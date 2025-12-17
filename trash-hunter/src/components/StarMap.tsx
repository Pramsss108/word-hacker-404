import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import TacticalMenu from "./TacticalMenu";

// Backend Types
// Backend Types
export interface StorageNode {
    name: string;
    size: number;
    children: StorageNode[];
    is_dir: boolean;
}

export interface FileInfo {
    path: string;
    name: string;
    is_dir: boolean;
    size: number;
    modified: number;
}

export interface DiskStats {
    total: number;
    used: number;
    free: number;
}

const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

import ScannerLoader from "./ScannerLoader";

interface StarMapProps {
    preloadedData?: {
        nodes: StorageNode[];
        largestFiles: FileInfo[];
        drives: string[];
        diskStats: DiskStats | null;
        path: string;
    } | null;
}

export default function StarMap({ preloadedData }: StarMapProps) {
    // Navigation State
    const [currentPath, setCurrentPath] = useState(preloadedData?.path || "C:\\");
    const [history, setHistory] = useState<string[]>([]);
    const [availableDrives, setAvailableDrives] = useState<string[]>(preloadedData?.drives || []);

    // Data State
    const [nodes, setNodes] = useState<StorageNode[]>(preloadedData?.nodes || []);
    const [loading, setLoading] = useState(false);
    const [diskStats, setDiskStats] = useState<DiskStats | null>(preloadedData?.diskStats || null);
    
    // CACHE for "Hot Speed" Navigation
    const cacheRef = useRef<Map<string, { nodes: StorageNode[], largestFiles: FileInfo[] }>>(new Map());

    // Sidebar State
    const [largestFiles, setLargestFiles] = useState<FileInfo[]>(preloadedData?.largestFiles || []);
    // const [scanningHogs, setScanningHogs] = useState(false);

    // Tactical Menu & Modal State
    const [menuState, setMenuState] = useState<{ x: number, y: number, file: any } | null>(null);
    const [cortexTarget, setCortexTarget] = useState<{ name: string, path: string } | null>(null);
    const [analysis, setAnalysis] = useState<{ score: number, type: string, advice: string } | null>(null);
    const [analyzing, setAnalyzing] = useState(false);

    // Critical Sector Definitions
    // ONLY lock the OS kernel and unreadable system folders. User data and Programs should be accessible.
    const CRITICAL_SECTORS = ["windows", "system volume information", "$recycle.bin", "recovery", "boot"];
    const isCritical = (name: string) => CRITICAL_SECTORS.includes(name.toLowerCase());

    // Fetch Stats
    const refreshDiskStats = async (target?: string) => {
        try {
            const stats = await invoke<DiskStats>("get_disk_stats", { targetPath: target || currentPath });
            setDiskStats(stats);
        } catch (e) { console.error("Disk Stats Error", e); }
    };

    // Analyze Critical Sector
    useEffect(() => {
        if (cortexTarget) {
            setAnalyzing(true);
            setAnalysis(null);
            invoke<any>("ask_cortex", { path: cortexTarget.path })
                .then(report => {
                    setAnalysis({
                        score: report.safety_score,
                        type: report.description,
                        advice: report.recommendation
                    });
                })
                .catch(e => {
                    setAnalysis({
                        score: 0,
                        type: "Analysis Failed",
                        advice: e.toString()
                    });
                })
                .finally(() => setAnalyzing(false));
        }
    }, [cortexTarget]);

    // Initial Load & Drive Detection
    useEffect(() => {
        // If data arrives LATE (after boot timeout), hydrate it now.
        if (preloadedData && preloadedData.path === currentPath) {
            setNodes(preloadedData.nodes);
            setLargestFiles(preloadedData.largestFiles);
            setAvailableDrives(preloadedData.drives);
            if (preloadedData.diskStats) setDiskStats(preloadedData.diskStats);
            setLoading(false);
            return; // Skip the manual fetch
        }

        if (nodes.length > 0) return; // Already data present

        refreshDiskStats();
        // Fetch real drives
        invoke<string[]>("get_system_drives").then(drives => {
            setAvailableDrives(drives);
            // Default to C: if available, else first
            if (nodes.length === 0) {
                if (drives.includes("C:\\")) loadLevel("C:\\");
                else if (drives.length > 0) loadLevel(drives[0]);
            }
        }).catch(() => {
            if (nodes.length === 0) loadLevel("C:\\");
        });
    }, [preloadedData]); // Re-run when appData finally arrives

    // Navigation Logic (Unified Scan)
    const loadLevel = async (path: string) => {
        // 1. CHECK CACHE (Hot Speed)
        if (cacheRef.current.has(path)) {
            const cached = cacheRef.current.get(path)!;
            setNodes(cached.nodes);
            setLargestFiles(cached.largestFiles);
            setCurrentPath(path);
            return;
        }

        setLoading(true);
        setNodes([]);
        setLargestFiles([]); // Clear old sidebar

        try {
            // HYBRID ENGINE: Try RAM first (Instant), then Disk (Reliable)
            let loadedFromRam = false;
            try {
                const ramResult = await invoke<{ nodes: StorageNode[], largest_files: FileInfo[] }>("browse_ram_index", { path });
                // If RAM returns valid data, use it.
                if (ramResult.nodes.length > 0) {
                    setNodes(ramResult.nodes);
                    setLargestFiles(ramResult.largest_files);
                    setCurrentPath(path);
                    setLoading(false);
                    loadedFromRam = true;
                    
                    // Cache it!
                    cacheRef.current.set(path, { nodes: ramResult.nodes, largestFiles: ramResult.largest_files });
                }
            } catch (ramError) {
                // Squelch RAM errors (index empty/miss), proceed to disk
            }

            if (!loadedFromRam) {
                // Fallback to Disk Scan
                const result = await invoke<{ nodes: StorageNode[], largest_files: FileInfo[] }>("scan_sector_unified", { path });
                setNodes(result.nodes);
                setLargestFiles(result.largest_files);
                setCurrentPath(path);
                
                // Cache it!
                cacheRef.current.set(path, { nodes: result.nodes, largestFiles: result.largest_files });
            }
        } catch (e: any) {
            console.error("Navigation Failed:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleDrillDown = (folderName: string, isDir: boolean) => {
        if (!isDir) return; // ELITE: Prevent drilling into files

        const separator = currentPath.endsWith("\\") ? "" : "\\";
        const newPath = `${currentPath}${separator}${folderName}`;

        if (isCritical(folderName)) {
            setCortexTarget({ name: folderName, path: newPath });
            return;
        }

        // Update history
        setHistory(prev => [...prev, currentPath]);
        loadLevel(newPath);
    };

    const handleBack = () => {
        if (history.length === 0) return;
        const previous = history[history.length - 1];
        setHistory(prev => prev.slice(0, -1));
        loadLevel(previous);
    };

    const handleDriveChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const drive = e.target.value;
        setHistory([]);
        refreshDiskStats(drive); // Immediate Update of Top Bar
        loadLevel(drive);
    };

    // Menu Handlers
    const handleContextMenu = (e: React.MouseEvent, node: StorageNode) => {
        e.preventDefault();
        e.stopPropagation();
        const separator = currentPath.endsWith("\\") ? "" : "\\";
        const fullPath = `${currentPath}${separator}${node.name}`;

        setMenuState({
            x: e.clientX,
            y: e.clientY,
            file: { name: node.name, path: fullPath, is_dir: true }
        });
    };

    const handleSidebarContextMenu = (e: React.MouseEvent, file: FileInfo) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuState({
            x: e.clientX,
            y: e.clientY,
            file: { name: file.name, path: file.path, is_dir: file.is_dir }
        });
    };

    const handleMenuAction = async (action: string, file: any) => {
        setMenuState(null);
        try {
            if (action === "delete") {
                if (confirm(`Permanently delete ${file.name}? THIS CANNOT BE UNDONE.`)) {
                    await invoke("delete_items", { paths: [file.path] });
                    loadLevel(currentPath);
                    // scanLargest(); // Removed: not defined in this scope.
                    refreshDiskStats();
                }
            } else if (action === "open") {
                await invoke("open_file", { path: file.path });
            } else if (action === "reveal") {
                await invoke("show_in_explorer", { path: file.path });
            } else if (action === "copy_path") {
                await navigator.clipboard.writeText(file.path);
            } else if (action === "analyze") {
                const report = await invoke<any>("ask_cortex", { path: file.path });
                alert(`CORTEX ANALYSIS:\n\nSCORE: ${report.safety_score}/100\n\nTYPE: ${report.description}\n\nADVICE: ${report.recommendation}`);
            }
        } catch (e: any) {
            alert("Action Failed: " + e.toString());
        }
    };

    // Mouse Navigation Shortcut (Back/Forward Buttons)
    useEffect(() => {
        const handleMouseNav = (e: MouseEvent) => {
            if (e.button === 3) {
                // Back Button
                e.preventDefault();
                if (history.length > 0) handleBack();
            } else if (e.button === 4) {
                // Forward Button (Not yet implemented with history stack)
                e.preventDefault();
                // console.log("Forward");
            }
        };

        window.addEventListener('mouseup', handleMouseNav);
        return () => window.removeEventListener('mouseup', handleMouseNav);
    }, [history, handleBack]); // Re-bind when history changes to capture latest state

    // Render Helpers
    // const totalLevelSize = nodes.reduce((acc, curr) => acc + curr.size, 0);

    return (
        <div className="h-full flex flex-col max-w-7xl mx-auto p-4 gap-4" onClick={() => setMenuState(null)}>
            {/* Cortex Security Modal */}
            {cortexTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#0a0a0a] border border-red-500/30 rounded-xl p-6 max-w-lg w-full shadow-[0_0_50px_rgba(255,0,0,0.1)] relative">
                        <button
                            onClick={() => setCortexTarget(null)}
                            className="absolute top-4 right-4 text-white/30 hover:text-white"
                        >
                            ✕
                        </button>

                        <div className="flex items-center gap-4 mb-6">
                            <div className="text-4xl">🔒</div>
                            <div>
                                <h2 className="text-xl font-bold text-white tracking-widest">RESTRICTED SECTOR</h2>
                                <div className="text-red-400 font-mono text-sm">{cortexTarget.name}</div>
                            </div>
                        </div>

                        {analyzing ? (
                            <div className="py-8 flex flex-col items-center gap-4">
                                <div className="text-neon-cyan animate-pulse font-mono">ESTABLISHING CORTEX LINK...</div>
                                <div className="w-full h-1 bg-white/10 rounded overflow-hidden">
                                    <div className="h-full bg-neon-cyan w-1/3 animate-[shimmer_1s_infinite]" />
                                </div>
                            </div>
                        ) : analysis ? (
                            <div className="space-y-4">
                                <div className="bg-white/5 p-4 rounded border border-white/10">
                                    <div className="text-[10px] text-white/50 mb-1 uppercase tracking-widest">Classification</div>
                                    <div className="text-white font-bold">{analysis.type}</div>
                                </div>
                                <div className="bg-white/5 p-4 rounded border border-white/10">
                                    <div className="text-[10px] text-white/50 mb-1 uppercase tracking-widest">Cortex Directive</div>
                                    <div className="text-neon-cyan text-sm leading-relaxed">{analysis.advice}</div>
                                </div>
                                {analysis.score > 80 && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs text-center rounded">
                                        ⚠️ MODIFICATION OF THIS SECTOR MAY CAUSE OS INSTABILITY
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            {/* Tactical Menu Overlay */}
            {menuState && (
                <TacticalMenu
                    x={menuState.x}
                    y={menuState.y}
                    file={menuState.file}
                    onClose={() => setMenuState(null)}
                    onAction={handleMenuAction}
                />
            )}


            <div className="glass-panel p-4 rounded-xl flex gap-4 items-center shadow-lg bg-black/40 backdrop-blur-md border border-white/10">
                <div className="flex items-center gap-4 flex-1">
                    <button
                        onClick={handleBack}
                        disabled={history.length === 0}
                        className="p-2 rounded-full bg-white/5 hover:bg-neon-cyan/20 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    >
                        🔙
                    </button>

                    <div className="flex gap-2 items-center bg-black/40 p-2 rounded-lg border border-white/10">
                        <span className="text-neon-cyan text-xl">🔭</span>
                        <select
                            className="bg-transparent text-neon-cyan font-bold outline-none cursor-pointer uppercase"
                            onChange={handleDriveChange}
                            value={availableDrives.find(d => currentPath.startsWith(d)) || ""}
                        >
                            {availableDrives.map(drive => (
                                <option key={drive} value={drive} className="bg-black text-white">
                                    {drive}
                                </option>
                            ))}
                        </select>
                        <div className="h-4 w-[1px] bg-white/20 mx-2" />
                        <div className="text-white/80 font-mono text-sm truncate max-w-[400px]">
                            {currentPath}
                        </div>
                    </div>

                    {/* Disk Health Bar */}
                    <div className="flex-1 max-w-xs ml-4 border-l border-white/10 pl-4 flex flex-col justify-center">
                        <div className="flex justify-between text-[10px] font-mono mb-1 text-white/70">
                            <span className="font-bold">
                                {(availableDrives.find(d => currentPath.startsWith(d)) || "DRIVE").toUpperCase()} DRIVE
                            </span>
                            <span>
                                {diskStats && !loading && diskStats.total > 0
                                    ? `${formatBytes(diskStats.used)} / ${formatBytes(diskStats.total)}`
                                    : <span className="animate-pulse">CALCULATING...</span>
                                }
                            </span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
                            {diskStats && !loading && diskStats.total > 0 ? (
                                <div
                                    className={`h-full relative transition-all duration-1000 ${diskStats.used / diskStats.total > 0.9 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-[#00f3ff] shadow-[0_0_10px_#00f3ff]'}`}
                                    style={{ width: `${Math.max(2, (diskStats.used / diskStats.total) * 100)}%` }}
                                >
                                    <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-white/50" />
                                </div>
                            ) : (
                                <div className="h-full w-full bg-white/10 animate-pulse relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_1s_infinite]" />
                                </div>
                            )}
                        </div>
                        <div className="mt-1 text-right text-[9px] text-white/30 font-mono uppercase">
                            {diskStats && !loading && diskStats.total > 0 ? `${formatBytes(diskStats.free)} Available` : "..."}
                        </div>
                    </div>
                </div>

                <div className={`text-neon-cyan font-mono text-xs border border-neon-cyan/20 px-2 py-1 rounded bg-neon-cyan/5 transition-all ${loading ? "animate-pulse" : ""}`}>
                    {loading ? "SCANNING SECTOR..." : `${nodes.length} OBJECTS`}
                </div>
            </div>

            <div className="flex-1 flex gap-4 min-h-0 relative">
                {/* Loader Overlay */}
                <ScannerLoader visible={loading} path={currentPath} />

                {/* Main View: Infinity Map */}
                <div className="flex-[2] glass-panel rounded-xl p-4 relative overflow-hidden flex flex-col">
                    <h3 className="text-white/50 font-mono text-xs mb-4 uppercase tracking-widest border-b border-white/5 pb-2">
                        Sector Topology
                    </h3>

                    {/* The Treemap Grid - NOW RECURSIVE & GALACTIC */}
                    <div className="flex-1 overflow-visible content-start flex flex-wrap gap-1 p-1 custom-scrollbar overflow-y-auto">
                        {!loading && nodes.length === 0 ? (
                            <div className="w-full h-full flex items-center justify-center flex-col gap-4 text-white/20">
                                <div className="text-4xl animate-pulse">🔭</div>
                                <div className="font-mono text-xs tracking-widest">SECTOR EMPTY</div>
                            </div>
                        ) : (
                            <GalacticGrid nodes={nodes} onDrill={handleDrillDown} onContext={handleContextMenu} />
                        )}
                    </div>
                </div>

                {/* Side View: Black Hole */}
                <div className="flex-1 glass-panel rounded-xl p-4 flex flex-col min-w-[300px]">
                    <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                        <h3 className="text-red-400 font-mono text-xs uppercase tracking-widest flex items-center gap-2">
                            <span>⚫</span> Black Hole (Global)
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                        {largestFiles.length === 0 ? (
                            <div className="text-white/20 text-center text-xs">No anomalies detected.</div>
                        ) : (
                            largestFiles.map((file, i) => (
                                <div
                                    key={i}
                                    onContextMenu={(e) => handleSidebarContextMenu(e, file)}
                                    className="group relative bg-white/5 hover:bg-red-500/10 border border-transparent hover:border-red-500/50 p-2 rounded transition-all cursor-pointer shadow-sm hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="font-bold text-white text-xs truncate w-3/4" title={file.name}>{file.name}</div>
                                        <div className="text-red-400 font-mono text-xs">{formatBytes(file.size)}</div>
                                    </div>
                                    <div className="text-[10px] text-white/30 truncate font-mono">{file.path}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Sub-Components ---

// --- New Galactic Grid Layout (Surfable & Readable) ---

const GalacticGrid = ({ nodes, onDrill, onContext }: { nodes: StorageNode[], onDrill: (n: string, isDir: boolean) => void, onContext: (e: any, n: StorageNode) => void }) => {
    // Sort: Folders first, then Files. Both by Size Descending.
    const sorted = [...nodes].sort((a, b) => {
        if (a.is_dir === b.is_dir) return b.size - a.size;
        return a.is_dir ? -1 : 1;
    });

    return (
        <div className="w-full flex flex-wrap content-start gap-4 p-4 pb-20">
            {sorted.map((node, i) => (
                <GalaxyNode key={i} node={node} onDrill={onDrill} onContext={onContext} />
            ))}
        </div>
    );
};

const GalaxyNode = ({ node, onDrill, onContext }: { node: StorageNode, onDrill: (n: string, isDir: boolean) => void, onContext: (e: any, n: StorageNode) => void }) => {
    // Size Classes for Visual Hierarchy
    const gb = node.size / (1024 * 1024 * 1024);

    // Tiers
    // Tier S: > 50 GB (Massive Star)
    // Tier A: > 10 GB (Giant)
    // Tier B: > 1 GB (Star)
    // Tier C: < 1 GB (Planet/Asteroid)

    let sizeClass = "w-32 h-24"; // Default
    let colorClass = "bg-white/5 border-white/10";
    let icon = node.is_dir ? "📁" : "📄";
    let glow = "";

    if (node.is_dir) {
        if (gb > 50) {
            sizeClass = "w-64 h-40";
            colorClass = "bg-gradient-to-br from-purple-900/40 to-black border-purple-500/50";
            glow = "shadow-[0_0_30px_rgba(168,85,247,0.2)]";
            icon = "🌌";
        }
        else if (gb > 10) {
            sizeClass = "w-48 h-32";
            colorClass = "bg-gradient-to-br from-blue-900/40 to-black border-blue-500/50";
            icon = "🪐";
        }
        else if (gb > 1) {
            sizeClass = "w-40 h-28";
            colorClass = "bg-gradient-to-br from-cyan-900/40 to-black border-cyan-500/30";
        }
    } else {
        // Files
        if (gb > 5) {
            sizeClass = "w-40 h-24";
            colorClass = "bg-red-500/10 border-red-500/30";
            icon = "🛑";
        } else {
            sizeClass = "w-28 h-20";
            colorClass = "bg-white/5 border-white/5 hover:bg-white/10";
        }
    }

    const isCritical = ["windows", "$recycle.bin", "recovery"].includes(node.name.toLowerCase());
    if (isCritical) {
        colorClass = "bg-[repeating-linear-gradient(45deg,rgba(0,0,0,0),rgba(0,0,0,0)_10px,rgba(255,0,0,0.1)_10px,rgba(255,0,0,0.1)_20px)] border-red-500/20";
        icon = "🔒";
    }

    return (
        <div
            onClick={(e) => { e.stopPropagation(); onDrill(node.name, node.is_dir); }}
            onContextMenu={(e) => onContext(e, node)}
            className={`group relative flex flex-col justify-between p-3 rounded-xl border transition-all duration-300 hover:scale-105 hover:z-10 cursor-pointer backdrop-blur-sm ${sizeClass} ${colorClass} ${glow}`}
            title={`${node.name}\n${formatBytes(node.size)}`}
        >
            {/* Top: Icon & Actions */}
            <div className="flex justify-between items-start">
                <div className="text-2xl transition-transform group-hover:rotate-12 group-hover:scale-110">{icon}</div>
                {node.is_dir && <div className="text-[10px] text-white/30 uppercase tracking-widest group-hover:text-neon-cyan">Open</div>}
            </div>

            {/* Bottom: Info */}
            <div>
                <div className="font-bold text-white text-sm truncate leading-tight mb-1 group-hover:whitespace-normal group-hover:bg-black/80 group-hover:absolute group-hover:bottom-8 group-hover:left-2 group-hover:right-2 group-hover:p-2 group-hover:rounded group-hover:z-20 group-hover:border group-hover:border-white/20">
                    {node.name}
                </div>
                <div className={`font-mono text-[10px] uppercase ${isCritical ? 'text-red-400' : 'text-white/40'}`}>
                    {formatBytes(node.size)}
                </div>
            </div>

            {/* Hover Glow Effect */}
            <div className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/5 transition-colors pointer-events-none" />
        </div>
    );
};





