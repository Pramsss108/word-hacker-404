import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

// --- Types ---

interface FileInfo {
    path: string;
    name: string;
    size: number;
    is_dir: boolean;
}

interface CortexResponse {
    text: string;
    related_files: FileInfo[];
}

interface LogMessage {
    id: number;
    role: "user" | "ai" | "system";
    text: string;
    files?: FileInfo[];
    timestamp: number;
}

interface Skill {
    id: string;
    name: string;
    role: string;
    icon: string;
    color: string;
    description: string;
    premiumFeatures: string[];
    commands: string[];
}

// --- Data ---

const SKILLS: Skill[] = [
    {
        id: 'hunter-eye',
        name: 'Hunter Eye',
        role: 'Deep Search Engine',
        icon: '🔍',
        color: 'text-blue-400 border-blue-500/30 bg-blue-500/20',
        description: 'Locates files instantly across your entire digital footprint using semantic and fuzzy matching.',
        premiumFeatures: [
            '⚡ milliseconds-fast Indexing',
            '📄 Content-Aware Analysis',
            '🧠 Fuzzy Logic ("Find that receipt")'
        ],
        commands: ['"Find resume.pdf"', '"Search for invoices"']
    },
    {
        id: 'system-pulse',
        name: 'System Pulse',
        role: 'Health Monitor',
        icon: '🩺',
        color: 'text-green-400 border-green-500/30 bg-green-500/20',
        description: 'Monitors vital system statistics in real-time to detect throttling or hardware stress.',
        premiumFeatures: [
            '📈 Real-time CPU/RAM Telemetry',
            '🛡️ Hardware Stress Detection',
            '🔋 Battery Optimizations'
        ],
        commands: ['"System health"', '"Check CPU status"']
    },
    {
        id: 'ram-scout',
        name: 'Ram Scout',
        role: 'Process Manager',
        icon: '📊',
        color: 'text-red-400 border-red-500/30 bg-red-500/20',
        description: 'Identifies resource-hungry applications and background processes slowing you down.',
        premiumFeatures: [
            '🩸 Memory Leak Detection',
            '⚡ One-Click Process Termination',
            '📉 Resource Usage Sorting'
        ],
        commands: ['"What is eating RAM?"', '"Kill chrome"']
    },
    {
        id: 'software-audit',
        name: 'Software Audit',
        role: 'App Inventory',
        icon: '📦',
        color: 'text-orange-400 border-orange-500/30 bg-orange-500/20',
        description: 'Catalogs every installed application to help you track bloatware and versioning.',
        premiumFeatures: [
            '📋 Version Tracking',
            '🕵️ Bloatware Identification',
            '🚀 Uninstaller Integration (Tier 2)'
        ],
        commands: ['"List my apps"', '"Show installed software"']
    },
    {
        id: 'chaos-wrangler',
        name: 'Chaos Wrangler',
        role: 'Downloads Sorter',
        icon: '🌪️',
        color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/20',
        description: 'Autonomously organizes your Downloads folder into neat Categories (Images, Docs, Installers) sorted by Year.',
        premiumFeatures: [
            '📅 Date-Based Sorting (Year/Month)',
            '🛡️ 24h Work Protection (Skips recent files)',
            '⏪ Infinite Undo (Revert changes instantly)'
        ],
        commands: ['"Sort my downloads"', '"Undo sort"']
    },
    {
        id: 'space-titan',
        name: 'Space Titan',
        role: 'Large File Scout',
        icon: '🐘',
        color: 'text-pink-400 border-pink-500/30 bg-pink-500/20',
        description: 'Hunts down massive files eating your disk space and visualizes them with bar charts.',
        premiumFeatures: [
            '📊 Visual Size Analysis (ASCII Bars)',
            '⚡ Instant Indexing (>50MB targets)',
            '🎯 Precision Removal Suggestions'
        ],
        commands: ['"Show large files"', '"Find big files"']
    },
    {
        id: 'ghost-buster',
        name: 'Ghost Buster',
        role: 'Empty Folder Nuke',
        icon: '👻',
        color: 'text-zinc-400 border-zinc-500/30 bg-zinc-500/20',
        description: 'Identifies and removes abandoned, empty directory trees that clutter your file system.',
        premiumFeatures: [
            '☢️ Nuke Mode (Actual Deletion)',
            '🛑 Root Armor (Protects Desktop/Docs)',
            '🕸️ Deep Recursion Scan'
        ],
        commands: ['"Find ghost folders"', '"Nuke empty folders"']
    },
    {
        id: 'twin-hunter',
        name: 'Twin Hunter',
        role: 'Duplicate Finder',
        icon: '👯',
        color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/20',
        description: 'Detects identical files using SHA-256 hashing to reclaim wasted space.',
        premiumFeatures: [
            '💰 Savings Calculator (MB/GB)',
            '🧠 Smart Safe-Delete Advice',
            '🔍 Double-Pass Verification'
        ],
        commands: ['"Find duplicates"', '"Check for copies"']
    },
    {
        id: 'trash-sniper',
        name: 'Trash Sniper',
        role: 'Junk Cleaner',
        icon: '🗑️',
        color: 'text-red-400 border-red-500/30 bg-red-500/20',
        description: 'Surgically removes system junk, temp files, and logs without touching your data.',
        premiumFeatures: [
            '🏥 System Health Diagnostics',
            '🕵️ Aggressive Custom Scan (Mode A)',
            '🧹 Intelligent Folder Grouping'
        ],
        commands: ['"Check for junk"', '"Scan D: for junk"']
    },
    {
        id: 'zen-sort',
        name: 'Zen Sort',
        role: 'Desktop Organizer',
        icon: '🧹',
        color: 'text-teal-400 border-teal-500/30 bg-teal-500/20',
        description: 'Declutters your desktop by smartly separating Screenshots from Photos.',
        premiumFeatures: [
            '📸 Semantic Image Detection',
            '📂 Auto-Folder Creation',
            '✨ Zero-Config Cleanup'
        ],
        commands: ['"Clean my desktop"', '"Organize photos"']
    },
    {
        id: 'adaptive-soul',
        name: 'Adaptive Soul',
        role: 'Neural Core',
        icon: '🧠',
        color: 'text-purple-400 border-purple-500/30 bg-purple-500/20',
        description: 'Advanced LLM core that adapts to your usage patterns and handles natural language.',
        premiumFeatures: [
            '🎭 Context-Aware Personality',
            '🧠 Long-Term Memory (Context Window)',
            '🛡️ Safety Guardrails'
        ],
        commands: ['"Tell me a joke"', '"Help me"']
    },
    {
        id: 'star-map',
        name: 'Star Map',
        role: 'Data Visualization',
        icon: '🌌',
        color: 'text-violet-400 border-violet-500/30 bg-violet-500/20',
        description: 'Visualizes your entire drive as a galactic map to spot massive clusters instantly.',
        premiumFeatures: [
            '🌠 Recursive Treemap (Depth 4)',
            '🗺️ Interactive Navigation',
            '⚡ Live Size Updates'
        ],
        commands: ['"Open Star Map"', '"Visualize D:"']
    }
];

interface SystemMetrics {
    cpu_usage: number;
    ram_used: number;
    ram_total: number;
}

interface StorageNode {
    name: string;
    size: number;
    children: StorageNode[];
    is_dir: boolean;
}

interface SectorScanResult {
    nodes: StorageNode[];
    largest_files: FileInfo[];
}

// --- Component ---

export default function CortexPanel({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    // State
    const [messages, setMessages] = useState<LogMessage[]>([
        { id: 1, role: "system", text: "Cortex Neural Core Online. Awaiting Input.", timestamp: Date.now() }
    ]);
    const [input, setInput] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const [metrics, setMetrics] = useState<SystemMetrics>({ cpu_usage: 0, ram_used: 0, ram_total: 0 });

    // Viz State
    const [vizPath, setVizPath] = useState<string | null>(null);
    const [vizData, setVizData] = useState<SectorScanResult | null>(null);
    const [isVizLoading, setIsVizLoading] = useState(false);

    // UI State
    const [isTriggered, setIsTriggered] = useState(true); // Default open if isOpen is controlled parentally, but we have local toggle too
    const [showSkills, setShowSkills] = useState(false);
    const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

    // Refs
    const scrollRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const skillListRef = useRef<HTMLDivElement>(null);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    // System Pulse (Live Header Stats)
    useEffect(() => {
        const interval = setInterval(async () => {
            if (!isOpen) return; // Save cycles if closed
            try {
                const m = await invoke<SystemMetrics>("get_system_metrics");
                setMetrics(m);
            } catch (e) {
                // Silent fail
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [isOpen]);

    // Handlers
    const loadViz = async (path: string) => {
        setVizPath(path);
        setVizData(null);
        setIsVizLoading(true);
        try {
            const data = await invoke<SectorScanResult>("scan_sector_unified", { path });
            setVizData(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsVizLoading(false);
        }
    };

    // Detect Magic Tags
    useEffect(() => {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.role === 'ai' && lastMsg.text.includes('[VISUALIZE_MODE:')) {
            const match = lastMsg.text.match(/\[VISUALIZE_MODE:(.*?)\]/);
            if (match && match[1]) {
                loadViz(match[1]);
            }
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: LogMessage = {
            id: Date.now(),
            role: "user",
            text: input,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsThinking(true);

        try {
            const history = messages.slice(-5).map(m =>
                `${m.role === 'user' ? 'USER' : 'AI'}: ${m.text}`
            ).join("\n");

            const response = await invoke<CortexResponse>("ask_cortex_llm", {
                query: input,
                context: history,
                modelName: null
            });

            const aiMsg: LogMessage = {
                id: Date.now() + 1,
                role: "ai",
                text: response.text,
                files: response.related_files,
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (e: any) {
            const errorMsg: LogMessage = {
                id: Date.now() + 1,
                role: "system",
                text: `Cortex Error: ${e.toString()}. Is Ollama running?`,
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsThinking(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const renderDetailView = (skill: Skill) => (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-xl z-50 flex flex-col p-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <button
                    onClick={() => setSelectedSkill(null)}
                    className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                >
                    ← Back
                </button>
                <div className={`p-4 rounded-2xl ${skill.color} bg-opacity-20 backdrop-blur-md border`}>
                    <div className="text-4xl">{skill.icon}</div>
                </div>
            </div>

            {/* Title */}
            <h2 className="text-3xl font-bold text-white mb-1">{skill.name}</h2>
            <p className="text-white/50 text-sm uppercase tracking-widest font-medium mb-4">{skill.role}</p>

            <p className="text-white/80 text-lg leading-relaxed mb-8 border-l-2 border-white/20 pl-4 py-1">
                {skill.description}
            </p>

            {/* Premium Features */}
            <div className="mb-8 pl-1">
                <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-4">Polished Capabilities (Tier 1)</h3>
                <div className="space-y-3">
                    {skill.premiumFeatures.map((feat, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                            <div className="w-1.5 h-1.5 rounded-full bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.5)]" />
                            <span className="text-white/90 font-medium">{feat}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Commands */}
            <div className="mt-auto">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Try asking...</h3>
                <div className="flex flex-wrap gap-2">
                    {skill.commands.map((cmd, i) => (
                        <button
                            key={i}
                            onClick={() => {
                                setInput(cmd.replace(/"/g, ''));
                                setSelectedSkill(null);
                                setShowSkills(false);
                            }}
                            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-mono text-cyan-300 transition-all hover:scale-105 active:scale-95"
                        >
                            {cmd}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    // --- Visualization Renderer ---
    const TreemapNode = ({ node, totalSize, depth }: { node: StorageNode, totalSize: number, depth: number }) => {
        const percent = (node.size / totalSize) * 100;
        if (percent < 1) return null; // Hide tiny stuff

        // Color based on depth/type (Sci-fi Palette)
        // Depth 0: Purple/Blue, Depth 1: Cyan, Depth 2: Green
        const colors = [
            'bg-purple-900/40 border-purple-500/50',
            'bg-blue-900/40 border-blue-500/50',
            'bg-cyan-900/40 border-cyan-500/50',
            'bg-green-900/40 border-green-500/50'
        ];
        const colorClass = colors[depth % colors.length];

        return (
            <div
                className={`relative overflow-hidden border ${colorClass} hover:bg-white/10 transition-colors flex flex-col p-1`}
                style={{ flexGrow: percent, minWidth: '50px', minHeight: '50px' }}
                title={`${node.name} (${(node.size / 1024 / 1024).toFixed(1)} MB)`}
            >
                <div className="flex justify-between items-center text-[10px] text-white/80 p-1 bg-black/20 truncate">
                    <span className="truncate font-bold">{node.name}</span>
                    <span className="opacity-50 ml-1">{(node.size / 1024 / 1024).toFixed(1)}MB</span>
                </div>

                {/* Recursive Children (Only if deep enough and large enough) */}
                {depth < 2 && node.children && node.children.length > 0 && (
                    <div className="flex-1 flex flex-wrap content-start gap-1 p-1 overflow-hidden">
                        {node.children.map((child, i) => (
                            <TreemapNode key={i} node={child} totalSize={node.size} depth={depth + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div
            ref={panelRef}
            className={`fixed right-0 top-0 bottom-0 w-[500px] bg-black/95 border-l border-white/10 shadow-2xl transition-transform duration-300 z-50 flex flex-col ${isTriggered ? 'translate-x-0' : 'translate-x-full'}`}
        >
            {/* ... (Existing Toggle Tab & Header code) ... */}

            {/* Viz Overlay */}
            {vizPath && (
                <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col animate-in fade-in duration-300 backdrop-blur-md">
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-purple-900/20">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-white tracking-widest flex items-center gap-2">
                                🌌 STAR MAP: <span className="text-purple-300 font-mono">{vizPath}</span>
                            </h2>
                            {isVizLoading && <span className="text-xs text-yellow-400 animate-pulse">Scanning Sector...</span>}
                        </div>
                        <button
                            onClick={() => setVizPath(null)}
                            className="px-4 py-2 bg-white/10 hover:bg-red-500/20 text-white rounded transition-colors"
                        >
                            CLOSE MAP
                        </button>
                    </div>

                    <div className="flex-1 p-4 overflow-hidden flex flex-wrap content-start gap-1">
                        {vizData ? (
                            vizData.nodes.map((node, i) => {
                                // Calculate total of displayed nodes to normalize flex
                                const total = vizData.nodes.reduce((acc, n) => acc + n.size, 0);
                                return <TreemapNode key={i} node={node} totalSize={total} depth={0} />;
                            })
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-purple-500/50 animate-pulse text-4xl">
                                INITIALIZING DEEP SCAN...
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Toggle Tab */}
            <button
                onClick={() => setIsTriggered(!isTriggered)}
                className={`absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 bg-black/80 border border-r-0 border-white/10 p-3 rounded-l-xl text-white hover:bg-purple-900/50 transition-all ${isTriggered ? 'opacity-100' : 'opacity-50 hover:opacity-100'}`}
            >
                {isTriggered ? '→' : '🤖'}
            </button>

            {/* ... (Rest of existing render) ... */}

            {/* Main Header */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-purple-900/20 to-transparent">
                <h2 className="text-white font-bold tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse"></span>
                    CORTEX v1.0 <span className="text-white/20 ml-2 text-xs font-mono">CPU {metrics.cpu_usage.toFixed(0)}% • RAM {(metrics.ram_used / 1024 / 1024 / 1024).toFixed(1)}GB</span>
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowSkills(!showSkills)}
                        className={`text-xs px-3 py-1 rounded border transition-colors ${showSkills ? 'bg-white text-black border-white' : 'bg-transparent text-white/50 border-white/20 hover:border-white/50'}`}
                    >
                        CAPABILITIES
                    </button>
                    <button
                        onClick={onClose}
                        className="text-xs px-3 py-1 rounded border border-white/20 text-white/50 hover:bg-red-500/20 hover:text-red-200 transition-colors"
                    >
                        CLOSE
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10" ref={scrollRef}>
                {messages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-lg text-sm leading-relaxed ${msg.role === 'user'
                            ? 'bg-white/10 text-white rounded-br-none'
                            : 'bg-purple-900/20 border border-purple-500/30 text-purple-100 rounded-bl-none shadow-[0_0_20px_rgba(168,85,247,0.1)]'
                            }`}>
                            <div className="whitespace-pre-wrap">{msg.text}</div>

                            {/* File Preview Cards */}
                            {msg.files && msg.files.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-white/10">
                                    <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Related Files</div>
                                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                                        {msg.files.map((f, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => invoke("show_in_explorer", { path: f.path })}
                                                className="min-w-[100px] bg-black/40 border border-white/10 rounded p-2 text-left hover:bg-purple-500/20 transition-colors"
                                            >
                                                <div className="text-lg mb-1">{f.is_dir ? "📁" : "📄"}</div>
                                                <div className="text-[10px] text-white/90 truncate">{f.name}</div>
                                                <div className="text-[9px] text-white/40">
                                                    {f.is_dir
                                                        ? <span className="text-yellow-500/50">DIR</span>
                                                        : (f.size > 1024 * 1024 ? (f.size / 1024 / 1024).toFixed(1) + ' MB' : (f.size / 1024).toFixed(1) + ' KB')
                                                    }
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {msg.role === 'ai' && <div className="text-[9px] text-purple-400/50 mt-1 font-mono tracking-wider pt-1">CORTEX CORE</div>}
                        </div>
                    </div>
                ))}
                {isThinking && (
                    <div className="flex items-center gap-2 text-xs text-purple-400 animate-pulse p-2">
                        <span>●</span><span>●</span><span>●</span>
                        <span className="uppercase tracking-widest">Processing</span>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/10 bg-black/50 backdrop-blur">
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask Cortex to find or analyze files..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all shadow-inner"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isThinking}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white/10 hover:bg-purple-500 text-white/50 hover:text-white transition-all disabled:opacity-0"
                    >
                        ➤
                    </button>
                </div>
                <div className="flex justify-between items-center mt-2 px-1">
                    <div className="text-[10px] text-white/30">
                        Local LLM: <span className={isThinking ? "text-yellow-400 animate-pulse" : "text-green-400"}>
                            {isThinking ? "PROCESSING" : "READY"}
                        </span>
                    </div>
                    <div className="text-[10px] text-white/20">v1.0</div>
                </div>
            </div>

            {/* Skills Overlay */}
            {showSkills && (
                <div className="absolute inset-0 bg-black/95 z-40 flex flex-col animate-in slide-in-from-bottom-10 duration-200">
                    {/* Detail View Render */}
                    {selectedSkill ? renderDetailView(selectedSkill) : (
                        <>
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-b from-purple-900/20 to-transparent">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-1">Neural Capabilities</h2>
                                    <p className="text-white/40 text-xs">TIER 1 SUITE • FULLY POLISHED</p>
                                </div>
                                <button onClick={() => setShowSkills(false)} className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20">×</button>
                            </div>

                            {/* Skills Scroll Grid */}
                            <div
                                className="flex-1 p-6 relative overflow-hidden"
                            >
                                {/* Fade Masks */}
                                <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black/95 to-transparent z-10 pointer-events-none" />
                                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/95 to-transparent z-10 pointer-events-none" />

                                <div
                                    ref={skillListRef}
                                    className="h-full overflow-y-auto pb-10 grid grid-cols-1 gap-4 overscroll-contain"
                                    onWheel={(e) => e.stopPropagation()}
                                >
                                    {SKILLS.map(skill => (
                                        <div
                                            key={skill.id}
                                            onClick={() => setSelectedSkill(skill)}
                                            className="group p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/30 hover:bg-white/10 transition-all cursor-pointer flex items-center gap-4"
                                        >
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${skill.color} border bg-opacity-20`}>
                                                {skill.icon}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-white font-bold">{skill.name}</h3>
                                                <p className="text-xs text-white/50 uppercase tracking-wider mb-1">{skill.role}</p>
                                                <p className="text-[11px] text-white/40 line-clamp-1">{skill.description}</p>
                                            </div>
                                            <div className="text-white/20 group-hover:text-white/60 transition-colors">→</div>
                                        </div>
                                    ))}

                                    {/* Footer Note */}
                                    <div className="text-center text-white/20 text-xs pt-4 pb-8">
                                        All systems nominal. Ready for Tier 2 Expansion.
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
