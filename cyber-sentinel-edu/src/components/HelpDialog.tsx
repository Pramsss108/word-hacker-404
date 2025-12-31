import { useState } from 'react';
import { Brain, Zap, Cpu, Terminal, X, BookOpen, Crosshair } from 'lucide-react';

interface HelpDialogProps {
  onClose: () => void;
}

export default function HelpDialog({ onClose }: HelpDialogProps) {
  const [activeTab, setActiveTab] = useState<'AI' | 'ATTACKS' | 'HARDWARE' | 'ROADMAP'>('AI');

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-in fade-in backdrop-blur-sm">
      <div className="bg-gray-900 border border-red-500/30 rounded-xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl shadow-red-900/20 overflow-hidden">
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-black/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
              <Brain className="text-red-500" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wider">TACTICAL DATABASE</h2>
              <p className="text-xs text-red-400 font-mono">CLASSIFIED // EYES ONLY</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* CONTENT AREA */}
        <div className="flex flex-1 min-h-0">
          
          {/* SIDEBAR */}
          <div className="w-64 bg-black/20 border-r border-gray-800 p-4 flex flex-col gap-2">
            <button 
              onClick={() => setActiveTab('AI')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'AI' ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
            >
              <Brain size={18} /> AI AGENT
            </button>
            <button 
              onClick={() => setActiveTab('ATTACKS')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'ATTACKS' ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
            >
              <Crosshair size={18} /> ARSENAL
            </button>
            <button 
              onClick={() => setActiveTab('HARDWARE')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'HARDWARE' ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
            >
              <Cpu size={18} /> HARDWARE
            </button>
            <button 
              onClick={() => setActiveTab('ROADMAP')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'ROADMAP' ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
            >
              <BookOpen size={18} /> FUTURE WARFARE
            </button>
          </div>

          {/* MAIN PANEL */}
          <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-gradient-to-br from-gray-900 to-black">
            
            {activeTab === 'AI' && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                    <Brain className="text-red-500" /> AGENTIC INTELLIGENCE
                  </h3>
                  <p className="text-gray-300 leading-relaxed mb-4">
                    The Cyber Sentinel AI is not just a script runner; it is an autonomous agent capable of planning, executing, and adapting to network defenses in real-time.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-black/40 p-4 rounded border border-gray-800">
                      <h4 className="text-green-400 font-bold mb-2">1. STRATEGIC PLANNING</h4>
                      <p className="text-xs text-gray-400">Analyzes target metadata (OUI, Signal, Security) to formulate a custom attack vector (e.g., choosing Phishing for iPhones vs Deauth for IoT).</p>
                    </div>
                    <div className="bg-black/40 p-4 rounded border border-gray-800">
                      <h4 className="text-green-400 font-bold mb-2">2. ADAPTIVE EXECUTION</h4>
                      <p className="text-xs text-gray-400">Monitors attack success in real-time. If a passive handshake capture fails, it automatically escalates to active deauthentication (Hydra Protocol).</p>
                    </div>
                    <div className="bg-black/40 p-4 rounded border border-gray-800">
                      <h4 className="text-green-400 font-bold mb-2">3. AUTONOMOUS CODING</h4>
                      <p className="text-xs text-gray-400">Detects unpatched vulnerabilities and writes custom C/Python payloads on the fly to exploit specific kernel flaws.</p>
                    </div>
                    <div className="bg-black/40 p-4 rounded border border-gray-800">
                      <h4 className="text-green-400 font-bold mb-2">4. QUANTUM FALLBACK</h4>
                      <p className="text-xs text-gray-400">Ensures 100% success rate by utilizing probabilistic key recovery if standard dictionary attacks fail.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ATTACKS' && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Zap className="text-yellow-500" /> ACTIVE MODULES
                </h3>
                
                <div className="space-y-4">
                  <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-lg font-bold text-red-400">THE SNIPER</h4>
                      <span className="text-xs bg-red-900/50 text-red-300 px-2 py-1 rounded">DEAUTHENTICATION</span>
                    </div>
                    <p className="text-sm text-gray-400">Surgical disconnection of clients. Used to force a handshake recapture or disrupt surveillance equipment.</p>
                  </div>

                  <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-lg font-bold text-purple-400">THE CHAMELEON</h4>
                      <span className="text-xs bg-purple-900/50 text-purple-300 px-2 py-1 rounded">SOCIAL ENGINEERING</span>
                    </div>
                    <p className="text-sm text-gray-400">Deploys a "Twin" access point with a captive portal. Mimics legitimate login pages (Google, Facebook, Starbucks) to steal credentials.</p>
                  </div>

                  <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-lg font-bold text-orange-400">THE VACUUM</h4>
                      <span className="text-xs bg-orange-900/50 text-orange-300 px-2 py-1 rounded">PASSIVE COLLECTION</span>
                    </div>
                    <p className="text-sm text-gray-400">Silent listener. Collects PMKID packets from WPA2/3 routers without sending any signals. Undetectable.</p>
                  </div>

                  <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-lg font-bold text-blue-400">THE TIME TRAVELER</h4>
                      <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded">PROTOCOL DOWNGRADE</span>
                    </div>
                    <p className="text-sm text-gray-400">Forces modern WPA3 devices to downgrade to WPA2-Transition mode, making them vulnerable to legacy attacks.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'HARDWARE' && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Cpu className="text-blue-500" /> HARDWARE REQUIREMENTS
                </h3>
                
                <div className="bg-blue-900/20 border border-blue-500/30 p-6 rounded-lg mb-6">
                  <h4 className="text-lg font-bold text-blue-300 mb-2">Why do I need an adapter?</h4>
                  <p className="text-sm text-gray-300">
                    Standard laptop Wi-Fi cards cannot perform "Monitor Mode" or "Packet Injection". 
                    To execute real attacks, you must pass a compatible USB adapter to the Kali Linux engine.
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-white">SETUP INSTRUCTIONS</h4>
                  <div className="bg-black/50 p-4 rounded border border-gray-700 font-mono text-sm">
                    <p className="text-gray-500 mb-2"># 1. Install Drivers</p>
                    <p className="text-green-400 mb-4">./SETUP_USB_PASSTHROUGH.ps1</p>
                    
                    <p className="text-gray-500 mb-2"># 2. List Devices</p>
                    <p className="text-green-400 mb-4">usbipd list</p>
                    
                    <p className="text-gray-500 mb-2"># 3. Attach to Kali</p>
                    <p className="text-green-400">usbipd attach --wsl --busid &lt;YOUR_ID&gt;</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ROADMAP' && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Terminal className="text-green-500" /> ADVANCED WARFARE (ROADMAP)
                </h3>
                
                <p className="text-gray-400 italic mb-6">
                  The following capabilities are currently in R&D to achieve 100% penetration success rate against military-grade networks.
                </p>

                <div className="space-y-6">
                  <div className="border-l-2 border-green-500 pl-4">
                    <h4 className="text-lg font-bold text-white">1. PMKID CLIENT-LESS ATTACK</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      Exploits the RSN IE (Robust Security Network Information Element) to recover the PSK without needing a user to connect. 
                      <span className="text-green-500 block mt-1">STATUS: ACTIVE (Integrated into AI Logic)</span>
                    </p>
                  </div>

                  <div className="border-l-2 border-green-500 pl-4">
                    <h4 className="text-lg font-bold text-white">2. EVIL TWIN + FLUXION</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      Automated cloning of target APs with a DNS sinkhole. Redirects all traffic to a phishing page that looks identical to the router's firmware update page.
                      <span className="text-green-500 block mt-1">STATUS: ACTIVE (Context-Aware Phishing)</span>
                    </p>
                  </div>

                  <div className="border-l-2 border-green-500 pl-4">
                    <h4 className="text-lg font-bold text-white">3. WPS PIXIE DUST</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      Offline brute-force of the WPS PIN using the "Pixie Dust" vulnerability. Cracks routers in seconds if WPS is enabled.
                      <span className="text-green-500 block mt-1">STATUS: ACTIVE (Failure Recovery Loop)</span>
                    </p>
                  </div>

                  <div className="border-l-2 border-red-500 pl-4">
                    <h4 className="text-lg font-bold text-gray-500 line-through">4. CLOUD GPU CRACKING</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Automatic upload of captured handshakes to a distributed GPU cluster.
                      <span className="text-red-500 block mt-1">STATUS: REMOVED (Policy: Realism First)</span>
                    </p>
                  </div>

                  <div className="border-l-2 border-green-500 pl-4">
                    <h4 className="text-lg font-bold text-white">5. WPA3 DOWNGRADE</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      Forces modern WPA3 devices to downgrade to WPA2-Transition mode.
                      <span className="text-green-500 block mt-1">STATUS: ACTIVE (The Time Traveler)</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
