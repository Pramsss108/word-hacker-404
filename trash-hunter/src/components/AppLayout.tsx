// -----------------------------------------------------------------------------
// APP LAYOUT (Shell)
// -----------------------------------------------------------------------------
import { ReactNode } from "react";

interface AppLayoutProps {
    children: ReactNode;
    activeTab: string;
    onTabChange: (tab: string) => void;
    isCortexOpen: boolean;
    onToggleCortex: () => void;
}

export default function AppLayout({ children, activeTab, onTabChange, isCortexOpen, onToggleCortex }: AppLayoutProps) {
    return (
        <div className="flex h-screen w-screen bg-transparent text-white font-sans overflow-hidden">
            {/* Sidebar - Premium Glass */}
            <aside className="w-72 h-full flex flex-col relative z-20 shrink-0">
                {/* Background for Sidebar only */}
                <div className="absolute inset-0 bg-[#111] border-r border-white/10" />

                <div className="relative z-10 p-8">
                    <div className="flex items-center gap-3 mb-8">
                        {/* Small Logo / Brand */}
                        <div className="w-8 h-8 rounded bg-gradient-to-br from-neon-cyan to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(0,243,255,0.4)]">
                            <span className="font-bold text-black text-lg">W</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-white">WH404 <span className="text-neon-cyan">AI</span></h1>
                            <div className="text-[10px] text-white/40 font-mono tracking-widest uppercase">Trash Hunter v1.0</div>
                        </div>
                    </div>

                    <nav className="space-y-1">
                        <NavItem
                            icon="🔍"
                            label="Hunter Eye"
                            description="SEARCH"
                            active={activeTab === "search"}
                            onClick={() => onTabChange("search")}
                        />
                        <NavItem
                            icon="🗺️"
                            label="Star Map"
                            description="VISUALIZE"
                            active={activeTab === "map"}
                            onClick={() => onTabChange("map")}
                        />
                        <NavItem
                            icon="🧠"
                            label="The Brain"
                            description="CLEANUP"
                            active={activeTab === "brain"}
                            onClick={() => onTabChange("brain")}
                        />
                        <NavItem
                            icon="🛡️"                            label="AI Overseer"
                            description="MONITOR"
                            active={activeTab === "monitor"}
                            onClick={() => onTabChange("monitor")}
                        />
                        <NavItem
                            icon="🛡️"                            label="Shield"
                            description="PROTECT"
                            active={activeTab === "shield"}
                            onClick={() => onTabChange("shield")}
                        />
                        <NavItem
                            icon="📜"
                            label="History"
                            description="LOGS"
                            active={activeTab === "history"}
                            onClick={() => onTabChange("history")}
                        />
                    </nav>

                    {/* Cortex Agent Toggle (VS Code Style Activity Bar Item) */}
                    <div className="mt-8 pt-8 border-t border-white/5">
                        <button
                            onClick={onToggleCortex}
                            className={`w-full group relative flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 overflow-hidden ${isCortexOpen
                                ? "bg-purple-600/20 text-purple-300 shadow-[0_0_15px_rgba(147,51,234,0.3)] border border-purple-500/30"
                                : "hover:bg-purple-500/10 text-white/50 hover:text-purple-300 border border-transparent"
                                }`}
                        >
                            <span className="text-xl">🤖</span>
                            <div className="flex flex-col items-start leading-none">
                                <span className="font-bold text-sm tracking-wide">CORTEX</span>
                                <span className="text-[10px] opacity-50 font-mono mt-1">AI AGENT</span>
                            </div>

                            {/* Active/Online Indicator */}
                            <div className={`absolute right-4 w-2 h-2 rounded-full ${isCortexOpen ? "bg-purple-400 animate-pulse shadow-[0_0_8px_#a855f7]" : "bg-white/10"}`} />
                        </button>
                    </div>
                </div>

                <div className="mt-auto relative z-10 p-6">
                    <div className="p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-transparent border border-green-500/20">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_#4ade80]" />
                            <span className="text-xs font-bold text-green-400 uppercase tracking-wider">System Stable</span>
                        </div>
                        <div className="text-[10px] text-white/40 font-mono">Core services running.</div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 h-full relative overflow-hidden bg-void-black/20 flex flex-col">
                {/* Top Bar / Header Area - REMOVED OVERIAPPING BUTTON */}
                <div className="absolute top-0 right-0 w-auto h-16 flex items-center justify-end px-8 z-30 pointer-events-none">
                    {/* Controls are now handled by individual views or sidebar */}
                </div>

                <div className="flex-1 w-full h-full overflow-y-auto custom-scrollbar p-0 relative">
                    {children}
                </div>
            </main>
        </div>
    );
}

function NavItem({ icon, label, description, active, onClick }: { icon: string, label: string, description: string, active: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`w-full group relative flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-300 overflow-hidden ${active
                ? "bg-white/5 shadow-lg shadow-black/20"
                : "hover:bg-white/5"
                }`}
        >
            {/* Active Indicator Line */}
            {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-neon-cyan rounded-r-full shadow-[0_0_10px_#00f3ff]" />}

            <span className={`text-xl z-10 transition-transform duration-300 ${active ? "scale-110" : "group-hover:scale-110 opacity-70"}`}>{icon}</span>
            <div className="text-left z-10">
                <div className={`font-semibold text-sm transition-colors ${active ? "text-white" : "text-white/60 group-hover:text-white"}`}>{label}</div>
                <div className="text-[9px] font-mono tracking-widest text-white/30 group-hover:text-neon-cyan/70 transition-colors uppercase">{description}</div>
            </div>

            {/* Hover Glow */}
            <div className={`absolute inset-0 bg-gradient-to-r from-neon-cyan/5 to-transparent opacity-0 transition-opacity duration-300 ${active ? "opacity-100" : "group-hover:opacity-100"}`} />
        </button>
    );
}
