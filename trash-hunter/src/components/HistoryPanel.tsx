import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { History, Trash2, ShieldAlert, CheckCircle, XCircle, Filter, RefreshCw } from "lucide-react";

interface HistoryEntry {
    timestamp: number;
    action: string;
    path: string;
    size: number;
    success: boolean;
    error?: string;
}

function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatTime(timestamp: number) {
    return new Date(timestamp * 1000).toLocaleString();
}

export default function HistoryPanel() {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'RECYCLE' | 'ANNIHILATE' | 'JUNK'>('ALL');

    const loadHistory = async () => {
        setLoading(true);
        try {
            const data = await invoke<HistoryEntry[]>("get_history");
            // Sort by newest first
            setHistory(data.sort((a, b) => b.timestamp - a.timestamp));
        } catch (e) {
            console.error("Failed to load history", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadHistory();

        // Listen for live updates from Rust
        const unlisten = listen<HistoryEntry>('history_update', (event) => {
            console.log("📜 History Update Received:", event.payload);
            setHistory(prev => [event.payload, ...prev]);
        });

        return () => {
            unlisten.then(f => f());
        };
    }, []);

    const filteredHistory = history.filter(h => {
        if (filter === 'ALL') return true;
        if (filter === 'JUNK') return h.action === 'JUNK_CLEANUP';
        return h.action === filter;
    });

    const totalReclaimed = history.reduce((acc, curr) => acc + (curr.success ? curr.size : 0), 0);

    const handleReAction = async (path: string, permanent: boolean) => {
        try {
            await invoke("execute_god_mode_strategy", { items: [path], permanent });
            // History will auto-update via event listener
        } catch (e) {
            console.error("Re-action failed", e);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#050505] text-white overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30">
                        <History className="text-blue-400" size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black tracking-tight">SYSTEM LOGS</h2>
                        <div className="text-sm text-white/40 font-mono uppercase tracking-widest">
                            Total Reclaimed: <span className="text-green-400 font-bold">{formatBytes(totalReclaimed)}</span>
                        </div>
                    </div>
                </div>
                
                <button 
                    onClick={loadHistory}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                    <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            {/* Filters */}
            <div className="px-6 py-4 flex gap-2 border-b border-white/5 shrink-0">
                <Filter size={16} className="text-white/40 mr-2 self-center" />
                {['ALL', 'RECYCLE', 'ANNIHILATE', 'JUNK'].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f as any)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                            filter === f 
                                ? 'bg-white text-black' 
                                : 'bg-white/5 text-white/40 hover:bg-white/10'
                        }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {filteredHistory.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-white/20 gap-4">
                        <History size={64} strokeWidth={1} />
                        <div className="text-lg font-medium">No records found</div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredHistory.map((entry, i) => (
                            <div 
                                key={i}
                                className="group flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 transition-all"
                            >
                                {/* Icon based on Action */}
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                    entry.action === 'ANNIHILATE' ? 'bg-red-500/20 text-red-400' :
                                    entry.action === 'RECYCLE' ? 'bg-green-500/20 text-green-400' :
                                    'bg-blue-500/20 text-blue-400'
                                }`}>
                                    {entry.action === 'ANNIHILATE' ? <ShieldAlert size={20} /> :
                                     entry.action === 'RECYCLE' ? <Trash2 size={20} /> :
                                     <CheckCircle size={20} />}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                                            entry.action === 'ANNIHILATE' ? 'bg-red-500/20 text-red-400' :
                                            entry.action === 'RECYCLE' ? 'bg-green-500/20 text-green-400' :
                                            'bg-blue-500/20 text-blue-400'
                                        }`}>
                                            {entry.action}
                                        </span>
                                        <span className="text-xs text-white/30 font-mono">
                                            {formatTime(entry.timestamp)}
                                        </span>
                                    </div>
                                    <div className="text-sm text-white/80 font-mono truncate" title={entry.path}>
                                        {entry.path}
                                    </div>
                                </div>

                                <div className="text-right shrink-0 flex items-center gap-4">
                                    <div className="flex flex-col items-end">
                                        <div className="text-sm font-bold text-white">
                                            {formatBytes(entry.size)}
                                        </div>
                                        <div className={`text-xs font-bold uppercase ${
                                            entry.success ? 'text-green-500' : 'text-red-500'
                                        }`}>
                                            {entry.success ? 'SUCCESS' : 'FAILED'}
                                        </div>
                                    </div>

                                    {/* RE-ACTION BUTTONS (Only for non-annihilated items) */}
                                    {entry.action !== 'ANNIHILATE' && (
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity pl-4 border-l border-white/10">
                                            <button
                                                onClick={() => handleReAction(entry.path, false)}
                                                title="Recycle Again"
                                                className="p-2 bg-white/5 hover:bg-green-500/20 text-white/40 hover:text-green-400 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleReAction(entry.path, true)}
                                                title="Permanently Annihilate"
                                                className="p-2 bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 rounded-lg transition-colors"
                                            >
                                                <ShieldAlert size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
