import { useState, useEffect } from 'react';
import { ArrowLeft, Download, Sparkles, Image as ImageIcon, Zap, RefreshCw, Bug } from 'lucide-react';
import MatrixRain from './MatrixRain';
import { fetchToObjectURL, revokeObjectURL } from '../utils/imageLoader';

// Style Presets (Keyword Engineering)
const STYLE_PRESETS: Record<string, string> = {
  minimalist: "vector art, flat design, clean lines, simple, white background, high contrast",
  realistic: "photorealistic, detailed, 8k, professional photography, cinematic lighting",
  abstract: "abstract art, geometric shapes, vibrant colors, artistic, surrealism",
  cyberpunk: "cyberpunk, neon, futuristic, dark background, glowing, high tech, matrix style",
  logo: "professional logo, vector style, centered, minimal, iconic, white background",
  anime: "anime style, cel shaded, vibrant, studio ghibli style, detailed"
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
    } catch (e) {}
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

  const generateImages = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setGeneratedImages([]); // Clear previous

    const basePrompt = prompt.trim();
    const styleKeywords = STYLE_PRESETS[stylePreset];
    
    // Generate 4 variations with different seeds
    // We use a small delay to ensure React renders the loading state
    setTimeout(async () => {
      const remoteUrls = [1, 2, 3, 4].map(i => {
        const finalPrompt = encodeURIComponent(`${basePrompt}, ${styleKeywords}`);
        const randomSeed = Math.floor(Math.random() * 1000000) + i;
        const baseUrl = `https://image.pollinations.ai/prompt/${finalPrompt}`;
        if (i === 1) return `${baseUrl}?seed=${randomSeed}&model=flux&width=1024&height=1024&nologo=true`;
        if (i === 2) return `${baseUrl}?seed=${randomSeed}&model=flux-realism&width=1024&height=1024&nologo=true`;
        if (i === 3) return `${baseUrl}?seed=${randomSeed}&model=any-dark&width=1024&height=1024&nologo=true`;
        return `${baseUrl}?seed=${randomSeed}&model=flux&width=1024&height=1024&nologo=true`;
      });

      // clear previous object URLs
      generatedImages.forEach(url => { if (url && url.startsWith('blob:')) revokeObjectURL(url); });

      // initialize with placeholders so UI shows loading indicators
      setGeneratedImages(remoteUrls.map(() => ''));

      // fetch each remote URL to object URL and update state as they arrive
      await Promise.all(remoteUrls.map(async (u, idx) => {
        try {
          const obj = await fetchToObjectURL(u);
          setGeneratedImages(prev => {
            const copy = [...prev];
            copy[idx] = obj;
            return copy;
          });
        } catch (e) {
          console.warn('Image fetch failed', e, u);
          // keep remote URL as fallback so user can open in new tab
          setGeneratedImages(prev => {
            const copy = [...prev];
            copy[idx] = u;
            return copy;
          });
        }
      }));

      setIsGenerating(false);
    }, 200);
  };

  // cleanup object urls on unmount
  useEffect(() => {
    return () => {
      generatedImages.forEach(url => { if (url && url.startsWith('blob:')) revokeObjectURL(url); });
    }
  }, [generatedImages]);

  const handleDownload = async (url: string, index: number) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `cyber-canvas-${Date.now()}-${index}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback to opening in new tab
      window.open(url, '_blank');
    }
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
        <div className="mono" style={{ fontSize: '0.8rem', color: '#0aff6a', display: 'flex', gap: '10px' }}>
          <button onClick={() => setShowDebug(!showDebug)} style={{ background: 'transparent', border: 'none', color: '#0aff6a', cursor: 'pointer' }} title="Toggle Debug Info">
            <Bug size={16} />
          </button>
          <button onClick={handleCopyDebug} style={{ background: 'transparent', border: '1px solid #0aff6a', color: '#0aff6a', cursor: 'pointer', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px' }}>
            COPY DEBUG
          </button>
          SYSTEM: ONLINE
        </div>
      </header>

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
              * Generates 4 variations using Pollinations.ai (Free Tier)
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
                background: '#000',
                aspectRatio: '1/1',
              }} className="image-card">
                <img 
                  src={url} 
                  alt={`Generated ${index + 1}`} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    // Fallback if image fails
                    e.currentTarget.style.opacity = '0.5';
                  }}
                />
                
                {showDebug && (
                  <div style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    background: 'rgba(0,0,0,0.8)', 
                    color: '#0aff6a', 
                    fontSize: '10px', 
                    padding: '5px', 
                    wordBreak: 'break-all',
                    zIndex: 5
                  }}>
                    {url}
                  </div>
                )}

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
                  
                  {/* Vectorize button */}
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
                </div>
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
