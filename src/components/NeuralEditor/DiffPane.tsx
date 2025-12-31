import React, { useEffect, useState } from 'react';
import DiffMatchPatch from 'diff-match-patch';
import { Check, Copy, CheckCircle2 } from 'lucide-react';

interface DiffPaneProps {
  original: string;
  modified: string;
  onAccept: () => void;
}

export const DiffPane: React.FC<DiffPaneProps> = ({ original, modified, onAccept }) => {
  const [diffs, setDiffs] = useState<Array<[number, string]>>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const dmp = new DiffMatchPatch();
    const d = dmp.diff_main(original, modified);
    dmp.diff_cleanupSemantic(d);
    setDiffs(d);
  }, [original, modified]);

  const handleCopy = () => {
    if (modified) {
      navigator.clipboard.writeText(modified);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <div className="pane-header">
        <div className="flex items-center gap-2">
          <span className="pane-title">NEURAL_OUTPUT</span>
          <span className="pane-badge readonly">READ_ONLY</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleCopy}
            className={`transition-colors ${copied ? 'text-green-400' : 'text-gray-500 hover:text-white'}`}
            title="Copy Result"
            disabled={!modified}
          >
            {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
          </button>
          <button 
            onClick={onAccept}
            className="text-gray-500 hover:text-green-400 transition-colors"
            title="Accept Changes"
            disabled={!modified}
          >
            <Check size={14} />
          </button>
        </div>
      </div>
      <div className="neural-diff-content">
        {diffs.map((part, index) => {
          const type = part[0];
          const text = part[1];
          
          if (type === 1) { // Insert
            return <span key={index} className="diff-add">{text}</span>;
          }
          if (type === -1) { // Delete
            return <span key={index} className="diff-del">{text}</span>;
          }
          return <span key={index} className="text-gray-300">{text}</span>; // Equal
        })}
        {diffs.length === 0 && !original && (
          <span className="text-gray-700 italic">Waiting for input...</span>
        )}
        {/* Fix: If we have original text but no diffs (meaning modified is empty/processing), show placeholder or original */}
        {original && !modified && (
           <span className="text-gray-600 italic animate-pulse">...Awaiting Neural Enhancement...</span>
        )}
      </div>
    </>
  );
};
