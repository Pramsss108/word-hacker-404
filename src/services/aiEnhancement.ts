/**
 * M5 - AI Enhancement Engine
 * Advanced AI-powered voice processing with adaptive algorithms
 * NASA-grade intelligent audio enhancement
 */

import { AudioEffectNode } from './engineCore';
import { EffectSettings } from './audioService';

export interface AIEnhancementConfig {
  clarity: number;        // Voice clarity enhancement (0-1)
  presence: number;       // Voice presence boost (0-1)
  warmth: number;         // Warmth and richness (0-1)
  intelligibility: number; // Speech intelligibility (0-1)
  adaptiveMode: boolean;   // Enable adaptive processing
  voiceType: 'male' | 'female' | 'auto'; // Voice type detection
}

export interface VoiceProfile {
  fundamentalFreq: number;    // F0 frequency
  formantFreqs: number[];     // Formant frequencies
  spectralCentroid: number;   // Brightness measure
  harmonicRatio: number;      // Voice quality measure
  voiceType: 'male' | 'female' | 'unknown';
}

export interface AIProcessorMetrics {
  voiceActivityDetection: number; // VAD confidence (0-1)
  spectralClarity: number;        // Clarity measure (0-1)
  harmonicStrength: number;       // Harmonic content (0-1)
  noiseLevel: number;            // Background noise estimate (0-1)
  processingLatency: number;      // AI processing time (ms)
}

/**
 * AI Voice Profile Analyzer
 * Analyzes voice characteristics for adaptive processing
 */
class AIVoiceAnalyzer {
  private sampleRate: number;
  private frameSize: number;
  private window: Float32Array;

  constructor(sampleRate: number = 48000) {
    this.sampleRate = sampleRate;
    this.frameSize = 2048;
    this.window = this.createHannWindow(this.frameSize);
  }

  /**
   * Analyze voice profile from audio buffer
   */
  analyzeVoiceProfile(audioBuffer: AudioBuffer): VoiceProfile {
    const channelData = audioBuffer.getChannelData(0);
    
    // Extract features
    const fundamentalFreq = this.estimateFundamentalFrequency(channelData);
    const formantFreqs = this.extractFormants(channelData);
    const spectralCentroid = this.computeSpectralCentroid(channelData);
    const harmonicRatio = this.computeHarmonicRatio(channelData);
    const voiceType = this.classifyVoiceType(fundamentalFreq, formantFreqs);

    return {
      fundamentalFreq,
      formantFreqs,
      spectralCentroid,
      harmonicRatio,
      voiceType
    };
  }

  /**
   * Estimate fundamental frequency using autocorrelation
   */
  private estimateFundamentalFrequency(signal: Float32Array): number {
    const minPeriod = Math.floor(this.sampleRate / 800); // 800 Hz max
    const maxPeriod = Math.floor(this.sampleRate / 50);  // 50 Hz min
    
    let maxCorrelation = 0;
    let bestPeriod = minPeriod;

    for (let period = minPeriod; period < maxPeriod; period++) {
      let correlation = 0;
      let count = 0;

      for (let i = 0; i < signal.length - period; i++) {
        correlation += signal[i] * signal[i + period];
        count++;
      }

      correlation /= count;
      
      if (correlation > maxCorrelation) {
        maxCorrelation = correlation;
        bestPeriod = period;
      }
    }

    return this.sampleRate / bestPeriod;
  }

  /**
   * Extract formant frequencies using LPC analysis
   */
  private extractFormants(signal: Float32Array): number[] {
    // Simplified formant extraction using spectral peaks
    const fft = this.computeFFT(signal);
    const spectrum = this.computePowerSpectrum(fft);
    
    return this.findSpectralPeaks(spectrum, 4); // First 4 formants
  }

  /**
   * Compute spectral centroid (brightness measure)
   */
  private computeSpectralCentroid(signal: Float32Array): number {
    const fft = this.computeFFT(signal);
    const spectrum = this.computePowerSpectrum(fft);
    
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < spectrum.length; i++) {
      const freq = (i * this.sampleRate) / (2 * spectrum.length);
      numerator += freq * spectrum[i];
      denominator += spectrum[i];
    }

    return denominator > 0 ? numerator / denominator : 0;
  }

  /**
   * Compute harmonic-to-noise ratio
   */
  private computeHarmonicRatio(signal: Float32Array): number {
    const f0 = this.estimateFundamentalFrequency(signal);
    const fft = this.computeFFT(signal);
    const spectrum = this.computePowerSpectrum(fft);
    
    let harmonicEnergy = 0;
    let totalEnergy = 0;

    for (let i = 0; i < spectrum.length; i++) {
      totalEnergy += spectrum[i];
      
      const freq = (i * this.sampleRate) / (2 * spectrum.length);
      const harmonicNumber = Math.round(freq / f0);
      
      if (Math.abs(freq - harmonicNumber * f0) < f0 * 0.1) {
        harmonicEnergy += spectrum[i];
      }
    }

    return totalEnergy > 0 ? harmonicEnergy / totalEnergy : 0;
  }

  /**
   * Classify voice type based on features
   */
  private classifyVoiceType(f0: number, formants: number[]): 'male' | 'female' | 'unknown' {
    if (formants.length < 2) return 'unknown';

    // Simple classification based on F0 and first two formants
    if (f0 < 130 && formants[0] < 500) {
      return 'male';
    } else if (f0 > 180 && formants[0] > 500) {
      return 'female';
    }
    
    return 'unknown';
  }

  // Helper methods
  private createHannWindow(size: number): Float32Array {
    const window = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (size - 1)));
    }
    return window;
  }

  private computeFFT(signal: Float32Array): Float32Array {
    // Simplified FFT implementation (would use optimized version in production)
    const N = signal.length;
    const result = new Float32Array(N * 2); // Complex numbers (real, imag)
    
    // Apply window
    const windowed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      windowed[i] = signal[i] * this.window[i % this.window.length];
    }

    // Simple DFT for demonstration
    for (let k = 0; k < N; k++) {
      let real = 0, imag = 0;
      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N;
        real += windowed[n] * Math.cos(angle);
        imag += windowed[n] * Math.sin(angle);
      }
      result[k * 2] = real;
      result[k * 2 + 1] = imag;
    }

    return result;
  }

  private computePowerSpectrum(fft: Float32Array): Float32Array {
    const spectrum = new Float32Array(fft.length / 2);
    for (let i = 0; i < spectrum.length; i++) {
      const real = fft[i * 2];
      const imag = fft[i * 2 + 1];
      spectrum[i] = real * real + imag * imag;
    }
    return spectrum;
  }

  private findSpectralPeaks(spectrum: Float32Array, numPeaks: number): number[] {
    const peaks: Array<{freq: number, magnitude: number}> = [];
    
    for (let i = 1; i < spectrum.length - 1; i++) {
      if (spectrum[i] > spectrum[i - 1] && spectrum[i] > spectrum[i + 1]) {
        const freq = (i * this.sampleRate) / (2 * spectrum.length);
        peaks.push({ freq, magnitude: spectrum[i] });
      }
    }

    // Sort by magnitude and return top peaks
    peaks.sort((a, b) => b.magnitude - a.magnitude);
    return peaks.slice(0, numPeaks).map(peak => peak.freq);
  }
}

/**
 * AI-Powered Voice Enhancer
 * Applies intelligent enhancements based on voice analysis
 */
class AIVoiceEnhancer {
  private ctx: AudioContext;
  private analyzer: AIVoiceAnalyzer;
  private voiceProfile: VoiceProfile | null = null;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.analyzer = new AIVoiceAnalyzer(ctx.sampleRate);
  }

  /**
   * Enhance audio buffer using AI algorithms
   */
  async enhanceAudio(
    audioBuffer: AudioBuffer,
    config: AIEnhancementConfig
  ): Promise<AudioBuffer> {
    // Analyze voice profile if adaptive mode is enabled
    if (config.adaptiveMode) {
      this.voiceProfile = this.analyzer.analyzeVoiceProfile(audioBuffer);
      console.log('M5: Voice profile analyzed:', this.voiceProfile);
    }

    // Create enhanced buffer
    const enhancedBuffer = this.ctx.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    // Process each channel
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel);
      const outputData = enhancedBuffer.getChannelData(channel);
      
      // Apply AI enhancements
      this.applyClarityEnhancement(inputData, outputData, config.clarity);
      this.applyPresenceBoost(outputData, config.presence);
      this.applyWarmthEnhancement(outputData, config.warmth);
      this.applyIntelligibilityBoost(outputData, config.intelligibility);
    }

    return enhancedBuffer;
  }

  /**
   * Apply clarity enhancement using adaptive filtering
   */
  private applyClarityEnhancement(
    input: Float32Array,
    output: Float32Array,
    amount: number
  ): void {
    if (amount === 0) {
      output.set(input);
      return;
    }

    // Adaptive high-frequency enhancement based on voice profile
    const enhancementFreq = this.voiceProfile ? 
      this.voiceProfile.spectralCentroid * 1.5 : 3000;
    
    // Simple high-shelf filter for clarity
    const gain = 1 + amount * 0.5;
    const a = Math.exp(-2 * Math.PI * enhancementFreq / this.ctx.sampleRate);
    
    let y1 = 0;
    let x1 = 0;

    for (let i = 0; i < input.length; i++) {
      const x0 = input[i];
      const y0 = gain * x0 + (gain - 1) * a * x1 - a * y1;
      
      output[i] = y0;
      x1 = x0;
      y1 = y0;
    }
  }

  /**
   * Apply presence boost for vocal forward-ness
   */
  private applyPresenceBoost(data: Float32Array, amount: number): void {
    if (amount === 0) return;

    // Presence boost around 2-5kHz
    const centerFreq = this.voiceProfile ? 
      this.voiceProfile.formantFreqs[1] || 2500 : 2500;
    
    const gain = 1 + amount * 0.3;
    const q = 2.0;
    const w = 2 * Math.PI * centerFreq / this.ctx.sampleRate;
    const cosw = Math.cos(w);
    const alpha = Math.sin(w) / (2 * q);
    
    // Peaking EQ coefficients
    const A = Math.sqrt(gain);
    const b0 = 1 + alpha * A;
    const b1 = -2 * cosw;
    const b2 = 1 - alpha * A;
    const a0 = 1 + alpha / A;
    const a1 = -2 * cosw;
    const a2 = 1 - alpha / A;

    // Apply filter
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

    for (let i = 0; i < data.length; i++) {
      const x0 = data[i];
      const y0 = (b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
      
      data[i] = y0;
      x2 = x1; x1 = x0;
      y2 = y1; y1 = y0;
    }
  }

  /**
   * Apply warmth enhancement using low-frequency enhancement
   */
  private applyWarmthEnhancement(data: Float32Array, amount: number): void {
    if (amount === 0) return;

    // Low-frequency warmth around 100-300Hz
    const centerFreq = this.voiceProfile ? 
      this.voiceProfile.fundamentalFreq * 2 : 200;
    
    const gain = 1 + amount * 0.4;
    const a = Math.exp(-2 * Math.PI * centerFreq / this.ctx.sampleRate);
    
    let y1 = 0;

    for (let i = 0; i < data.length; i++) {
      const y0 = data[i] + a * y1;
      data[i] = y0 * gain;
      y1 = y0;
    }
  }

  /**
   * Apply intelligibility boost for speech clarity
   */
  private applyIntelligibilityBoost(data: Float32Array, amount: number): void {
    if (amount === 0) return;

    // Multi-band enhancement for speech intelligibility
    const bands = [
      { freq: 1000, gain: 1 + amount * 0.2 },
      { freq: 2000, gain: 1 + amount * 0.3 },
      { freq: 4000, gain: 1 + amount * 0.4 }
    ];

    for (const band of bands) {
      const w = 2 * Math.PI * band.freq / this.ctx.sampleRate;
      const a = Math.exp(-w);
      
      let y1 = 0;
      for (let i = 0; i < data.length; i++) {
        const y0 = data[i] + a * y1;
        data[i] = y0 * band.gain;
        y1 = y0;
      }
    }
  }

  getVoiceProfile(): VoiceProfile | null {
    return this.voiceProfile;
  }
}

/**
 * AI Enhancement Node for Audio Graph
 */
export class AIEnhancementNode implements AudioEffectNode {
  public input: GainNode;
  public output: GainNode;
  private enhancer: AIVoiceEnhancer;
  private config: AIEnhancementConfig;

  constructor(ctx: AudioContext) {
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.enhancer = new AIVoiceEnhancer(ctx);
    
    // Default configuration
    this.config = {
      clarity: 0.7,
      presence: 0.5,
      warmth: 0.3,
      intelligibility: 0.8,
      adaptiveMode: true,
      voiceType: 'auto'
    };

    // Connect input to output (bypass by default)
    this.input.connect(this.output);
  }

  setParams(params: Partial<EffectSettings>): void {
    // Extract AI enhancement parameters from EffectSettings
    if (params.aiEnhancement !== undefined) {
      this.config.clarity = params.aiEnhancement;
      this.config.presence = params.aiEnhancement * 0.7;
      this.config.warmth = params.aiEnhancement * 0.4;
      this.config.intelligibility = params.aiEnhancement * 1.1;
    }
    if (params.enableAIEnhancement !== undefined) {
      // Enable/disable adaptive mode based on toggle
      this.config.adaptiveMode = params.enableAIEnhancement;
    }
  }

  async processBuffer(audioBuffer: AudioBuffer): Promise<AudioBuffer> {
    return await this.enhancer.enhanceAudio(audioBuffer, this.config);
  }

  getVoiceProfile(): VoiceProfile | null {
    return this.enhancer.getVoiceProfile();
  }

  dispose(): void {
    this.input.disconnect();
    this.output.disconnect();
  }
}

/**
 * AI Processing Metrics Monitor
 */
export class AIMetricsMonitor {
  private metrics: AIProcessorMetrics;

  constructor() {
    this.metrics = {
      voiceActivityDetection: 0,
      spectralClarity: 0,
      harmonicStrength: 0,
      noiseLevel: 0,
      processingLatency: 0
    };
  }

  updateMetrics(audioBuffer: AudioBuffer, processingTime: number): void {
    const channelData = audioBuffer.getChannelData(0);
    
    this.metrics.voiceActivityDetection = this.computeVAD(channelData);
    this.metrics.spectralClarity = this.computeSpectralClarity(channelData);
    this.metrics.harmonicStrength = this.computeHarmonicStrength(channelData);
    this.metrics.noiseLevel = this.computeNoiseLevel(channelData);
    this.metrics.processingLatency = processingTime;
  }

  getMetrics(): AIProcessorMetrics {
    return { ...this.metrics };
  }

  private computeVAD(signal: Float32Array): number {
    // Simple energy-based voice activity detection
    let energy = 0;
    for (let i = 0; i < signal.length; i++) {
      energy += signal[i] * signal[i];
    }
    energy /= signal.length;
    
    return Math.min(1, energy * 10); // Normalize to 0-1
  }

  private computeSpectralClarity(signal: Float32Array): number {
    // Measure of spectral clarity (high-frequency content)
    let highFreqEnergy = 0;
    let totalEnergy = 0;
    
    for (let i = 0; i < signal.length; i++) {
      const sample = signal[i];
      totalEnergy += sample * sample;
      
      // Simple high-pass for clarity estimation
      if (i > 0) {
        const highFreq = sample - signal[i - 1];
        highFreqEnergy += highFreq * highFreq;
      }
    }
    
    return totalEnergy > 0 ? Math.min(1, highFreqEnergy / totalEnergy) : 0;
  }

  private computeHarmonicStrength(signal: Float32Array): number {
    // Simple harmonic strength estimation using autocorrelation
    let maxCorrelation = 0;
    const maxLag = Math.min(1000, Math.floor(signal.length / 4));
    
    for (let lag = 50; lag < maxLag; lag++) {
      let correlation = 0;
      for (let i = 0; i < signal.length - lag; i++) {
        correlation += signal[i] * signal[i + lag];
      }
      correlation = Math.abs(correlation) / (signal.length - lag);
      maxCorrelation = Math.max(maxCorrelation, correlation);
    }
    
    return Math.min(1, maxCorrelation);
  }

  private computeNoiseLevel(signal: Float32Array): number {
    // Estimate noise level using minimum statistics
    const sorted = Array.from(signal).map(Math.abs).sort((a, b) => a - b);
    const percentile10 = sorted[Math.floor(sorted.length * 0.1)];
    
    return Math.min(1, percentile10 * 20); // Normalize noise estimate
  }
}

// Export default configuration and factory function
export const defaultAIConfig: AIEnhancementConfig = {
  clarity: 0.7,
  presence: 0.5,
  warmth: 0.3,
  intelligibility: 0.8,
  adaptiveMode: true,
  voiceType: 'auto'
};

export function createAIEnhancement(ctx: AudioContext): AIEnhancementNode {
  return new AIEnhancementNode(ctx);
}