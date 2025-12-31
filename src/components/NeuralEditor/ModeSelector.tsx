import React from 'react';
import { Wand2, SpellCheck, ShieldAlert, FileSearch } from 'lucide-react';

interface ModeSelectorProps {
  activeMode: 'paraphraser' | 'grammar' | 'detector' | 'plagiarism';
  onChange: (mode: 'paraphraser' | 'grammar' | 'detector' | 'plagiarism') => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ activeMode, onChange }) => {
  const modes = [
    { id: 'paraphraser', label: 'Paraphraser', icon: Wand2 },
    { id: 'grammar', label: 'Grammar Check', icon: SpellCheck },
    { id: 'detector', label: 'AI Detector', icon: ShieldAlert },
    { id: 'plagiarism', label: 'Plagiarism Check', icon: FileSearch },
  ] as const;

  return (
    <div className="mode-selector">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onChange(mode.id)}
          className={`mode-btn ${activeMode === mode.id ? 'active' : ''}`}
        >
          <mode.icon size={14} />
          {mode.label}
        </button>
      ))}
    </div>
  );
};
