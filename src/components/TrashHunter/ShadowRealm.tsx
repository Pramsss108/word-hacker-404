import { useState, useEffect } from 'react';
import { Ghost, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface ShadowCopy {
  id: string;
  created_at: string;
  volume: string;
}

export default function ShadowRealm() {
  const [shadows, setShadows] = useState<ShadowCopy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scanShadows = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<ShadowCopy[]>('scan_shadow_copies');
      setShadows(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const deleteShadow = async (id: string) => {
    if (!confirm('Are you sure? This cannot be undone.')) return;
    try {
      await invoke('delete_shadow_copy', { id });
      setShadows(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      alert('Failed to delete: ' + err);
    }
  };

  useEffect(() => {
    scanShadows();
  }, []);

  return (
    <div className="shadow-realm glass p-6 rounded-xl border border-white/10 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-white">
          <Ghost className="text-purple-400" /> The Shadow Realm
        </h2>
        <button onClick={scanShadows} className="p-2 hover:bg-white/10 rounded-full text-white">
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <p className="text-sm text-white/60 mb-4">
        System Restore points ("Shadow Copies") can take up 10-50GB of space. 
        Keep the most recent one, delete the rest.
      </p>

      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded text-red-200 text-sm mb-4 flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <div className="space-y-2">
        {shadows.length === 0 && !loading && !error && (
          <div className="text-center py-8 text-white/30">
            No shadow copies found. The realm is empty.
          </div>
        )}
        
        {shadows.map((shadow, index) => (
          <div key={shadow.id} className="flex items-center justify-between p-3 bg-black/30 rounded border border-white/5 hover:border-purple-400/50 transition-colors">
            <div>
              <div className="text-white font-mono text-sm">{shadow.created_at}</div>
              <div className="text-xs text-white/40 font-mono">{shadow.id}</div>
              {index === shadows.length - 1 && (
                <span className="inline-block mt-1 text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                  NEWEST (RECOMMENDED KEEP)
                </span>
              )}
            </div>
            <button 
              onClick={() => deleteShadow(shadow.id)}
              className="p-2 hover:bg-red-500/20 text-white/50 hover:text-red-400 rounded transition-colors"
              title="Annihilate"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
