import React from 'react';
import { X, Terminal } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  brainStatus: 'checking' | 'local' | 'cloud' | 'offline';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#0b0b0d] border border-white/10 rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="h-12 bg-black/40 border-b border-white/10 flex items-center justify-between px-4 shrink-0">
          <h2 className="font-mono text-sm font-bold text-gray-200 flex items-center gap-2">
            <Terminal size={16} className="text-green-500" />
            NEURAL_CONFIG
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 font-mono text-sm">
          
          {/* Status Section */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500 uppercase tracking-wider">Current Status</label>
            <div className="p-3 rounded border bg-blue-500/10 border-blue-500/30 text-blue-400">
              ☁️ CLOUD UPLINK ACTIVE (Groq)
            </div>
          </div>

          {/* Info Section */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500 uppercase tracking-wider">Neural Gateway</label>
            <div className="bg-white/5 p-3 rounded text-xs text-gray-400 border border-white/10">
              <p>Connected to <strong>Word Hacker Neural Gateway</strong>.</p>
              <p className="mt-1 text-green-400">Status: Operational</p>
              <p className="mt-2 text-gray-500 italic">
                Powered by Llama 3 70B via Cloudflare Edge.
                No local installation required.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
