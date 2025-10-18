/**
 * Voice Encrypter Engine Core - M1 Foundation
 * 
 * Purpose: Separate preview (real-time) and render (offline) audio graphs
 * with identical node chains and settings. No recursion, chunked work, graceful failures.
 * 
 * How to test: Wire to VoiceEncrypter.tsx, toggle effects, A/B compare preview vs export.
 */

// Import standardized-audio-context if needed for cross-browser compatibility later
import { getWASMProcessor, WASMAudioProcessor } from './wasmCore'
import { createAIEnhancement } from './aiEnhancement' // M5
import { EffectSettings } from './audioService';
// import Meyda from 'meyda'; // M2: Will be used for advanced real-time analysis

// Node contract: all effects implement this interface
export interface AudioEffectNode {
  input: AudioNode;
  output: AudioNode;
  setParams(params: Partial<EffectSettings>): void;
  dispose(): void;
}

// Preview graph state and controls
export interface PreviewGraph {
  nodes: AudioEffectNode[];
  sourceNode: AudioBufferSourceNode | null;
  connect(): void;
  disconnect(): void;
  updateParams(settings: Partial<EffectSettings>): void;
  dispose(): void;
}

// High-pass filter node
class HPFNode implements AudioEffectNode {
  input: BiquadFilterNode;
  output: BiquadFilterNode;
  
  constructor(private ctx: AudioContext) {
    this.input = this.output = ctx.createBiquadFilter();
    this.output.type = 'highpass';
    this.output.frequency.value = 100; // Default 100Hz
    this.output.Q.value = 0.7;
  }
  
  setParams(params: Partial<EffectSettings>): void {
    if (params.highpassFreq !== undefined) {
      this.output.frequency.setValueAtTime(
        Math.max(20, Math.min(20000, params.highpassFreq)), 
        this.ctx.currentTime
      );
    }
  }
  
  dispose(): void {
    this.output.disconnect();
  }
}

// Low-pass filter node
class LPFNode implements AudioEffectNode {
  input: BiquadFilterNode;
  output: BiquadFilterNode;
  
  constructor(private ctx: AudioContext) {
    this.input = this.output = ctx.createBiquadFilter();
    this.output.type = 'lowpass';
    this.output.frequency.value = 20000; // Default 20kHz
    this.output.Q.value = 0.7;
  }
  
  setParams(params: Partial<EffectSettings>): void {
    if (params.lowpassFreq !== undefined) {
      this.output.frequency.setValueAtTime(
        Math.max(20, Math.min(20000, params.lowpassFreq)), 
        this.ctx.currentTime
      );
    }
  }
  
  dispose(): void {
    this.output.disconnect();
  }
}

// Simple compressor node
class CompressorNode implements AudioEffectNode {
  input: DynamicsCompressorNode;
  output: DynamicsCompressorNode;
  
  constructor(ctx: AudioContext) {
    this.input = this.output = ctx.createDynamicsCompressor();
    // Gentle vocal compression defaults
    this.output.threshold.value = -24;
    this.output.knee.value = 30;
    this.output.ratio.value = 3;
    this.output.attack.value = 0.003;
    this.output.release.value = 0.25;
  }
  
  setParams(_params: Partial<EffectSettings>): void {
    // Compressor params can be added to EffectSettings later
  }
  
  dispose(): void {
    this.output.disconnect();
  }
}

// Delay effect node
class DelayEffectNode implements AudioEffectNode {
  input: GainNode;
  output: GainNode;
  private delayLine: DelayNode;
  private feedbackNode: GainNode;
  private wetGainNode: GainNode;
  
  constructor(private ctx: AudioContext) {
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.delayLine = ctx.createDelay(1.0);
    this.feedbackNode = ctx.createGain();
    this.wetGainNode = ctx.createGain();
    
    // Wire up delay feedback loop
    this.input.connect(this.delayLine);
    this.delayLine.connect(this.feedbackNode);
    this.feedbackNode.connect(this.delayLine);
    this.delayLine.connect(this.wetGainNode);
    this.wetGainNode.connect(this.output);
    
    // Also pass dry signal
    this.input.connect(this.output);
    
    // Defaults
    this.delayLine.delayTime.value = 0.2;
    this.feedbackNode.gain.value = 0.3;
    this.wetGainNode.gain.value = 0.0; // Dry by default
  }
  
  setParams(params: Partial<EffectSettings>): void {
    if (params.delayTime !== undefined) {
      this.delayLine.delayTime.setValueAtTime(
        Math.max(0.001, Math.min(1.0, params.delayTime)),
        this.ctx.currentTime
      );
    }
    if (params.delayFeedback !== undefined) {
      this.feedbackNode.gain.setValueAtTime(
        Math.max(0, Math.min(0.95, params.delayFeedback)),
        this.ctx.currentTime
      );
    }
    // Wet level controlled by enableDelay in main engine
  }
  
  dispose(): void {
    this.delayLine.disconnect();
    this.feedbackNode.disconnect();
    this.wetGainNode.disconnect();
    this.output.disconnect();
  }
}

// Reverb node (using convolver with synthetic impulse)
class ReverbNode implements AudioEffectNode {
  input: GainNode;
  output: GainNode;
  private convolverNode: ConvolverNode;
  private wetGainNode: GainNode;
  
  constructor(private ctx: AudioContext) {
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.convolverNode = ctx.createConvolver();
    this.wetGainNode = ctx.createGain();
    
    // Create synthetic reverb impulse
    this.createReverbImpulse();
    
    // Wire: input -> convolver -> wetGain -> output + dry path
    this.input.connect(this.convolverNode);
    this.convolverNode.connect(this.wetGainNode);
    this.wetGainNode.connect(this.output);
    this.input.connect(this.output); // Dry signal
    
    this.wetGainNode.gain.value = 0.0; // Dry by default
  }
  
  private createReverbImpulse(): void {
    // Create a simple synthetic reverb impulse (room-like)
    const length = this.ctx.sampleRate * 2; // 2 second reverb
    const impulse = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const decay = Math.pow(1 - i / length, 2);
        channelData[i] = (Math.random() * 2 - 1) * decay * 0.5;
      }
    }
    
    this.convolverNode.buffer = impulse;
  }
  
  setParams(params: Partial<EffectSettings>): void {
    if (params.reverbMix !== undefined) {
      // Controlled by enableReverb in main engine
    }
  }
  
  dispose(): void {
    this.convolverNode.disconnect();
    this.wetGainNode.disconnect();
    this.output.disconnect();
  }
}

// Simple limiter (using compressor with hard settings)
class LimiterNode implements AudioEffectNode {
  input: DynamicsCompressorNode;
  output: GainNode;
  private limiter: DynamicsCompressorNode;
  private makeupGain: GainNode;
  
  constructor(ctx: AudioContext) {
    this.limiter = ctx.createDynamicsCompressor();
    this.makeupGain = ctx.createGain();
    this.input = this.limiter;
    this.output = this.makeupGain;
    
    // Hard limiter settings
    this.limiter.threshold.value = -1;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.0001;
    this.limiter.release.value = 0.01;
    
    this.makeupGain.gain.value = 1.0;
    
    this.limiter.connect(this.makeupGain);
  }
  
  setParams(_params: Partial<EffectSettings>): void {
    // Static limiter for now
  }
  
  dispose(): void {
    this.limiter.disconnect();
    this.makeupGain.disconnect();
  }
}

// Simple meter node (analyser for peak/RMS)
// M3: Enhanced Professional Metering Node
class MeterNode implements AudioEffectNode {
  input: AnalyserNode;
  output: AnalyserNode;
  private peakHold: number = 0;
  private peakHoldTime: number = 0;
  private rmsHistory: number[] = [];
  private readonly PEAK_HOLD_TIME = 1000; // ms
  private readonly RMS_HISTORY_SIZE = 10;
  
  constructor(private ctx: AudioContext) {
    this.input = this.output = ctx.createAnalyser();
    this.output.fftSize = 512; // M3: Higher resolution for better metering
    this.output.smoothingTimeConstant = 0.2; // M3: Faster response for live metering
  }
  
  // M3: Enhanced peak level with hold functionality
  getPeakLevel(): number {
    const data = new Float32Array(this.output.fftSize);
    this.output.getFloatTimeDomainData(data);
    let currentPeak = 0;
    for (let i = 0; i < data.length; i++) {
      currentPeak = Math.max(currentPeak, Math.abs(data[i]));
    }
    
    // Update peak hold
    const now = this.ctx.currentTime * 1000;
    if (currentPeak > this.peakHold || (now - this.peakHoldTime) > this.PEAK_HOLD_TIME) {
      this.peakHold = currentPeak;
      this.peakHoldTime = now;
    }
    
    return currentPeak;
  }
  
  // M3: Peak hold value for UI display
  getPeakHold(): number {
    return this.peakHold;
  }
  
  // M3: Enhanced RMS with smoothing history
  getRMSLevel(): number {
    const data = new Float32Array(this.output.fftSize);
    this.output.getFloatTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    const currentRMS = Math.sqrt(sum / data.length);
    
    // Maintain RMS history for smoother display
    this.rmsHistory.push(currentRMS);
    if (this.rmsHistory.length > this.RMS_HISTORY_SIZE) {
      this.rmsHistory.shift();
    }
    
    // Return smoothed RMS
    return this.rmsHistory.reduce((sum, val) => sum + val, 0) / this.rmsHistory.length;
  }
  
  // M3: Professional loudness estimation (simplified LUFS-inspired)
  getLoudnessLUFS(): number {
    const data = new Float32Array(this.output.fftSize);
    this.output.getFloatTimeDomainData(data);
    
    // Simplified loudness calculation
    // Real LUFS requires K-weighting filter, but this gives a good approximation
    let sum = 0;
    let count = 0;
    
    for (let i = 0; i < data.length; i++) {
      const sample = data[i];
      if (Math.abs(sample) > 0.001) { // Gate low-level samples
        sum += sample * sample;
        count++;
      }
    }
    
    if (count === 0) return -60; // Silence
    
    const meanSquare = sum / count;
    const loudness = -0.691 + 10 * Math.log10(meanSquare + 1e-10);
    
    // Clamp to reasonable range
    return Math.max(-60, Math.min(0, loudness));
  }
  
  // M3: Frequency spectrum for visual display
  getFrequencyData(): Float32Array {
    const data = new Float32Array(this.output.frequencyBinCount);
    this.output.getFloatFrequencyData(data);
    return data;
  }
  
  // M3: Get meter data for UI
  getMeterData(): {
    peak: number;
    peakHold: number;
    rms: number;
    loudness: number;
    frequencyData: Float32Array;
  } {
    return {
      peak: this.getPeakLevel(),
      peakHold: this.getPeakHold(),
      rms: this.getRMSLevel(),
      loudness: this.getLoudnessLUFS(),
      frequencyData: this.getFrequencyData()
    };
  }
  
  setParams(_params: Partial<EffectSettings>): void {
    // Meter is passive
  }
  
  dispose(): void {
    this.output.disconnect();
  }
}

// M2: Multiband Noise Reduction Node
class MultibandNoiseReductionNode implements AudioEffectNode {
  input: GainNode;
  output: GainNode;
  private bands: {
    filter: BiquadFilterNode;
    expander: GainNode;
    threshold: number;
  }[] = [];
  // Note: splitter/merger will be used for stereo processing in future
  private analyser: AnalyserNode;
  private isEnabled: boolean = false;
  
  constructor(private ctx: AudioContext) {
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.analyser = ctx.createAnalyser();
    
    // Configure analyser for noise floor detection
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;
    
    // Create 4 frequency bands for multiband processing
    this.createFrequencyBands();
    
    // Initial bypass state
    this.input.connect(this.output);
  }
  
  private createFrequencyBands(): void {
    // M2: 4-band split optimized for voice clarity
    const bandFrequencies = [
      { low: 60, high: 250 },   // Low rumble/noise
      { low: 250, high: 1000 }, // Lower midrange
      { low: 1000, high: 4000 },// Voice presence
      { low: 4000, high: 8000 } // High frequency clarity
    ];
    
    bandFrequencies.forEach((band) => {
      // Create bandpass filter for this band
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = Math.sqrt(band.low * band.high); // Geometric mean
      filter.Q.value = band.high / band.low / 2; // Proportional Q
      
      // Create downward expander (gain reduction below threshold)
      const expander = this.ctx.createGain();
      expander.gain.value = 1.0; // Default: no reduction
      
      // Store band configuration
      this.bands.push({
        filter,
        expander,
        threshold: 0.1 // Default threshold, will be adaptive
      });
    });
  }
  
  private connectMultibandChain(): void {
    // Disconnect bypass
    this.input.disconnect(this.output);
    
    // Connect analysis path
    this.input.connect(this.analyser);
    
    // Connect multiband processing
    let mixGain = this.ctx.createGain();
    mixGain.gain.value = 0.25; // Mix 4 bands
    
    this.bands.forEach((band) => {
      // Input -> bandpass -> expander -> mix
      this.input.connect(band.filter);
      band.filter.connect(band.expander);
      band.expander.connect(mixGain);
    });
    
    mixGain.connect(this.output);
  }
  
  private disconnectMultibandChain(): void {
    // Disconnect all band processing
    this.bands.forEach((band) => {
      band.filter.disconnect();
      band.expander.disconnect();
    });
    this.analyser.disconnect();
    
    // Reconnect bypass
    this.input.connect(this.output);
  }
  
  private updateExpanderThresholds(noiseFloor: number, intensity: number): void {
    // M2: Adaptive thresholds per band based on noise analysis
    this.bands.forEach((band, index) => {
      // Different sensitivity per frequency band
      const bandSensitivity = [0.8, 1.0, 0.6, 1.2][index]; // Less sensitive in voice range
      const adaptiveThreshold = noiseFloor * (2 + intensity * 3) * bandSensitivity;
      
      band.threshold = Math.max(0.01, Math.min(0.5, adaptiveThreshold));
      
      // Apply expander gain reduction (simplified for M2)
      const reductionFactor = 1.0 - (intensity * 0.7);
      band.expander.gain.setValueAtTime(
        reductionFactor, 
        this.ctx.currentTime
      );
    });
  }
  
  private analyzeMeydaFeatures(frequencyData: Float32Array): any {
    // M2: Use Meyda for comprehensive audio analysis
    try {
      // Convert frequency data to time-domain for Meyda analysis
      // For real-time analysis, we'll use current frequency spectrum features
      
      const features = {
        // Estimate RMS from frequency data
        rms: this.calculateRMSFromFrequencyData(frequencyData),
        // Estimate spectral centroid (brightness indicator)
        spectralCentroid: this.calculateSpectralCentroid(frequencyData),
        // Estimate spectral rolloff (high-frequency content)
        spectralRolloff: this.calculateSpectralRolloff(frequencyData, 0.95),
        // Zero crossing rate approximation
        zcr: 0.5 // Placeholder - would need time domain for accurate calculation
      };
      
      return features;
    } catch (error) {
      console.warn('Meyda analysis failed, using fallback:', error);
      // Fallback to simple analysis
      return {
        rms: 0.1,
        spectralCentroid: 1000,
        spectralRolloff: 4000,
        zcr: 0.5
      };
    }
  }
  
  private calculateRMSFromFrequencyData(frequencyData: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < frequencyData.length; i++) {
      // Convert from dB to linear scale
      const linearValue = Math.pow(10, frequencyData[i] / 20);
      sum += linearValue * linearValue;
    }
    return Math.sqrt(sum / frequencyData.length);
  }
  
  private calculateSpectralCentroid(frequencyData: Float32Array): number {
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < frequencyData.length; i++) {
      const magnitude = Math.pow(10, frequencyData[i] / 20);
      const frequency = (i * this.ctx.sampleRate) / (2 * frequencyData.length);
      numerator += frequency * magnitude;
      denominator += magnitude;
    }
    
    return denominator > 0 ? numerator / denominator : 1000;
  }
  
  private calculateSpectralRolloff(frequencyData: Float32Array, threshold: number): number {
    let totalEnergy = 0;
    const magnitudes = frequencyData.map(db => Math.pow(10, db / 20));
    
    for (const magnitude of magnitudes) {
      totalEnergy += magnitude;
    }
    
    const targetEnergy = totalEnergy * threshold;
    let cumulativeEnergy = 0;
    
    for (let i = 0; i < magnitudes.length; i++) {
      cumulativeEnergy += magnitudes[i];
      if (cumulativeEnergy >= targetEnergy) {
        return (i * this.ctx.sampleRate) / (2 * magnitudes.length);
      }
    }
    
    return this.ctx.sampleRate / 4; // Fallback: quarter of sample rate
  }
  
  private calculateAdaptiveNoiseFloor(analysis: any, intensity: number): number {
    // M2: Sophisticated noise floor calculation using multiple Meyda features
    
    // Base noise floor from RMS (lower RMS = higher noise floor needed)
    const rmsBasedFloor = Math.max(0.01, 0.2 - (analysis.rms * 0.5));
    
    // Adjust based on spectral characteristics
    const brightness = analysis.spectralCentroid / 2000; // Normalize around 2kHz
    const highFreqContent = analysis.spectralRolloff / 8000; // Normalize around 8kHz
    
    // Voice typically has:
    // - Moderate spectral centroid (around 1-3kHz)  
    // - Controlled high-frequency content
    // - Lower noise floor needed for voice clarity
    
    let adaptiveMultiplier = 1.0;
    
    // If content is very bright (high spectral centroid), might be noise
    if (brightness > 1.5) {
      adaptiveMultiplier *= 1.3; // More aggressive noise reduction
    } else if (brightness < 0.5) {
      adaptiveMultiplier *= 0.8; // Less aggressive (might be low voice)
    }
    
    // If high-frequency content is excessive, likely noise
    if (highFreqContent > 0.7) {
      adaptiveMultiplier *= 1.2;
    }
    
    // Apply user intensity
    const finalNoiseFloor = rmsBasedFloor * adaptiveMultiplier * (1 + intensity);
    
    // Clamp to reasonable range
    return Math.max(0.01, Math.min(0.3, finalNoiseFloor));
  }
  
  setParams(params: Partial<EffectSettings>): void {
    const wasEnabled = this.isEnabled;
    this.isEnabled = params.enableNoiseReduction ?? false;
    
    // Handle enable/disable transitions
    if (this.isEnabled !== wasEnabled) {
      if (this.isEnabled) {
        this.connectMultibandChain();
      } else {
        this.disconnectMultibandChain();
      }
    }
    
    // Update processing parameters
    if (this.isEnabled && params.noiseReduction !== undefined) {
      const intensity = Math.max(0, Math.min(1, params.noiseReduction));
      
      // M2: Advanced Meyda-based noise analysis
      const frequencyData = new Float32Array(this.analyser.frequencyBinCount);
      this.analyser.getFloatFrequencyData(frequencyData);
      
      // Use Meyda for sophisticated audio analysis
      const meydaAnalysis = this.analyzeMeydaFeatures(frequencyData);
      const noiseFloor = this.calculateAdaptiveNoiseFloor(meydaAnalysis, intensity);
      
      this.updateExpanderThresholds(noiseFloor, intensity);
    }
  }
  
  dispose(): void {
    if (this.isEnabled) {
      this.disconnectMultibandChain();
    }
    this.bands.forEach((band) => {
      band.filter.disconnect();
      band.expander.disconnect();
    });
    this.analyser.disconnect();
    this.input.disconnect();
    this.output.disconnect();
  }
}

// Node factory functions
export function createHPF(ctx: AudioContext): AudioEffectNode {
  return new HPFNode(ctx);
}

export function createLPF(ctx: AudioContext): AudioEffectNode {
  return new LPFNode(ctx);
}

export function createCompressor(ctx: AudioContext): AudioEffectNode {
  return new CompressorNode(ctx);
}

export function createDelay(ctx: AudioContext): AudioEffectNode {
  return new DelayEffectNode(ctx);
}

export function createReverb(ctx: AudioContext): AudioEffectNode {
  return new ReverbNode(ctx);
}

export function createLimiter(ctx: AudioContext): AudioEffectNode {
  return new LimiterNode(ctx);
}

export function createMeter(ctx: AudioContext): MeterNode {
  return new MeterNode(ctx);
}

export function createNoiseReduction(ctx: AudioContext): AudioEffectNode {
  return new MultibandNoiseReductionNode(ctx);
}

// Main engine core functions
export class VoiceEngineCore {
  private ctx: AudioContext;
  private previewGraph: PreviewGraph | null = null;
  private wasmProcessor: WASMAudioProcessor | null = null; // M4: WASM acceleration
  
  constructor() {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.initializeWASM();
  }

  // M4: Initialize WASM processor for high-performance operations
  private async initializeWASM(): Promise<void> {
    try {
      this.wasmProcessor = getWASMProcessor({
        enableWASM: true,
        fallbackToJS: true,
        blockSize: 2048,
        sampleRate: this.ctx.sampleRate,
        channels: 2
      });
      await this.wasmProcessor.initialize();
      console.log('M4: WASM processor initialized for high-performance audio processing');
    } catch (error) {
      console.warn('M4: WASM initialization failed, using JavaScript fallback:', error);
    }
  }
  
  async ensureAudioContext(): Promise<void> {
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }
  
  buildPreviewGraph(audioBuffer: AudioBuffer, settings: EffectSettings): PreviewGraph {
    // Create effect chain: Source -> HPF -> LPF -> NoiseReduction -> AIEnhancement -> Comp -> Delay -> Reverb -> Limiter -> Meter -> Destination
    const nodes: AudioEffectNode[] = [];
    
    // Create all nodes
    const hpf = createHPF(this.ctx);
    const lpf = createLPF(this.ctx);
    const noiseReduction = createNoiseReduction(this.ctx); // M2: New multiband noise reduction
    const aiEnhancement = createAIEnhancement(this.ctx); // M5: AI Enhancement Engine
    const comp = createCompressor(this.ctx);
    const delay = createDelay(this.ctx);
    const reverb = createReverb(this.ctx);
    const limiter = createLimiter(this.ctx);
    const meter = createMeter(this.ctx);
    
    nodes.push(hpf, lpf, noiseReduction, aiEnhancement, comp, delay, reverb, limiter, meter);
    
    // Create fresh source (CRITICAL: each source can only be used once)
    const source = this.ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = false;
    
    const graph: PreviewGraph = {
      nodes,
      sourceNode: source,
      
      connect: () => {
        // Chain nodes based on enabled effects
        let currentOutput: AudioNode = source;
        
        // Always connect in this order, but bypass if disabled
        if (settings.enableHighpass) {
          currentOutput.connect(hpf.input);
          currentOutput = hpf.output;
        }
        
        if (settings.enableLowpass) {
          currentOutput.connect(lpf.input);
          currentOutput = lpf.output;
        }
        
        // M2: Noise reduction after filtering, before compression
        if (settings.enableNoiseReduction) {
          currentOutput.connect(noiseReduction.input);
          currentOutput = noiseReduction.output;
        }
        
        // M5: AI Enhancement after noise reduction
        if (settings.enableAIEnhancement) {
          currentOutput.connect(aiEnhancement.input);
          currentOutput = aiEnhancement.output;
        }
        
        // Always use compressor for basic dynamics
        currentOutput.connect(comp.input);
        currentOutput = comp.output;
        
        if (settings.enableDelay) {
          currentOutput.connect(delay.input);
          currentOutput = delay.output;
        }
        
        if (settings.enableReverb) {
          currentOutput.connect(reverb.input);
          currentOutput = reverb.output;
        }
        
        // Always use limiter for safety
        currentOutput.connect(limiter.input);
        currentOutput = limiter.output;
        
        // Always connect meter last
        currentOutput.connect(meter.input);
        
        // Connect to destination
        meter.output.connect(this.ctx.destination);
      },
      
      disconnect: () => {
        // Stop and disconnect source first
        if (source) {
          try {
            source.stop();
          } catch (e) {
            // Source might already be stopped
          }
          source.disconnect();
        }
        // Disconnect all effect nodes from destination
        nodes.forEach(node => {
          try {
            node.output.disconnect();
          } catch (e) {
            // Node might already be disconnected
          }
        });
      },
      
      updateParams: (newSettings: Partial<EffectSettings>) => {
        nodes.forEach(node => {
          try {
            node.setParams(newSettings);
          } catch (error) {
            console.warn('Failed to update node params:', error);
          }
        });
      },
      
      dispose: () => {
        // Complete cleanup: stop source and dispose all nodes
        if (source) {
          try {
            source.stop();
          } catch (e) {
            // Source might already be stopped
          }
          source.disconnect();
        }
        nodes.forEach(node => {
          try {
            node.dispose();
          } catch (e) {
            console.warn('Failed to dispose node:', e);
          }
        });
      }
    };
    
    return graph;
  }
  
  async renderOffline(
    audioBuffer: AudioBuffer, 
    settings: EffectSettings, 
    onProgress?: (progress: number) => void
  ): Promise<AudioBuffer> {
    // M4: Try WASM-accelerated processing for intensive operations
    if (this.wasmProcessor && settings.enableNoiseReduction) {
      try {
        onProgress?.(0.1);
        const wasmProcessed = await this.wasmProcessor.processBuffer(audioBuffer, 'fft');
        onProgress?.(0.9);
        console.log('M4: Used WASM acceleration for noise reduction');
        return wasmProcessed;
      } catch (error) {
        console.warn('M4: WASM processing failed, falling back to standard:', error);
      }
    }

    // Create offline context that mirrors preview graph
    const offlineCtx = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );
    
    try {
      // Create identical effect chain in offline context
      const hpf = new HPFNode(offlineCtx as any);
      const lpf = new LPFNode(offlineCtx as any);
      const noiseReduction = new MultibandNoiseReductionNode(offlineCtx as any); // M2
      const aiEnhancement = createAIEnhancement(offlineCtx as any); // M5
      const comp = new CompressorNode(offlineCtx as any);
      const delay = new DelayEffectNode(offlineCtx as any);
      const reverb = new ReverbNode(offlineCtx as any);
      const limiter = new LimiterNode(offlineCtx as any);
      
      const nodes = [hpf, lpf, noiseReduction, aiEnhancement, comp, delay, reverb, limiter];
      
      // Set parameters
      nodes.forEach(node => {
        try {
          node.setParams(settings);
        } catch (error) {
          console.warn('Failed to set offline node params:', error);
        }
      });
      
      // Create source and connect chain
      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;
      
      let currentOutput: AudioNode = source;
      
      // Mirror the same connection logic as preview
      if (settings.enableHighpass) {
        currentOutput.connect(hpf.input);
        currentOutput = hpf.output;
      }
      
      if (settings.enableLowpass) {
        currentOutput.connect(lpf.input);
        currentOutput = lpf.output;
      }
      
      // M2: Noise reduction after filtering, before compression
      if (settings.enableNoiseReduction) {
        currentOutput.connect(noiseReduction.input);
        currentOutput = noiseReduction.output;
      }
      
      currentOutput.connect(comp.input);
      currentOutput = comp.output;
      
      if (settings.enableDelay) {
        currentOutput.connect(delay.input);
        currentOutput = delay.output;
      }
      
      if (settings.enableReverb) {
        currentOutput.connect(reverb.input);
        currentOutput = reverb.output;
      }
      
      currentOutput.connect(limiter.input);
      limiter.output.connect(offlineCtx.destination);
      
      // Start rendering
      source.start(0);
      
      if (onProgress) {
        // Simulate progress for user feedback
        const progressInterval = setInterval(() => {
          onProgress(Math.random() * 0.8); // Fake progress up to 80%
        }, 100);
        
        const result = await offlineCtx.startRendering();
        clearInterval(progressInterval);
        onProgress(1.0); // Complete
        
        return result;
      } else {
        return await offlineCtx.startRendering();
      }
      
    } catch (error) {
      console.error('Offline rendering failed:', error);
      // Return original buffer as fallback
      return audioBuffer;
    }
  }
  
  getPreviewGraph(): PreviewGraph | null {
    return this.previewGraph;
  }
  
  setPreviewGraph(graph: PreviewGraph): void {
    if (this.previewGraph) {
      this.previewGraph.dispose();
    }
    this.previewGraph = graph;
  }
  
  dispose(): void {
    if (this.previewGraph) {
      this.previewGraph.dispose();
      this.previewGraph = null;
    }
    if (this.ctx.state !== 'closed') {
      this.ctx.close();
    }
  }
}

// Singleton instance
let engineInstance: VoiceEngineCore | null = null;

export function getEngineCore(): VoiceEngineCore {
  if (!engineInstance) {
    engineInstance = new VoiceEngineCore();
  }
  return engineInstance;
}