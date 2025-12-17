
interface ViewToggleProps {
    mode: "list" | "grid";
    onChange: (mode: "list" | "grid") => void;
}

export default function ViewToggle({ mode, onChange }: ViewToggleProps) {
    return (
        <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
            <button
                onClick={() => onChange("list")}
                className={`p-2 rounded transition-all duration-300 ${mode === "list" ? "bg-white/10 text-neon-cyan shadow-sm" : "text-white/40 hover:text-white"
                    }`}
                title="List View"
            >
                {/* List Icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="21" y2="12"></line>
                    <line x1="8" y1="18" x2="21" y2="18"></line>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
            </button>
            <button
                onClick={() => onChange("grid")}
                className={`p-2 rounded transition-all duration-300 ${mode === "grid" ? "bg-white/10 text-neon-cyan shadow-sm" : "text-white/40 hover:text-white"
                    }`}
                title="Grid View"
            >
                {/* Grid Icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
            </button>
        </div>
    );
}
