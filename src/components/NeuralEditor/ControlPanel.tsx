import React from 'react';
import { Wand2, Eraser, AlignLeft, Sparkles } from 'lucide-react';
import { playClickSound } from '../../lib/sound';

interface ControlPanelProps {
  onRewrite: (mode: string) => void;
  isProcessing: boolean;
  brainStatus: 'cloud';
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ onRewrite, isProcessing }) => {
  const getStatusText = () => {
    if (isProcessing) return 'PROCESSING...';
    return 'Online Mode';
  };

  const handleClick = (mode: string) => {
    playClickSound();
    onRewrite(mode);
  };

  return (
    <div className="neural-controls">
      <div 
        className="status-indicator rounded px-2 py-1 -ml-2 border border-transparent"
        title="Neural Link Active"
      >
        <div className={`status-dot blue ${isProcessing ? 'ping' : ''}`} />
        <span className="status-text" style={{ color: '#60a5fa' }}>
          {getStatusText()}
        </span>
      </div>

      <div className="control-divider" />

      <button 
        onClick={() => handleClick('fluency')}
        disabled={isProcessing}
        className="control-btn"
      >
        <Wand2 size={14} />
        <span>Fix Grammar</span>
      </button>

      <button 
        onClick={() => handleClick('formal')}
        disabled={isProcessing}
        className="control-btn"
      >
        <AlignLeft size={14} />
        <span>Formalize</span>
      </button>

      <button 
        onClick={() => handleClick('shorten')}
        disabled={isProcessing}
        className="control-btn"
      >
        <Eraser size={14} />
        <span>Shorten</span>
      </button>

      <button 
        onClick={() => onRewrite('creative')}
        disabled={isProcessing}
        className="control-btn enhance"
      >
        <Sparkles size={14} />
        <span>ENHANCE</span>
      </button>
    </div>
  );
};
