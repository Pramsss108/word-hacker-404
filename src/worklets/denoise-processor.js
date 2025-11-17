/*
  DenoiseProcessor (AudioWorkletProcessor)
  - Frame-based pipeline with simple VAD gate and placeholder denoise
  - RNNoise integration planned via WASM instantiate inside the processor
  - Communicates with main thread via port for control/metrics
*/

class RingBuffer {
  constructor(capacity) {
    this._buf = new Float32Array(capacity);
    this._head = 0;
    this._tail = 0;
    this._size = 0;
  }
  push(frame) {
    const n = frame.length;
    for (let i = 0; i < n; i++) {
      this._buf[this._head] = frame[i];
      this._head = (this._head + 1) % this._buf.length;
      if (this._size < this._buf.length) this._size++; else this._tail = (this._tail + 1) % this._buf.length;
    }
  }
  pop(n) {
    const out = new Float32Array(n);
    if (this._size < n) return null;
    for (let i = 0; i < n; i++) {
      out[i] = this._buf[this._tail];
      this._tail = (this._tail + 1) % this._buf.length;
      this._size--;
    }
    return out;
  }
}

class DenoiseProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super(options);
    this.sampleRate = sampleRate;
    // RNNoise works at 48kHz, 480-sample frames (~10ms)
    this.frameSize = 480;
    this.channelCount = 1; // speech mono processing
    this.inputRing = new RingBuffer(this.frameSize * 10);
  this.vadThreshold = 0.003; // base energy threshold
  this.noiseFloor = 0.001;   // running estimate of background level
  this.alphaNoise = 0.01;    // EMA coefficient for noise floor when non-speech
    this.bypass = false;
  this._frameCounter = 0;
  this._rnnoise = null; // { processFrame(Float32Array): Float32Array }
  this._ready = false;

    this.port.onmessage = (e) => {
      const { type, data } = e.data || {};
      if (type === 'config') {
        if (typeof data?.vadThreshold === 'number') this.vadThreshold = data.vadThreshold;
        if (typeof data?.bypass === 'boolean') this.bypass = data.bypass;
      } else if (type === 'rnnoise-bytes') {
        // In-processor WASM compile placeholder; replace with real init when wired
        try {
          // Placeholder: mark as ready with pass-through processor
          this._rnnoise = {
            processFrame: (f32) => f32,
          };
          this._ready = true;
          this.port.postMessage({ type: 'rnnoise-ready', data: { ok: true } });
        } catch (err) {
          this._rnnoise = null;
          this._ready = false;
          this.port.postMessage({ type: 'rnnoise-ready', data: { ok: false, error: String(err) } });
        }
      }
    };
  }

  _energy(frame) {
    let sum = 0;
    for (let i = 0; i < frame.length; i++) { const v = frame[i]; sum += v * v; }
    return sum / frame.length;
  }

  _simpleGate(frame, isSpeech) {
    if (isSpeech) return frame;
    // attenuate non-speech
    const out = new Float32Array(frame.length);
    for (let i = 0; i < frame.length; i++) out[i] = frame[i] * 0.1;
    return out;
  }

  _placeholderDenoise(frame) {
    // Very light lowpass-like smoothing as a placeholder
    const out = new Float32Array(frame.length);
    let prev = 0;
    const alpha = 0.1;
    for (let i = 0; i < frame.length; i++) {
      prev = alpha * frame[i] + (1 - alpha) * prev;
      out[i] = prev;
    }
    return out;
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || input.length === 0 || !output || output.length === 0) return true;
    const inCh = input[0];
    const outCh = output[0];
    if (!inCh || !outCh) return true;

    // accumulate input samples into ring buffer
    this.inputRing.push(inCh);

    let written = 0;
    // produce same number of samples as provided, processing per frame internally
    while (written < outCh.length) {
      const frame = this.inputRing.pop(this.frameSize);
      if (!frame) break; // not enough yet

      const energy = this._energy(frame);
      // adaptive threshold: base + scaled noise floor
      const dynamicThresh = this.vadThreshold + this.noiseFloor * 2;
      const isSpeech = energy > dynamicThresh;
      // update noise floor when not speech
      if (!isSpeech) {
        this.noiseFloor = (1 - this.alphaNoise) * this.noiseFloor + this.alphaNoise * energy;
      }
      // denoise: rnnoise if ready, otherwise placeholder or bypass
      let denoised = frame;
      if (!this.bypass) {
        if (this._ready && this._rnnoise) {
          denoised = this._rnnoise.processFrame(frame);
        } else {
          denoised = this._placeholderDenoise(frame);
        }
      }
      const gated = this._simpleGate(denoised, isSpeech);

      const chunk = Math.min(gated.length, outCh.length - written);
      outCh.set(gated.subarray(0, chunk), written);
      written += chunk;

      // send metrics sparsely
      this._frameCounter++;
      if ((this._frameCounter % 25) === 0) {
        this.port.postMessage({ type: 'metrics', data: { energy, isSpeech, noiseFloor: this.noiseFloor, dynamicThresh } });
      }
    }

    // if we couldn’t fill all output, pad with zeros to avoid glitches
    for (let i = written; i < outCh.length; i++) outCh[i] = 0;

    return true;
  }
}

registerProcessor('denoise-processor', DenoiseProcessor);
