/**
 * M7: Export & Presets System
 * Professional audio export with multiple formats and preset management
 */

import { EffectSettings } from './audioService';

// Export format configurations
export interface ExportFormat {
  id: string;
  name: string;
  extension: string;
  mimeType: string;
  description: string;
  quality: ExportQuality[];
}

export interface ExportQuality {
  id: string;
  name: string;
  bitrate?: number;      // For compressed formats (kbps)
  sampleRate: number;    // Hz
  bitDepth?: number;     // For uncompressed formats
  channels: number;
}

export interface ExportOptions {
  format: string;        // Format ID
  quality: string;       // Quality ID
  normalize: boolean;    // Normalize audio levels
  fadeIn: number;        // Fade in duration (seconds)
  fadeOut: number;       // Fade out duration (seconds)
  trimSilence: boolean;  // Remove silence from start/end
}

export interface AudioPreset {
  id: string;
  name: string;
  description: string;
  category: PresetCategory;
  settings: EffectSettings;
  author: string;
  createdAt: Date;
  tags: string[];
  favorite: boolean;
}

export enum PresetCategory {
  VOICE_ENHANCEMENT = 'voice-enhancement',
  VOCAL_EFFECTS = 'vocal-effects',
  CREATIVE = 'creative',
  MASTERING = 'mastering',
  CUSTOM = 'custom',
  AI_GENERATED = 'ai-generated'
}

// Export formats configuration
export const EXPORT_FORMATS: ExportFormat[] = [
  {
    id: 'wav',
    name: 'WAV (Uncompressed)',
    extension: 'wav',
    mimeType: 'audio/wav',
    description: 'Highest quality, larger file size',
    quality: [
      { id: 'studio', name: 'Studio (48kHz/24-bit)', sampleRate: 48000, bitDepth: 24, channels: 2 },
      { id: 'broadcast', name: 'Broadcast (48kHz/16-bit)', sampleRate: 48000, bitDepth: 16, channels: 2 },
      { id: 'cd', name: 'CD Quality (44.1kHz/16-bit)', sampleRate: 44100, bitDepth: 16, channels: 2 },
    ]
  },
  {
    id: 'mp3',
    name: 'MP3 (Compressed)',
    extension: 'mp3',
    mimeType: 'audio/mpeg',
    description: 'Good quality, smaller file size',
    quality: [
      { id: 'high', name: 'High Quality (320 kbps)', bitrate: 320, sampleRate: 44100, channels: 2 },
      { id: 'standard', name: 'Standard (192 kbps)', bitrate: 192, sampleRate: 44100, channels: 2 },
      { id: 'voice', name: 'Voice Optimized (128 kbps)', bitrate: 128, sampleRate: 44100, channels: 1 },
    ]
  },
  {
    id: 'aac',
    name: 'AAC (Advanced Audio)',
    extension: 'm4a',
    mimeType: 'audio/mp4',
    description: 'Better compression than MP3',
    quality: [
      { id: 'high', name: 'High Quality (256 kbps)', bitrate: 256, sampleRate: 44100, channels: 2 },
      { id: 'standard', name: 'Standard (128 kbps)', bitrate: 128, sampleRate: 44100, channels: 2 },
      { id: 'voice', name: 'Voice Optimized (96 kbps)', bitrate: 96, sampleRate: 44100, channels: 1 },
    ]
  }
];

// Built-in presets
export const BUILT_IN_PRESETS: AudioPreset[] = [
  {
    id: 'voice-clarity',
    name: '🎯 Voice Clarity Boost',
    description: 'Enhance speech intelligibility and presence',
    category: PresetCategory.VOICE_ENHANCEMENT,
    settings: {
      // Effect Values
      pitchShift: 0,
      distortion: 0,
      reverbMix: 0.1,
      delayTime: 0.05,
      delayFeedback: 0.1,
      lowpassFreq: 12000,
      highpassFreq: 80,
      aiEnhancement: 0.8,
      noiseReduction: 0.7,
  aiModelSize: 'tiny',
      
      // WASM Performance
      enableWASM: true,
      wasmBlockSize: 2048,
      
      // Effect Toggles
      enablePitchShift: false,
      enableDistortion: false,
      enableReverb: true,
      enableDelay: true,
      enableLowpass: true,
      enableHighpass: true,
      enableAIEnhancement: true,
      enableNoiseReduction: true,
      enableMastering: true,
    },
    author: 'Word Hacker 404',
    createdAt: new Date(),
    tags: ['voice', 'clarity', 'speech'],
    favorite: false
  },
  {
    id: 'podcast-master',
    name: '🎙️ Podcast Master',
    description: 'Professional podcast voice processing',
    category: PresetCategory.MASTERING,
    settings: {
      // Effect Values
      pitchShift: 0,
      distortion: 0,
      reverbMix: 0.05,
      delayTime: 0.02,
      delayFeedback: 0.05,
      lowpassFreq: 15000,
      highpassFreq: 100,
      aiEnhancement: 0.6,
      noiseReduction: 0.8,
  aiModelSize: 'tiny',
      
      // WASM Performance
      enableWASM: true,
      wasmBlockSize: 4096,
      
      // Effect Toggles
      enablePitchShift: false,
      enableDistortion: false,
      enableReverb: true,
      enableDelay: false,
      enableLowpass: true,
      enableHighpass: true,
      enableAIEnhancement: true,
      enableNoiseReduction: true,
      enableMastering: true,
    },
    author: 'Word Hacker 404',
    createdAt: new Date(),
    tags: ['podcast', 'broadcast', 'professional'],
    favorite: true
  },
  {
    id: 'creative-voice',
    name: '🎨 Creative Voice FX',
    description: 'Dramatic voice transformation effects',
    category: PresetCategory.CREATIVE,
    settings: {
      // Effect Values
      pitchShift: -3,
      distortion: 0.3,
      reverbMix: 0.4,
      delayTime: 0.15,
      delayFeedback: 0.25,
      lowpassFreq: 8000,
      highpassFreq: 150,
      aiEnhancement: 0.4,
      noiseReduction: 0.5,
  aiModelSize: 'medium',
      
      // WASM Performance
      enableWASM: true,
      wasmBlockSize: 2048,
      
      // Effect Toggles
      enablePitchShift: true,
      enableDistortion: true,
      enableReverb: true,
      enableDelay: true,
      enableLowpass: true,
      enableHighpass: true,
      enableAIEnhancement: true,
      enableNoiseReduction: true,
      enableMastering: true,
    },
    author: 'Word Hacker 404',
    createdAt: new Date(),
    tags: ['creative', 'fx', 'dramatic'],
    favorite: false
  },
  {
    id: 'ai-enhance',
    name: '🤖 AI Enhancement Pro',
    description: 'Maximum AI-powered voice enhancement',
    category: PresetCategory.AI_GENERATED,
    settings: {
      // Effect Values
      pitchShift: 0,
      distortion: 0,
      reverbMix: 0.2,
      delayTime: 0.08,
      delayFeedback: 0.15,
      lowpassFreq: 18000,
      highpassFreq: 60,
      aiEnhancement: 1.0,
      noiseReduction: 0.9,
  aiModelSize: 'large',
      
      // WASM Performance
      enableWASM: true,
      wasmBlockSize: 2048,
      
      // Effect Toggles
      enablePitchShift: false,
      enableDistortion: false,
      enableReverb: true,
      enableDelay: true,
      enableLowpass: true,
      enableHighpass: true,
      enableAIEnhancement: true,
      enableNoiseReduction: true,
      enableMastering: true,
    },
    author: 'Word Hacker 404',
    createdAt: new Date(),
    tags: ['ai', 'enhancement', 'automatic'],
    favorite: true
  }
];

/**
 * Export Service - Handles audio export in multiple formats
 */
export class AudioExportService {
  private static instance: AudioExportService;

  static getInstance(): AudioExportService {
    if (!AudioExportService.instance) {
      AudioExportService.instance = new AudioExportService();
    }
    return AudioExportService.instance;
  }

  /**
   * Export audio buffer with specified options
   */
  async exportAudio(
    audioBuffer: AudioBuffer, 
    options: ExportOptions,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    const format = EXPORT_FORMATS.find(f => f.id === options.format);
    if (!format) {
      throw new Error(`Unsupported export format: ${options.format}`);
    }

    const quality = format.quality.find(q => q.id === options.quality);
    if (!quality) {
      throw new Error(`Unsupported quality option: ${options.quality}`);
    }

    // Apply post-processing options
    let processedBuffer = audioBuffer;

    if (onProgress) onProgress(0.1);

    // Normalize audio if requested
    if (options.normalize) {
      processedBuffer = this.normalizeAudio(processedBuffer);
    }

    if (onProgress) onProgress(0.3);

    // Apply fade in/out
    if (options.fadeIn > 0 || options.fadeOut > 0) {
      processedBuffer = this.applyFades(processedBuffer, options.fadeIn, options.fadeOut);
    }

    if (onProgress) onProgress(0.5);

    // Trim silence if requested
    if (options.trimSilence) {
      processedBuffer = this.trimSilence(processedBuffer);
    }

    if (onProgress) onProgress(0.7);

    // Convert to target format
    const blob = await this.convertToFormat(processedBuffer, format, quality);

    if (onProgress) onProgress(1.0);

    return blob;
  }

  /**
   * Normalize audio to prevent clipping
   */
  private normalizeAudio(buffer: AudioBuffer): AudioBuffer {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const normalizedBuffer = ctx.createBuffer(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );

    // Find peak level across all channels
    let peak = 0;
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < channelData.length; i++) {
        peak = Math.max(peak, Math.abs(channelData[i]));
      }
    }

    // Apply normalization (leave 0.3dB headroom)
    const normalizeGain = peak > 0 ? 0.97 / peak : 1.0;

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const inputData = buffer.getChannelData(channel);
      const outputData = normalizedBuffer.getChannelData(channel);
      
      for (let i = 0; i < inputData.length; i++) {
        outputData[i] = inputData[i] * normalizeGain;
      }
    }

    return normalizedBuffer;
  }

  /**
   * Apply fade in and fade out
   */
  private applyFades(buffer: AudioBuffer, fadeInSec: number, fadeOutSec: number): AudioBuffer {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const fadedBuffer = ctx.createBuffer(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );

    const fadeInSamples = Math.floor(fadeInSec * buffer.sampleRate);
    const fadeOutSamples = Math.floor(fadeOutSec * buffer.sampleRate);

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const inputData = buffer.getChannelData(channel);
      const outputData = fadedBuffer.getChannelData(channel);
      
      for (let i = 0; i < inputData.length; i++) {
        let gain = 1.0;
        
        // Fade in
        if (i < fadeInSamples) {
          gain = i / fadeInSamples;
        }
        
        // Fade out
        if (i > inputData.length - fadeOutSamples) {
          const fadeOutGain = (inputData.length - i) / fadeOutSamples;
          gain = Math.min(gain, fadeOutGain);
        }
        
        outputData[i] = inputData[i] * gain;
      }
    }

    return fadedBuffer;
  }

  /**
   * Remove silence from start and end
   */
  private trimSilence(buffer: AudioBuffer): AudioBuffer {
    const threshold = 0.01; // Silence threshold
    
    // Find first non-silent sample
    let startSample = 0;
    outer: for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        if (Math.abs(buffer.getChannelData(channel)[i]) > threshold) {
          startSample = i;
          break outer;
        }
      }
    }

    // Find last non-silent sample
    let endSample = buffer.length;
    outer: for (let i = buffer.length - 1; i >= 0; i--) {
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        if (Math.abs(buffer.getChannelData(channel)[i]) > threshold) {
          endSample = i + 1;
          break outer;
        }
      }
    }

    // Create trimmed buffer
    const trimmedLength = endSample - startSample;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const trimmedBuffer = ctx.createBuffer(
      buffer.numberOfChannels,
      trimmedLength,
      buffer.sampleRate
    );

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const inputData = buffer.getChannelData(channel);
      const outputData = trimmedBuffer.getChannelData(channel);
      
      for (let i = 0; i < trimmedLength; i++) {
        outputData[i] = inputData[startSample + i];
      }
    }

    return trimmedBuffer;
  }

  /**
   * Convert buffer to specified format
   */
  private async convertToFormat(
    buffer: AudioBuffer, 
    format: ExportFormat, 
    quality: ExportQuality
  ): Promise<Blob> {
    switch (format.id) {
      case 'wav':
        return this.encodeWAV(buffer, quality);
      case 'mp3':
        return this.encodeMP3(buffer, quality);
      case 'aac':
        return this.encodeAAC(buffer, quality);
      default:
        throw new Error(`Unsupported format: ${format.id}`);
    }
  }

  /**
   * Encode as WAV
   */
  private encodeWAV(buffer: AudioBuffer, quality: ExportQuality): Blob {
    const channels = Math.min(buffer.numberOfChannels, quality.channels);
    const sampleRate = quality.sampleRate;
    const bitDepth = quality.bitDepth || 16;
    const bytesPerSample = bitDepth / 8;
    
    // Resample if needed
    const resampledBuffer = this.resampleBuffer(buffer, sampleRate);
    
    const length = resampledBuffer.length * channels * bytesPerSample;
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * bytesPerSample, true);
    view.setUint16(32, channels * bytesPerSample, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);
    
    // Audio data
    const maxValue = Math.pow(2, bitDepth - 1) - 1;
    let offset = 44;
    
    for (let i = 0; i < resampledBuffer.length; i++) {
      for (let channel = 0; channel < channels; channel++) {
        const channelData = resampledBuffer.getChannelData(Math.min(channel, resampledBuffer.numberOfChannels - 1));
        const sample = Math.max(-1, Math.min(1, channelData[i]));
        
        if (bitDepth === 16) {
          view.setInt16(offset, sample * maxValue, true);
          offset += 2;
        } else if (bitDepth === 24) {
          const intSample = Math.floor(sample * maxValue);
          view.setUint8(offset, intSample & 0xFF);
          view.setUint8(offset + 1, (intSample >> 8) & 0xFF);
          view.setUint8(offset + 2, (intSample >> 16) & 0xFF);
          offset += 3;
        }
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  /**
   * Encode as MP3 (placeholder - would need lame.js or similar)
   */
  private async encodeMP3(buffer: AudioBuffer, quality: ExportQuality): Promise<Blob> {
    // For now, convert to WAV as fallback
    // In production, would use lame.js or similar MP3 encoder
    console.warn('MP3 encoding not yet implemented, using WAV as fallback');
    return this.encodeWAV(buffer, {
      id: quality.id,
      name: quality.name,
      sampleRate: quality.sampleRate,
      bitDepth: 16,
      channels: quality.channels
    });
  }

  /**
   * Encode as AAC (placeholder - would need AAC encoder)
   */
  private async encodeAAC(buffer: AudioBuffer, quality: ExportQuality): Promise<Blob> {
    // For now, convert to WAV as fallback
    // In production, would use AAC encoder
    console.warn('AAC encoding not yet implemented, using WAV as fallback');
    return this.encodeWAV(buffer, {
      id: quality.id,
      name: quality.name,
      sampleRate: quality.sampleRate,
      bitDepth: 16,
      channels: quality.channels
    });
  }

  /**
   * Resample audio buffer to target sample rate
   */
  private resampleBuffer(buffer: AudioBuffer, targetSampleRate: number): AudioBuffer {
    if (buffer.sampleRate === targetSampleRate) {
      return buffer;
    }

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ratio = targetSampleRate / buffer.sampleRate;
    const newLength = Math.floor(buffer.length * ratio);
    
    const resampledBuffer = ctx.createBuffer(
      buffer.numberOfChannels,
      newLength,
      targetSampleRate
    );

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const inputData = buffer.getChannelData(channel);
      const outputData = resampledBuffer.getChannelData(channel);
      
      for (let i = 0; i < newLength; i++) {
        const sourceIndex = i / ratio;
        const index = Math.floor(sourceIndex);
        const fraction = sourceIndex - index;
        
        if (index + 1 < inputData.length) {
          // Linear interpolation
          outputData[i] = inputData[index] * (1 - fraction) + inputData[index + 1] * fraction;
        } else {
          outputData[i] = inputData[Math.min(index, inputData.length - 1)];
        }
      }
    }

    return resampledBuffer;
  }
}

/**
 * Preset Management Service
 */
export class PresetService {
  private static instance: PresetService;
  private presets: AudioPreset[] = [...BUILT_IN_PRESETS];

  static getInstance(): PresetService {
    if (!PresetService.instance) {
      PresetService.instance = new PresetService();
      PresetService.instance.loadPresets();
    }
    return PresetService.instance;
  }

  /**
   * Get all presets
   */
  getPresets(): AudioPreset[] {
    return this.presets;
  }

  /**
   * Get presets by category
   */
  getPresetsByCategory(category: PresetCategory): AudioPreset[] {
    return this.presets.filter(preset => preset.category === category);
  }

  /**
   * Get favorite presets
   */
  getFavoritePresets(): AudioPreset[] {
    return this.presets.filter(preset => preset.favorite);
  }

  /**
   * Create new preset
   */
  createPreset(name: string, description: string, settings: EffectSettings, category = PresetCategory.CUSTOM): AudioPreset {
    const preset: AudioPreset = {
      id: `custom-${Date.now()}`,
      name,
      description,
      category,
      settings: { ...settings },
      author: 'User',
      createdAt: new Date(),
      tags: [],
      favorite: false
    };

    this.presets.push(preset);
    this.savePresets();
    return preset;
  }

  /**
   * Update preset
   */
  updatePreset(id: string, updates: Partial<AudioPreset>): void {
    const index = this.presets.findIndex(p => p.id === id);
    if (index !== -1) {
      this.presets[index] = { ...this.presets[index], ...updates };
      this.savePresets();
    }
  }

  /**
   * Delete preset
   */
  deletePreset(id: string): void {
    // Don't allow deletion of built-in presets
    if (BUILT_IN_PRESETS.some(p => p.id === id)) {
      throw new Error('Cannot delete built-in preset');
    }

    this.presets = this.presets.filter(p => p.id !== id);
    this.savePresets();
  }

  /**
   * Toggle favorite status
   */
  toggleFavorite(id: string): void {
    const preset = this.presets.find(p => p.id === id);
    if (preset) {
      preset.favorite = !preset.favorite;
      this.savePresets();
    }
  }

  /**
   * Export preset to JSON
   */
  exportPreset(id: string): string {
    const preset = this.presets.find(p => p.id === id);
    if (!preset) {
      throw new Error('Preset not found');
    }
    return JSON.stringify(preset, null, 2);
  }

  /**
   * Import preset from JSON
   */
  importPreset(jsonData: string): AudioPreset {
    const preset = JSON.parse(jsonData) as AudioPreset;
    preset.id = `imported-${Date.now()}`;
    preset.createdAt = new Date();
    
    this.presets.push(preset);
    this.savePresets();
    return preset;
  }

  /**
   * Save presets to localStorage
   */
  private savePresets(): void {
    const customPresets = this.presets.filter(p => !BUILT_IN_PRESETS.some(bp => bp.id === p.id));
    localStorage.setItem('word-hacker-presets', JSON.stringify(customPresets));
  }

  /**
   * Load presets from localStorage
   */
  private loadPresets(): void {
    try {
      const saved = localStorage.getItem('word-hacker-presets');
      if (saved) {
        const customPresets = JSON.parse(saved) as AudioPreset[];
        this.presets = [...BUILT_IN_PRESETS, ...customPresets];
      }
    } catch (error) {
      console.warn('Failed to load presets:', error);
    }
  }
}

// Export service instances
export const exportService = AudioExportService.getInstance();
export const presetService = PresetService.getInstance();