import { useState, useEffect } from 'react';
import { Download, RefreshCw, Zap, Image as ImageIcon, ArrowLeft, Bug, Sparkles, Plus, Terminal } from 'lucide-react';


import MatrixRain from './MatrixRain';
import { revokeObjectURL } from '../utils/imageLoader';

// Style Presets (Keyword Engineering)
const STYLE_PRESETS: Record<string, string> = {
  minimalist: "vector art, flat design, clean lines, simple, white background, high contrast",
  realistic: "photorealistic, detailed, 8k, professional photography, cinematic lighting",
  abstract: "abstract art, geometric shapes, vibrant colors, artistic, surrealism",
  cyberpunk: "cyberpunk, neon, futuristic, dark background, glowing, high tech, matrix style",
  logo: "professional logo, vector style, centered, minimal, iconic, white background",
  anime: "anime style, cel shaded, vibrant, studio ghibli style, detailed"
};

const STATUS = {
  LOADING: "__LOADING__",
  PENDING: "__PENDING__",
};

interface CyberCanvasProps {
  onBack: () => void;
  onVectorize?: (imageUrl: string) => void;
}

export default function CyberCanvas({ onBack, onVectorize }: CyberCanvasProps) {
  const [prompt, setPrompt] = useState('');
  const [stylePreset, setStylePreset] = useState('cyberpunk');
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  // Pro Mode: Hugging Face Token (Persisted)
  const [hfToken, setHfToken] = useState(() => localStorage.getItem('hf_token') || '');
  const [showSettings, setShowSettings] = useState(false);

  // When token changes, save it
  useEffect(() => {
    localStorage.setItem('hf_token', hfToken);
  }, [hfToken]);

  // "The Vault" Mode: Calls Cloudflare Worker (Proxy)
  // No key is stored here. It's safe.
  const proxyUrl = "https://cyber-canvas-proxy.guitarguitarabhijit.workers.dev";

  // Publish CyberCanvas snapshot to DebugHub
  useEffect(() => {
    try {
      const hub = (window as any).__DEBUG_HUB__
      if (hub && typeof hub.set === 'function') {
        hub.set('cybercanvas', {
          prompt,
          stylePreset,
          generatedImages,
          isGenerating
        })
      }
    } catch (e) { }
  }, [prompt, stylePreset, generatedImages, isGenerating]);

  const handleCopyDebug = () => {
    const debugInfo = {
      userAgent: navigator.userAgent,
      generatedImages,
      prompt,
      stylePreset,
      time: new Date().toISOString()
    };
    navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
    alert("Debug info copied! Please paste it in the chat.");
  };

  // cleanup object urls on unmount
  useEffect(() => {
    // Cleanup blobs
    return () => { generatedImages.forEach(url => revokeObjectURL(url)); };
  }, [generatedImages]);

  // Generation Logic
  const generateImages = async () => {
    if (!prompt.trim()) return;
    if (!prompt.trim()) return;
    setIsGenerating(true);
    // Initialize with [LOADING, PENDING] so user sees 2 slots immediately
    setGeneratedImages([STATUS.LOADING, STATUS.PENDING]);

    const basePrompt = prompt.trim();

    setTimeout(async () => {
      // 1. "The Vault" (Pro Mode via Proxy)
      // Calls your Worker -> Worker checks limits -> Worker uses Secret Key
      const generateSlot = async (slotIndex: number) => {
        const randomSeed = Math.floor(Math.random() * 1000000) + slotIndex;
        const finalPrompt = `${basePrompt}, ${STYLE_PRESETS[stylePreset]}`;

        let vaultSuccess = false;
        // Retry Loop (3 attempts) to handle API hiccups (503/429)
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const response = await fetch(proxyUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                prompt: finalPrompt,
                seed: randomSeed
              }),
            });

            if (response.ok) {
              const blob = await response.blob();
              const imageUrl = URL.createObjectURL(blob);
              setGeneratedImages(prev => {
                const copy = [...prev];
                copy[slotIndex] = imageUrl;
                return copy;
              });
              vaultSuccess = true;
              break; // Success! Exit loop
            } else {
              console.warn(`Vault Attempt ${attempt + 1} Failed: ${response.status}`);
              if (attempt < 2) await new Promise(r => setTimeout(r, 2000)); // Wait 2s before retry
            }
          } catch (e) { console.error("Vault Network Error", e); }
        }

        if (vaultSuccess) return;

        console.warn("Vault Unreachable after retries, switching to Pollinations");

        // 2. Fallback: Free Mode (Pollinations)
        // If Proxy fails (Limit reached), use Pollinations Turbo
        const model = 'turbo';
        const encodedPrompt = encodeURIComponent(finalPrompt);
        const seed = randomSeed + Math.floor(Math.random() * 100);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true&seed=${seed}&model=${model}&width=1024&height=1024`;

        setGeneratedImages(prev => {
          const copy = [...prev];
          copy[slotIndex] = imageUrl;
          return copy;
        });
      };

      // Try to generate 4 images (Vault attempt)
      // If Vault limits 5/day, it will fail after 5th and fallback to Pollinations (Free)
      // Try to generate 2 images (Vault attempt) - Optimized for stability
      // If Vault limits 5/day, it will fail after nth and fallback to Pollinations (Free)
      const slotsToGenerate = [0, 1];
      for (let i = 0; i < slotsToGenerate.length; i++) {
        const index = slotsToGenerate[i];

        // If it's the second slot, mark it as loading now (was pending)
        if (i > 0) {
          setGeneratedImages(prev => {
            const copy = [...prev];
            copy[index] = STATUS.LOADING;
            return copy;
          });
        }

        await generateSlot(index); // Wait for finish (Sequential)

        // Buffer
        if (i < slotsToGenerate.length - 1) await new Promise(r => setTimeout(r, 500));
      }

      setIsGenerating(false);
    }, 100);
  };

  // Helper for downloading images properly as Blobs (prevents 0-byte downloads)
  const handleDownload = async (url: string, index: number) => {
    try {
      console.log("Attempting download for:", url);
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `CyberCanvas_Gen_${Date.now()}_${index + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error("Download failed, falling back to direct tab", e);
      // Fallback: This ensures the user definitely sees the image full size
      window.open(url, '_blank');
    }
  };

  // Manual Retry for a specific slot (Now uses Vault)
  const retrySlot = async (index: number) => {
    // 1. Set to LOADING state
    setGeneratedImages(prev => {
      const copy = [...prev];
      copy[index] = STATUS.LOADING;
      return copy;
    });

    // 2. Wait 300ms so user actually sees the reset
    await new Promise(r => setTimeout(r, 300));
    const randomSeed = Math.floor(Math.random() * 1000000) + Date.now();
    const finalPrompt = `${prompt.trim()}, ${STYLE_PRESETS[stylePreset]}`;

    // 3. Try Vault First (Pro Mode)
    let vaultSuccess = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(proxyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: finalPrompt, seed: randomSeed }),
        });

        if (response.ok) {
          const blob = await response.blob();
          const imageUrl = URL.createObjectURL(blob);
          setGeneratedImages(prev => {
            const copy = [...prev];
            copy[index] = imageUrl;
            return copy;
          });
          vaultSuccess = true;
          break;
        } else {
          // Backoff
          if (attempt < 2) await new Promise(r => setTimeout(r, 1500));
        }
      } catch (e) { }
    }

    if (vaultSuccess) return;

    // 4. Fallback to Pollinations (Free)
    const models = ['turbo', 'flux-realism', 'any-dark'];
    const model = models[Math.floor(Math.random() * models.length)];
    const encodedPrompt = encodeURIComponent(finalPrompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true&seed=${randomSeed}&model=${model}&width=1024&height=1024`;

    setGeneratedImages(prev => {
      const copy = [...prev];
      copy[index] = imageUrl;
      return copy;
    });
  };

  return (
    <div className="app cyber-canvas-screen" style={{ minHeight: '100vh', background: '#0b0b0d', color: '#e9eef6', display: 'flex', flexDirection: 'column' }}>
      <MatrixRain opacity={0.05} density={20} speed={1.5} />

      {/* Header */}
      <header style={{
        padding: '20px',
        borderBottom: '1px solid rgba(10, 255, 106, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(11, 11, 13, 0.8)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button
            onClick={onBack}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#0aff6a',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: 'JetBrains Mono, monospace'
            }}
          >
            <ArrowLeft size={18} /> BACK
          </button>
          <h1 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'JetBrains Mono, monospace', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={20} color="#0aff6a" />
            CYBER CANVAS <span style={{ fontSize: '0.8em', opacity: 0.5 }}>// AI IMAGE GENERATOR</span>
          </h1>
        </div>
        <div className="mono" style={{ fontSize: '0.8rem', color: '#0aff6a', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              background: hfToken ? 'rgba(10, 255, 106, 0.2)' : 'transparent',
              border: '1px solid #0aff6a',
              color: '#0aff6a',
              cursor: 'pointer',
              fontSize: '0.7rem',
              padding: '4px 8px',
              borderRadius: '4px',
              display: 'flex',
              gap: '5px',
              alignItems: 'center'
            }}
          >
            <Terminal size={14} /> {hfToken ? "PRO MODE :: ACTIVE" : "CONFIG API"}
          </button>

          <button onClick={() => setShowDebug(!showDebug)} style={{ background: 'transparent', border: 'none', color: '#0aff6a', cursor: 'pointer' }} title="Toggle Debug Info">
            <Bug size={16} />
          </button>
          <button onClick={handleCopyDebug} style={{ background: 'transparent', border: '1px solid #0aff6a', color: '#0aff6a', cursor: 'pointer', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px' }}>
            COPY DEBUG
          </button>
          SYSTEM: ONLINE
        </div>
      </header>

      {/* API Key Settings Overlay */}
      {showSettings && (
        <div style={{
          background: '#111',
          borderBottom: '1px solid #333',
          padding: '15px',
          marginBottom: '10px'
        }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontSize: '0.9rem', marginBottom: '5px' }}>Hugging Face Token (Free):</div>
              <input
                type="password"
                value={hfToken}
                onChange={(e) => setHfToken(e.target.value)}
                placeholder="Paste token here (starts with hf_...)"
                style={{
                  width: '100%',
                  background: '#222',
                  border: '1px solid #444',
                  color: '#0aff6a',
                  padding: '8px',
                  borderRadius: '4px',
                  fontFamily: 'monospace'
                }}
              />
            </div>
            <div style={{ fontSize: '0.8rem', color: '#888' }}>
              Get free token at <a href="https://huggingface.co/settings/tokens" target="_blank" style={{ color: '#0aff6a' }}>huggingface.co</a>.
              <br />Unlocks <b>FLUX.1-Dev</b> (Best Quality).
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main style={{ flex: 1, padding: '20px', maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box', position: 'relative', zIndex: 1 }}>

        {/* Controls */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '30px'
        }}>
          <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your vision (e.g., 'A futuristic robot head logo')..."
                style={{
                  flex: 1,
                  position: 'relative',
                  zIndex: 2,
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid #333',
                  color: '#fff',
                  padding: '12px 15px',
                  borderRadius: '6px',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '1rem',
                  minWidth: '250px'
                }}
                onKeyDown={(e) => e.key === 'Enter' && generateImages()}
              />

              <select
                value={stylePreset}
                onChange={(e) => setStylePreset(e.target.value)}
                style={{
                  background: '#1a1a1d',
                  border: '1px solid #333',
                  color: '#fff',
                  padding: '12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontFamily: 'JetBrains Mono, monospace',
                  position: 'relative',
                  zIndex: 2
                }}
              >
                {Object.keys(STYLE_PRESETS).map(style => (
                  <option key={style} value={style}>{style.toUpperCase()}</option>
                ))}
              </select>

              <button
                onClick={generateImages}
                disabled={isGenerating || !prompt.trim()}
                style={{
                  background: isGenerating ? '#333' : '#0aff6a',
                  color: isGenerating ? '#888' : '#000',
                  border: 'none',
                  padding: '12px 25px',
                  borderRadius: '6px',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontFamily: 'JetBrains Mono, monospace',
                  transition: 'all 0.2s'
                }}
              >
                {isGenerating ? (
                  <><RefreshCw className="spin" size={18} /> GENERATING...</>
                ) : (
                  <><Zap size={18} /> GENERATE</>
                )}
              </button>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#888', fontFamily: 'JetBrains Mono, monospace' }}>
              * Generates 2 variations (Optimized) using Pollinations.ai (Free Tier)
            </div>
          </div>
        </div>

        {/* Results Grid */}
        {generatedImages.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px'
          }}>
            {generatedImages.map((url, index) => (
              <div key={index} style={{
                position: 'relative',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: '#0b0b0d', // Match background
                aspectRatio: '1/1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }} className="image-card">

                {url === STATUS.LOADING ? (
                  /* LOADING STATE */
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', color: '#0aff6a' }}>
                    <RefreshCw className="spin" size={32} />
                    <span className="mono" style={{ fontSize: '0.8rem' }}>GENERATING...</span>
                  </div>
                ) : url === STATUS.PENDING ? (
                  /* PENDING STATE */
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', color: '#666' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#666', animation: 'pulse 2s infinite' }}></div>
                    <span className="mono" style={{ fontSize: '0.8rem' }}>QUEUED</span>
                  </div>
                ) : url ? (
                  /* SUCCESS STATE */
                  <>
                    <img
                      src={url}
                      alt={`Generated ${index + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => { e.currentTarget.style.opacity = '0.5'; }}
                    />

                    {/* Overlay Actions */}
                    <div className="image-actions" style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: '15px',
                      background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
                      display: 'flex',
                      gap: '10px',
                      justifyContent: 'center'
                    }}>
                      <button
                        onClick={() => handleDownload(url, index)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(5px)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: '#fff',
                          padding: '8px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '0.8rem'
                        }}
                        title="Download Image"
                      >
                        <Download size={14} /> SAVE
                      </button>

                      <button
                        onClick={() => onVectorize && onVectorize(url)}
                        style={{
                          background: 'rgba(10, 255, 106, 0.2)',
                          backdropFilter: 'blur(5px)',
                          border: '1px solid #0aff6a',
                          color: '#0aff6a',
                          padding: '8px 12px',
                          borderRadius: '4px',
                          cursor: onVectorize ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '0.8rem',
                          opacity: onVectorize ? 1 : 0.7
                        }}
                        title="Vectorize"
                      >
                        <ImageIcon size={14} /> VECTORIZE
                      </button>

                      <button
                        onClick={() => retrySlot(index)}
                        style={{
                          background: 'rgba(255, 100, 100, 0.2)',
                          backdropFilter: 'blur(5px)',
                          border: '1px solid #ff6464',
                          color: '#ff6464',
                          padding: '8px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '0.8rem'
                        }}
                        title="Retry / Regenerate"
                      >
                        <RefreshCw size={14} /> RETRY
                      </button>
                    </div>

                    {showDebug && (
                      <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0,
                        background: 'rgba(0,0,0,0.8)', color: '#0aff6a', fontSize: '10px', padding: '5px', wordBreak: 'break-all', zIndex: 5
                      }}>
                        {url}
                      </div>
                    )}
                  </>
                ) : (
                  /* Empty Slot (Failed or Init) - Click to Generate */
                  <button
                    onClick={() => retrySlot(index)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '2px dashed rgba(255, 255, 255, 0.1)',
                      color: 'rgba(255, 255, 255, 0.5)',
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(10, 255, 106, 0.1)';
                      e.currentTarget.style.borderColor = '#0aff6a';
                      e.currentTarget.style.color = '#0aff6a';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
                    }}
                  >
                    <Plus size={32} />
                    <span style={{ fontSize: '0.9rem', fontFamily: 'JetBrains Mono' }}>GENERATE VARIATION</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '400px',
            color: '#444',
            border: '2px dashed #222',
            borderRadius: '12px'
          }}>
            <Sparkles size={48} style={{ marginBottom: '20px', opacity: 0.2 }} />
            <p style={{ fontFamily: 'JetBrains Mono, monospace' }}>AWAITING INPUT...</p>
          </div>
        )}

      </main>
    </div>
  );
}
