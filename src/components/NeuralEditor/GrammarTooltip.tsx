import React from 'react';
import { X, Check, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { GrammarIssue } from '../../lib/GrammarEngine';

interface GrammarTooltipProps {
  issue: GrammarIssue;
  position: { x: number; y: number };
  onFix: (replacement: string) => void;
  onIgnore: () => void;
  onClose: () => void;
}

export const GrammarTooltip: React.FC<GrammarTooltipProps> = ({
  issue,
  position,
  onFix,
  onIgnore,
  onClose
}) => {
  const getIcon = () => {
    switch (issue.ruleId) {
      case 'retext-passive': return <AlertTriangle size={14} className="text-yellow-400" />;
      case 'retext-simplify': return <Info size={14} className="text-blue-400" />;
      default: return <AlertCircle size={14} className="text-red-400" />;
    }
  };

  return (
    <div 
      className="fixed z-50 bg-[#1a1b1e] border border-white/10 rounded-lg shadow-xl p-3 w-64 animate-in fade-in zoom-in-95 duration-100"
      style={{ 
        left: position.x, 
        top: position.y + 20, // Offset below cursor
        transform: 'translateX(-50%)' 
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {getIcon()}
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            {issue.ruleId.replace('retext-', '')}
          </span>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white">
          <X size={12} />
        </button>
      </div>

      <p className="text-sm text-gray-200 mb-3 font-medium">
        {issue.message}
      </p>

      <div className="flex flex-col gap-2">
        {issue.expected?.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onFix(suggestion)}
            className="flex items-center gap-2 px-3 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded text-sm font-medium transition-colors text-left"
          >
            <Check size={14} />
            Change to "{suggestion}"
          </button>
        ))}
        
        <button
          onClick={onIgnore}
          className="text-xs text-gray-500 hover:text-gray-300 py-1 text-left"
        >
          Ignore this issue
        </button>
      </div>
    </div>
  );
};
