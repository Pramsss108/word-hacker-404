import { useState, useRef, useEffect } from "react";

interface FilterOption {
    id: string;
    label: string;
    icon: string;
}

interface FilterSelectProps {
    options: FilterOption[];
    selectedId: string;
    onSelect: (id: string) => void;
}

export default function FilterSelect({ options, selectedId, onSelect }: FilterSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(o => o.id === selectedId) || options[0];

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative h-full" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 h-full px-4 bg-white/5 hover:bg-white/10 border-r border-white/10 transition-colors outline-none min-w-[140px]"
            >
                <span className="text-lg opacity-70">{selectedOption.icon}</span>
                <span className="font-mono text-sm font-bold text-white tracking-wide truncate flex-1 text-left">
                    {selectedOption.label}
                </span>
                <span className={`text-[10px] text-white/50 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                    ▼
                </span>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl py-1 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {options.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => {
                                onSelect(option.id);
                                setIsOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors hover:bg-white/10 ${selectedId === option.id ? "text-neon-cyan bg-neon-cyan/5" : "text-white/80"
                                }`}
                        >
                            <span className="text-base w-5 text-center">{option.icon}</span>
                            <span className="font-mono tracking-wide">{option.label}</span>
                            {selectedId === option.id && (
                                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-neon-cyan shadow-[0_0_8px_#00f3ff]" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
