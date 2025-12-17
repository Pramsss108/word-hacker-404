export default function Shield() {
    return (
        <div className="h-full flex flex-col max-w-4xl mx-auto items-center justify-center p-8">

            {/* Shield Icon / Visual */}
            <div className="relative mb-12 group">
                <div className="absolute inset-0 bg-neon-cyan/20 blur-[60px] rounded-full animate-pulse" />
                <div className="w-64 h-64 relative z-10">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-neon-cyan drop-shadow-[0_0_15px_rgba(0,243,255,0.5)]">
                        <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="rgba(0, 243, 255, 0.05)" />
                        <path d="M12 8V16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M8 12H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                {/* Holographic Ring */}
                <div className="absolute inset-[-20%] border border-neon-cyan/30 rounded-full animate-[spin_10s_linear_infinite]" />
                <div className="absolute inset-[-15%] border border-dashed border-white/20 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
            </div>

            {/* Status Text */}
            <h2 className="text-4xl font-bold text-white mb-4 tracking-tighter">
                SYSTEM SHIELD <span className="text-neon-cyan">ACTIVE</span>
            </h2>

            <p className="text-white/60 text-center max-w-lg mb-8 text-lg">
                Essential Windows directories are protected from accidental deletion.
                <br />
                Neural monitoring is scanning for unauthorized access.
            </p>

            {/* Stats / Info Cards */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
                <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center gap-4">
                    <span className="text-2xl">🧱</span>
                    <div>
                        <div className="text-xs text-white/40 uppercase tracking-widest">Protected Core</div>
                        <div className="font-mono text-neon-cyan">C:\Windows\*</div>
                    </div>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center gap-4">
                    <span className="text-2xl">📁</span>
                    <div>
                        <div className="text-xs text-white/40 uppercase tracking-widest">Safe Check</div>
                        <div className="font-mono text-neon-cyan">Program Files</div>
                    </div>
                </div>
            </div>

        </div>
    );
}
