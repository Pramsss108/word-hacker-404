import { useState, useEffect } from 'react';
import { ArrowLeft, Globe, Shield, Zap, Users, Lock, Terminal, Download } from 'lucide-react';
import MatrixRain from './MatrixRain';

export default function ProjectGhost({ onBack }: { onBack: () => void }) {
  const [activeMode, setActiveMode] = useState<'ghost' | 'swarm'>('ghost');
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (connectionStatus === 'connecting') {
      const timer = setTimeout(() => {
        setConnectionStatus('connected');
        addLog('Connection established via Cloudflare Edge Network.');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [connectionStatus]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`].slice(-5));
  };

  const handleConnect = () => {
    if (connectionStatus === 'connected') {
      setConnectionStatus('disconnected');
      addLog('Disconnected.');
    } else {
      setConnectionStatus('connecting');
      addLog(`Initiating ${activeMode === 'ghost' ? 'Ghost' : 'Swarm'} Protocol...`);
    }
  };

  return (
    <div className="app" style={{ background: '#0b0b0d', minHeight: '100vh', color: '#e9eef6', fontFamily: 'Inter, sans-serif' }}>
      <MatrixRain opacity={0.05} density={20} speed={1} />
      
      {/* Header */}
      <header style={{ padding: '20px', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(11, 11, 13, 0.8)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: '#0aff6a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowLeft size={20} /> Back
          </button>
          <h1 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Globe size={24} color="#0aff6a" />
            PROJECT GHOST
          </h1>
        </div>
        <div className="mono" style={{ color: '#0aff6a', fontSize: '0.9rem' }}>
          STATUS: {connectionStatus.toUpperCase()}
        </div>
      </header>

      <main className="container" style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Hero Section */}
        <section style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h2 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '20px', background: 'linear-gradient(to right, #e9eef6, #9aa3b2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            THE INVISIBLE NETWORK
          </h2>
          <p style={{ fontSize: '1.2rem', color: '#9aa3b2', maxWidth: '600px', margin: '0 auto 40px' }}>
            Zero-Cost. Undetectable. The world's first hybrid VPN architecture using Cloudflare Edge and P2P Swarms.
          </p>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
            <button 
              onClick={() => setActiveMode('ghost')}
              style={{
                padding: '15px 30px',
                background: activeMode === 'ghost' ? 'rgba(10, 255, 106, 0.1)' : 'transparent',
                border: `1px solid ${activeMode === 'ghost' ? '#0aff6a' : '#333'}`,
                color: activeMode === 'ghost' ? '#0aff6a' : '#9aa3b2',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.3s ease'
              }}
            >
              <Zap size={20} />
              GHOST MODE
            </button>
            <button 
              onClick={() => setActiveMode('swarm')}
              style={{
                padding: '15px 30px',
                background: activeMode === 'swarm' ? 'rgba(217, 46, 46, 0.1)' : 'transparent',
                border: `1px solid ${activeMode === 'swarm' ? '#d92e2e' : '#333'}`,
                color: activeMode === 'swarm' ? '#d92e2e' : '#9aa3b2',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.3s ease'
              }}
            >
              <Users size={20} />
              SWARM MODE
            </button>
          </div>
        </section>

        {/* Dashboard Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          
          {/* Status Panel */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid #333', borderRadius: '12px', padding: '25px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0 }}>
              <Shield size={20} color="#0aff6a" />
              Security Status
            </h3>
            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: '#9aa3b2' }}>IP Address</span>
                <span className="mono" style={{ color: connectionStatus === 'connected' ? '#0aff6a' : '#d92e2e' }}>
                  {connectionStatus === 'connected' ? '104.21.55.2' : 'EXPOSED'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: '#9aa3b2' }}>Protocol</span>
                <span className="mono">VLESS + TLS</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: '#9aa3b2' }}>Encryption</span>
                <span className="mono">AES-256-GCM</span>
              </div>
            </div>
            <button 
              onClick={handleConnect}
              style={{
                width: '100%',
                marginTop: '20px',
                padding: '12px',
                background: connectionStatus === 'connected' ? '#d92e2e' : '#0aff6a',
                color: '#000',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {connectionStatus === 'connected' ? 'DISCONNECT' : 'ACTIVATE SHIELD'}
            </button>
          </div>

          {/* Mode Info */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid #333', borderRadius: '12px', padding: '25px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0 }}>
              {activeMode === 'ghost' ? <Zap size={20} color="#0aff6a" /> : <Users size={20} color="#d92e2e" />}
              {activeMode === 'ghost' ? 'Ghost Architecture' : 'Swarm Architecture'}
            </h3>
            <p style={{ color: '#9aa3b2', lineHeight: '1.6' }}>
              {activeMode === 'ghost' 
                ? "Routes traffic through Cloudflare's massive global edge network. To observers, your traffic looks like standard HTTPS web browsing. Zero cost, high speed, low detection."
                : "Decentralized P2P routing. Traffic is bounced through a residential IP swarm, making it impossible to distinguish from normal home internet usage. The nuclear option for bypassing strict blocks."}
            </p>
            <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                <Lock size={16} color={activeMode === 'ghost' ? '#0aff6a' : '#d92e2e'} />
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                  {activeMode === 'ghost' ? 'CDN Fronting Active' : 'Residential IP Masking'}
                </span>
              </div>
            </div>
          </div>

          {/* Terminal Log */}
          <div style={{ background: '#000', border: '1px solid #333', borderRadius: '12px', padding: '20px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem', gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', color: '#666' }}>
              <Terminal size={16} />
              <span>SYSTEM LOG</span>
            </div>
            <div style={{ height: '150px', overflowY: 'auto', color: '#0aff6a' }}>
              {logs.length === 0 && <span style={{ color: '#444' }}>Waiting for command...</span>}
              {logs.map((log, i) => (
                <div key={i} style={{ marginBottom: '5px' }}>{log}</div>
              ))}
            </div>
          </div>

        </div>

        {/* Download Section */}
        <div style={{ marginTop: '60px', textAlign: 'center', padding: '40px', background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)', borderRadius: '16px', border: '1px solid #222' }}>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '15px' }}>Get the Desktop Client</h3>
          <p style={{ color: '#9aa3b2', marginBottom: '30px' }}>
            Project Ghost requires the native desktop client to interface with the network adapter.
            <br />Available for Windows, macOS, and Linux.
          </p>
          <button style={{ padding: '15px 40px', background: '#e9eef6', color: '#0b0b0d', border: 'none', borderRadius: '30px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
            <Download size={20} />
            DOWNLOAD BETA v0.1.0
          </button>
        </div>

      </main>
    </div>
  );
}
