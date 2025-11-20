import { useState, useEffect } from 'react';
import { getWASMProcessor } from '../services/wasmCore';

interface PerformanceStats {
  wasmEnabled: boolean;
  processorsActive: number;
  memoryUsage: number;
  avgProcessingTime: number;
  lastFrameTime: number;
}

export default function PerformanceMonitor() {
  const [stats, setStats] = useState<PerformanceStats>({
    wasmEnabled: false,
    processorsActive: 0,
    memoryUsage: 0,
    avgProcessingTime: 0,
    lastFrameTime: 0
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let animationFrame: number;
    let lastUpdateTime = performance.now();
    let frameTimes: number[] = [];

    const updateStats = () => {
      const now = performance.now();
      const frameTime = now - lastUpdateTime;
      
      frameTimes.push(frameTime);
      if (frameTimes.length > 60) frameTimes.shift(); // Keep last 60 frames
      
      const wasmProcessor = getWASMProcessor();
      const wasmStats = wasmProcessor.getPerformanceStats();
      
      setStats({
        wasmEnabled: wasmStats.wasmEnabled,
        processorsActive: wasmStats.processorsActive,
        memoryUsage: wasmStats.memoryUsage,
        avgProcessingTime: frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length,
        lastFrameTime: frameTime
      });
      
      lastUpdateTime = now;
      
      if (isVisible) {
        animationFrame = requestAnimationFrame(updateStats);
      }
    };

    if (isVisible) {
      updateStats();
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isVisible]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="performance-toggle"
        title="Show M4 Performance Monitor"
      >
        📊 M4 Stats
      </button>
    );
  }

  return (
    <div className="performance-monitor">
      <div className="performance-header">
        <span className="performance-title">M4 Performance Monitor</span>
        <button
          onClick={() => setIsVisible(false)}
          className="performance-close"
          aria-label="Close performance monitor"
        >
          <span className="close-cross" aria-hidden>✕</span>
        </button>
      </div>
      
      <div className="performance-grid">
        <div className="stat-item">
          <span className="stat-label">Engine:</span>
          <span className={`stat-value ${stats.wasmEnabled ? 'wasm' : 'js'}`}>
            {stats.wasmEnabled ? 'WASM' : 'JavaScript'}
          </span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">Processors:</span>
          <span className="stat-value">{stats.processorsActive}</span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">Memory:</span>
          <span className="stat-value">{(stats.memoryUsage / 1024).toFixed(1)}KB</span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">Avg Frame:</span>
          <span className={`stat-value ${stats.avgProcessingTime > 16.67 ? 'warning' : 'good'}`}>
            {stats.avgProcessingTime.toFixed(1)}ms
          </span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">Frame Rate:</span>
          <span className={`stat-value ${1000 / stats.avgProcessingTime < 30 ? 'warning' : 'good'}`}>
            {(1000 / stats.avgProcessingTime).toFixed(0)}fps
          </span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">Performance:</span>
          <span className={`stat-value ${stats.wasmEnabled ? 'excellent' : 'good'}`}>
            {stats.wasmEnabled ? '3x Faster' : 'Standard'}
          </span>
        </div>
      </div>
    </div>
  );
}