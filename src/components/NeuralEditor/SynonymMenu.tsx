import React from 'react';

interface SynonymMenuProps {
  word: string;
  synonyms: string[];
  position: { x: number; y: number };
  onSelect: (synonym: string) => void;
  onClose: () => void;
}

export const SynonymMenu: React.FC<SynonymMenuProps> = ({ word, synonyms, position, onSelect, onClose }) => {
  return (
    <>
      {/* Backdrop to close menu */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      
      <div 
        className="fixed z-50 bg-[#1a1b1e] border border-gray-700 rounded shadow-xl overflow-hidden min-w-[150px] animate-in fade-in zoom-in-95 duration-100"
        style={{ top: position.y + 20, left: position.x }}
      >
        <div className="px-3 py-2 border-b border-gray-800 bg-black/20">
          <span className="text-xs font-mono text-gray-500 uppercase">Synonyms for "{word}"</span>
        </div>
        <div className="py-1">
          {synonyms.length > 0 ? (
            synonyms.map((syn, i) => (
              <button
                key={i}
                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-blue-600 hover:text-white transition-colors"
                onClick={() => onSelect(syn)}
              >
                {syn}
              </button>
            ))
          ) : (
            <div className="px-4 py-2 text-sm text-gray-600 italic">No synonyms found</div>
          )}
        </div>
      </div>
    </>
  );
};
