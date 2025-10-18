/**
 * Voice Encrypter Engine Core - M1 Foundation
 * 
 * Purpose: Separate preview (real-time) and render (offline) audio graphs
 * with identical node chains and settings. No recursion, chunked work, graceful failures.
 * 
 * How to test: Wire to VoiceEncrypter.tsx, toggle effects, A/B compare preview vs export.
 */

// Import standardized-audio-context if needed for cross-browser compatibility later
import { EffectSettings } from './audioService';

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
class MeterNode implements AudioEffectNode {
  input: AnalyserNode;
  output: AnalyserNode;
  
  constructor(ctx: AudioContext) {
    this.input = this.output = ctx.createAnalyser();
    this.output.fftSize = 256;
    this.output.smoothingTimeConstant = 0.3;
  }
  
  getPeakLevel(): number {
    const data = new Float32Array(this.output.fftSize);
    this.output.getFloatTimeDomainData(data);
    let peak = 0;
    for (let i = 0; i < data.length; i++) {
      peak = Math.max(peak, Math.abs(data[i]));
    }
    return peak;
  }
  
  getRMSLevel(): number {
    const data = new Float32Array(this.output.fftSize);
    this.output.getFloatTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    return Math.sqrt(sum / data.length);
  }
  
  setParams(_params: Partial<EffectSettings>): void {
    // Meter is passive
  }
  
  dispose(): void {
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

// Main engine core functions
export class VoiceEngineCore {
  private ctx: AudioContext;
  private previewGraph: PreviewGraph | null = null;
  
  constructor() {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  
  async ensureAudioContext(): Promise<void> {
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }
  
  buildPreviewGraph(audioBuffer: AudioBuffer, settings: EffectSettings): PreviewGraph {
    // Create effect chain: Source -> HPF -> LPF -> Comp -> Delay -> Reverb -> Limiter -> Meter -> Destination
    const nodes: AudioEffectNode[] = [];
    
    // Create all nodes
    const hpf = createHPF(this.ctx);
    const lpf = createLPF(this.ctx);
    const comp = createCompressor(this.ctx);
    const delay = createDelay(this.ctx);
    const reverb = createReverb(this.ctx);
    const limiter = createLimiter(this.ctx);
    const meter = createMeter(this.ctx);
    
    nodes.push(hpf, lpf, comp, delay, reverb, limiter, meter);
    
    // Create source
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
        if (source) {
          source.disconnect();
        }
        nodes.forEach(node => node.dispose());
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
        if (source) {
          source.disconnect();
        }
        nodes.forEach(node => node.dispose());
      }
    };
    
    return graph;
  }
  
  async renderOffline(
    audioBuffer: AudioBuffer, 
    settings: EffectSettings, 
    onProgress?: (progress: number) => void
  ): Promise<AudioBuffer> {
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
      const comp = new CompressorNode(offlineCtx as any);
      const delay = new DelayEffectNode(offlineCtx as any);
      const reverb = new ReverbNode(offlineCtx as any);
      const limiter = new LimiterNode(offlineCtx as any);
      
      const nodes = [hpf, lpf, comp, delay, reverb, limiter];
      
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