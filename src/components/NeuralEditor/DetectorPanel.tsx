import React from 'react';
import { ShieldAlert, ScanLine } from 'lucide-react';

interface DetectorPanelProps {
  score: number | null;
  analysis: string | null;
  isScanning: boolean;
  onScan: () => void;
}

export const DetectorPanel: React.FC<DetectorPanelProps> = ({ score, analysis, isScanning, onScan }) => {
  const getScoreColor = (s: number) => {
    if (s < 30) return 'text-green';
    if (s < 70) return 'text-yellow';
    return 'text-red';
  };

  const getScoreStroke = (s: number) => {
    if (s < 30) return 'stroke-green';
    if (s < 70) return 'stroke-yellow';
    return 'stroke-red';
  };

  const getScoreLabel = (s: number) => {
    if (s < 30) return 'HUMAN';
    if (s < 70) return 'MIXED';
    return 'AI GENERATED';
  };

  if (score === null && !isScanning) {
    return (
      <div className="detector-panel">
        <div className="detector-empty">
          <ShieldAlert size={48} className="empty-icon" />
          <h3 className="empty-title">AI Tracer Ready</h3>
          <p className="empty-text">
            Scan the text to detect synthetic patterns and AI generation signatures.
          </p>
          <button onClick={onScan} className="scan-btn">
            <ScanLine size={18} />
            INITIATE SCAN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="detector-panel">
      {isScanning ? (
        <div className="detector-loading">
          <div className="loading-spinner" />
          <p className="loading-text">ANALYZING PATTERNS...</p>
        </div>
      ) : (
        <>
          <div className="detector-gauge-container">
            {/* Circular Progress Background */}
            <svg className="detector-gauge-svg">
              <circle
                cx="96"
                cy="96"
                r="88"
                className="gauge-bg"
                strokeWidth="12"
                fill="transparent"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                className={`gauge-value ${getScoreStroke(score || 0)}`}
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={553}
                strokeDashoffset={553 - (553 * (score || 0)) / 100}
                strokeLinecap="round"
              />
            </svg>
            <div className="gauge-center">
              <span className={`gauge-score ${getScoreColor(score || 0)}`}>
                {score}%
              </span>
              <span className="gauge-label">SYNTHETIC SCORE</span>
            </div>
          </div>

          <div className={`detector-status ${getScoreColor(score || 0)}`}>
            {getScoreLabel(score || 0)}
          </div>

          <div className="detector-report">
            <h4 className="report-title">Analysis Report</h4>
            <p className="report-text">
              {analysis}
            </p>
          </div>

          <button onClick={onScan} className="rescan-btn">
            <ScanLine size={14} />
            RE-SCAN
          </button>
        </>
      )}
    </div>
  );
};
