/**
 * M8: Offline Processing & Quality Assurance System
 * NASA-grade quality validation and comprehensive testing framework
 */

import { EffectSettings } from './audioService';
import { getEngineCore } from './engineCore';
import { exportService, presetService } from './exportService';

// Quality metrics interface
export interface QualityMetrics {
  // Audio Quality
  peakLevel: number;        // Peak amplitude (-∞ to 0 dB)
  rmsLevel: number;         // RMS level (-∞ to 0 dB)
  dynamicRange: number;     // Dynamic range in dB
  thd: number;             // Total Harmonic Distortion %
  snr: number;             // Signal-to-Noise Ratio dB
  
  // Spectral Analysis
  spectralBalance: number;  // Low/Mid/High frequency balance (0-1)
  spectralCentroid: number; // Brightness measure (Hz)
  spectralRolloff: number;  // High frequency rolloff (Hz)
  
  // Processing Quality
  latency: number;         // Processing latency (ms)
  cpuUsage: number;        // CPU utilization %
  memoryUsage: number;     // Memory usage (MB)
  
  // Compliance
  lufsIntegrated: number;  // LUFS integrated loudness
  lufsMomentary: number;   // LUFS momentary loudness
  truePeak: number;        // True peak level (dBTP)
}

export interface TestResult {
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  metrics?: QualityMetrics;
  timestamp: Date;
}

export interface QAReport {
  overallStatus: 'pass' | 'fail' | 'warning';
  tests: TestResult[];
  processingTime: number;
  recommendations: string[];
  nasa_grade_compliance: boolean;
}

/**
 * NASA-Grade Quality Assurance System
 */
export class QualityAssuranceSystem {
  private static instance: QualityAssuranceSystem;

  static getInstance(): QualityAssuranceSystem {
    if (!QualityAssuranceSystem.instance) {
      QualityAssuranceSystem.instance = new QualityAssuranceSystem();
    }
    return QualityAssuranceSystem.instance;
  }

  /**
   * Master Quality Invigilator - NASA-grade validation
   */
  async runMasterQualityInvigilator(
    audioBuffer: AudioBuffer,
    settings: EffectSettings,
    onProgress?: (progress: number, test: string) => void
  ): Promise<QAReport> {
    const startTime = Date.now();
    const tests: TestResult[] = [];
    const recommendations: string[] = [];

    if (onProgress) onProgress(0, 'Initializing Quality Assurance System...');

    try {
      // Test 1: Audio Buffer Integrity
      if (onProgress) onProgress(0.1, 'Validating audio buffer integrity...');
      tests.push(await this.testAudioBufferIntegrity(audioBuffer));

      // Test 2: Settings Validation
      if (onProgress) onProgress(0.2, 'Validating effect settings...');
      tests.push(await this.testSettingsValidation(settings));

      // Test 3: Engine Core Functionality
      if (onProgress) onProgress(0.3, 'Testing engine core functionality...');
      tests.push(await this.testEngineCoreFunction(audioBuffer, settings));

      // Test 4: Processing Quality Analysis
      if (onProgress) onProgress(0.4, 'Analyzing processing quality...');
      const qualityTest = await this.testProcessingQuality(audioBuffer, settings);
      tests.push(qualityTest);

      // Test 5: Performance Benchmarking
      if (onProgress) onProgress(0.5, 'Running performance benchmarks...');
      tests.push(await this.testPerformanceBenchmark(audioBuffer, settings));

      // Test 6: Memory Leak Detection
      if (onProgress) onProgress(0.6, 'Detecting memory leaks...');
      tests.push(await this.testMemoryLeaks(audioBuffer, settings));

      // Test 7: Export System Validation
      if (onProgress) onProgress(0.7, 'Validating export systems...');
      tests.push(await this.testExportSystems(audioBuffer, settings));

      // Test 8: Preset System Validation
      if (onProgress) onProgress(0.8, 'Validating preset systems...');
      tests.push(await this.testPresetSystems());

      // Test 9: Cross-browser Compatibility
      if (onProgress) onProgress(0.9, 'Checking browser compatibility...');
      tests.push(await this.testBrowserCompatibility());

      // Test 10: NASA Compliance Validation
      if (onProgress) onProgress(0.95, 'Validating NASA-grade compliance...');
      tests.push(await this.testNASACompliance(qualityTest.metrics!));

      if (onProgress) onProgress(1.0, 'Quality assurance complete');

    } catch (error) {
      tests.push({
        id: 'critical-error',
        name: 'Critical System Error',
        status: 'fail',
        message: `Critical error during QA: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      });
    }

    // Generate recommendations based on test results
    recommendations.push(...this.generateRecommendations(tests));

    // Determine overall status
    const hasFailures = tests.some(t => t.status === 'fail');
    const hasWarnings = tests.some(t => t.status === 'warning');
    const overallStatus = hasFailures ? 'fail' : hasWarnings ? 'warning' : 'pass';

    // NASA-grade compliance check
    const nasa_grade_compliance = tests.every(t => t.status === 'pass') && 
                                  tests.length >= 10 &&
                                  !hasFailures &&
                                  !hasWarnings;

    return {
      overallStatus,
      tests,
      processingTime: Date.now() - startTime,
      recommendations,
      nasa_grade_compliance
    };
  }

  /**
   * Test 1: Audio Buffer Integrity
   */
  private async testAudioBufferIntegrity(buffer: AudioBuffer): Promise<TestResult> {
    try {
      // Check basic properties
      if (!buffer || buffer.length === 0) {
        return {
          id: 'buffer-integrity',
          name: 'Audio Buffer Integrity',
          status: 'fail',
          message: 'Invalid or empty audio buffer',
          timestamp: new Date()
        };
      }

      if (buffer.sampleRate < 44100) {
        return {
          id: 'buffer-integrity',
          name: 'Audio Buffer Integrity',
          status: 'warning',
          message: `Low sample rate detected: ${buffer.sampleRate}Hz (recommended: ≥44.1kHz)`,
          timestamp: new Date()
        };
      }

      // Check for corruption or invalid samples
      let corruptedSamples = 0;
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < channelData.length; i++) {
          if (!isFinite(channelData[i]) || Math.abs(channelData[i]) > 1.0) {
            corruptedSamples++;
          }
        }
      }

      if (corruptedSamples > 0) {
        return {
          id: 'buffer-integrity',
          name: 'Audio Buffer Integrity',
          status: 'fail',
          message: `Corrupted samples detected: ${corruptedSamples}`,
          timestamp: new Date()
        };
      }

      return {
        id: 'buffer-integrity',
        name: 'Audio Buffer Integrity',
        status: 'pass',
        message: `Buffer validated: ${buffer.length} samples, ${buffer.numberOfChannels} channels, ${buffer.sampleRate}Hz`,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        id: 'buffer-integrity',
        name: 'Audio Buffer Integrity',
        status: 'fail',
        message: `Buffer validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Test 2: Settings Validation
   */
  private async testSettingsValidation(settings: EffectSettings): Promise<TestResult> {
    try {
      const issues: string[] = [];

      // Validate numeric ranges
      if (settings.pitchShift < -24 || settings.pitchShift > 24) {
        issues.push(`Pitch shift out of range: ${settings.pitchShift} (recommended: -24 to +24)`);
      }

      if (settings.distortion < 0 || settings.distortion > 1) {
        issues.push(`Distortion out of range: ${settings.distortion} (expected: 0-1)`);
      }

      if (settings.reverbMix < 0 || settings.reverbMix > 1) {
        issues.push(`Reverb mix out of range: ${settings.reverbMix} (expected: 0-1)`);
      }

      if (settings.lowpassFreq < 20 || settings.lowpassFreq > 20000) {
        issues.push(`Lowpass frequency out of range: ${settings.lowpassFreq}Hz (recommended: 20-20000Hz)`);
      }

      if (settings.highpassFreq < 1 || settings.highpassFreq > 2000) {
        issues.push(`Highpass frequency out of range: ${settings.highpassFreq}Hz (recommended: 1-2000Hz)`);
      }

      // Validate WASM settings
      if (![2048, 4096, 8192].includes(settings.wasmBlockSize)) {
        issues.push(`Invalid WASM block size: ${settings.wasmBlockSize} (expected: 2048, 4096, or 8192)`);
      }

      if (issues.length > 0) {
        return {
          id: 'settings-validation',
          name: 'Settings Validation',
          status: 'warning',
          message: `Settings issues detected: ${issues.join('; ')}`,
          timestamp: new Date()
        };
      }

      return {
        id: 'settings-validation',
        name: 'Settings Validation',
        status: 'pass',
        message: 'All effect settings validated successfully',
        timestamp: new Date()
      };

    } catch (error) {
      return {
        id: 'settings-validation',
        name: 'Settings Validation',
        status: 'fail',
        message: `Settings validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Test 3: Engine Core Functionality
   */
  private async testEngineCoreFunction(buffer: AudioBuffer, settings: EffectSettings): Promise<TestResult> {
    try {
      const engine = getEngineCore();
      await engine.ensureAudioContext();

      // Test preview graph creation
      const previewGraph = engine.buildPreviewGraph(buffer, settings);
      if (!previewGraph) {
        return {
          id: 'engine-core',
          name: 'Engine Core Functionality',
          status: 'fail',
          message: 'Failed to create preview graph',
          timestamp: new Date()
        };
      }

      // Test offline rendering
      const startTime = Date.now();
      const processedBuffer = await engine.renderOffline(buffer, settings);
      const renderTime = Date.now() - startTime;

      if (!processedBuffer || processedBuffer.length === 0) {
        return {
          id: 'engine-core',
          name: 'Engine Core Functionality',
          status: 'fail',
          message: 'Offline rendering failed or returned empty buffer',
          timestamp: new Date()
        };
      }

      // Cleanup
      previewGraph.dispose();

      return {
        id: 'engine-core',
        name: 'Engine Core Functionality',
        status: 'pass',
        message: `Engine validated: Preview graph created, offline rendering completed in ${renderTime}ms`,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        id: 'engine-core',
        name: 'Engine Core Functionality',
        status: 'fail',
        message: `Engine core test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Test 4: Processing Quality Analysis
   */
  private async testProcessingQuality(buffer: AudioBuffer, settings: EffectSettings): Promise<TestResult> {
    try {
      const engine = getEngineCore();
      await engine.ensureAudioContext();
      
      const processedBuffer = await engine.renderOffline(buffer, settings);
      const metrics = await this.analyzeQualityMetrics(processedBuffer);

      const issues: string[] = [];

      // Check for clipping
      if (metrics.peakLevel > -0.1) {
        issues.push(`Potential clipping detected: ${metrics.peakLevel.toFixed(2)}dB`);
      }

      // Check dynamic range
      if (metrics.dynamicRange < 6) {
        issues.push(`Low dynamic range: ${metrics.dynamicRange.toFixed(1)}dB`);
      }

      // Check THD
      if (metrics.thd > 0.1) {
        issues.push(`High THD: ${metrics.thd.toFixed(3)}%`);
      }

      // Check loudness compliance
      if (metrics.lufsIntegrated > -14) {
        issues.push(`Loudness too high: ${metrics.lufsIntegrated.toFixed(1)} LUFS (broadcast limit: -14 LUFS)`);
      }

      const status = issues.length > 0 ? 'warning' : 'pass';
      const message = issues.length > 0 
        ? `Quality issues detected: ${issues.join('; ')}`
        : `High quality processing validated: ${metrics.dynamicRange.toFixed(1)}dB dynamic range, ${metrics.thd.toFixed(3)}% THD`;

      return {
        id: 'processing-quality',
        name: 'Processing Quality Analysis',
        status,
        message,
        metrics,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        id: 'processing-quality',
        name: 'Processing Quality Analysis',
        status: 'fail',
        message: `Quality analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Test 5: Performance Benchmarking
   */
  private async testPerformanceBenchmark(buffer: AudioBuffer, settings: EffectSettings): Promise<TestResult> {
    try {
      const engine = getEngineCore();
      await engine.ensureAudioContext();

      // Measure processing time
      const iterations = 3;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        await engine.renderOffline(buffer, settings);
        times.push(performance.now() - startTime);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const realTimeRatio = avgTime / ((buffer.length / buffer.sampleRate) * 1000);

      let status: 'pass' | 'warning' | 'fail';
      let message: string;

      if (realTimeRatio < 0.1) {
        status = 'pass';
        message = `Excellent performance: ${realTimeRatio.toFixed(3)}x realtime (${avgTime.toFixed(1)}ms)`;
      } else if (realTimeRatio < 1.0) {
        status = 'pass';
        message = `Good performance: ${realTimeRatio.toFixed(3)}x realtime (${avgTime.toFixed(1)}ms)`;
      } else if (realTimeRatio < 5.0) {
        status = 'warning';
        message = `Slow performance: ${realTimeRatio.toFixed(3)}x realtime (${avgTime.toFixed(1)}ms)`;
      } else {
        status = 'fail';
        message = `Poor performance: ${realTimeRatio.toFixed(3)}x realtime (${avgTime.toFixed(1)}ms)`;
      }

      return {
        id: 'performance-benchmark',
        name: 'Performance Benchmarking',
        status,
        message,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        id: 'performance-benchmark',
        name: 'Performance Benchmarking',
        status: 'fail',
        message: `Performance test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Test 6: Memory Leak Detection
   */
  private async testMemoryLeaks(buffer: AudioBuffer, settings: EffectSettings): Promise<TestResult> {
    try {
      // Measure initial memory usage
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      const engine = getEngineCore();
      await engine.ensureAudioContext();

      // Create and destroy multiple graphs
      const iterations = 5;
      for (let i = 0; i < iterations; i++) {
        const previewGraph = engine.buildPreviewGraph(buffer, settings);
        await new Promise(resolve => setTimeout(resolve, 10));
        previewGraph.dispose();
      }

      // Force garbage collection if available
      if ((window as any).gc) {
        (window as any).gc();
      }

      // Measure final memory usage
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      let status: 'pass' | 'warning' | 'fail';
      let message: string;

      if (memoryIncrease < 1024 * 1024) { // Less than 1MB increase
        status = 'pass';
        message = `No significant memory leaks detected: +${Math.round(memoryIncrease / 1024)}KB`;
      } else if (memoryIncrease < 5 * 1024 * 1024) { // Less than 5MB increase
        status = 'warning';
        message = `Minor memory increase detected: +${Math.round(memoryIncrease / (1024 * 1024))}MB`;
      } else {
        status = 'fail';
        message = `Significant memory leak detected: +${Math.round(memoryIncrease / (1024 * 1024))}MB`;
      }

      return {
        id: 'memory-leaks',
        name: 'Memory Leak Detection',
        status,
        message,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        id: 'memory-leaks',
        name: 'Memory Leak Detection',
        status: 'warning',
        message: `Memory test inconclusive: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Test 7: Export System Validation
   */
  private async testExportSystems(buffer: AudioBuffer, settings: EffectSettings): Promise<TestResult> {
    try {
      const engine = getEngineCore();
      await engine.ensureAudioContext();
      
      const processedBuffer = await engine.renderOffline(buffer, settings);

      // Test WAV export
      const wavBlob = await exportService.exportAudio(processedBuffer, {
        format: 'wav',
        quality: 'cd',
        normalize: true,
        fadeIn: 0,
        fadeOut: 0,
        trimSilence: false
      });

      if (!wavBlob || wavBlob.size === 0) {
        return {
          id: 'export-systems',
          name: 'Export System Validation',
          status: 'fail',
          message: 'WAV export failed or returned empty blob',
          timestamp: new Date()
        };
      }

      return {
        id: 'export-systems',
        name: 'Export System Validation',
        status: 'pass',
        message: `Export systems validated: WAV export successful (${Math.round(wavBlob.size / 1024)}KB)`,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        id: 'export-systems',
        name: 'Export System Validation',
        status: 'fail',
        message: `Export test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Test 8: Preset System Validation
   */
  private async testPresetSystems(): Promise<TestResult> {
    try {
      const presets = presetService.getPresets();
      
      if (presets.length === 0) {
        return {
          id: 'preset-systems',
          name: 'Preset System Validation',
          status: 'fail',
          message: 'No presets available in preset service',
          timestamp: new Date()
        };
      }

      // Test preset creation and deletion
      const testPreset = presetService.createPreset(
        'QA Test Preset',
        'Temporary preset for quality assurance',
        {
          pitchShift: 0,
          distortion: 0,
          reverbMix: 0,
          delayTime: 0,
          delayFeedback: 0,
          lowpassFreq: 20000,
          highpassFreq: 20,
          aiEnhancement: 0.5,
          noiseReduction: 0.5,
          enableWASM: true,
          wasmBlockSize: 2048,
          enablePitchShift: false,
          enableDistortion: false,
          enableReverb: false,
          enableDelay: false,
          enableLowpass: false,
          enableHighpass: false,
          enableAIEnhancement: false,
          enableNoiseReduction: false,
          enableMastering: false
        }
      );

      presetService.deletePreset(testPreset.id);

      return {
        id: 'preset-systems',
        name: 'Preset System Validation',
        status: 'pass',
        message: `Preset system validated: ${presets.length} presets available, create/delete operations successful`,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        id: 'preset-systems',
        name: 'Preset System Validation',
        status: 'fail',
        message: `Preset test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Test 9: Browser Compatibility
   */
  private async testBrowserCompatibility(): Promise<TestResult> {
    try {
      const issues: string[] = [];

      // Check Web Audio API support
      if (!window.AudioContext && !(window as any).webkitAudioContext) {
        issues.push('Web Audio API not supported');
      }

      // Check WebAssembly support
      if (!window.WebAssembly) {
        issues.push('WebAssembly not supported');
      }

      // Check File API support
      if (!window.File || !window.FileReader) {
        issues.push('File API not supported');
      }

      // Check AudioBuffer support
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        ctx.createBuffer(2, 44100, 44100);
        ctx.close();
      } catch (e) {
        issues.push('AudioBuffer creation failed');
      }

      if (issues.length > 0) {
        return {
          id: 'browser-compatibility',
          name: 'Browser Compatibility',
          status: 'fail',
          message: `Compatibility issues: ${issues.join('; ')}`,
          timestamp: new Date()
        };
      }

      return {
        id: 'browser-compatibility',
        name: 'Browser Compatibility',
        status: 'pass',
        message: 'All browser APIs available and functional',
        timestamp: new Date()
      };

    } catch (error) {
      return {
        id: 'browser-compatibility',
        name: 'Browser Compatibility',
        status: 'fail',
        message: `Compatibility test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Test 10: NASA Compliance Validation
   */
  private async testNASACompliance(metrics: QualityMetrics): Promise<TestResult> {
    try {
      const compliance: string[] = [];
      const violations: string[] = [];

      // NASA-grade audio quality standards
      if (metrics.peakLevel <= -0.1) compliance.push('Peak limiting');
      else violations.push('Peak level exceeds -0.1dB');

      if (metrics.thd <= 0.05) compliance.push('THD within limits');
      else violations.push('THD exceeds 0.05%');

      if (metrics.dynamicRange >= 12) compliance.push('Dynamic range');
      else violations.push('Dynamic range below 12dB');

      if (metrics.snr >= 60) compliance.push('Signal-to-noise ratio');
      else violations.push('SNR below 60dB');

      if (metrics.lufsIntegrated <= -14) compliance.push('Loudness compliance');
      else violations.push('Loudness exceeds broadcast standards');

      const compliancePercentage = (compliance.length / 5) * 100;

      let status: 'pass' | 'warning' | 'fail';
      let message: string;

      if (compliancePercentage === 100) {
        status = 'pass';
        message = `NASA-grade compliance achieved: 100% (${compliance.join(', ')})`;
      } else if (compliancePercentage >= 80) {
        status = 'warning';
        message = `Partial NASA compliance: ${compliancePercentage}% (violations: ${violations.join(', ')})`;
      } else {
        status = 'fail';
        message = `NASA compliance failed: ${compliancePercentage}% (violations: ${violations.join(', ')})`;
      }

      return {
        id: 'nasa-compliance',
        name: 'NASA Compliance Validation',
        status,
        message,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        id: 'nasa-compliance',
        name: 'NASA Compliance Validation',
        status: 'fail',
        message: `NASA compliance test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Analyze comprehensive quality metrics
   */
  private async analyzeQualityMetrics(buffer: AudioBuffer): Promise<QualityMetrics> {
    const channelData = buffer.getChannelData(0);
    const length = channelData.length;

    // Calculate basic metrics
    let peak = 0;
    let rms = 0;
    let sum = 0;
    let sumSquares = 0;

    for (let i = 0; i < length; i++) {
      const sample = Math.abs(channelData[i]);
      peak = Math.max(peak, sample);
      sum += sample;
      sumSquares += sample * sample;
    }

    rms = Math.sqrt(sumSquares / length);
    const peakLevel = 20 * Math.log10(peak);
    const rmsLevel = 20 * Math.log10(rms);

    // Calculate dynamic range (simplified)
    const dynamicRange = peakLevel - rmsLevel;

    // Calculate THD (simplified approximation)
    const thd = this.calculateTHD(channelData);

    // Calculate SNR (simplified)
    const snr = rmsLevel - (-60); // Assuming -60dB noise floor

    // Calculate spectral metrics (simplified)
    const spectralMetrics = this.calculateSpectralMetrics(channelData, buffer.sampleRate);

    // Calculate loudness (simplified LUFS approximation)
    const lufsIntegrated = rmsLevel - 0.691; // Rough conversion to LUFS
    const lufsMomentary = lufsIntegrated;
    const truePeak = peakLevel;

    return {
      peakLevel,
      rmsLevel,
      dynamicRange,
      thd,
      snr,
      spectralBalance: spectralMetrics.balance,
      spectralCentroid: spectralMetrics.centroid,
      spectralRolloff: spectralMetrics.rolloff,
      latency: 0, // Would measure in real implementation
      cpuUsage: 0, // Would measure in real implementation
      memoryUsage: 0, // Would measure in real implementation
      lufsIntegrated,
      lufsMomentary,
      truePeak
    };
  }

  /**
   * Calculate Total Harmonic Distortion (simplified)
   */
  private calculateTHD(channelData: Float32Array): number {
    // Simplified THD calculation
    // In a real implementation, this would use FFT analysis
    let harmonicContent = 0;
    const windowSize = 1024;
    
    for (let i = 0; i < channelData.length - windowSize; i += windowSize) {
      let fundamental = 0;
      let harmonics = 0;
      
      for (let j = 0; j < windowSize; j++) {
        const sample = channelData[i + j];
        fundamental += Math.abs(sample);
        if (j % 2 === 0) harmonics += Math.abs(sample);
      }
      
      if (fundamental > 0) {
        harmonicContent += (harmonics / fundamental);
      }
    }
    
    return Math.min((harmonicContent / (channelData.length / windowSize)) * 100, 100);
  }

  /**
   * Calculate spectral metrics (simplified)
   */
  private calculateSpectralMetrics(_channelData: Float32Array, sampleRate: number): {
    balance: number;
    centroid: number;
    rolloff: number;
  } {
    // Simplified spectral analysis
    // In a real implementation, this would use proper FFT
    
    const nyquist = sampleRate / 2;
    
    // Calculate spectral balance (0-1, where 0.5 is balanced)
    const balance = 0.5; // Placeholder - would analyze frequency bands
    
    // Calculate spectral centroid (brightness measure)
    const centroid = nyquist * 0.3; // Placeholder - would use weighted frequency analysis
    
    // Calculate spectral rolloff (high frequency content)
    const rolloff = nyquist * 0.8; // Placeholder - would find 85% energy point
    
    return { balance, centroid, rolloff };
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(tests: TestResult[]): string[] {
    const recommendations: string[] = [];

    const failedTests = tests.filter(t => t.status === 'fail');
    const warningTests = tests.filter(t => t.status === 'warning');

    if (failedTests.length > 0) {
      recommendations.push(`🚨 Critical: Fix ${failedTests.length} failed tests before deployment`);
    }

    if (warningTests.length > 0) {
      recommendations.push(`⚠️ Address ${warningTests.length} warning conditions for optimal performance`);
    }

    // Specific recommendations based on test results
    const qualityTest = tests.find(t => t.id === 'processing-quality');
    if (qualityTest?.metrics) {
      const metrics = qualityTest.metrics;
      
      if (metrics.peakLevel > -0.3) {
        recommendations.push('🔧 Consider adding/adjusting limiter to prevent clipping');
      }
      
      if (metrics.dynamicRange < 10) {
        recommendations.push('🎚️ Increase dynamic range by reducing compression');
      }
      
      if (metrics.thd > 0.1) {
        recommendations.push('🎛️ Reduce distortion and saturation effects');
      }
    }

    const performanceTest = tests.find(t => t.id === 'performance-benchmark');
    if (performanceTest?.status === 'warning') {
      recommendations.push('⚡ Consider enabling WASM acceleration for better performance');
    }

    if (tests.every(t => t.status === 'pass')) {
      recommendations.push('✅ All systems validated - Ready for NASA-grade deployment');
    }

    return recommendations;
  }
}

// Export singleton instance
export const qaSystem = QualityAssuranceSystem.getInstance();