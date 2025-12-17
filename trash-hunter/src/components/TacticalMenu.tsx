import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface TacticalMenuProps {
    x: number;
    y: number;
    file: { name: string; path: string; is_dir: boolean };
    onClose: () => void;
    onAction: (action: string, pyaload?: any) => void;
}

export default function TacticalMenu({ x, y, file, onClose, onAction }: TacticalMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [aiStatus, setAiStatus] = useState<string | null>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [onClose]);

    // Prevent menu from going off-screen
    const style = {
        top: Math.min(y, window.innerHeight - 250),
        left: Math.min(x, window.innerWidth - 200),
    };

    const handleAskAI = async () => {
        setAiStatus("Analyzing...");
        try {
            const result = await invoke<string>("analyze_file_safety", { path: file.path });
            setAiStatus(result);
        } catch (e) {
            setAiStatus("Error: " + e);
        }
    };

    return (
        <div
            ref={menuRef}
            style={style}
            className="fixed z-[9999] w-64 bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-[0_0_30px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-100"
            onContextMenu={(e) => e.preventDefault()} // No double context menu
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
        >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/5 bg-white/5">
                <div className="text-xs font-mono text-neon-cyan/80 uppercase tracking-widest">Target Acquired</div>
                <div className="text-sm font-bold text-white truncate mt-1">{file.name}</div>
            </div>

            {/* Actions */}
            <div className="py-1">
                <MenuOption label="Open Protocol" icon="📂" onClick={() => onAction("open", file)} />
                <MenuOption label="Reveal Location" icon="📍" onClick={() => onAction("reveal", file)} />
                <div className="my-1 border-b border-white/5" />
                <MenuOption label="Copy Path" icon="📋" onClick={() => onAction("copy_path", file)} />
                <MenuOption label="Analyze Composition" icon="🧠" onClick={() => onAction("analyze", file)} />
                <MenuOption label="Ask AI: Is it safe?" icon="🤖" onClick={handleAskAI} />
                <div className="my-1 border-b border-white/5" />
                <MenuOption label="TERMINATE (Delete)" icon="☢️" isDestructive onClick={() => onAction("delete", file)} />
            </div>

            {/* AI Result Overlay */}
            {aiStatus && (
                <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center text-white p-6 text-center z-50 animate-in fade-in">
                    {aiStatus === "Analyzing..." ? (
                        <>
                            <div className="text-4xl mb-4 animate-bounce">🤖</div>
                            <div className="text-xs font-mono text-neon-cyan animate-pulse tracking-widest">NEURAL SCANNING...</div>
                        </>
                    ) : (
                        <div className="flex flex-col h-full w-full">
                            <div className="flex-1 overflow-y-auto custom-scrollbar text-left space-y-4">
                                {(() => {
                                    try {
                                        // Try to parse JSON response
                                        const data = JSON.parse(aiStatus);
                                        return (
                                            <>
                                                <div className="border-b border-white/10 pb-2">
                                                    <div className="text-[10px] text-white/50 uppercase tracking-widest mb-1">Identity</div>
                                                    <div className="text-sm font-bold text-neon-cyan">{data.identity}</div>
                                                </div>
                                                
                                                <div className="border-b border-white/10 pb-2">
                                                    <div className="text-[10px] text-white/50 uppercase tracking-widest mb-1">Role</div>
                                                    <div className="text-xs text-white/80 leading-relaxed">{data.role}</div>
                                                </div>

                                                <div className="border-b border-white/10 pb-2">
                                                    <div className="text-[10px] text-white/50 uppercase tracking-widest mb-1">Risk Level</div>
                                                    <div className={`text-sm font-bold ${
                                                        data.risk_level === 'SAFE' ? 'text-green-400' : 
                                                        data.risk_level === 'CRITICAL' ? 'text-red-500 animate-pulse' : 'text-yellow-400'
                                                    }`}>
                                                        {data.risk_level}
                                                    </div>
                                                </div>

                                                <div className="border-b border-white/10 pb-2">
                                                    <div className="text-[10px] text-white/50 uppercase tracking-widest mb-1">Verdict</div>
                                                    <div className="text-xs text-white/90 italic">"{data.verdict}"</div>
                                                </div>

                                                {data.technical_deep_dive && (
                                                    <div className="pt-1">
                                                        <div className="text-[10px] text-white/50 uppercase tracking-widest mb-1">Deep Dive</div>
                                                        <ul className="list-disc list-inside space-y-1">
                                                            {data.technical_deep_dive.map((fact: string, i: number) => (
                                                                <li key={i} className="text-[10px] text-white/70 font-mono leading-tight">{fact}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    } catch (e) {
                                        // Fallback for plain text or error
                                        return <div className="text-xs font-mono leading-relaxed text-white/90">{aiStatus}</div>;
                                    }
                                })()}
                            </div>
                            <button 
                                onClick={() => setAiStatus(null)}
                                className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded text-[10px] uppercase tracking-widest w-full transition-colors shrink-0"
                            >
                                Acknowledge
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function MenuOption({ label, icon, onClick, isDestructive = false }: { label: string, icon: string, onClick: () => void, isDestructive?: boolean }) {
    return (
        <button
            onClick={onClick}
            className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors hover:bg-white/10 ${isDestructive ? "text-red-500 hover:bg-red-500/10 hover:text-red-400" : "text-white/80 hover:text-white"
                }`}
        >
            <span className="text-lg w-6 text-center opacity-70">{icon}</span>
            <span className="font-mono text-sm tracking-wide">{label}</span>
        </button>
    );
}
