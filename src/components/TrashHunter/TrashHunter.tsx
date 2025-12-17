import { useState } from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import OmniSelector from './OmniSelector';
import ShadowRealm from './ShadowRealm';

export default function TrashHunter({ onBack }: { onBack: () => void }) {
  const [scope, setScope] = useState<'global' | 'drive' | 'folder'>('global');
  const [target, setTarget] = useState<string | undefined>(undefined);

  const handleScopeSelect = (newScope: 'global' | 'drive' | 'folder', newTarget?: string) => {
    setScope(newScope);
    setTarget(newTarget);
    console.log(`Scope selected: ${newScope}, Target: ${newTarget}`);
    // Here we would trigger the scan logic based on scope
  };

  return (
    <div className="trash-hunter-page min-h-screen bg-[#0b0b0d] text-white p-6">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={20} /> Back to Tools
      </button>

      <header className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Trash2 className="text-[#0aff6a]" size={32} /> 
          Trash Hunter <span className="text-xs bg-[#0aff6a] text-black px-2 py-1 rounded font-mono">GOD MODE</span>
        </h1>
        <p className="text-white/60 mt-2">
          AI-Powered System Cleaner. Select your target and reclaim your space.
        </p>
      </header>

      <div className="max-w-4xl mx-auto space-y-8">
        <OmniSelector onScopeSelect={handleScopeSelect} />
        
        <ShadowRealm />
        
        <div className="text-xs text-white/20 font-mono text-center">
          Active Scope: {scope.toUpperCase()} {target ? `[${target}]` : ''}
        </div>
      </div>
    </div>
  );
}
