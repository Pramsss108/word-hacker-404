import { useState } from "react";

export default function HelpOverlay() {
    const [isOpen, setIsOpen] = useState(false);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 left-4 z-50 w-8 h-8 rounded-full bg-white/10 hover:bg-neon-cyan/20 border border-white/20 flex items-center justify-center text-xs text-white/50 hover:text-white transition-all"
                title="Help Guide"
            >
                ?
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8">
            <div className="glass-panel p-8 max-w-4xl w-full max-h-full overflow-y-auto relative rounded-xl border border-neon-cyan/30 shadow-[0_0_50px_rgba(0,243,255,0.1)]">
                <button
                    onClick={() => setIsOpen(false)}
                    className="absolute top-4 right-4 text-white/50 hover:text-white"
                >
                    ✕
                </button>

                <h1 className="text-3xl font-bold text-white mb-2">OPERATOR MANUAL</h1>
                <p className="text-neon-cyan font-mono mb-8 opacity-80">WH404 // CLASSIFIED SYSTEMS GUIDE</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    <div className="space-y-4">
                        <h2 className="text-xl text-white font-bold border-b border-white/10 pb-2">🔍 SYSTEM 1: SEARCH EYE</h2>
                        <ul className="list-disc list-inside text-white/70 space-y-2 text-sm">
                            <li><strong className="text-neon-cyan">Context:</strong> Global file hunter.</li>
                            <li><strong className="text-white">How to use:</strong> Type a filename or extension to instantly find files anywhere on your system.</li>
                            <li><strong className="text-white">Pro Tip:</strong> Use the "List/Grid" toggle to change view modes. Right-click files for options.</li>
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-xl text-white font-bold border-b border-white/10 pb-2">🧠 SYSTEM 2: CORTEX AI</h2>
                        <ul className="list-disc list-inside text-white/70 space-y-2 text-sm">
                            <li><strong className="text-neon-cyan">Context:</strong> Intelligent junk removal.</li>
                            <li><strong className="text-white">Scan System:</strong> Locates temporary files, logs, and system rot (`%TEMP%`, `Windows\Temp`).</li>
                            <li><strong className="text-white">Purge Junk:</strong> Permanently deletes the discovered debris.</li>
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-xl text-white font-bold border-b border-white/10 pb-2">🗺️ SYSTEM 3: STAR MAP</h2>
                        <ul className="list-disc list-inside text-white/70 space-y-2 text-sm">
                            <li><strong className="text-neon-cyan">Context:</strong> Storage visualization.</li>
                            <li><strong className="text-white">TreeMap:</strong> The large blocks represent your folders. Bigger block = More space used.</li>
                            <li><strong className="text-white">Black Hole:</strong> The list on the right shows the Top 50 Largest Files on your C: drive.</li>
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-xl text-white font-bold border-b border-white/10 pb-2">🛡️ SYSTEM 4: SHIELD</h2>
                        <ul className="list-disc list-inside text-white/70 space-y-2 text-sm">
                            <li><strong className="text-neon-cyan">Context:</strong> Active Protection.</li>
                            <li><strong className="text-white">Status:</strong> Monitors critical system paths to prevent accidental damage.</li>
                        </ul>
                    </div>

                </div>

                <div className="mt-8 pt-8 border-t border-white/10 text-center text-white/30 text-xs font-mono">
                    WH404 TRASH-HUNTER v1.0 // PRODUCTION BUILD
                </div>
            </div>
        </div>
    );
}
