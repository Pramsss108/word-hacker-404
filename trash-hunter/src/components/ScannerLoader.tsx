import { useEffect, useState } from "react";

interface ScannerLoaderProps {
    visible: boolean;
    path: string;
    onSkip?: () => void;
}

export default function ScannerLoader({ visible, path, onSkip }: ScannerLoaderProps) {
    const [text, setText] = useState("INITIALIZING SENSORS...");
    const [longLoad, setLongLoad] = useState(false);

    useEffect(() => {
        if (!visible) {
            setLongLoad(false);
            return;
        }

        let phases = [];
        if (path === "BOOT") {
            phases = [
                "SYSTEM INITIALIZATION...",
                "LOADING KERNEL MODULES...",
                "DECRYPTING SECURE STORAGE...",
                "CONNECTING TO NEURAL NET...",
                "ACCESS GRANTED"
            ];
        } else {
            phases = [
                "CALIBRATING OPTICAL SENSORS...",
                `MAPPING SECTOR: ${path}...`,
                "ANALYZING SPECTRAL DATA...",
                "TRIANGULATING ANOMALIES...",
                "RENDERING TOPOLOGY..."
            ];
        }

        let i = 0;
        setText(phases[0]);

        const interval = setInterval(() => {
            i = (i + 1) % phases.length;
            setText(phases[i]);
        }, 800);

        // Show bypass option if taking too long (> 5s)
        const longLoadTimer = setTimeout(() => setLongLoad(true), 5000);

        return () => {
            clearInterval(interval);
            clearTimeout(longLoadTimer);
        };
    }, [visible, path]);

    if (!visible) return null;

    return (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center">
            <div className="relative">
                {/* Radar Circle */}
                <div className="w-32 h-32 rounded-full border-2 border-neon-cyan/30 animate-[spin_4s_linear_infinite] relative flex items-center justify-center">
                    <div className="absolute inset-0 border-t-2 border-neon-cyan/80 rounded-full animate-[spin_1s_linear_infinite]" />
                    <div className="w-2 h-2 bg-neon-cyan rounded-full animate-ping" />
                </div>
            </div>

            <div className="mt-8 font-mono text-neon-cyan text-xl tracking-[0.2em] animate-pulse">
                {text}
            </div>

            <div className="mt-2 text-white/30 font-mono text-xs flex flex-col items-center gap-2">
                <span>DO NOT TURN OFF THE CONSOLE</span>
                {longLoad && onSkip && (
                    <button
                        onClick={onSkip}
                        className="pointer-events-auto mt-4 px-4 py-2 border border-white/10 hover:bg-white/5 rounded text-red-400 hover:text-red-300 transition-colors uppercase tracking-widest text-[10px]"
                    >
                        [ BYPASS SEQUENCE ]
                    </button>
                )}
            </div>

            {/* Scrolling Code Effect Background */}
            <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none -z-10">
                <div className="text-[10px] text-neon-cyan font-mono p-4 leading-3">
                    {Array.from({ length: 40 }).map((_, i) => (
                        <div key={i}>{Math.random().toString(36).substring(7).repeat(10)}</div>
                    ))}
                </div>
            </div>
        </div>
    );
}
