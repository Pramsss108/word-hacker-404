import { useState, useRef, useEffect } from 'react'
import { Upload, Mic, Loader2, X, Activity, Cpu } from 'lucide-react'
import './GhostFactory.css'

export default function GhostFactory({ onClose }: { onClose: () => void }) {
    // Core State - Hardcoded URL for No-Code Automation
    const [kaggleUrl, setKaggleUrl] = useState('https://indented-lipochromic-bev.ngrok-free.dev')
    const [mode, setMode] = useState<'train' | 'generate'>('train')
    const [logs, setLogs] = useState<string[]>([])
    const [progress, setProgress] = useState(0)

    const [file, setFile] = useState<File | null>(null)
    const [isGenerating, setIsGenerating] = useState(false)
    const [audioUrl, setAudioUrl] = useState<string | null>(null)

    // Native File Input
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Polling Effect for Terminal
    useEffect(() => {
        let interval: any;
        if (mode === 'train' && isGenerating) {
            interval = setInterval(async () => {
                try {
                    const baseUrl = kaggleUrl.replace(/\/$/, '')
                    const res = await fetch(`${baseUrl}/status`);
                    const data = await res.json();
                    setLogs(data.logs || []);
                    setProgress(data.progress || 0);
                    if (data.status === "READY") {
                        setIsGenerating(false);
                        setMode('generate'); // Auto switch on success
                    }
                } catch (e) {
                    console.error("Polling error", e);
                }
            }, 1000); // 1s polling
        }
        return () => clearInterval(interval);
    }, [mode, isGenerating, kaggleUrl])

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    }

    const handleTrain = async () => {
        if (!file) return;
        setIsGenerating(true);
        setLogs(["Creating secure uplink...", "Initializing neural handshake..."]);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('epochs', '100');

            const baseUrl = kaggleUrl.replace(/\/$/, '')
            await fetch(`${baseUrl}/train`, { method: 'POST', body: formData });
        } catch (e) {
            setLogs(prev => [...prev, "❌ CONNECTION REFUSED"]);
            setIsGenerating(false);
        }
    }

    const handleVoiceChange = async () => {
        if (!file) return;
        setIsGenerating(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const baseUrl = kaggleUrl.replace(/\/$/, '')
            const res = await fetch(`${baseUrl}/voice_change`, { method: 'POST', body: formData });
            if (!res.ok) throw new Error("Inference Failed");

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            setAudioUrl(url);
        } catch (e) {
            console.error("INFERENCE FAILED", e);
        } finally {
            setIsGenerating(false);
        }
    }

    return (
        <div className="ghost-overlay">
            <div className="ghost-frame">
                <div className="ghost-scanline"></div>

                {/* Header */}
                <header className="ghost-header">
                    <div className="ghost-brand">
                        <div className="ghost-icon-box">
                            <Cpu size={24} />
                        </div>
                        <div className="ghost-titles">
                            <h2>GLOBAL VOICE FACTORY <span className="ghost-pro-badge">PRO</span></h2>
                            <p className="ghost-subtitle">RVC HYBRID // NEURAL TRAINING // LIVE</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="ghost-close-btn">
                        ABORT PROTOCOL [ESC] <X size={18} />
                    </button>
                </header>

                <div className="ghost-body">
                    {/* Sidebar */}
                    <aside className="ghost-sidebar">
                        <div className={`ghost-step ${mode === 'train' ? 'active' : ''}`}>
                            <h3>01. Neural Training</h3>
                            <p>Train RVC Model</p>
                        </div>
                        <div className={`ghost-step ${mode === 'generate' ? 'active' : ''}`}>
                            <h3>02. Voice Conversion</h3>
                            <p>Real-Time Inference</p>
                        </div>

                        <div className="ghost-status-panel">
                            <div className="ghost-stat-row">
                                <span>STATUS:</span>
                                <span className={isGenerating ? "status-warn" : "status-ok"}>{isGenerating ? "PROCESSING..." : "IDLE"}</span>
                            </div>
                            <div className="ghost-stat-row">
                                <span>EPOCHS:</span>
                                <span>{progress}%</span>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="ghost-main">

                        {/* URL Bar */}
                        <div className="url-input-container">
                            <div className="url-input-box">
                                <label className="url-label">Kaggle Tunnel Interface</label>
                                <input
                                    className="url-input"
                                    value={kaggleUrl}
                                    onChange={(e) => setKaggleUrl(e.target.value)}
                                    placeholder="Paste URL here..."
                                />
                            </div>
                            <div className={`url-status-dot ${kaggleUrl ? 'active' : ''}`}></div>
                        </div>

                        {/* Tabs */}
                        <div className="ghost-tab-container">
                            <button className={`ghost-tab ${mode === 'train' ? 'active' : ''}`} onClick={() => setMode('train')}>
                                TRAINING CONSOLE
                            </button>
                            <button className={`ghost-tab ${mode === 'generate' ? 'active' : ''}`} onClick={() => setMode('generate')}>
                                VOICE INFERENCE
                            </button>
                        </div>

                        {mode === 'train' ? (
                            <div className="animate-in fade-in">
                                <div style={{ marginBottom: '2rem' }}>
                                    <div
                                        className="ghost-dropzone"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileSelect}
                                            className="file-input-hidden"
                                            accept="audio/*"
                                        />
                                        {file ? (
                                            <div style={{ textAlign: 'center' }}>
                                                <Activity size={32} color="#0aff6a" style={{ margin: '0 auto 1rem' }} />
                                                <p className="drop-text">{file.name}</p>
                                                <p className="drop-sub" style={{ color: '#0aff6a' }}>READY FOR INJECTION</p>
                                            </div>
                                        ) : (
                                            <div style={{ textAlign: 'center' }}>
                                                <Upload className="drop-icon" />
                                                <p className="drop-text">UPLOAD TRAINING DATASET</p>
                                                <p className="drop-sub">10s to 10min Audio File</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <h3 className="ghost-subtitle" style={{ marginBottom: '1rem' }}>LIVE KERNEL LOGS</h3>
                                <div className="ghost-terminal custom-scrollbar">
                                    {logs.length === 0 && <span style={{ opacity: 0.5 }}>Waiting for uplink...</span>}
                                    {logs.map((log, i) => (
                                        <div key={i} className={`log-entry ${i === logs.length - 1 ? 'latest' : ''}`}>
                                            {log}
                                        </div>
                                    ))}
                                    <div ref={el => el?.scrollIntoView()} />
                                </div>

                                <div className="ghost-action-row">
                                    <button
                                        className="ghost-launch-btn"
                                        onClick={handleTrain}
                                        disabled={isGenerating || !file}
                                    >
                                        {isGenerating ? <Loader2 className="spin-icon" /> : <Cpu />}
                                        {isGenerating ? "TRAINING IN PROGRESS..." : "INITIATE NEURAL TRAINING"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="animate-in fade-in">
                                <div className="ghost-dropzone" style={{ height: '200px' }} onClick={() => fileInputRef.current?.click()}>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileSelect}
                                        className="file-input-hidden"
                                        accept="audio/*"
                                    />
                                    {file ? (
                                        <div style={{ textAlign: 'center' }}>
                                            <Mic size={48} className="drop-icon" style={{ color: '#0aff6a' }} />
                                            <p className="drop-text">{file.name}</p>
                                            <p className="drop-sub">INPUT AUDIO READY FOR CONVERSION</p>
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: 'center' }}>
                                            <Mic size={48} className="drop-icon" style={{ color: isGenerating ? '#ef4444' : 'var(--muted)' }} />
                                            <p className="drop-text">UPLOAD AUDIO TO CONVERT</p>
                                            <p className="drop-sub">Speak clearly to test Voice Conversion</p>
                                        </div>
                                    )}
                                </div>
                                <div className="ghost-action-row">
                                    <button className="ghost-launch-btn" onClick={handleVoiceChange} disabled={isGenerating || !file}>
                                        <Activity /> {isGenerating ? "CONVERTING VOICE..." : "START CONVERSION"}
                                    </button>
                                </div>

                                {audioUrl && (
                                    <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(10,255,106,0.1)', borderRadius: '12px', border: '1px solid #0aff6a' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <strong style={{ color: '#0aff6a', fontFamily: 'monospace' }}>CONVERSION COMPLETE</strong>
                                            <a href={audioUrl} download="rvc_result.wav" style={{ color: '#000', background: '#0aff6a', padding: '0.2rem 0.8rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', textDecoration: 'none' }}>DOWNLOAD</a>
                                        </div>
                                        <audio controls src={audioUrl} style={{ width: '100%', height: '32px' }} />
                                    </div>
                                )}
                            </div>
                        )}

                    </main>
                </div>
            </div>
        </div>
    )
}
