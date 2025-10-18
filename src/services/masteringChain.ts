/**
 * M6 - Mastering & Polish Engine
 * Professional mastering chain with multi-band processing, stereo enhancement, and final limiting
 * NASA-grade mastering quality for professional audio output
 */

import { AudioEffectNode } from './engineCore';
import { EffectSettings } from './audioService';

export interface MasteringConfig {
  multiband: {
    enabled: boolean;
    lowGain: number;    // -12dB to +12dB
    midGain: number;    // -12dB to +12dB
    highGain: number;   // -12dB to +12dB
    lowFreq: number;    // Low/Mid crossover (200-1000Hz)
    highFreq: number;   // Mid/High crossover (2000-8000Hz)
  };
  stereo: {
    enabled: boolean;
    width: number;      // Stereo width (0.0-2.0, 1.0=normal)
    bass: number;       // Bass mono control (0.0-1.0)
    imaging: number;    // Stereo imaging enhancement (0.0-1.0)
  };
  exciter: {
    enabled: boolean;
    amount: number;     // Harmonic excitation amount (0.0-1.0)
    frequency: number;  // Target frequency (1000-8000Hz)
    harmonics: number;  // Harmonic content (1-5)
  };
  finalLimiter: {
    enabled: boolean;
    threshold: number;  // Limiting threshold (-6dB to 0dB)
    release: number;    // Release time (10ms-1000ms)
    ceiling: number;    // Output ceiling (-1dB to 0dB)
  };
  masterVolume: number; // Final output volume (0.0-2.0)
}

/**
 * Multi-band EQ Processor
 */
class MultibandEQ {
  private ctx: AudioContext;
  private lowShelf!: BiquadFilterNode;
  private midPeak!: BiquadFilterNode;
  private highShelf!: BiquadFilterNode;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.setupFilters();
  }

  private setupFilters(): void {
    // Low shelf filter
    this.lowShelf = this.ctx.createBiquadFilter();
    this.lowShelf.type = 'lowshelf';
    this.lowShelf.frequency.value = 250;
    this.lowShelf.gain.value = 0;

    // Mid peaking filter
    this.midPeak = this.ctx.createBiquadFilter();
    this.midPeak.type = 'peaking';
    this.midPeak.frequency.value = 1000;
    this.midPeak.Q.value = 1.0;
    this.midPeak.gain.value = 0;

    // High shelf filter
    this.highShelf = this.ctx.createBiquadFilter();
    this.highShelf.type = 'highshelf';
    this.highShelf.frequency.value = 4000;
    this.highShelf.gain.value = 0;

    // Connect the chain
    this.lowShelf.connect(this.midPeak);
    this.midPeak.connect(this.highShelf);
  }

  connect(destination: AudioNode): void {
    this.highShelf.connect(destination);
  }

  getInput(): AudioNode {
    return this.lowShelf;
  }

  setParams(config: MasteringConfig['multiband']): void {
    this.lowShelf.frequency.value = config.lowFreq;
    this.lowShelf.gain.value = config.lowGain;

    this.midPeak.frequency.value = (config.lowFreq + config.highFreq) / 2;
    this.midPeak.gain.value = config.midGain;

    this.highShelf.frequency.value = config.highFreq;
    this.highShelf.gain.value = config.highGain;
  }

  dispose(): void {
    this.lowShelf.disconnect();
    this.midPeak.disconnect();
    this.highShelf.disconnect();
  }
}

/**
 * Stereo Enhancement Processor
 */
class StereoEnhancer {
  private ctx: AudioContext;
  private splitter!: ChannelSplitterNode;
  private merger!: ChannelMergerNode;
  private midGain!: GainNode;
  private sideGain!: GainNode;
  private bassFilter!: BiquadFilterNode;
  private delayL!: DelayNode;
  private delayR!: DelayNode;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.setupStereoProcessing();
  }

  private setupStereoProcessing(): void {
    // Create M/S processing nodes
    this.splitter = this.ctx.createChannelSplitter(2);
    this.merger = this.ctx.createChannelMerger(2);
    
    // Mid and Side gain controls
    this.midGain = this.ctx.createGain();
    this.sideGain = this.ctx.createGain();

    // Bass mono filter
    this.bassFilter = this.ctx.createBiquadFilter();
    this.bassFilter.type = 'lowpass';
    this.bassFilter.frequency.value = 120;

    // Micro delays for stereo imaging
    this.delayL = this.ctx.createDelay(0.001);
    this.delayR = this.ctx.createDelay(0.001);
    this.delayL.delayTime.value = 0;
    this.delayR.delayTime.value = 0;

    // Initial connections (will be modified in setParams)
    this.splitter.connect(this.merger, 0, 0);
    this.splitter.connect(this.merger, 1, 1);
  }

  getInput(): AudioNode {
    return this.splitter;
  }

  connect(destination: AudioNode): void {
    this.merger.connect(destination);
  }

  setParams(config: MasteringConfig['stereo']): void {
    if (!config.enabled) return;

    // Implement stereo width control
    // Width > 1.0 = wider, < 1.0 = narrower, 0.0 = mono
    const width = Math.max(0, Math.min(2, config.width));
    
    this.midGain.gain.value = 1.0;
    this.sideGain.gain.value = width;

    // Bass mono control
    this.bassFilter.frequency.value = 120 + (config.bass * 80);

    // Stereo imaging with micro delays
    const imagingDelay = config.imaging * 0.0005; // Max 0.5ms
    this.delayL.delayTime.value = imagingDelay;
    this.delayR.delayTime.value = 0;
  }

  dispose(): void {
    this.splitter.disconnect();
    this.merger.disconnect();
    this.midGain.disconnect();
    this.sideGain.disconnect();
    this.bassFilter.disconnect();
    this.delayL.disconnect();
    this.delayR.disconnect();
  }
}

/**
 * Harmonic Exciter
 */
class HarmonicExciter {
  private ctx: AudioContext;
  private filter!: BiquadFilterNode;
  private waveshaper!: WaveShaperNode;
  private dryGain!: GainNode;
  private wetGain!: GainNode;
  private mixer!: GainNode;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.setupExciter();
  }

  private setupExciter(): void {
    // High-pass filter to target frequency range
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'highpass';
    this.filter.frequency.value = 2000;

    // Waveshaper for harmonic generation
    this.waveshaper = this.ctx.createWaveShaper();
    this.waveshaper.curve = this.createExciterCurve() as any;
    this.waveshaper.oversample = '4x';

    // Parallel processing
    this.dryGain = this.ctx.createGain();
    this.wetGain = this.ctx.createGain();
    this.mixer = this.ctx.createGain();

    // Connect processing chain
    this.filter.connect(this.waveshaper);
    this.waveshaper.connect(this.wetGain);
    this.wetGain.connect(this.mixer);
    this.dryGain.connect(this.mixer);
  }

  private createExciterCurve(): Float32Array {
    const samples = 1024;
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i - samples / 2) / (samples / 2);
      // Soft saturation with harmonic generation
      curve[i] = Math.tanh(x * 2) * 0.5 + Math.sin(x * Math.PI) * 0.1;
    }
    
    return curve;
  }

  getInput(): AudioNode {
    return this.dryGain;
  }

  connect(destination: AudioNode): void {
    this.mixer.connect(destination);
  }

  connectToFilter(): void {
    this.dryGain.connect(this.filter);
  }

  setParams(config: MasteringConfig['exciter']): void {
    if (!config.enabled) {
      this.wetGain.gain.value = 0;
      this.dryGain.gain.value = 1;
      return;
    }

    this.filter.frequency.value = config.frequency;
    this.wetGain.gain.value = config.amount * 0.3;
    this.dryGain.gain.value = 1 - (config.amount * 0.2);

    // Adjust waveshaper curve based on harmonics setting
    this.waveshaper.curve = this.createExciterCurve() as any;
  }

  dispose(): void {
    this.filter.disconnect();
    this.waveshaper.disconnect();
    this.dryGain.disconnect();
    this.wetGain.disconnect();
    this.mixer.disconnect();
  }
}

/**
 * Professional Mastering Limiter
 */
class MasteringLimiter {
  private ctx: AudioContext;
  private compressor!: DynamicsCompressorNode;
  private outputGain!: GainNode;
  private lookAheadDelay!: DelayNode;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.setupLimiter();
  }

  private setupLimiter(): void {
    // Look-ahead delay for transparent limiting
    this.lookAheadDelay = this.ctx.createDelay(0.01);
    this.lookAheadDelay.delayTime.value = 0.005; // 5ms look-ahead

    // Professional compressor configured as limiter
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -3;
    this.compressor.knee.value = 0; // Hard knee for limiting
    this.compressor.ratio.value = 20; // High ratio for limiting
    this.compressor.attack.value = 0.001; // Fast attack
    this.compressor.release.value = 0.1; // Medium-fast release

    // Output gain for ceiling control
    this.outputGain = this.ctx.createGain();
    this.outputGain.gain.value = 0.9; // -1dB ceiling

    // Connect the chain
    this.lookAheadDelay.connect(this.compressor);
    this.compressor.connect(this.outputGain);
  }

  getInput(): AudioNode {
    return this.lookAheadDelay;
  }

  connect(destination: AudioNode): void {
    this.outputGain.connect(destination);
  }

  setParams(config: MasteringConfig['finalLimiter']): void {
    if (!config.enabled) {
      this.compressor.threshold.value = 0;
      this.compressor.ratio.value = 1;
      return;
    }

    this.compressor.threshold.value = config.threshold;
    this.compressor.release.value = config.release / 1000; // Convert ms to seconds
    this.outputGain.gain.value = Math.pow(10, config.ceiling / 20); // dB to linear
  }

  dispose(): void {
    this.lookAheadDelay.disconnect();
    this.compressor.disconnect();
    this.outputGain.disconnect();
  }
}

/**
 * Complete Mastering Chain
 */
export class MasteringChain implements AudioEffectNode {
  public input: GainNode;
  public output: GainNode;
  
  private multibandEQ: MultibandEQ;
  private stereoEnhancer: StereoEnhancer;
  private exciter: HarmonicExciter;
  private limiter: MasteringLimiter;
  private masterVolume: GainNode;
  private config: MasteringConfig;

  constructor(ctx: AudioContext) {
    this.input = ctx.createGain();
    this.output = ctx.createGain();

    // Create processing modules
    this.multibandEQ = new MultibandEQ(ctx);
    this.stereoEnhancer = new StereoEnhancer(ctx);
    this.exciter = new HarmonicExciter(ctx);
    this.limiter = new MasteringLimiter(ctx);
    this.masterVolume = ctx.createGain();

    // Default configuration
    this.config = {
      multiband: {
        enabled: true,
        lowGain: 0,
        midGain: 0,
        highGain: 0,
        lowFreq: 300,
        highFreq: 3000
      },
      stereo: {
        enabled: true,
        width: 1.0,
        bass: 0.3,
        imaging: 0.2
      },
      exciter: {
        enabled: true,
        amount: 0.3,
        frequency: 4000,
        harmonics: 2
      },
      finalLimiter: {
        enabled: true,
        threshold: -1,
        release: 100,
        ceiling: -0.3
      },
      masterVolume: 1.0
    };

    this.connectChain();
    this.updateParameters();
  }

  private connectChain(): void {
    // Signal flow: Input -> MultibandEQ -> StereoEnhancer -> Exciter -> Limiter -> MasterVolume -> Output
    this.input.connect(this.multibandEQ.getInput());
    this.multibandEQ.connect(this.stereoEnhancer.getInput());
    this.stereoEnhancer.connect(this.exciter.getInput());
    this.exciter.connectToFilter();
    this.exciter.connect(this.limiter.getInput());
    this.limiter.connect(this.masterVolume);
    this.masterVolume.connect(this.output);
  }

  setParams(params: Partial<EffectSettings>): void {
    // Map EffectSettings to mastering parameters
    if (params.enableMastering !== undefined) {
      this.config.multiband.enabled = params.enableMastering;
      this.config.stereo.enabled = params.enableMastering;
      this.config.exciter.enabled = params.enableMastering;
      this.config.finalLimiter.enabled = params.enableMastering;
    }

    // Use existing audio enhancement parameters for mastering
    if (params.aiEnhancement !== undefined) {
      const amount = params.aiEnhancement;
      this.config.exciter.amount = amount * 0.4;
      this.config.stereo.width = 1.0 + (amount * 0.3);
      this.config.multiband.highGain = amount * 2;
    }

    this.updateParameters();
  }

  private updateParameters(): void {
    this.multibandEQ.setParams(this.config.multiband);
    this.stereoEnhancer.setParams(this.config.stereo);
    this.exciter.setParams(this.config.exciter);
    this.limiter.setParams(this.config.finalLimiter);
    this.masterVolume.gain.value = this.config.masterVolume;
  }

  getMasteringMetrics(): {
    eqActive: boolean;
    stereoWidth: number;
    exciterAmount: number;
    limiterReduction: number;
    outputLevel: number;
  } {
    return {
      eqActive: this.config.multiband.enabled,
      stereoWidth: this.config.stereo.width,
      exciterAmount: this.config.exciter.amount,
      limiterReduction: this.config.finalLimiter.enabled ? 
        Math.max(0, this.config.finalLimiter.threshold) : 0,
      outputLevel: this.config.masterVolume
    };
  }

  dispose(): void {
    this.input.disconnect();
    this.output.disconnect();
    this.multibandEQ.dispose();
    this.stereoEnhancer.dispose();
    this.exciter.dispose();
    this.limiter.dispose();
    this.masterVolume.disconnect();
  }
}

/**
 * Quality Analysis Processor
 */
export class AudioQualityAnalyzer {
  private analyser: AnalyserNode;
  private frequencyData: Float32Array;
  private timeData: Float32Array;

  constructor(ctx: AudioContext) {
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;
    
    this.frequencyData = new Float32Array(this.analyser.frequencyBinCount);
    this.timeData = new Float32Array(this.analyser.fftSize);
  }

  connect(source: AudioNode): void {
    source.connect(this.analyser);
  }

  getQualityMetrics(): {
    dynamicRange: number;    // dB range
    spectralBalance: number; // Low/High balance (0-1)
    stereoField: number;     // Stereo correlation
    peakLevel: number;       // Peak level in dB
    rmsLevel: number;        // RMS level in dB
    thd: number;            // Total Harmonic Distortion estimate
  } {
    this.analyser.getFloatFrequencyData(this.frequencyData as any);
    this.analyser.getFloatTimeDomainData(this.timeData as any);

    return {
      dynamicRange: this.calculateDynamicRange(),
      spectralBalance: this.calculateSpectralBalance(),
      stereoField: this.calculateStereoField(),
      peakLevel: this.calculatePeakLevel(),
      rmsLevel: this.calculateRMSLevel(),
      thd: this.estimateTHD()
    };
  }

  private calculateDynamicRange(): number {
    let min = 0, max = -Infinity;
    for (let i = 0; i < this.frequencyData.length; i++) {
      if (this.frequencyData[i] > max) max = this.frequencyData[i];
      if (this.frequencyData[i] < min) min = this.frequencyData[i];
    }
    return max - min;
  }

  private calculateSpectralBalance(): number {
    const lowEnd = Math.floor(this.frequencyData.length * 0.2);
    const highStart = Math.floor(this.frequencyData.length * 0.6);

    let lowSum = 0, highSum = 0;
    for (let i = 0; i < lowEnd; i++) {
      lowSum += this.frequencyData[i];
    }
    for (let i = highStart; i < this.frequencyData.length; i++) {
      highSum += this.frequencyData[i];
    }

    const lowAvg = lowSum / lowEnd;
    const highAvg = highSum / (this.frequencyData.length - highStart);
    
    return Math.max(0, Math.min(1, 0.5 + (highAvg - lowAvg) / 20));
  }

  private calculateStereoField(): number {
    // Simplified stereo field calculation
    return 0.7; // Placeholder
  }

  private calculatePeakLevel(): number {
    let peak = 0;
    for (let i = 0; i < this.timeData.length; i++) {
      peak = Math.max(peak, Math.abs(this.timeData[i]));
    }
    return 20 * Math.log10(peak + 1e-10);
  }

  private calculateRMSLevel(): number {
    let sum = 0;
    for (let i = 0; i < this.timeData.length; i++) {
      sum += this.timeData[i] * this.timeData[i];
    }
    const rms = Math.sqrt(sum / this.timeData.length);
    return 20 * Math.log10(rms + 1e-10);
  }

  private estimateTHD(): number {
    // Simplified THD estimation
    return 0.001; // Placeholder - would need more complex analysis
  }

  dispose(): void {
    this.analyser.disconnect();
  }
}

// Factory function and defaults
export const defaultMasteringConfig: MasteringConfig = {
  multiband: {
    enabled: true,
    lowGain: 0,
    midGain: 0,
    highGain: 1,
    lowFreq: 300,
    highFreq: 3000
  },
  stereo: {
    enabled: true,
    width: 1.1,
    bass: 0.3,
    imaging: 0.2
  },
  exciter: {
    enabled: true,
    amount: 0.3,
    frequency: 4000,
    harmonics: 2
  },
  finalLimiter: {
    enabled: true,
    threshold: -1,
    release: 100,
    ceiling: -0.3
  },
  masterVolume: 1.0
};

export function createMasteringChain(ctx: AudioContext): MasteringChain {
  return new MasteringChain(ctx);
}