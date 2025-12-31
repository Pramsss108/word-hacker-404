import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { HardDrive, Globe, FolderSearch, BrainCircuit, Trash2, Activity, FolderOpen, Ghost, Database, AlertTriangle, CheckCircle, XCircle, ChevronRight, ChevronLeft, ShieldAlert, Zap } from "lucide-react";

interface RegistryApp {
    name: string;
    install_location: string;
    uninstall_string: string;
}

interface GhostFolder {
    path: string;
    name: string;
    size: number;
    probability: number;
}

interface DeepScanReport {
    registry_apps: RegistryApp[];
    ghost_folders: GhostFolder[];
    driver_issues: string[];
    installer_issues: string[];
}

interface StrategyCard {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    impact: number;
    risk: 'LOW' | 'MEDIUM' | 'HIGH';
    paths: string[];
    type: 'GHOST' | 'DRIVER' | 'INSTALLER' | 'GENERIC';
}

interface AgentLog {
    id: number;
    text: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'ai' | 'matrix';
    timestamp: string;
}

export default function Brain() {
    // Agent State
    const [agentState, setAgentState] = useState<'IDLE' | 'ANALYZING' | 'READY' | 'EXECUTING'>('IDLE');
    const [scanMode, setScanMode] = useState<'GLOBAL' | 'SECTOR' | 'SURGICAL'>('GLOBAL');
    const [targetPath, setTargetPath] = useState<string>("");
    const [availableDrives, setAvailableDrives] = useState<string[]>([]);
    const [logs, setLogs] = useState<AgentLog[]>([]);
    
    // Strategy Deck State
    const [cards, setCards] = useState<StrategyCard[]>([]);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
    const [showRecycleGuide, setShowRecycleGuide] = useState(false); // NEW: Popup state
    
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    // Initialize selection when card changes
    useEffect(() => {
        if (cards.length > 0 && cards[currentCardIndex]) {
            // Default: Select ALL
            setSelectedPaths(new Set(cards[currentCardIndex].paths));
        }
    }, [currentCardIndex, cards]);

    // Auto-select all paths when card changes
    useEffect(() => {
        if (cards.length > 0 && cards[currentCardIndex]) {
            const currentCard = cards[currentCardIndex];
            // Convert string[] to Set<string>
            setSelectedPaths(new Set(currentCard.paths));
        }
    }, [currentCardIndex, cards]);

    const togglePath = (path: string) => {
        const newSet = new Set(selectedPaths);
        if (newSet.has(path)) {
            newSet.delete(path);
        } else {
            newSet.add(path);
        }
        setSelectedPaths(newSet);
    };

    const toggleAll = () => {
        if (cards.length === 0) return;
        const currentPaths = cards[currentCardIndex].paths;
        if (selectedPaths.size === currentPaths.length) {
            setSelectedPaths(new Set()); // Deselect all
        } else {
            setSelectedPaths(new Set(currentPaths)); // Select all
        }
    };

    // Load drives on mount
    useEffect(() => {
        invoke<string[]>("get_system_drives").then(setAvailableDrives).catch(console.error);
    }, []);

    const addLog = (text: string, type: AgentLog['type'] = 'info') => {
        setLogs(prev => [...prev, {
            id: Date.now(),
            text,
            type,
            timestamp: new Date().toLocaleTimeString()
        }]);
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleBrowse = async () => {
        try {
            const selected = await invoke<string | null>("pick_folder");
            if (selected) {
                setTargetPath(selected);
                addLog(`TARGET SELECTED: ${selected}`, 'info');
            }
        } catch (e) {
            addLog(`BROWSE ERROR: ${e}`, 'error');
        }
    };

    // THE GOD MODE LOGIC
    const initiateDeepScan = async () => {
        if (scanMode !== 'GLOBAL' && !targetPath) {
            addLog("ERROR: NO TARGET SELECTED. PLEASE SELECT A DRIVE OR FOLDER.", 'error');
            return;
        }

        setAgentState('ANALYZING');
        setLogs([]);
        // setReport(null);
        setCards([]);
        setCurrentCardIndex(0);
        
        addLog("INITIALIZING GOD MODE PROTOCOL...", 'matrix');
        
        // Phase 3: The "Thinking" State - Simulated Progress Logs
        const thinkingLogs = [
            "MAPPING WINDOWS REGISTRY HIVES...",
            "CROSS-REFERENCING APPDATA ORPHANS...",
            "ANALYZING DRIVER STORE REPOSITORY...",
            "CALCULATING ENTROPY OF SYSTEM FILES...",
            "DETECTING SHADOW COPIES...",
            "EXECUTING DEEP SCAN KERNEL..."
        ];

        let logIndex = 0;
        const logInterval = setInterval(() => {
            if (logIndex < thinkingLogs.length) {
                addLog(thinkingLogs[logIndex], 'info');
                logIndex++;
            }
        }, 800);

        try {
            if (targetPath) {
                addLog(`TARGET LOCKED: ${scanMode} SCAN [${targetPath}]`, 'matrix');
            }

            // The Heavy Lift (Real Backend Call)
            const result = await invoke<DeepScanReport>('perform_deep_scan', { 
                mode: scanMode, 
                target: targetPath || null 
            });

            clearInterval(logInterval);
            addLog("DATA ACQUIRED. UPLOADING TO CORTEX...", 'ai');
            
            // Artificial delay for "Uploading" feel
            await new Promise(r => setTimeout(r, 1000));
            
            // setReport(result);

            // Phase 4: Generate Strategy Cards
            const newCards: StrategyCard[] = [];

            // 1. Ghost Folders
            if (result.ghost_folders.length > 0) {
                const totalSize = result.ghost_folders.reduce((acc, g) => acc + g.size, 0);
                newCards.push({
                    id: 'ghosts',
                    title: 'GHOST DATA DETECTED',
                    subtitle: `${result.ghost_folders.length} ORPHANED FOLDERS`,
                    description: "These folders are leftovers from uninstalled software. They are not linked to any active program in the Registry.",
                    impact: totalSize,
                    risk: 'LOW',
                    paths: result.ghost_folders.map(g => g.path),
                    type: 'GHOST'
                });
            }

            // 2. Driver Issues
            if (result.driver_issues.length > 0) {
                newCards.push({
                    id: 'drivers',
                    title: 'DRIVER REPOSITORY BLOAT',
                    subtitle: `${result.driver_issues.length} REDUNDANT PACKAGES`,
                    description: "Old versions of GPU and System drivers are stored in FileRepository. You only need the latest one.",
                    impact: result.driver_issues.length * 1024 * 1024 * 500, // Approx 500MB per driver
                    risk: 'LOW',
                    paths: result.driver_issues, 
                    type: 'DRIVER'
                });
            }

            // 3. Installer Issues
            if (result.installer_issues.length > 0) {
                newCards.push({
                    id: 'installers',
                    title: 'ORPHANED INSTALLERS',
                    subtitle: `${result.installer_issues.length} USELESS MSI FILES`,
                    description: "Setup files for software that is no longer installed or has been updated.",
                    impact: result.installer_issues.length * 1024 * 1024 * 100, // Approx 100MB per msi
                    risk: 'MEDIUM',
                    paths: result.installer_issues,
                    type: 'INSTALLER'
                });
            }

            if (newCards.length === 0) {
                addLog("SYSTEM IS CLEAN. NO ACTIONS REQUIRED.", 'success');
                setAgentState('IDLE');
            } else {
                setCards(newCards);
                setAgentState('READY');
                addLog(`STRATEGY FORMULATED: ${newCards.length} ACTIONABLE ITEMS.`, 'success');
            }

        } catch (error) {
            clearInterval(logInterval);
            console.error(error);
            addLog(`CRITICAL FAILURE: ${error}`, 'error');
            setAgentState('IDLE');
        }
    };

    const [permanentDelete, setPermanentDelete] = useState(false);

    const executeCardAction = async (card: StrategyCard) => {
        setAgentState('EXECUTING');
        addLog(`EXECUTING PROTOCOL: ${card.title}...`, 'warning');

        try {
            // Use SELECTED paths only
            let items = Array.from(selectedPaths);
            
            if (items.length > 0) {
                const result = await invoke<string>("execute_god_mode_strategy", { items, permanent: permanentDelete });
                addLog(result, 'success');
                
                if (!permanentDelete) {
                    setShowRecycleGuide(true); // SHOW POPUP ONLY FOR RECYCLE
                }
            } else {
                addLog("NO ITEMS SELECTED. SKIPPING EXECUTION.", 'warning');
            }

            addLog(`${card.title} COMPLETE.`, 'success');
            
            // Remove card from deck
            const newCards = cards.filter(c => c.id !== card.id);
            setCards(newCards);
            if (newCards.length === 0) {
                setAgentState('IDLE');
                addLog("ALL TASKS COMPLETED. SYSTEM OPTIMIZED.", 'matrix');
            } else {
                setAgentState('READY');
                setCurrentCardIndex(0);
            }

        } catch (e) {
            addLog(`EXECUTION FAILED: ${e}`, 'error');
            setAgentState('READY');
        }
    };

    const ignoreCard = () => {
        const newCards = cards.filter((_, i) => i !== currentCardIndex);
        setCards(newCards);
        if (newCards.length === 0) {
            setAgentState('IDLE');
            addLog("ALL TASKS REVIEWED.", 'info');
        } else {
            setCurrentCardIndex(0);
        }
    };

    return (
        <div className="h-full flex flex-col p-6 max-w-7xl mx-auto relative overflow-hidden">
            {/* Background FX */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/10 via-black to-black pointer-events-none" />

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between mb-8 border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-4">
                        <span className="text-purple-500">GOD MODE</span>
                        <span className="text-white/20">///</span>
                        <span>ARCHITECT</span>
                    </h1>
                    <div className="text-xs font-mono text-purple-400/60 mt-2 tracking-[0.2em]">AUTONOMOUS SYSTEM INTELLIGENCE</div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-[10px] text-white/30 uppercase tracking-widest">System Status</div>
                        <div className={`text-xl font-bold font-mono ${
                            agentState === 'IDLE' ? 'text-white/50' :
                            agentState === 'ANALYZING' ? 'text-amber-400 animate-pulse' :
                            agentState === 'READY' ? 'text-green-400' : 'text-purple-400'
                        }`}>
                            {agentState}
                        </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${
                        agentState === 'IDLE' ? 'bg-white/10' :
                        agentState === 'ANALYZING' ? 'bg-amber-400 animate-ping' :
                        'bg-green-400 shadow-[0_0_10px_#4ade80]'
                    }`} />
                </div>
            </div>

            <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0">
                
                {/* LEFT: MISSION CONTROL (Selector) */}
                <div className="lg:col-span-4 flex flex-col h-full min-h-0">
                    <div className="text-xs font-mono text-white/40 uppercase tracking-widest mb-2 shrink-0">Select Mission Scope</div>
                    
                    <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                        {/* GLOBAL CARD */}
                        <button 
                            onClick={() => { setScanMode('GLOBAL'); setTargetPath(""); }}
                            disabled={agentState !== 'IDLE'}
                            className={`p-5 rounded-2xl border transition-all duration-300 text-left group relative overflow-hidden w-full ${
                                scanMode === 'GLOBAL' 
                                    ? 'bg-purple-900/20 border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.2)]' 
                                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-50 transition-opacity">
                                <Globe size={40} />
                            </div>
                            <div className="relative z-10">
                                <div className="text-xl font-bold text-white mb-1">GLOBAL</div>
                                <div className="text-[10px] text-purple-300 font-mono mb-2">FULL SYSTEM AUDIT</div>
                                <p className="text-xs text-white/60">Deep analysis of Registry, Drivers, and all Drives. Takes 2-5 mins.</p>
                            </div>
                        </button>

                        {/* SECTOR CARD */}
                        <button 
                            onClick={() => { setScanMode('SECTOR'); setTargetPath(""); }}
                            disabled={agentState !== 'IDLE'}
                            className={`p-5 rounded-2xl border transition-all duration-300 text-left group relative overflow-hidden w-full ${
                                scanMode === 'SECTOR' 
                                    ? 'bg-blue-900/20 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.2)]' 
                                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-50 transition-opacity">
                                <HardDrive size={40} />
                            </div>
                            <div className="relative z-10">
                                <div className="text-xl font-bold text-white mb-1">SECTOR</div>
                                <div className="text-[10px] text-blue-300 font-mono mb-2">DRIVE TARGETING</div>
                                <p className="text-xs text-white/60">Focus on a specific drive (C:, D:) to reclaim space quickly.</p>
                            </div>
                        </button>

                        {/* SECTOR SELECTOR (Only visible when SECTOR is active) */}
                        {scanMode === 'SECTOR' && (
                            <div className="grid grid-cols-3 gap-2 animate-in slide-in-from-top-2">
                                {availableDrives.map(drive => (
                                    <button
                                        key={drive}
                                        onClick={() => setTargetPath(drive)}
                                        className={`p-2 rounded-lg border text-center font-mono text-sm transition-all ${
                                            targetPath === drive 
                                                ? 'bg-blue-500 text-white border-blue-400' 
                                                : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                                        }`}
                                    >
                                        {drive}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* SURGICAL CARD */}
                        <button 
                            onClick={() => { setScanMode('SURGICAL'); setTargetPath(""); }}
                            disabled={agentState !== 'IDLE'}
                            className={`p-5 rounded-2xl border transition-all duration-300 text-left group relative overflow-hidden w-full ${
                                scanMode === 'SURGICAL' 
                                    ? 'bg-amber-900/20 border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.2)]' 
                                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-50 transition-opacity">
                                <FolderSearch size={40} />
                            </div>
                            <div className="relative z-10">
                                <div className="text-xl font-bold text-white mb-1">SURGICAL</div>
                                <div className="text-[10px] text-amber-300 font-mono mb-2">FOLDER ANALYSIS</div>
                                <p className="text-xs text-white/60">Pinpoint analysis of a specific folder structure.</p>
                            </div>
                        </button>

                        {/* SURGICAL INPUT (Only visible when SURGICAL is active) */}
                        {scanMode === 'SURGICAL' && (
                            <div className="flex gap-2 animate-in slide-in-from-top-2">
                                <input 
                                    type="text" 
                                    value={targetPath}
                                    onChange={(e) => setTargetPath(e.target.value)}
                                    placeholder="C:\Users\..."
                                    className="flex-1 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-amber-500 outline-none"
                                />
                                <button 
                                    onClick={handleBrowse}
                                    className="bg-amber-600 hover:bg-amber-500 text-white p-2 rounded-lg transition-colors"
                                >
                                    <FolderOpen size={18} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ACTIVATE BUTTON */}
                    <div className="pt-4 mt-auto shrink-0">
                        <button
                            onClick={initiateDeepScan}
                            disabled={agentState !== 'IDLE' || (scanMode !== 'GLOBAL' && !targetPath)}
                            className={`w-full py-4 rounded-xl font-bold tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${
                                agentState === 'IDLE' && (scanMode === 'GLOBAL' || targetPath)
                                    ? 'bg-white text-black hover:bg-purple-400 hover:scale-[1.02]'
                                    : 'bg-white/10 text-white/50 cursor-not-allowed'
                            }`}
                        >
                            {agentState === 'IDLE' ? (
                                <>
                                    <BrainCircuit size={20} />
                                    INITIATE NEURAL LINK
                                </>
                            ) : (
                                <>
                                    <Activity size={20} className="animate-pulse" />
                                    PROCESSING...
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* CENTER: TERMINAL & STRATEGY */}
                <div className="lg:col-span-8 flex flex-col gap-4 h-full min-h-0">
                    
                    {/* Terminal Output - Only visible when NO cards are active */}
                    {cards.length === 0 && (
                        <div className="flex-1 bg-black border border-white/20 rounded-2xl p-6 font-mono text-base overflow-hidden flex flex-col shadow-inner min-h-0">
                            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-4 shrink-0">
                                <span className="text-sm text-white/50 uppercase tracking-widest font-bold">/var/log/god_mode.log</span>
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-3 pr-4 scrollbar-thin scrollbar-thumb-white/20 custom-scrollbar">
                                {logs.map(log => (
                                    <div key={log.id} className={`flex gap-4 ${
                                        log.type === 'error' ? 'text-red-400 font-bold' :
                                        log.type === 'success' ? 'text-green-400 font-bold' :
                                        log.type === 'warning' ? 'text-amber-400 font-bold' :
                                        log.type === 'ai' ? 'text-purple-400 font-bold' :
                                        log.type === 'matrix' ? 'text-green-500 font-black text-lg' :
                                        'text-white font-medium'
                                    }`}>
                                        <span className="text-white/30 shrink-0 font-mono">[{log.timestamp}]</span>
                                        <span className="break-words tracking-wide">{log.text}</span>
                                    </div>
                                ))}
                                <div ref={logsEndRef} />
                            </div>
                        </div>
                    )}

                    {/* Strategy Deck - Takes FULL HEIGHT when active */}
                    {cards.length > 0 && (
                        <div className="flex-1 bg-[#050505] border border-white/20 rounded-3xl p-6 animate-in slide-in-from-bottom-4 fade-in duration-700 flex flex-col relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] z-50">
                            
                            {/* Big Navigation Arrows (Floating) */}
                            <button 
                                onClick={() => setCurrentCardIndex(prev => Math.max(0, prev - 1))}
                                disabled={currentCardIndex === 0}
                                className="absolute left-4 top-1/2 -translate-y-1/2 p-6 bg-black/50 hover:bg-white/10 rounded-full disabled:opacity-0 transition-all z-30 group border border-white/10 backdrop-blur-md"
                            >
                                <ChevronLeft size={48} className="text-white/50 group-hover:text-white transition-colors" />
                            </button>
                            <button 
                                onClick={() => setCurrentCardIndex(prev => Math.min(cards.length - 1, prev + 1))}
                                disabled={currentCardIndex === cards.length - 1}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-6 bg-black/50 hover:bg-white/10 rounded-full disabled:opacity-0 transition-all z-30 group border border-white/10 backdrop-blur-md"
                            >
                                <ChevronRight size={48} className="text-white/50 group-hover:text-white transition-colors" />
                            </button>

                            {/* Header */}
                            <div className="flex items-center justify-between mb-4 shrink-0 px-12">
                                <div className="flex items-center gap-6">
                                    <div className="p-4 bg-purple-600/20 rounded-2xl shadow-[0_0_20px_rgba(168,85,247,0.4)] border border-purple-500/30">
                                        <BrainCircuit className="text-purple-300" size={32} />
                                    </div>
                                    <div>
                                        <div className="text-2xl font-black text-white tracking-wide mb-1">CORTEX STRATEGY</div>
                                        <div className="text-sm font-mono text-purple-300 uppercase tracking-widest font-bold">
                                            CARD {currentCardIndex + 1} OF {cards.length}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 px-6 py-3 bg-green-900/20 border border-green-500/50 rounded-full shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                                    <ShieldAlert size={20} className="text-green-400" />
                                    <span className="text-sm font-black text-green-400 uppercase tracking-wider">Safe Mode Active</span>
                                </div>
                            </div>

                            {/* Active Card Stack - Using Grid for perfect stacking */}
                            <div className="flex-1 grid grid-cols-1 grid-rows-1 overflow-hidden px-12 pb-2">
                                {cards.map((card, index) => (
                                    <div 
                                        key={card.id}
                                        className={`col-start-1 row-start-1 flex flex-col transition-all duration-500 ${
                                            index === currentCardIndex ? 'opacity-100 translate-x-0 z-10' : 
                                            index < currentCardIndex ? 'opacity-0 -translate-x-20 pointer-events-none' : 
                                            'opacity-0 translate-x-20 pointer-events-none'
                                        }`}
                                    >
                                        {/* Header Section */}
                                        <div className="flex items-start gap-6 mb-4 shrink-0">
                                            <div className={`p-4 rounded-2xl shrink-0 ${
                                                card.type === 'GHOST' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                                                card.type === 'DRIVER' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                                                'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                            }`}>
                                                {card.type === 'GHOST' ? <Ghost size={32} /> :
                                                 card.type === 'DRIVER' ? <Database size={32} /> :
                                                 <AlertTriangle size={32} />}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-2xl font-bold text-white mb-1 tracking-tight">{card.title}</h3>
                                                <div className="text-sm font-mono text-white/60 mb-3 uppercase tracking-wider">{card.subtitle}</div>
                                                <div className="flex items-center gap-4 text-xs font-bold">
                                                    <span className="text-red-300 flex items-center gap-2 bg-red-900/20 px-3 py-1.5 rounded-lg border border-red-500/30">
                                                        <Zap size={14} /> SAVE {formatBytes(card.impact)}
                                                    </span>
                                                    <span className={`${
                                                        card.risk === 'LOW' ? 'text-green-300 bg-green-900/20 border-green-500/30' : 'text-amber-300 bg-amber-900/20 border-amber-500/30'
                                                    } flex items-center gap-2 px-3 py-1.5 rounded-lg border`}>
                                                        <ShieldAlert size={14} /> RISK: {card.risk}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Description - Always Visible */}
                                        <div className="mb-4 shrink-0 px-1">
                                            <p className="text-base text-white/80 font-medium leading-relaxed">{card.description}</p>
                                        </div>

                                        {/* Scrollable Manifest Area */}
                                        <div className="flex-1 bg-black/40 rounded-xl p-4 border border-white/10 overflow-y-auto custom-scrollbar min-h-0 shadow-inner">
                                            <div className="flex items-center justify-between mb-3 sticky top-0 bg-[#0a0a0a] py-2 -mt-2 border-b border-white/10 z-10">
                                                <div className="text-xs text-white/40 uppercase font-bold tracking-widest">Target Manifest</div>
                                                <button 
                                                    onClick={toggleAll}
                                                    className="text-xs font-bold text-purple-400 hover:text-purple-300 uppercase tracking-wider"
                                                >
                                                    {selectedPaths.size === card.paths.length ? 'Deselect All' : 'Select All'}
                                                </button>
                                            </div>
                                            <div className="font-mono text-xs text-white/70 space-y-1">
                                                {card.paths.slice(0, 100).map((p, i) => (
                                                    <div 
                                                        key={i} 
                                                        onClick={() => togglePath(p)}
                                                        className={`flex items-center gap-3 border-b border-white/5 pb-1.5 last:border-0 hover:bg-white/5 px-2 rounded transition-colors cursor-pointer select-none ${
                                                            selectedPaths.has(p) ? 'opacity-100' : 'opacity-50'
                                                        }`}
                                                    >
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                                            selectedPaths.has(p) 
                                                                ? 'bg-green-500 border-green-500' 
                                                                : 'border-white/30'
                                                        }`}>
                                                            {selectedPaths.has(p) && <CheckCircle size={12} className="text-black" />}
                                                        </div>
                                                        <span className="break-all">{p}</span>
                                                    </div>
                                                ))}
                                                {card.paths.length > 100 && (
                                                    <div className="text-white/40 italic pl-9 font-bold pt-2">
                                                        ...and {card.paths.length - 100} more items
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions - Always Visible at Bottom */}
                                        <div className="mt-4 flex flex-col gap-3 shrink-0 pb-1">
                                            
                                            {/* Permanent Delete Toggle */}
                                            <div 
                                                onClick={() => setPermanentDelete(!permanentDelete)}
                                                className={`flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                                                    permanentDelete 
                                                        ? 'bg-red-900/20 border-red-500/50' 
                                                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                                                        permanentDelete ? 'bg-red-500 border-red-500' : 'border-white/30'
                                                    }`}>
                                                        {permanentDelete && <div className="w-2 h-2 bg-black rounded-full" />}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className={`text-sm font-bold uppercase tracking-wider ${permanentDelete ? 'text-red-400' : 'text-white/60'}`}>
                                                            Permanent Annihilation
                                                        </span>
                                                        <span className="text-xs text-white/40 font-mono">
                                                            {permanentDelete ? 'WARNING: Bypasses Recycle Bin. Irreversible.' : 'Safe Mode: Moves to Recycle Bin.'}
                                                        </span>
                                                    </div>
                                                </div>
                                                {permanentDelete && <ShieldAlert size={18} className="text-red-500 animate-pulse" />}
                                            </div>

                                            <div className="flex gap-4">
                                                <button 
                                                    onClick={() => executeCardAction(card)}
                                                    className={`flex-1 py-4 font-bold text-lg rounded-xl shadow-lg transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3 uppercase tracking-widest ${
                                                        permanentDelete 
                                                            ? 'bg-red-600 text-white hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.4)]' 
                                                            : 'bg-white text-black hover:bg-green-400'
                                                    }`}
                                                >
                                                    <Trash2 size={20} strokeWidth={2.5} />
                                                    {permanentDelete ? 'ANNIHILATE' : 'Execute Recycle'}
                                                </button>
                                                <button 
                                                    onClick={ignoreCard}
                                                    className="px-8 py-4 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest border border-white/10 hover:border-white/30"
                                                >
                                                    <XCircle size={18} />
                                                    Ignore
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* RECYCLE BIN GUIDE MODAL */}
            {showRecycleGuide && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-[#0a0a0a] border border-white/20 rounded-3xl max-w-md w-full p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
                        {/* Decorative background elements */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-purple-500 to-blue-500" />
                        
                        <div className="flex flex-col items-center text-center gap-6">
                            <div className="w-20 h-20 bg-green-900/20 rounded-full flex items-center justify-center border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                                <Trash2 size={40} className="text-green-400" />
                            </div>
                            
                            <div>
                                <h3 className="text-2xl font-black text-white mb-2 tracking-tight">MOVED TO RECYCLE BIN</h3>
                                <p className="text-white/60 leading-relaxed">
                                    For your safety, these files have been moved to your system's Recycle Bin instead of being permanently deleted.
                                </p>
                            </div>

                            <div className="bg-white/5 rounded-xl p-4 w-full border border-white/10 text-left">
                                <div className="flex items-start gap-3">
                                    <ShieldAlert size={20} className="text-purple-400 shrink-0 mt-0.5" />
                                    <div className="text-sm text-white/80">
                                        <span className="text-purple-400 font-bold block mb-1">Why?</span>
                                        This allows you to restore any file if you change your mind or if a program stops working correctly.
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={() => setShowRecycleGuide(false)}
                                className="w-full py-4 bg-white text-black hover:bg-green-400 font-bold text-lg rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] uppercase tracking-widest"
                            >
                                Understood
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
