import { useState, useEffect } from 'react';
import { ArrowLeft, Shield, Activity, Cpu, HardDrive, Brain, Search } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useGlobalAIWorker } from '../services/GlobalAIWorker';

interface ProcessInfo {
  pid: number;
  name: string;
  memory: number;
  cpu_usage: number;
  path: string;
}

export default function SystemMonitor({ onBack }: { onBack: () => void }) {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPid, setSelectedPid] = useState<number | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const { getWorker } = useGlobalAIWorker();

  const fetchProcesses = async () => {
    try {
      const list = await invoke<ProcessInfo[]>('get_running_processes');
      // Sort by Memory usage (descending)
      setProcesses(list.sort((a, b) => b.memory - a.memory));
      setLoading(false);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchProcesses();
    const interval = setInterval(fetchProcesses, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const askAi = async (proc: ProcessInfo) => {
    setAnalyzing(true);
    setAiAnalysis(null);
    setSelectedPid(proc.pid);

    const worker = getWorker();
    if (!worker) {
      setAiAnalysis("AI Engine not ready. Please wait...");
      setAnalyzing(false);
      return;
    }

    const prompt = `Analyze this Windows process for security threats.
    Name: ${proc.name}
    Path: ${proc.path || "Unknown (System Protected)"}
    Memory: ${(proc.memory / 1024 / 1024).toFixed(2)} MB
    
    Is this safe? If it's a system process, say SAFE. If it looks like a miner or malware, say DANGER. Keep it short.`;

    worker.onmessage = (e: MessageEvent) => {
      if (e.data.status === 'complete') {
        setAiAnalysis(e.data.output);
        setAnalyzing(false);
      }
    };

    worker.postMessage({ type: 'generate', text: prompt });
  };

  return (
    <div className="system-monitor min-h-screen bg-[#0b0b0d] text-white p-6 font-mono">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={20} /> Back to Tools
      </button>

      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-[#0aff6a]">
            <Activity size={32} /> 
            AI Overseer <span className="text-xs bg-[#0aff6a] text-black px-2 py-1 rounded">LIVE</span>
          </h1>
          <p className="text-white/60 mt-2">
            Monitoring {processes.length} active processes. AI Analysis Ready.
          </p>
        </div>
        <div className="text-right text-xs text-white/30">
          <div className="flex items-center gap-2 justify-end"><Cpu size={14} /> CPU: NORMAL</div>
          <div className="flex items-center gap-2 justify-end"><HardDrive size={14} /> RAM: OPTIMAL</div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Process List */}
        <div className="lg:col-span-2 glass rounded-xl border border-white/10 overflow-hidden h-[600px] flex flex-col">
          <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between text-xs text-white/50 uppercase tracking-wider">
            <span>Process Name</span>
            <span>Memory / PID</span>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
            {loading ? (
              <div className="text-center py-20 animate-pulse">Scanning System...</div>
            ) : (
              processes.map(proc => (
                <div 
                  key={proc.pid}
                  onClick={() => setSelectedPid(proc.pid)}
                  className={`flex items-center justify-between p-3 rounded cursor-pointer transition-all ${selectedPid === proc.pid ? 'bg-[#0aff6a]/20 border-[#0aff6a]/50' : 'hover:bg-white/5 border-transparent'} border`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${proc.path ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    <div>
                      <div className="font-bold text-sm">{proc.name}</div>
                      <div className="text-[10px] text-white/40 truncate max-w-[200px]">{proc.path || "System Protected"}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#0aff6a] text-sm">{(proc.memory / 1024 / 1024).toFixed(1)} MB</div>
                    <div className="text-[10px] text-white/30">PID: {proc.pid}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AI Analysis Panel */}
        <div className="glass rounded-xl border border-white/10 p-6 flex flex-col">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Brain className="text-purple-400" /> AI Analyst
          </h2>
          
          {selectedPid ? (
            <div className="flex-1 flex flex-col">
              <div className="mb-6">
                <div className="text-xs text-white/40 uppercase mb-1">Selected Target</div>
                <div className="text-2xl font-bold text-white break-all">
                  {processes.find(p => p.pid === selectedPid)?.name}
                </div>
                <div className="text-xs text-white/50 font-mono mt-1">
                  PID: {selectedPid}
                </div>
              </div>

              <div className="flex-1 bg-black/40 rounded-lg p-4 border border-white/5 mb-4 overflow-y-auto">
                {analyzing ? (
                  <div className="flex items-center gap-2 text-purple-400 animate-pulse">
                    <Brain size={16} /> Analyzing process DNA...
                  </div>
                ) : aiAnalysis ? (
                  <div className="prose prose-invert text-sm">
                    <p className="text-purple-300 font-bold mb-2">Verdict:</p>
                    {aiAnalysis}
                  </div>
                ) : (
                  <div className="text-white/30 text-center py-10 text-sm">
                    Select a process and ask the AI to analyze it for threats.
                  </div>
                )}
              </div>

              <button 
                onClick={() => {
                  const p = processes.find(x => x.pid === selectedPid);
                  if (p) askAi(p);
                }}
                disabled={analyzing}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all"
              >
                {analyzing ? <Activity className="animate-spin" /> : <Search size={18} />}
                {analyzing ? 'Scanning...' : 'Analyze with AI'}
              </button>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/30 text-center">
              <div>
                <Shield size={48} className="mx-auto mb-4 opacity-20" />
                <p>Select a process from the list to begin analysis.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
