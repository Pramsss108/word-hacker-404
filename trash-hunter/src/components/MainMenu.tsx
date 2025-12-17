import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

export default function MainMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);

        // PRE-LOAD: Warm up the cache for C: drive so Star Map is instant
        invoke("get_level_stats", { path: "C:\\" }).catch(() => { });

        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const MenuItem = ({ label, shortcut, active = false }: { label: string, shortcut?: string, active?: boolean }) => (
        <button
            className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors hover:bg-white/10 group ${active ? "text-neon-cyan" : "text-white/80"
                }`}
        >
            <span className="font-mono group-hover:text-white transition-colors">{label}</span>
            {shortcut && <span className="text-[10px] text-white/30 font-mono border border-white/10 px-1 rounded bg-black/20">{shortcut}</span>}
        </button>
    );

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2 rounded-lg transition-colors ${isOpen ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-2 border-b border-white/5 mb-2">
                        <div className="text-xs font-bold text-neon-cyan uppercase tracking-widest">Trash Hunter</div>
                        <div className="text-[10px] text-white/30">v1.0.0-beta</div>
                    </div>

                    <MenuItem label="New Search Window" shortcut="Ctrl+N" />
                    <MenuItem label="Export Results..." shortcut="Ctrl+S" />
                    <div className="my-1 border-b border-white/5" />
                    <MenuItem label="Indexing Options" />
                    <MenuItem label="Settings" />
                    <div className="my-1 border-b border-white/5" />
                    <MenuItem label="Exit" shortcut="Alt+F4" />
                </div>
            )}
        </div>
    );
}
