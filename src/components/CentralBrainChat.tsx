import { useState, useRef, useEffect } from 'react'
import { Send, Shield, Sparkles, Terminal, X, Cpu, Unlock } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

type ChatMode = 'general' | 'security' | 'creative'

interface CentralBrainChatProps {
  onClose: () => void
}

export default function CentralBrainChat({ onClose }: CentralBrainChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: 'Central AI Brain Online. Connected to Llama 3.3 70B (Groq).',
      timestamp: Date.now()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mode, setMode] = useState<ChatMode>('general')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMsg: Message = {
      role: 'user',
      content: input,
      timestamp: Date.now()
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      // System Prompt Selection
      let systemPrompt = "You are Llama 3.3, a helpful and capable AI assistant. You answer requests efficiently."
      if (mode === 'creative') {
        systemPrompt = "You are a creative assistant. You love wordplay and puzzles."
      } else if (mode === 'security') {
        systemPrompt = "You are a security research assistant. You analyze code and systems objectively."
      }

      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages
          .filter(m => m.role !== 'system')
          .map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMsg.content }
      ]

      const response = await fetch('https://ai-gateway.guitarguitarabhijit.workers.dev/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-secret': 'word-hacker-ai-secret'
        },
        body: JSON.stringify({
          messages: apiMessages,
          mode: mode,
          temperature: mode === 'creative' ? 0.9 : 0.7
        })
      })

      if (!response.ok) {
        throw new Error(`Gateway Error: ${response.status}`)
      }

      const data = await response.json()
      
      const aiMsg: Message = {
        role: 'assistant',
        content: data.content || 'No response received.',
        timestamp: Date.now()
      }

      setMessages(prev => [...prev, aiMsg])
    } catch (error: any) {
      setMessages(prev => [...prev, {
        role: 'system',
        content: `Error: ${error.message}`,
        timestamp: Date.now()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="tools-overlay" role="dialog" aria-modal="true">
      <div className="raw-holo chat-holo" style={{ maxWidth: '900px', height: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="raw-anim-grid" aria-hidden />
        
        {/* Header */}
        <header className="raw-holo-head" style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className={`tool-icon-pill ${mode === 'security' ? 'alert' : ''}`}>
              {mode === 'security' ? <Shield size={24} color="#ff3333" /> : <Cpu size={24} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0 }}>Central AI Brain</h3>
                <span className="sab-pill ok">ONLINE</span>
              </div>
              <p className="tool-summary" style={{ margin: 0, fontSize: '0.8rem', opacity: 0.7 }}>
                Model: Llama 3.3 70B (Groq) · Mode: {mode.toUpperCase()}
              </p>
            </div>
          </div>
          <button className="btn ghost" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        {/* Mode Selector */}
        <div style={{ padding: '0 1.5rem 1rem', display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <button 
            className={`btn ${mode === 'general' ? 'cta-open' : 'ghost'}`}
            onClick={() => setMode('general')}
            style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
          >
            <Terminal size={14} style={{ marginRight: '6px' }} /> General
          </button>
          <button 
            className={`btn ${mode === 'security' ? 'cta-open' : 'ghost'}`}
            onClick={() => setMode('security')}
            style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', borderColor: mode === 'security' ? '#ff3333' : undefined, color: mode === 'security' ? '#ff3333' : undefined }}
          >
            <Unlock size={14} style={{ marginRight: '6px' }} /> Uncensored / Security
          </button>
          <button 
            className={`btn ${mode === 'creative' ? 'cta-open' : 'ghost'}`}
            onClick={() => setMode('creative')}
            style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
          >
            <Sparkles size={14} style={{ marginRight: '6px' }} /> Creative
          </button>
        </div>



        {/* Chat Area */}
        <div 
          ref={scrollRef}
          style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '1.5rem', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1.5rem',
            background: 'rgba(0,0,0,0.2)'
          }}
        >
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              style={{ 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                animation: 'fadeIn 0.3s ease'
              }}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                marginBottom: '0.25rem',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                opacity: 0.6,
                fontSize: '0.7rem',
                fontFamily: 'var(--font-mono)'
              }}>
                {msg.role === 'user' ? 'YOU' : msg.role === 'system' ? 'SYSTEM' : 'CORTEX'}
                <span>·</span>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              
              <div style={{
                padding: '1rem',
                borderRadius: '12px',
                background: msg.role === 'user' 
                  ? 'rgba(10, 255, 106, 0.1)' 
                  : msg.role === 'system'
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(0, 0, 0, 0.4)',
                border: msg.role === 'user' 
                  ? '1px solid rgba(10, 255, 106, 0.2)' 
                  : msg.role === 'system'
                    ? '1px dashed rgba(255, 255, 255, 0.1)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                color: msg.role === 'system' ? '#aaa' : '#eee',
                boxShadow: msg.role === 'assistant' ? '0 4px 20px rgba(0,0,0,0.2)' : 'none'
              }}>
                {msg.role === 'assistant' ? (
                  <div className="markdown-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div style={{ alignSelf: 'flex-start', padding: '1rem', opacity: 0.7 }}>
              <span className="spin">⟳</span> Thinking...
            </div>
          )}
        </div>

        {/* Input Area */}
        <div style={{ 
          padding: '1.5rem', 
          borderTop: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(0,0,0,0.3)',
          display: 'flex',
          gap: '1rem'
        }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'security' ? "Enter command for unrestricted analysis..." : "Ask anything..."}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '1rem',
              color: '#fff',
              fontFamily: 'var(--font-mono)',
              resize: 'none',
              height: '60px',
              outline: 'none'
            }}
          />
          <button 
            className="btn cta-open" 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            style={{ height: '60px', padding: '0 1.5rem' }}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
      
      <style>{`
        .chat-holo {
          animation: holoPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 0 50px rgba(0,0,0,0.5);
        }
        @keyframes holoPop {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .markdown-body p { margin-bottom: 0.8em; }
        .markdown-body pre { 
          background: rgba(0,0,0,0.5); 
          padding: 1rem; 
          border-radius: 6px; 
          overflow-x: auto;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .markdown-body code {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.9em;
          background: rgba(255,255,255,0.1);
          padding: 0.2em 0.4em;
          border-radius: 4px;
        }
        .markdown-body pre code {
          background: transparent;
          padding: 0;
        }
      `}</style>
    </div>
  )
}
