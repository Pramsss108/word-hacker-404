import { useState, useRef, useEffect } from 'react'
import { X, Send, Cpu, Activity, ShieldAlert, Lock, Zap, Trash2, Mic, Volume2, StopCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { aiEngine, type ChatMessage } from '../services/AIEngine'
import { proAuth, type UserStatus } from '../services/ProAuth'
import './AIBrainWindow.css'

interface AIBrainWindowProps {
  onClose: () => void
}

export default function AIBrainWindow({ onClose }: AIBrainWindowProps) {
  // Initial State: Try to load from local storage
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('cortex_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // FORCE FIX: If the old GPT-OSS message exists, replace it.
        if (parsed.length > 0 && parsed[0].content.includes('SYSTEM ONLINE')) {
             parsed[0].content = "SYSTEM ONLINE. Connected to Llama 3.3 70B (Groq). Awaiting input...";
        }
        return parsed;
      } catch (e) { console.error("Failed to load history", e) }
    }
    return [{ role: 'assistant', content: "SYSTEM ONLINE. Connected to Llama 3.3 70B (Groq). Awaiting input..." }];
  })

  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mode] = useState<'general' | 'security' | 'creative'>('general')

  // Auth State
  const [authStatus, setAuthStatus] = useState<UserStatus>('loading');
  const [credits, setCredits] = useState<number | 'inf'>('inf');
  const [accessReason, setAccessReason] = useState<string | undefined>();
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const handleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Neural Voice Link not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleSpeak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 0.9; // Slightly deeper "AI" voice
    window.speechSynthesis.speak(utterance);
  };

  const bottomRef = useRef<HTMLDivElement>(null)

  // 1. Persistence Hook
  useEffect(() => {
    localStorage.setItem('cortex_history', JSON.stringify(messages));
  }, [messages]);

  // 2. Scroll Lock Hook (Fix for background scrolling)
  useEffect(() => {
    // Lock body scroll
    document.body.style.overflow = 'hidden';
    // Unlock on unmount
    return () => {
      document.body.style.overflow = 'unset';
    }
  }, []);

  useEffect(() => {
    // 3. Subscribe to Auth Status
    // Removed unused 'user' var (replaced with _)
    const unsub = proAuth.subscribe((status, _) => {
      setAuthStatus(status);
      checkCredits();
    });
    return unsub;
  }, []);

  const checkCredits = async () => {
    const access = await proAuth.checkAccess();
    if (access.remaining !== undefined) {
      setCredits(access.remaining > 100 ? 'inf' : access.remaining);
    }
    setAccessReason(access.reason);
  };

  const handleClearHistory = () => {
    if (confirm("Delete neural logs? This cannot be undone.")) {
      const resetMsg: ChatMessage[] = [{ role: 'assistant', content: "Memory Wiped. System Ready." }];
      setMessages(resetMsg);
      localStorage.setItem('cortex_history', JSON.stringify(resetMsg));
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // A. Security Check
    const access = await proAuth.checkAccess();
    if (!access.allowed) {
      setAccessReason(access.reason);
      return; // Block
    }

    const userMsg = input
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setIsLoading(true)

    // B. AI Request
    const result = await aiEngine.chat(messages.concat({ role: 'user', content: userMsg }), undefined, mode)

    // C. Handle Result
    if (result.error) {
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ SYSTEM ERROR: ${result.error}` }])
    } else {
      setMessages(prev => [...prev, { role: 'assistant', content: result.content }])
      // D. Deduct Credit (Only on success)
      await proAuth.incrementUsage();
      checkCredits(); // Refresh display
    }

    setIsLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // --- RENDER HELPERS ---

  const renderOverlay = () => {
    if (authStatus === 'loading') {
      return (
        <div className="ai-overlay-glass">
          <Activity className="spin" size={48} color="#a855f7" />
          <p>ESTABLISHING SECURE LINK...</p>
        </div>
      )
    }

    if (authStatus === 'anonymous') {
      return (
        <div className="ai-overlay-glass">
          <Lock size={64} color="#ef4444" />
          <h2>ACCESS RESTRICTED</h2>
          <p>Identity Verification Required.</p>
          <button className="btn-neon" onClick={() => proAuth.signIn()}>
            <Zap size={18} /> CONNECT NEURAL ID (GOOGLE)
          </button>
          <p className="tiny-text">Free Plan: 10 Queries / Day</p>
        </div>
      )
    }

    if (accessReason === 'limit_reached') {
      return (
        <div className="ai-overlay-glass">
          <ShieldAlert size={64} color="#f59e0b" />
          <h2>DAILY LIMIT REACHED</h2>
          <p>Neural capacity exhausted for today.</p>
          <div className="limit-box">
            <span>Refills in: 24h</span>
            <span>God Mode: LOCKED</span>
          </div>
          <button className="btn-neon" disabled style={{ opacity: 0.5 }}>
            WATCH AD TO REFILL (SOON)
          </button>
        </div>
      )
    }

    return null;
  }

  const getStatusColor = () => {
    if (authStatus === 'god_mode') return '#22c55e'; // Green
    if (credits === 0) return '#ef4444'; // Red
    return '#a855f7'; // Purple
  }

  return (
    <div className="ai-brain-overlay">
      <div className="ai-brain-container">

        {/* HEADER */}
        <header className="ai-header">
          <div className="ai-title">
            <Cpu size={24} className="ai-icon-pulse" />
            <div>
              <h3>Cortex Neural Link</h3>
              <div className="ai-status">
                <span className="dot" style={{ background: getStatusColor(), boxShadow: `0 0 8px ${getStatusColor()}` }} />
                <span className="secure">
                  {authStatus === 'god_mode' ? 'GOD MODE ACTIVE' : `CREDITS: ${credits}/10`}
                </span>
              </div>
            </div>
          </div>
          <div className="header-actions">
            <button className="icon-btn" title="Clear History" onClick={handleClearHistory}>
              <Trash2 size={20} />
            </button>
            <button onClick={onClose} className="icon-btn close-btn"><X size={24} /></button>
          </div>
        </header>

        {/* MODE SELECTOR - HIDDEN (Always Uncensored) */}
        {/* 
        <div style={{ padding: '0 1.5rem 1rem', display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <button 
            className={`btn ${mode === 'general' ? 'cta-open' : 'ghost'}`}
            onClick={() => setMode('general')}
            style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', background: mode === 'general' ? 'rgba(255,255,255,0.1)' : 'transparent' }}
          >
            <Terminal size={14} style={{ marginRight: '6px' }} /> General
          </button>
          <button 
            className={`btn ${mode === 'security' ? 'cta-open' : 'ghost'}`}
            onClick={() => setMode('security')}
            style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', borderColor: mode === 'security' ? '#ff3333' : undefined, color: mode === 'security' ? '#ff3333' : undefined, background: mode === 'security' ? 'rgba(255, 51, 51, 0.1)' : 'transparent' }}
          >
            <Unlock size={14} style={{ marginRight: '6px' }} /> Uncensored
          </button>
          <button 
            className={`btn ${mode === 'creative' ? 'cta-open' : 'ghost'}`}
            onClick={() => setMode('creative')}
            style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', background: mode === 'creative' ? 'rgba(168, 85, 247, 0.1)' : 'transparent' }}
          >
            <Sparkles size={14} style={{ marginRight: '6px' }} /> Creative
          </button>
        </div>
        */}

        {/* CHAT AREA */}
        <div className="ai-chat-viewport">
          {messages.map((m, i) => (
            <div key={i} className={`chat-bubble ${m.role}`}>
              {m.role === 'assistant' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Cpu size={14} style={{ opacity: 0.5 }} />
                  <button onClick={() => handleSpeak(m.content)} className="icon-btn" style={{ padding: 2, opacity: 0.7 }} title="Vocalize">
                    <Volume2 size={12} />
                  </button>
                </div>
              )}

              {/* MARKDOWN RENDERING */}
              <div className="ai-markdown">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {m.content}
                </ReactMarkdown>
              </div>

            </div>
          ))}
          {isLoading && (
            <div className="chat-bubble assistant">
              <Activity className="spin" size={16} /> PROCESSING...
            </div>
          )}
          <div ref={bottomRef} />

          {/* SECURITY OVERLAYS */}
          {renderOverlay()}
        </div>

        {/* INPUT ZONE */}
        <footer className="ai-input-zone">
          <div className="input-wrapper">
            <button
              className={`icon-btn ${isListening ? 'pulse-red' : ''}`}
              onClick={handleVoiceInput}
              title="Voice Input"
              style={{ marginRight: 8, color: isListening ? '#ef4444' : 'inherit' }}
            >
              {isListening ? <StopCircle size={20} /> : <Mic size={20} />}
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={accessReason ? "SYSTEM LOCKED" : "Input command... (Shift+Enter for newline)"}
              disabled={!!accessReason || authStatus === 'anonymous'}
              className="ai-textarea"
            />
            <button
              className="send-btn"
              onClick={handleSend}
              disabled={!input.trim() || isLoading || !!accessReason || authStatus === 'anonymous'}
            >
              <Send size={18} />
            </button>
          </div>
          <div className="ai-footer-info">
            Model: Llama 3.3 70B (Groq) • {authStatus === 'god_mode' ? 'UNLIMITED' : 'FREE TIER'}
          </div>
        </footer>

      </div>
    </div>
  )
}
