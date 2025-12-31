import React, { useState } from 'react';
import { Search, ShieldAlert, CheckCircle, Globe, ExternalLink } from 'lucide-react';

interface PlagiarismResult {
  score: number;
  matches: Array<{
    text: string;
    source: string;
    similarity: number;
  }>;
}

interface PlagiarismPanelProps {
  text: string;
}

export const PlagiarismPanel: React.FC<PlagiarismPanelProps> = ({ text }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<PlagiarismResult | null>(null);

  const handleScan = async () => {
    if (!text.trim()) return;
    
    setIsScanning(true);
    setResult(null);

    // SIMULATION: In a real app, this would call a Copyscape/Turnitin API.
    // For this demo, we simulate a scan process.
    setTimeout(() => {
      const randomScore = Math.random() > 0.7 ? Math.floor(Math.random() * 20) : 0; // Mostly 0% plagiarism
      
      const mockMatches = randomScore > 0 ? [
        {
          text: text.substring(0, Math.min(50, text.length)) + "...",
          source: "wikipedia.org",
          similarity: 85
        }
      ] : [];

      setResult({
        score: randomScore,
        matches: mockMatches
      });
      setIsScanning(false);
    }, 2500);
  };

  return (
    <div className="h-full flex flex-col bg-black/20">
      {/* Header */}
      <div className="pane-header">
        <div className="flex items-center gap-2">
          <span className="pane-title">ECHO_TRACER</span>
          <span className="pane-badge readonly">WEB_CRAWLER</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center overflow-y-auto custom-scrollbar">
        
        {!result && !isScanning && (
          <div className="text-center max-w-xs">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full border-2 border-dashed border-gray-700 flex items-center justify-center">
              <Globe size={32} className="text-gray-600" />
            </div>
            <h3 className="text-lg font-mono text-gray-300 mb-2">Deep Web Scan</h3>
            <p className="text-sm text-gray-500 mb-6">
              Scan your text against billions of web pages to ensure originality.
            </p>
            <button 
              onClick={handleScan}
              disabled={!text.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono text-sm rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
            >
              <Search size={16} />
              INITIATE SCAN
            </button>
          </div>
        )}

        {isScanning && (
          <div className="text-center">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full animate-ping"></div>
              <div className="absolute inset-0 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono text-xs text-blue-400 animate-pulse">SCANNING</span>
              </div>
            </div>
            <div className="font-mono text-sm text-blue-400">
              <p className="mb-1">ACCESSING GLOBAL NODES...</p>
              <p className="text-xs text-gray-500">Comparing patterns...</p>
            </div>
          </div>
        )}

        {result && (
          <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Score Card */}
            <div className={`p-6 rounded-lg border ${result.score > 0 ? 'border-red-500/30 bg-red-500/5' : 'border-green-500/30 bg-green-500/5'} mb-6 text-center`}>
              <div className="mb-2">
                {result.score > 0 ? (
                  <ShieldAlert size={48} className="mx-auto text-red-500" />
                ) : (
                  <CheckCircle size={48} className="mx-auto text-green-500" />
                )}
              </div>
              <div className="text-4xl font-bold font-mono mb-1">
                {result.score}%
              </div>
              <div className="text-sm uppercase tracking-widest font-mono text-gray-400">
                Similarity Score
              </div>
            </div>

            {/* Matches List */}
            {result.matches.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-xs font-mono text-gray-500 uppercase mb-2">Detected Matches</h4>
                {result.matches.map((match, i) => (
                  <div key={i} className="p-3 rounded bg-white/5 border border-white/10 text-left">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-mono text-red-400">{match.similarity}% Match</span>
                      <a href="#" className="text-gray-500 hover:text-blue-400 transition-colors">
                        <ExternalLink size={12} />
                      </a>
                    </div>
                    <p className="text-sm text-gray-300 mb-2 line-clamp-2 font-serif italic">
                      "{match.text}"
                    </p>
                    <div className="text-xs text-gray-500 font-mono">
                      Source: {match.source}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 text-sm">
                <p>No matching sources found in public database.</p>
                <p className="text-xs mt-2 opacity-50">Your text appears to be 100% original.</p>
              </div>
            )}

            <button 
              onClick={handleScan}
              className="mt-8 text-xs text-gray-500 hover:text-white underline decoration-dotted underline-offset-4 transition-colors"
            >
              RUN NEW SCAN
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
