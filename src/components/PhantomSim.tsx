import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  QrCode,
  Signal,
  Trash2,
  X,
  CheckCircle,
  Loader2,
  Globe,
  Lock
} from 'lucide-react';
import './PhantomSim.css';

interface PhantomSimProps {
  onClose: () => void;
}

type Step = 'select' | 'generate' | 'scan' | 'handshake' | 'verify' | 'success';

const PhantomSim: React.FC<PhantomSimProps> = ({ onClose }) => {
  const [step, setStep] = useState<Step>('select');
  const [provider, setProvider] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [smsCode, setSmsCode] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string, type: 'info' | 'error' | 'warn' = 'info') => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false });
    setLogs(prev => [...prev, `[${timestamp}] ${type.toUpperCase()}: ${msg}`]);
  };

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Generation Simulation
  useEffect(() => {
    if (step === 'generate') {
      addLog(`Initiating secure handshake with ${provider}...`);
      let p = 0;
      const interval = setInterval(() => {
        p += Math.random() * 10;
        if (p > 100) {
          p = 100;
          clearInterval(interval);
          addLog('Cryptographic profile generated successfully.');
          addLog('QR Payload ready for injection.');
          setTimeout(() => setStep('scan'), 1000);
        } else {
          if (Math.random() > 0.7) addLog(`Allocating sector ${Math.floor(Math.random() * 9999)}...`);
        }
        setProgress(p);
      }, 300);
      return () => clearInterval(interval);
    }
  }, [step, provider]);

  // Handshake Simulation
  useEffect(() => {
    if (step === 'handshake') {
      addLog('Listening for carrier signal...');
      const timeout = setTimeout(() => {
        addLog('Signal detected: LTE Band 4 (1700/2100 MHz)');
        addLog('Device handshake verified: iPhone 15 Pro [Simulated]');
        setStep('verify');
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [step]);

  const handleProviderSelect = (p: string) => {
    setProvider(p);
    setStep('generate');
  };

  const handleVerify = () => {
    if (smsCode.length >= 4) {
      addLog(`Verifying code: ${smsCode}...`);
      setTimeout(() => {
        addLog('SMS Verification SUCCESS.');
        addLog('Identity established.');
        setStep('success');
      }, 1500);
    } else {
      addLog('Invalid code length.', 'error');
    }
  };

  return (
    <div className="phantom-sim-overlay">
      <div className="phantom-container">
        <header className="phantom-header">
          <div className="phantom-title">
            <Smartphone size={20} />
            PHANTOM SIM <span style={{ fontSize: '0.6em', opacity: 0.5 }}>// V2.0</span>
          </div>
          <div className="phantom-status">
            <div className="phantom-status-dot" />
            CONNECTED TO DARK NODE
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </header>

        <div className="phantom-body">
          <div className="phantom-step-indicator">
            {['select', 'generate', 'scan', 'verify', 'success'].map((s, i) => (
              <div
                key={s}
                className={`step-dot ${['select', 'generate', 'scan', 'handshake', 'verify', 'success'].indexOf(step) >= i ? 'active' : ''
                  } ${['select', 'generate', 'scan', 'handshake', 'verify', 'success'].indexOf(step) > i ? 'completed' : ''
                  }`}
              />
            ))}
          </div>

          <div className="phantom-content">
            {step === 'select' && (
              <>
                <Globe size={64} className="phantom-icon-large" />
                <h2 className="phantom-h2">SELECT CARRIER NODE</h2>
                <p className="phantom-p">Choose an anonymous provider to generate your ephemeral identity.</p>
                <div className="phantom-actions">
                  <button className="phantom-btn" onClick={() => handleProviderSelect('SILENT.LINK')}>
                    SILENT.LINK [US/UK]
                  </button>
                  <button className="phantom-btn" onClick={() => handleProviderSelect('REDTEAGO')}>
                    REDTEAGO [GLOBAL]
                  </button>
                  <button className="phantom-btn" onClick={() => handleProviderSelect('KEEPGO')}>
                    KEEPGO [EU]
                  </button>
                </div>
              </>
            )}

            {step === 'generate' && (
              <>
                <Loader2 size={64} className="phantom-icon-large" style={{ animation: 'spin 2s linear infinite' }} />
                <h2 className="phantom-h2">GENERATING PROFILE</h2>
                <p className="phantom-p">Forging cryptographic keys and allocating burner number...</p>
                <div style={{ width: '100%', height: '4px', background: '#333', marginTop: '20px' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: '#d92e2e', transition: 'width 0.3s' }} />
                </div>
                <p style={{ marginTop: '10px', fontFamily: 'monospace' }}>{Math.floor(progress)}% COMPLETE</p>
              </>
            )}

            {step === 'scan' && (
              <>
                <QrCode size={64} className="phantom-icon-large" />
                <h2 className="phantom-h2">INJECT PROFILE</h2>
                <p className="phantom-p">Scan this QR code with your iPhone to install the eSIM.</p>

                <div className="qr-placeholder">
                  {/* In a real app, this would be the API response QR */}
                  <div style={{ width: '100%', height: '100%', background: 'repeating-linear-gradient(45deg, #000 0, #000 10px, #fff 10px, #fff 20px)', opacity: 0.8 }} />
                </div>

                <div className="phantom-actions">
                  <button className="phantom-btn primary" onClick={() => setStep('handshake')}>
                    I HAVE SCANNED IT
                  </button>
                </div>
              </>
            )}

            {step === 'handshake' && (
              <>
                <Signal size={64} className="phantom-icon-large" style={{ animation: 'pulse 1s infinite' }} />
                <h2 className="phantom-h2">WAITING FOR NETWORK</h2>
                <p className="phantom-p">Connecting to local cell towers... Please wait.</p>
              </>
            )}

            {step === 'verify' && (
              <>
                <Lock size={64} className="phantom-icon-large" />
                <h2 className="phantom-h2">SMS INTERCEPT</h2>
                <p className="phantom-p">Enter the 6-digit verification code received on your device.</p>

                <div className="input-group">
                  <input
                    type="text"
                    maxLength={6}
                    className="phantom-input"
                    placeholder="000000"
                    value={smsCode}
                    onChange={(e) => setSmsCode(e.target.value.replace(/[^0-9]/g, ''))}
                  />
                </div>

                <div className="phantom-actions">
                  <button className="phantom-btn primary" onClick={handleVerify}>
                    VERIFY IDENTITY
                  </button>
                </div>
              </>
            )}

            {step === 'success' && (
              <>
                <CheckCircle size={64} className="phantom-icon-large" style={{ color: '#0aff6a' }} />
                <h2 className="phantom-h2" style={{ color: '#0aff6a' }}>IDENTITY VERIFIED</h2>
                <p className="phantom-p">Soldier account is active. You may now proceed with operations.</p>

                <div className="phantom-actions">
                  <button className="phantom-btn" onClick={() => { setStep('select'); setSmsCode(''); setLogs([]); }}>
                    <Trash2 size={16} /> BURN & ROTATE
                  </button>
                  <button className="phantom-btn" onClick={onClose}>
                    RETURN TO BASE
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="terminal-log">
          {logs.map((log, i) => (
            <div key={i} className={`log-line ${log.includes('ERROR') ? 'error' : ''}`}>
              {log}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
};

export default PhantomSim;
