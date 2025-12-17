import { useState, useEffect } from 'react';
import { Globe, HardDrive, FolderSearch, ChevronRight } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface DriveInfo {
  name: string;
  mount_point: string;
  total_space: number;
  available_space: number;
}

interface OmniSelectorProps {
  onScopeSelect: (scope: 'global' | 'drive' | 'folder', target?: string) => void;
}

export default function OmniSelector({ onScopeSelect }: OmniSelectorProps) {
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [selectedMode, setSelectedMode] = useState<'global' | 'drive' | 'folder'>('global');

  useEffect(() => {
    invoke<DriveInfo[]>('get_system_drives').then(setDrives).catch(console.error);
  }, []);

  return (
    <div className="omni-selector glass p-6 rounded-xl border border-white/10">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
        <Globe className="text-[#0aff6a]" /> Mission Control
      </h2>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        <button 
          className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-all ${selectedMode === 'global' ? 'border-[#0aff6a] bg-[#0aff6a]/10 text-white' : 'border-white/10 hover:bg-white/5 text-white/70'}`}
          onClick={() => setSelectedMode('global')}
        >
          <Globe size={32} />
          <span className="font-mono text-sm">GLOBAL</span>
        </button>
        
        <button 
          className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-all ${selectedMode === 'drive' ? 'border-[#0aff6a] bg-[#0aff6a]/10 text-white' : 'border-white/10 hover:bg-white/5 text-white/70'}`}
          onClick={() => setSelectedMode('drive')}
        >
          <HardDrive size={32} />
          <span className="font-mono text-sm">SECTOR</span>
        </button>
        
        <button 
          className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-all ${selectedMode === 'folder' ? 'border-[#0aff6a] bg-[#0aff6a]/10 text-white' : 'border-white/10 hover:bg-white/5 text-white/70'}`}
          onClick={() => setSelectedMode('folder')}
        >
          <FolderSearch size={32} />
          <span className="font-mono text-sm">SURGICAL</span>
        </button>
      </div>

      {selectedMode === 'drive' && (
        <div className="drive-list grid grid-cols-1 md:grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-2 mb-4">
          {drives.map(drive => (
            <button 
              key={drive.mount_point}
              className="p-3 border border-white/10 rounded hover:border-[#0aff6a] text-left bg-black/20 transition-colors"
              onClick={() => onScopeSelect('drive', drive.mount_point)}
            >
              <div className="font-bold text-white">{drive.name || 'Local Disk'} ({drive.mount_point})</div>
              <div className="text-xs text-white/50 font-mono">
                Free: {(drive.available_space / 1024 / 1024 / 1024).toFixed(1)} GB
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedMode === 'global' && (
        <button 
          className="w-full py-3 bg-[#0aff6a] text-black font-bold rounded hover:opacity-90 flex items-center justify-center gap-2 transition-opacity"
          onClick={() => onScopeSelect('global')}
        >
          INITIATE GLOBAL SCAN <ChevronRight />
        </button>
      )}
      
       {selectedMode === 'folder' && (
        <div className="text-center p-4 text-white/50 border border-dashed border-white/10 rounded">
           Surgical Mode: Select a specific folder to analyze. (Coming Soon)
        </div>
      )}
    </div>
  );
}
