import { useState, useEffect } from 'react';
import { ArrowLeft, Activity, Cpu, HardDrive, Brain, Search, Shield } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface ProcessInfo {
  pid: number;
  name: string;
  memory: number;
  cpu_usage: number;
  path: string;
}

export default function SystemMonitor({ onBack }: { onBack: () => void }) {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [selectedPid, setSelectedPid] = useState<number | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const fetchProcesses = async () => {
    try {
      const list = await invoke<ProcessInfo[]>('get_running_processes');
      // Sort by Memory usage (descending)
      setProcesses(list.sort((a, b) => b.memory - a.memory));
      // setLoading(false);
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

    try {
        const result = await invoke<string>('analyze_process_safety', {
            procName: proc.name,
            procPath: proc.path || "Unknown",
            memoryMb: proc.memory / 1024 / 1024
        });
        setAiAnalysis(result);
    } catch (e) {
        setAiAnalysis(`Error: ${e}`);
    } finally {
        setAnalyzing(false);
    }
  };

  return (
    <div className="system-monitor min-h-screen bg-[#0b0b0d] text-white p-6 font-mono">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={20} /> Back to Dashboard
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
        <div className="lg:col-span-2 glass rounded-xl border border-white/10 overflow-hidden h-[600px] flex flex-col bg-[#111]">
          <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between text-xs text-white/50 uppercase tracking-wider">
            <span>Process Name</span>
            <span>Memory / PID</span>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
            {processes.map(proc => (
              <div 
                key={proc.pid}
                onClick={() => setSelectedPid(proc.pid)}
                className={`p-3 rounded flex justify-between items-center cursor-pointer transition-colors ${
                  selectedPid === proc.pid ? 'bg-[#0aff6a]/10 border border-[#0aff6a]/30' : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${proc.cpu_usage > 10 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                  <div>
                    <div className="font-bold text-sm">{proc.name}</div>
                    <div className="text-xs text-white/30 truncate max-w-[200px]">{proc.path || "System Process"}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[#0aff6a]">{(proc.memory / 1024 / 1024).toFixed(1)} MB</div>
                  <div className="text-xs text-white/30">PID: {proc.pid}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Analysis Panel */}
        <div className="glass rounded-xl border border-white/10 p-6 flex flex-col bg-[#111]">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Brain size={20} className="text-[#0aff6a]" /> 
            Threat Analysis
          </h2>
          
          {selectedPid ? (
            <div className="flex-1 flex flex-col">
              <div className="mb-6 p-4 bg-white/5 rounded border border-white/10">
                <div className="text-xs text-white/40 mb-1">SELECTED TARGET</div>
                <div className="text-lg font-bold text-white">{processes.find(p => p.pid === selectedPid)?.name}</div>
                <div className="text-xs font-mono text-[#0aff6a]">PID: {selectedPid}</div>
              </div>

              <div className="flex-1 border border-dashed border-white/20 rounded p-4 mb-6 relative overflow-hidden">
                {analyzing ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                    <div className="text-center">
                      <div className="animate-spin w-8 h-8 border-2 border-[#0aff6a] border-t-transparent rounded-full mx-auto mb-2"/>
                      <div className="text-xs text-[#0aff6a] animate-pulse">SCANNING NEURAL NET...</div>
                    </div>
                  </div>
                ) : aiAnalysis ? (
                  <div className="prose prose-invert text-sm">
                    <p className="text-[#0aff6a] font-bold mb-2">VERDICT:</p>
                    {aiAnalysis}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-white/20 text-center text-sm">
                    Select a process and run analysis to detect hidden threats.
                  </div>
                )}
              </div>

              <button 
                onClick={() => {
                    const p = processes.find(x => x.pid === selectedPid);
                    if(p) askAi(p);
                }}
                disabled={analyzing}
                className="w-full py-4 bg-[#0aff6a] text-black font-bold rounded hover:bg-[#00cc55] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
              >
                {analyzing ? 'ANALYZING...' : (
                  <>
                    <Search size={18} /> ANALYZE THREATS
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-white/30 text-center">
              <Shield size={48} className="mb-4 opacity-20" />
              <p>Select a process from the list to begin forensic analysis.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
