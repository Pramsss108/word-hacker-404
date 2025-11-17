// Audio pipeline for A1: sets up AudioWorklet with denoise processor and provides a simple API.

export interface PipelineOptions {
  vadThreshold?: number;
  bypass?: boolean;
}

export class VoicePipeline {
  private ctx: AudioContext;
  private workletNode?: AudioWorkletNode;
  private metricsHandler?: (data: any) => void;

  constructor(ctx?: AudioContext) {
    this.ctx = ctx ?? new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  async init(options?: PipelineOptions) {
    // Ensure running
    if (this.ctx.state === 'suspended') await this.ctx.resume();

    // Load the worklet module (bundled by Vite)
    const url = new URL('../worklets/denoise-processor.js', import.meta.url);
    await this.ctx.audioWorklet.addModule(url);

    this.workletNode = new AudioWorkletNode(this.ctx, 'denoise-processor');
    if (options) this.workletNode.port.postMessage({ type: 'config', data: options });

    // Forward metrics to window for now (can be wired to UI)
    this.workletNode.port.onmessage = (e) => {
      const { type, data } = e.data || {};
      if (type === 'metrics') {
        // eslint-disable-next-line no-console
        console.debug('A1 metrics', data);
        this.metricsHandler?.(data);
      } else if (type === 'rnnoise-ready') {
        // eslint-disable-next-line no-console
        console.info('RNNoise ready:', data);
      }
    };

    // Try to load rnnoise wasm bytes (optional)
    try {
      // Note: public/wasm maps to /wasm in dev/prod
      const wasmUrl = new URL('/wasm/rnnoise.wasm', window.location.origin);
      const resp = await fetch(wasmUrl);
      if (resp.ok) {
        const bytes = new Uint8Array(await resp.arrayBuffer());
        this.workletNode.port.postMessage({ type: 'rnnoise-bytes', data: bytes }, [bytes.buffer]);
      }
    } catch {
      // ignore; placeholder stays active
    }
  }

  connectSource(source: MediaStreamAudioSourceNode | AudioNode) {
    if (!this.workletNode) throw new Error('Pipeline not initialized');
    // RNNoise expects 48k; bypass denoise if sampleRate differs (until resampler added)
    const sr = this.ctx.sampleRate;
    if (sr !== 48000) {
      // eslint-disable-next-line no-console
      console.warn(`RNNoise expects 48kHz, current AudioContext = ${sr}. Denoise bypassed for stability.`);
      source.connect(this.ctx.destination);
      return;
    }
    source.connect(this.workletNode);
    this.workletNode.connect(this.ctx.destination);
  }

  createMediaStreamSource(stream: MediaStream) {
    return this.ctx.createMediaStreamSource(stream);
  }

  onMetrics(handler: (data: any) => void) {
    this.metricsHandler = handler;
  }

  disconnect() {
    try {
      this.workletNode?.disconnect();
    } catch {}
    try {
      // Suspending keeps context reusable without full close
      this.ctx.suspend();
    } catch {}
  }
}
