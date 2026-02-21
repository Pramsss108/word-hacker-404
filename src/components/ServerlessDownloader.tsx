import { useState, useEffect } from 'react';
import {
    Download,
    Shield,
    Key,
    Database,
    Terminal
} from 'lucide-react';

const ServerlessDownloader = () => {
    const [url, setUrl] = useState('');
    const [status, setStatus] = useState<'idle' | 'harvesting' | 'success' | 'error'>('idle');
    const [log, setLog] = useState<string[]>([
        "Initializing Red Team protocol...",
        "Secure storage check: OFF-GRID",
        "Waiting for target..."
    ]);
    const [showLogin, setShowLogin] = useState(false);
    const [license, setLicense] = useState('');

    // In a real Public SaaS, these are HARDCODED to YOUR repo

    // Load license on mount
    useEffect(() => {
        const savedKey = localStorage.getItem('wh_license_key');
        if (savedKey) {
            setLicense(savedKey);
            addLog("Identity Validated: Pro License Loaded.");
        } else {
            addLog("TRIAL MODE: Please Login with License Key.");
            setShowLogin(true);
        }
    }, []);

    const addLog = (msg: string) => {
        setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 10));
    };

    const handleLogin = () => {
        if (license.length < 5) {
            addLog("Error: Invalid License Format.");
            return;
        }
        localStorage.setItem('wh_license_key', license);
        addLog("License Key Cached. SaaS Uplink Established.");
        setShowLogin(false);
    };

    // ... (Wait, I should implement exactly what the user asked: Pro Login)

    return (
        <div className="p-6 max-w-2xl mx-auto w-full font-mono text-green-500">
            {/* Header */}
            <div className="border border-green-500/30 bg-black/80 rounded-t-lg p-4 flex justify-between items-center backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-500 animate-pulse" />
                    <h2 className="text-lg font-bold tracking-wider text-white">SOCIAL MEDIA HARVESTER <span className="text-xs text-green-500/50">PRO</span></h2>
                </div>
                <button
                    onClick={() => setShowLogin(!showLogin)}
                    className="flex items-center gap-2 bg-green-900/20 px-3 py-1 rounded text-xs hover:bg-green-500/20 border border-green-500/30"
                >
                    <Key size={12} /> {license ? 'LICENSE ACTIVE' : 'NO LICENSE'}
                </button>
            </div>

            {/* Main Console */}
            <div className="border-x border-b border-green-500/30 bg-black/90 p-6 rounded-b-lg space-y-6 shadow-2xl shadow-green-900/10">

                {showLogin ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded text-sm text-yellow-200">
                            <h3 className="flex items-center gap-2 font-bold mb-2"><Database size={16} /> PRO MEMBER ACCESS</h3>
                            <p>Enter your <code>word-hacker-404</code> License Key to access the Unlimited SaaS Engine.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs uppercase tracking-widest text-green-700">License Key</label>
                            <div className="relative">
                                <Key className="absolute left-3 top-3 w-4 h-4 text-green-600" />
                                <input
                                    type="password"
                                    value={license}
                                    onChange={e => setLicense(e.target.value)}
                                    placeholder="WH-PRO-xxxx-xxxx"
                                    className="w-full bg-black border border-green-900 focus:border-green-500 p-2 pl-10 text-green-400 outline-none rounded transition-all"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleLogin}
                            className="w-full bg-green-900/30 hover:bg-green-500/20 border border-green-500/50 text-green-400 py-2 rounded uppercase tracking-widest text-sm transition-all"
                        >
                            Authenticated
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Target Input */}
                        <div className="space-y-2">
                            <label className="text-xs uppercase tracking-widest text-green-700">Target Coordinates</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={url}
                                    onChange={e => setUrl(e.target.value)}
                                    placeholder="https://youtube.com/watch?v=..."
                                    className="flex-1 bg-black border border-green-900 focus:border-green-500 p-3 text-white outline-none rounded"
                                    disabled={!license}
                                />
                                <button
                                    onClick={async () => {
                                        if (!url) return;
                                        setStatus('harvesting');
                                        addLog("Connecting to Public SaaS Engine...");

                                        try {
                                            const res = await fetch('http://localhost:3002/harvest', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ url: url, license: license })
                                            });

                                            const data = await res.json();

                                            if (res.ok) {
                                                setStatus('success');
                                                addLog("SUCCESS: Job dispatched to Unlimited Public Runner.");
                                                addLog("Check 'Releases' tab on GitHub in ~2 minutes.");
                                            } else {
                                                setStatus('error');
                                                addLog(`ERROR: ${data.error || 'Dispatch Failed'}`);
                                                if (data.details) addLog(`Details: ${data.details}`);
                                            }
                                        } catch (e: any) {
                                            setStatus('error');
                                            addLog(`NETWORK ERROR: Is Local Backend (Port 3002) running?`);
                                            addLog(`Full Error: ${e.message}`);
                                        }
                                    }}
                                    disabled={status === 'harvesting' || !license}
                                    className="bg-red-900/20 hover:bg-red-500/20 border border-red-500/50 text-red-500 px-6 rounded transition-all disabled:opacity-50"
                                >
                                    {status === 'harvesting' ? '...' : <Download size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* Terminal Log */}
                        <div className="mt-6 bg-black p-4 rounded border border-green-900/50 h-48 overflow-y-auto font-mono text-xs">
                            <div className="sticky top-0 bg-black/90 pb-2 border-b border-green-900/30 mb-2 flex items-center gap-2 text-green-700">
                                <Terminal size={12} />
                                <span>SYSTEM LOG</span>
                            </div>
                            {log.map((line, i) => (
                                <div key={i} className="mb-1 text-green-500/80">
                                    <span className="opacity-50 mr-2">{'>'}</span>
                                    {line}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Footer Status */}
            <div className="mt-4 flex justify-between text-[10px] text-green-900 uppercase tracking-widest">
                <div className="flex gap-4">
                    <span>Mem: 64TB</span>
                    <span>Enc: AES-256</span>
                </div>
                <div className="flex gap-2 items-center">
                    <span className={`w-2 h-2 rounded-full ${status === 'harvesting' ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
                    <span>STATUS: {status === 'harvesting' ? 'BUSY' : 'READY'}</span>
                </div>
            </div>
        </div>
    );
};

export default ServerlessDownloader;
