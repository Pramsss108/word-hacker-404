import { useState, useEffect } from 'react';
import {
    Video,
    ShieldCheck,
    Zap,
    Globe,
    Download,
    Key,
    Terminal
} from 'lucide-react';
import SeoWrapper from './SeoWrapper';
import MatrixRain from './MatrixRain';

const tr = (l: string, key: string) => {
    return (TRANSLATIONS[l as keyof typeof TRANSLATIONS] as any)[key] || key;
};

const TRANSLATIONS = {
    en: {
        title: "Ready to",
        titleHighlight: "Harvest?",
        btnAnalyze: "HARVEST",
        btnScanning: "CONNECTING...",
        placeholder: "Paste Link (YouTube, Insta, X, TikTok)...",
        tabHome: "Home",
        tabFaq: "FAQ",
        faqTitle: "Red Team Data",
        statNoLogs: "No Logs",
        statUnlimited: "SaaS Engine",
        stat4K: "Unlimited",
        statusInit: "SaaS Connected"
    }
};

const SocialMediaHarvester = ({ onClose }: { onClose: () => void }) => {
    const [lang] = useState('en');
    const getT = (k: string) => tr(lang, k);

    const [url, setUrl] = useState('');
    const [license, setLicense] = useState('wordhacker_mock_license'); // Auto-Injected
    const [showLogin, setShowLogin] = useState(false);

    // Status State
    const [status, setStatus] = useState<'idle' | 'analyzing' | 'ready' | 'error'>('idle');
    const [statusText, setStatusText] = useState("Auto-Auth Active");
    const [logs, setLogs] = useState<string[]>([]);

    useEffect(() => {
        const savedKey = localStorage.getItem('wh_license_key');
        if (savedKey) {
            setLicense(savedKey);
            setStatusText("License Active");
        } else {
            setStatusText("No License");
            setShowLogin(true);
        }
    }, []);

    const addLog = (msg: string) => {
        setLogs((prev: string[]) => [`[${new Date().toLocaleTimeString()}] ${msg} `, ...prev].slice(0, 10));
    };

    const handleLogin = () => {
        if (license.length < 5) return;
        localStorage.setItem('wh_license_key', license);
        setShowLogin(false);
        setStatusText("License Active");
        addLog("Identity Validated.");
    };

    const handleHarvest = async () => {
        if (!url) return;
        if (!license) { setShowLogin(true); return; }

        setStatus('analyzing');
        setStatusText("Initiating...");
        addLog(`Target: ${url.substring(0, 30)}...`);

        try {
            // Call Local Backend Proxy
            const res = await fetch('http://localhost:3002/harvest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url, license: license })
            });

            const data = await res.json();

            if (res.ok) {
                setStatus('ready');
                setStatusText("Harvested");
                addLog("SUCCESS: Job dispatched to Cloud Runner.");
                addLog("File will appear in 'Releases' shortly.");
            } else {
                setStatus('error');
                setStatusText("Failed");
                addLog(`ERROR: ${data.error || 'Unknown Error'} `);
                if (data.details) addLog(data.details);
            }
        } catch (e: any) {
            console.error("Connection failed:", e);
            setStatus('error');
            setStatusText("Network Error");
            addLog("Err: Backend (Port 3002) unreachable?");
        }
    };

    const SCHEMA = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Social Media Harvester",
        "applicationCategory": "MultimediaApplication",
        "description": "Red Team Social Media Downloader."
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: '#0b0b0d',
            color: '#e9eef6',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
        }} role="dialog" aria-modal="true">
            <SeoWrapper
                title="Social Media Harvester"
                description="Red Team Archiver."
                schema={SCHEMA}
            />

            {/* Dynamic Background */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.4 }}>
                <MatrixRain opacity={0.05} density={12} speed={2} />
            </div>

            {/* Decorative Glows (Green for Harvester) */}
            <div style={{ position: 'absolute', top: '-20%', left: '20%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(10,255,106,0.1) 0%, transparent 70%)', filter: 'blur(80px)', zIndex: 0 }} />

            {/* App Header */}
            <header style={{
                position: 'relative',
                zIndex: 50,
                padding: '1rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid rgba(255,255,255,0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ background: 'rgba(10, 255, 106, 0.1)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(10, 255, 106, 0.3)' }}>
                            <Download size={20} color="#0aff6a" />
                        </div>
                        <span style={{ fontWeight: 700, letterSpacing: '-0.5px' }}>Social Media Harvester</span>
                    </div>

                    <nav style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={() => setShowLogin(!showLogin)} className="btn ghost small" style={{ color: license ? '#0aff6a' : '#ff3333' }}>
                            <Key size={12} style={{ marginRight: 5 }} /> {license ? 'PRO LICENSE' : 'NO LICENSE'}
                        </button>
                    </nav>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', opacity: 0.7 }}>
                        <span style={{ width: '6px', height: '6px', background: status === 'error' ? '#f00' : '#0aff6a', borderRadius: '50%', boxShadow: '0 0 8px #0aff6a' }} />
                        {statusText}
                    </div>
                    <button onClick={onClose} className="btn ghost" style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
            </header>

            {/* Main Content */}
            <main style={{
                position: 'relative',
                zIndex: 10,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2rem',
                padding: '2rem'
            }}>

                <div className="glass" style={{ width: '100%', maxWidth: '700px', padding: '2.5rem', borderRadius: '24px', background: 'rgba(20, 20, 23, 0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>

                    {showLogin ? (
                        <div style={{ textAlign: 'center', marginBottom: '2rem', animation: 'fadeIn 0.5s' }}>
                            <h2 style={{ color: '#0aff6a', marginBottom: '1rem' }}>Identity Verification</h2>
                            <p style={{ opacity: 0.7, marginBottom: '2rem' }}>Enter your GitHub Personal Access Token to unlock the engine.</p>
                            <input
                                type="password"
                                placeholder="ghp_XXXXXXXXXXXXXXXXXXXX"
                                value={license}
                                onChange={(e) => setLicense(e.target.value)}
                                style={{
                                    width: '100%',
                                    background: 'rgba(0,0,0,0.5)',
                                    border: '1px solid rgba(10,255,106,0.3)',
                                    color: '#fff',
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    marginBottom: '1rem',
                                    fontFamily: 'monospace'
                                }}
                            />
                            <button className="btn" onClick={handleLogin} style={{ width: '100%', background: '#0aff6a', color: '#000', fontWeight: 'bold' }}>
                                Authenticate
                            </button>
                        </div>
                    ) : (
                        <>
                            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 0.5rem 0', background: 'linear-gradient(to right, #fff, #aaa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                    {getT('title')} <span style={{ color: '#0aff6a', WebkitTextFillColor: '#0aff6a' }}>{getT('titleHighlight')}</span>
                                </h1>
                                <p style={{ opacity: 0.6 }}>Red Team Grade. 100% Privacy.</p>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
                                <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
                                    <Globe size={20} />
                                </div>
                                <input
                                    type="text"
                                    placeholder={getT('placeholder')}
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    style={{
                                        flex: 1,
                                        background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#fff',
                                        padding: '1.2rem 1.2rem 1.2rem 3rem',
                                        borderRadius: '12px',
                                        fontSize: '1.1rem',
                                        outline: 'none',
                                        transition: 'all 0.2s'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#0aff6a'}
                                />
                                <button
                                    className="btn"
                                    onClick={handleHarvest}
                                    disabled={status === 'analyzing'}
                                    style={{ padding: '0 2.5rem', fontSize: '1.1rem', background: status === 'analyzing' ? '#333' : '#0aff6a', color: '#000', minWidth: '160px', fontWeight: 'bold' }}
                                >
                                    {status === 'analyzing' ? getT('btnScanning') : getT('btnAnalyze')}
                                </button>
                            </div>

                            {/* Logs Preview */}
                            {logs.length > 0 && (
                                <div style={{ marginTop: '2rem', background: '#000', padding: '1rem', borderRadius: '8px', border: '1px solid #333', fontFamily: 'monospace', fontSize: '0.8rem', opacity: 0.8 }}>
                                    <div style={{ color: '#0aff6a', marginBottom: '0.5rem', display: 'flex', gap: '5px', alignItems: 'center' }}><Terminal size={12} /> SYSTEM LOG</div>
                                    {logs.map((l: string, i: number) => <div key={i} style={{ marginBottom: '2px' }}>{l}</div>)}
                                </div>
                            )}

                            {/* Quick Toggles */}
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1.5rem', opacity: 0.7, fontSize: '0.9rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ShieldCheck size={14} color="#0aff6a" /> {getT('statNoLogs')}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Zap size={14} color="#fbbf24" /> {getT('statUnlimited')}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Video size={14} color="#60a5fa" /> {getT('stat4K')}</div>
                            </div>
                        </>
                    )}
                </div>

                {status === 'ready' && (
                    <div style={{ display: 'flex', gap: '2rem', width: '100%', maxWidth: '700px', animation: 'slideUp 0.4s ease', padding: '1rem', background: 'rgba(10, 255, 106, 0.1)', borderRadius: '12px', border: '1px solid #0aff6a' }}>
                        <div style={{ color: '#0aff6a' }}>
                            <h3>Success!</h3>
                            <p>The harvest command has been sent to the SaaS Engine.</p>
                            <a href="https://github.com/Pramsss108/word-hacker-404/releases" target="_blank" style={{ color: '#fff', textDecoration: 'underline' }}>Check Releases Tab Here</a>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};

export default SocialMediaHarvester;
