import { useState, useRef, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event"; // Moved to top
import { useVirtualizer } from "@tanstack/react-virtual";
// import FilterSelect from "./FilterSelect";
import MainMenu from "./MainMenu";
import ViewToggle from "./ViewToggle";
// import TacticalMenu from "./TacticalMenu";
import ContextMenu from "./ContextMenu"; // ADDED IMPORT

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------
interface FileInfo {
    path: string;
    name: string;
    is_dir: boolean;
    size: number;
    modified: number;
}

// -----------------------------------------------------------------------------
// UTILS
// -----------------------------------------------------------------------------
const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${['B', 'KB', 'MB', 'GB', 'TB'][i]}`;
};

// -----------------------------------------------------------------------------
// COMPONENTS
// -----------------------------------------------------------------------------

function DbStatusMonitor({ onForceIndex }: { onForceIndex: () => void }) {
    const [status, setStatus] = useState<{ total_files: number, is_indexing: boolean, scanned_count: number } | null>(null);

    useEffect(() => {
        // Polling for general state (Start/Stop)
        const check = () => invoke<any>("get_hunter_status").then(s => {
            setStatus(prev => {
                // If we are getting live updates via event, don't overwrite count with stale 0 from backend if backend isn't updating it
                // Actually, if backend returns 0 for scanned_count during Elite Scan, we should trust the event.
                // But let's just use the event to bump the number.
                if (prev && prev.scanned_count > s.scanned_count && s.is_indexing) {
                    return { ...s, scanned_count: prev.scanned_count };
                }
                return s;
            });
        }).catch(console.error);
        const interval = setInterval(check, 500);

        // Event Listener for High-Speed Elite Updates
        const unlisten = listen<number>("indexing_progress", (event) => {
            setStatus(prev => {
                if (!prev) return { total_files: 0, is_indexing: true, scanned_count: event.payload };
                return { ...prev, is_indexing: true, scanned_count: event.payload };
            });
        });

        return () => {
            clearInterval(interval);
            unlisten.then(f => f());
        };
    }, []);

    if (!status) return null;

    // ELITE UI: Minimalist Status Logic
    return (
        <div className="flex items-center gap-4 text-[10px] font-mono tracking-widest uppercase">
            {status.is_indexing ? (
                <div className="flex items-center gap-2 text-neon-cyan animate-pulse">
                    <span className="animate-spin">⚙️</span>
                    INDEXING: {status.scanned_count.toLocaleString()}
                </div>
            ) : status.total_files > 0 ? (
                <div className="flex items-center gap-2 text-emerald-500/50 hover:text-emerald-500 transition-colors cursor-pointer" onClick={onForceIndex} title="Click to Re-Index">
                    ✅ DB READY ({status.total_files.toLocaleString()})
                </div>
            ) : (
                <div onClick={onForceIndex} className="text-red-500 animate-pulse cursor-pointer border border-red-500/20 px-2 py-1 rounded hover:bg-red-500/10">
                    ⚠️ DB EMPTY
                </div>
            )}
        </div>
    );
}

function InspectorPanel({ file, onClose }: { file: FileInfo, onClose: () => void }) {
    const [folderSize, setFolderSize] = useState<number | null>(null);
    const [calculating, setCalculating] = useState(false);

    useEffect(() => { setFolderSize(null); setCalculating(false); }, [file]);

    const handleCalc = () => {
        setCalculating(true);
        invoke<number>("calculate_dir_size", { path: file.path })
            .then(setFolderSize)
            .finally(() => setCalculating(false));
    };

    return (
        <div className="w-80 h-full border-l border-white/10 bg-[#0c0c0c] flex flex-col shadow-2xl z-20">
            <div className="p-4 border-b border-white/5 flex justify-between">
                <span className="text-neon-cyan/50 text-xs font-mono uppercase tracking-widest">Inspector</span>
                <button onClick={onClose} className="text-white/30 hover:text-white">✕</button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
                <div className="flex justify-center py-4">
                    <div className="text-6xl text-neon-cyan opacity-80">{file.is_dir ? "📁" : "📄"}</div>
                </div>
                <div className="space-y-1 break-words">
                    <div className="text-white/40 text-[10px] uppercase font-bold">Name</div>
                    <div className="text-sm font-medium">{file.name}</div>
                </div>
                <div className="space-y-1 break-words">
                    <div className="text-white/40 text-[10px] uppercase font-bold">Path</div>
                    <div className="text-xs font-mono text-white/60 bg-white/5 p-2 rounded select-all">{file.path}</div>
                </div>
                {file.is_dir && (
                    <button onClick={handleCalc} disabled={calculating || folderSize !== null} className="w-full py-2 border border-white/10 hover:border-neon-cyan/50 text-xs text-neon-cyan uppercase tracking-wider rounded transition-all">
                        {folderSize !== null ? formatBytes(folderSize) : calculating ? "Calculating..." : "Calculate Size"}
                    </button>
                )}
                {!file.is_dir && (
                    <div className="text-xs text-neon-cyan font-mono">{formatBytes(file.size)}</div>
                )}
                <div className="pt-4 space-y-2">
                    <button onClick={() => invoke("open_file", { path: file.path })} className="w-full py-3 bg-neon-cyan/10 hover:bg-neon-cyan/20 rounded text-sm text-neon-cyan font-bold transition-all">OPEN</button>
                    <button onClick={() => invoke("show_in_explorer", { path: file.path })} className="w-full py-3 bg-white/5 hover:bg-white/10 rounded text-sm text-white transition-all">REVEAL</button>
                </div>
            </div>
        </div>
    );
}

// -----------------------------------------------------------------------------
// ICON COMPONENT (Async + Cached)
// -----------------------------------------------------------------------------
const iconCache = new Map<string, string>();

function FileIcon({ path, isDir, className }: { path: string, isDir: boolean, name: string, className?: string }) {
    const [iconSrc, setIconSrc] = useState<string | null>(null);

    useEffect(() => {
        if (isDir) return; // Use standard folder emoji for now (or fetch system folder icon later)

        // Check cache first (by ext for now per stub, later by full path if unique icons needed)
        // Optimization: Use extension as key for stub to save requests
        // REAL IMPLEMENTATION: Use path as key
        const key = path.split('.').pop()?.toLowerCase() || "unknown";

        if (iconCache.has(key)) {
            setIconSrc(iconCache.get(key)!);
            return;
        }

        invoke<string>("get_file_icon", { path })
            .then(res => {
                // If it starts with "icon:", it's our stub. 
                // Late we will get "data:image/png;base64,..."
                iconCache.set(key, res);
                setIconSrc(res);
            })
            .catch(() => setIconSrc(null));
    }, [path, isDir]);

    if (isDir) return <span className={className || "opacity-70"}>📁</span>;

    if (!iconSrc) return <span className={className || "opacity-70"}>📄</span>;

    // Render Stub or Real Image
    if (iconSrc.startsWith("icon:")) {
        // Generate a deterministic color from the extension string for the stub
        const ext = iconSrc.split(":")[1];
        const color = stringToColor(ext);
        return (
            <div className={`rounded flex items-center justify-center text-[10px] font-bold text-black uppercase ${className}`} style={{ backgroundColor: color }}>
                {ext.slice(0, 3)}
            </div>
        );
    }

    // Real Base64 Image
    return <img src={iconSrc} alt="icon" className={className || "w-6 h-6 object-contain"} />;
}

// Helper for Stub Colors
function stringToColor(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + "00000".substring(0, 6 - c.length) + c;
}

// -----------------------------------------------------------------------------
// CORE SEARCH ENGINE
// -----------------------------------------------------------------------------
export default function SearchEye() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<FileInfo[]>([]); // Renamed from 'files' to 'results'
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [inspectorFile, setInspectorFile] = useState<FileInfo | null>(null);
    const [selectedDrive, setSelectedDrive] = useState("Global");
    const [availableDrives, setAvailableDrives] = useState<string[]>([]);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, file: FileInfo } | null>(null); // ADDED STATE

    const inputRef = useRef<HTMLInputElement>(null);
    const parentRef = useRef<HTMLDivElement>(null);
    const debounceTimer = useRef<number | null>(null);

    // Boot
    useEffect(() => {
        invoke<string[]>("get_system_drives").then(setAvailableDrives);
        setTimeout(() => inputRef.current?.focus(), 100);

        // ELITE FIX: Trigger initial load of Top 50 files so screen isn't black
        invoke<FileInfo[]>("search_ram", { query: "" })
            .then(res => setResults(res)) // Updated to results
            .catch(console.error);
    }, []);

    // ELITE: Debounced Instant Search
    const runSearch = useCallback((rawQuery: string, drive: string) => {
        const q = rawQuery.trim();

        // Mode: Browsing (Drive/Path) vs Searching (Everything)
        const isPath = q.includes(":\\") || q.startsWith("\\\\") || q.startsWith("/");

        // ELITE FIX: Allow empty Global query to fetch default view (Top 50)
        if (!q && drive === "Global") {
            // Pass strict empty query to backend
            invoke<FileInfo[]>("search_ram", { query: "" })
                .then(res => {
                    setResults(res); // Updated to results
                    setSelectedIndex(0);
                })
                .catch(console.error);
            return;
        }

        const command = isPath || (drive !== "Global" && !q) ? "scan_directory" : "search_ram";
        const args = (isPath || (drive !== "Global" && !q))
            ? { path: isPath ? q : drive, query: null }
            : { query: q };

        invoke<FileInfo[]>(command, args)
            .then(res => {
                setResults(res); // Updated to results
                setSelectedIndex(0); // Reset selection
            })
            .catch(console.error);
    }, []);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);

        if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
        debounceTimer.current = window.setTimeout(() => {
            runSearch(val, selectedDrive);
        }, 50); // ELITE RULE: <50ms debounce
    };

    // ELITE: Keyboard Navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex(i => Math.min(i + 1, results.length - 1));
            // Auto-scroll logic could go here
            if (rowVirtualizer) rowVirtualizer.scrollToIndex(selectedIndex + 1, { align: 'auto' });
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex(i => Math.max(i - 1, 0));
            if (rowVirtualizer) rowVirtualizer.scrollToIndex(selectedIndex - 1, { align: 'auto' });
        } else if (e.key === "Enter") {
            const file = results[selectedIndex];
            if (file) invoke("open_file", { path: file.path });
        } else if (e.key === "Escape") {
            setQuery("");
            setResults([]); // Fix: files -> results
            setInspectorFile(null);
        }
    };

    // Virtualization
    const rowVirtualizer = useVirtualizer({
        count: results.length, // Fix: files -> results
        getScrollElement: () => parentRef.current,
        estimateSize: () => viewMode === "list" ? 48 : 140, // Height
        overscan: 10,
    });

    return (
        <div className="h-full flex flex-col bg-[#050505] text-white overflow-hidden relative" onContextMenu={e => e.preventDefault()}>

            {/* TOP BAR */}
            <div className="flex-none pt-4 pb-2 px-6 flex flex-col gap-4 z-30">
                <div className="flex justify-between items-center px-1">
                    <div className="text-[10px] font-mono text-neon-cyan/50 tracking-[0.3em] uppercase">
                        HUNTER // {selectedDrive} // {results.length} ITEMS // DBG: {query}
                    </div>
                    <div className="flex items-center gap-4">
                        <DbStatusMonitor onForceIndex={() => invoke("build_index", { drives: availableDrives })} />
                        <ViewToggle mode={viewMode} onChange={setViewMode} />
                        <MainMenu />
                    </div>
                </div>

                {/* SEARCH INPUT */}
                <div className="relative h-14 w-full max-w-5xl mx-auto group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-cyan/30 to-purple-600/30 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
                    <div className="relative flex items-center bg-[#0a0a0a] border border-white/10 rounded-xl h-full shadow-2xl px-4">

                        {/* Drive Select */}
                        <div className="relative mr-4 pr-4 border-r border-white/10 flex items-center gap-2 cursor-pointer hover:bg-white/5 rounded px-2 -ml-2 py-1 transition-colors">
                            <span className="text-lg">💾</span>
                            <span className="font-mono font-bold text-sm">{selectedDrive}</span>
                            <select
                                value={selectedDrive}
                                onChange={e => { setSelectedDrive(e.target.value); runSearch(query, e.target.value); }}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            >
                                <option value="Global">ALL</option>
                                {availableDrives.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>

                        {/* Input */}
                        <input
                            ref={inputRef}
                            className="flex-1 bg-transparent border-none outline-none text-xl font-mono placeholder-white/20 h-full"
                            placeholder="Type to hunt..."
                            value={query}
                            onChange={handleInput}
                            onKeyDown={handleKeyDown}
                        />

                        {/* Force Scan Button (Subtle) */}
                        <button
                            onClick={() => runSearch(query, selectedDrive)}
                            className="ml-4 px-4 py-1.5 bg-white/5 hover:bg-neon-cyan/20 border border-white/5 hover:border-neon-cyan/50 rounded text-xs font-bold tracking-widest uppercase text-neon-cyan transition-all"
                        >
                            HUNT
                        </button>
                    </div>
                </div>
            </div>

            {/* MAIN WORKSPACE */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* RESULTS PANEL (Full Width) */}
                <div ref={parentRef} className={`flex-1 overflow-y-auto custom-scrollbar p-0 ${viewMode === 'grid' ? "p-4" : ""}`}>

                    {/* List Mode (High Perf Virtualized) */}
                    {viewMode === 'list' && (
                        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                            {rowVirtualizer.getVirtualItems().length === 0 && results.length === 0 && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/10 pointer-events-none">
                                    <div className="text-6xl grayscale mb-4">📡</div>
                                    <div className="font-mono tracking-widest uppercase text-lg">System Ready</div>
                                </div>
                            )}
                            {rowVirtualizer.getVirtualItems().map((row) => {
                                const file = results[row.index];
                                const isSelected = row.index === selectedIndex;
                                return (
                                    <div
                                        key={row.index}
                                        onClick={() => { setSelectedIndex(row.index); setInspectorFile(file); }}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            setContextMenu({ x: e.clientX, y: e.clientY, file });
                                        }}
                                        className={`absolute top-0 left-0 w-full h-[48px] px-4 flex items-center gap-3 cursor-pointer border-b border-white/5 transition-colors ${isSelected ? "bg-neon-cyan/10 border-l-2 border-l-neon-cyan" : "hover:bg-white/5 border-l-2 border-l-transparent"}`}
                                        style={{ transform: `translateY(${row.start}px)` }}
                                    >
                                        <div className="text-xl opacity-70 w-8 text-center flex items-center justify-center shrink-0">
                                            <FileIcon path={file.path} isDir={file.is_dir} name={file.name} />
                                        </div>
                                        
                                        {/* Drive Badge */}
                                        <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${file.path.startsWith("C") ? "bg-blue-500/20 text-blue-400" : "bg-orange-500/20 text-orange-400"}`}>
                                            {file.path.charAt(0).toUpperCase()}
                                        </div>

                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <div className="font-medium truncate text-sm text-white/90 leading-tight">
                                                {file.name}
                                            </div>
                                            <div className="text-[10px] text-white/40 truncate font-mono leading-tight opacity-60">
                                                {file.path}
                                            </div>
                                        </div>
                                        
                                        <div className="w-20 text-right text-xs font-mono text-white/30 hidden sm:block shrink-0">
                                            {formatBytes(file.size)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Grid Mode (Simple Layout) */}
                    {viewMode === 'grid' && (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-4 content-start pb-20">
                            {results.slice(0, 500).map((file, i) => ( // Cap at 500 for grid perf
                                <div
                                    key={i}
                                    onClick={() => { setSelectedIndex(i); setInspectorFile(file); }}
                                    className={`aspect-square flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${i === selectedIndex ? "bg-neon-cyan/10 border-neon-cyan/50" : "bg-white/5 border-white/5 hover:bg-white/10"}`}
                                >
                                    <div className="text-4xl mb-2 flex items-center justify-center">
                                        <FileIcon path={file.path} isDir={file.is_dir} name={file.name} />
                                    </div>
                                    <div className="text-[10px] text-center w-full truncate px-1 opacity-80">{file.name}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Inspector Panel (Overlay) */}
                {inspectorFile && <InspectorPanel file={inspectorFile} onClose={() => setInspectorFile(null)} />}
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    file={contextMenu.file}
                    onClose={() => setContextMenu(null)}
                    onDeleted={() => {
                        setResults(prev => prev.filter(f => f.path !== contextMenu.file.path));
                    }}
                />
            )}
        </div>
    );
}
