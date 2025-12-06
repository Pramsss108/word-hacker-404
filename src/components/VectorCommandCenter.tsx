import React, { useState, useRef, useEffect } from 'react';
import { 
  Wand2, 
  Download, 
  Copy, 
  PenTool, 
  Cpu, 
  CheckCircle2, 
  AlertCircle, 
  Upload,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  FileText,
  Eraser,
  ArrowUpCircle,
  X,
  BrainCircuit,
  Sparkles,
  Loader2,
  RefreshCcw
} from 'lucide-react';
import VectorizerWorker from '../workers/vectorizer.worker?worker';
import LLMWorker from '../workers/llm.worker?worker';
import { INDUSTRIES, STYLES, ASSET_TYPES, COMPOSITIONS, MOODS, COLOR_PALETTES } from '../data/promptPresets';
import { removeBackground } from '@imgly/background-removal';
import Upscaler from 'upscaler';

import { useGlobalAIWorker } from '../services/GlobalAIWorker';

// --- TYPES ---
type Mode = 'architect' | 'vectorizer';
type Sector = 'print' | 'logo' | 'illustration' | 'cnc' | 'embroidery';

const SECTOR_PRESETS: Record<Sector, any> = {
  print: { numberofcolors: 8, pathomit: 12, blurradius: 0 },
  logo: { numberofcolors: 4, ltres: 0.5, qtres: 0.5, rightangleenhance: true },
  illustration: { numberofcolors: 32, ltres: 1, qtres: 1 },
  cnc: { numberofcolors: 2, colorsampling: 0, blurradius: 0, blurdelta: 0 },
  embroidery: { numberofcolors: 6, pathomit: 20 }
};

interface PromptState {
  subject: string;
  industry: keyof typeof INDUSTRIES;
  assetType: keyof typeof ASSET_TYPES;
  style: keyof typeof STYLES;
  composition: keyof typeof COMPOSITIONS;
  mood: keyof typeof MOODS;
  palette: string;
  customColors: string[];
}

// --- STYLES (Inline for simplicity/portability) ---
const styles = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '20px',
    color: '#e9eef6',
    fontFamily: '"JetBrains Mono", monospace',
    boxSizing: 'border-box' as const,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid #222',
    paddingBottom: '12px',
    flexShrink: 0,
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: '#0aff6a',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  tabContainer: {
    display: 'flex',
    gap: '4px',
    background: '#111',
    padding: '4px',
    borderRadius: '8px',
    marginBottom: '20px',
    flexShrink: 0,
  },
  tab: (isActive: boolean) => ({
    flex: 1,
    padding: '10px',
    border: 'none',
    background: isActive ? '#222' : 'transparent',
    color: isActive ? '#0aff6a' : '#666',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
    fontSize: '0.85rem',
  }),
  section: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    overflow: 'hidden',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
    overflowY: 'auto' as const, // Allow internal scroll if absolutely needed, but try to fit
    paddingRight: '4px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  label: {
    fontSize: '0.7rem',
    color: '#888',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    fontWeight: 600,
  },
  input: {
    background: '#050505',
    border: '1px solid #333',
    padding: '10px',
    borderRadius: '6px',
    color: 'white',
    fontSize: '0.85rem',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  select: {
    background: '#050505',
    border: '1px solid #333',
    padding: '10px',
    borderRadius: '6px',
    color: 'white',
    fontSize: '0.85rem',
    fontFamily: 'inherit',
    cursor: 'pointer',
  },
  button: {
    background: '#0aff6a',
    color: 'black',
    border: 'none',
    padding: '14px',
    borderRadius: '8px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '0.9rem',
    textTransform: 'uppercase' as const,
    transition: 'transform 0.1s',
  },
  resultBox: {
    background: '#1a1a1a',
    border: '1px dashed #444',
    borderRadius: '8px',
    padding: '24px',
    marginTop: '16px',
    position: 'relative' as const,
  },
  promptText: {
    color: '#ccc',
    lineHeight: 1.6,
    fontSize: '0.95rem',
    whiteSpace: 'pre-wrap' as const,
  },
  dropZone: {
    border: '2px dashed #333',
    borderRadius: '12px',
    padding: '48px',
    textAlign: 'center' as const,
    cursor: 'pointer',
    transition: 'border-color 0.2s',
    background: '#080808',
  },
  svgPreview: {
    width: '100%',
    height: '300px',
    background: 'transparent', // Checkerboard pattern could be added here
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    border: '1px solid #333',
    borderRadius: '8px',
  }
};

export default function VectorCommandCenter() {
  const [mode, setMode] = useState<Mode>('architect');
  
  // Architect State
  const [promptState, setPromptState] = useState<PromptState>({
    subject: '',
    industry: 'tech',
    assetType: 'logo',
    style: 'minimal',
    composition: 'centered',
    mood: 'professional',
    palette: 'monochrome',
    customColors: ['#000000', '#ffffff', '#333333', '#666666', '#999999']
  });
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  // Vectorizer State
  const [svgOutput, setSvgOutput] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [comparePos, setComparePos] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [sector, setSector] = useState<Sector | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  const [showResultModal, setShowResultModal] = useState(false);

  // AI Brain State
  const [aiModelType, setAiModelType] = useState<'lite' | 'pro'>('pro'); // Default to PRO (248M)
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiModelReady, setAiModelReady] = useState(false);
  const [aiProgress, setAiProgress] = useState<any>(null);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiOriginalInput, setAiOriginalInput] = useState<string | null>(null);
  const [systemError, setSystemError] = useState<string | null>(null);
  const llmWorkerRef = useRef<Worker | null>(null);
  const waitingForEnhance = useRef(false);
  const { getWorker, getStatus } = useGlobalAIWorker();

  // System Capability Check
  const checkSystemCapabilities = () => {
    // Heuristic: Check for device memory (if available) and concurrency
    const ram = (navigator as any).deviceMemory || 4; // Default to 4 if unknown
    // const cores = navigator.hardwareConcurrency || 4; // Unused for now

    if (ram < 4) {
      return {
        compatible: false,
        reason: `Insufficient RAM (${ram}GB detected). The Max Power AI requires at least 4GB.`
      };
    }
    
    // Mobile check (rough heuristic)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile && ram < 6) {
       return {
         compatible: false,
         reason: "Mobile device detected. High-performance AI requires a desktop environment or high-end mobile device."
       };
    }

    return { compatible: true };
  };

  // Initialize Worker Logic
  const initializeWorker = (modelName: string = 'Xenova/LaMini-Flan-T5-248M') => {
    // Use the global worker if available
    const globalW = getWorker();
    
    // If we already have a local ref, clean it up unless it's the global one
    if (llmWorkerRef.current && llmWorkerRef.current !== globalW) {
      llmWorkerRef.current.terminate();
    }

    try {
      // Use global worker or create new one if somehow missing (fallback)
      const worker = globalW || new LLMWorker();
      
      // Attach event listeners to the worker
      // Note: This overrides previous listeners, which is what we want for the active component
      worker.onmessage = (e) => {
        const { type, data, text, error } = e.data;
        if (type === 'progress') {
          setAiProgress(data);
        } else if (type === 'ready') {
          setAiModelReady(true);
          // Only hide loading if we aren't waiting for an enhancement
          if (!waitingForEnhance.current) {
            setAiLoading(false);
          }
          setAiProgress(null);
        } else if (type === 'result') {
          // Reset waiting flag
          waitingForEnhance.current = false;

          // CLEANUP: Remove conversational filler if the model ignores instructions
          let cleanText = text
            .replace(/^The professional vector logo for ".*?" is: /i, '')
            .replace(/^The visual elements.*?are:\s*/i, '') // Remove "The visual elements... are:"
            .replace(/^The design concept is a /, 'A ')
            .replace(/^The design concept is /, '')
            .replace(/^This is a /, 'A ')
            .replace(/^Here is a /, 'A ')
            .replace(/^\d+\.\s*Title:.*?(?=\d+\.|A )/i, '') // Remove "1. Title: ..." garbage
            .trim();
          
          // If it starts with "A The", fix it to "A"
          if (cleanText.startsWith("A The ")) {
            cleanText = cleanText.replace("A The ", "A ");
          }

          // If it still starts with "1.", strip it
          if (cleanText.match(/^\d+\./)) {
              cleanText = cleanText.replace(/^\d+\.\s*/, '');
          }

          // Capitalize first letter
          cleanText = cleanText.charAt(0).toUpperCase() + cleanText.slice(1);

          setAiResult(cleanText);
          setAiLoading(false);
        } else if (type === 'error') {
          console.error("AI Worker Error:", error);
          setAiLoading(false);
          
          // Check for specific "offset out of bounds" error which means WASM memory limit
          if (error.message && error.message.includes('offset is out of bounds')) {
             setSystemError("Browser Memory Limit Reached. The 'Ultra' model is too large for this browser tab's allocated memory (WASM Limit), even with 16GB RAM.");
          } else {
             setSystemError("AI Engine Failure: " + (error.message || "Unknown error."));
          }
          setAiEnabled(false);
        }
      };
      
      worker.onerror = (err) => {
        console.error("Worker Script Error:", err);
        setAiLoading(false);
        setSystemError("Critical Worker Failure. The AI model crashed the browser tab (Out of Memory).");
        setAiEnabled(false);
      };
      
      llmWorkerRef.current = worker;
      
      // If it's a fresh worker (not global), start loading
      if (!globalW) {
         worker.postMessage({ type: 'load', model: modelName });
      } else {
         // If it is global, check status
         const status = getStatus();
         if (status === 'ready') {
            setAiModelReady(true);
            setAiLoading(false);
         } else if (status === 'loading') {
            setAiLoading(true);
            // We might miss progress events if we attach late, 
            // but the worker will keep sending them if we ask or if it's busy.
            // Actually, we can't easily "ask" for current progress.
            // But the next progress event will update us.
         }
      }

    } catch (err: any) {
      console.error("Failed to initialize AI Worker", err);
    }
  };

  // Initialize Worker Silently on Mount
  useEffect(() => {
    // 1. Run System Check
    const sysCheck = checkSystemCapabilities();
    if (!sysCheck.compatible) {
      // Don't show error yet, only if they try to use it
      return;
    }

    // Initialize using the global worker
    initializeWorker();
    
    return () => {
      // DO NOT terminate the worker on unmount anymore!
      // We want it to keep running in the background.
      // llmWorkerRef.current?.terminate();
      
      // Just remove the listener to avoid memory leaks or state updates on unmounted component
      if (llmWorkerRef.current) {
        llmWorkerRef.current.onmessage = null;
        llmWorkerRef.current.onerror = null;
      }
    };
  }, []); // Run once on mount

  const handleCancelDownload = () => {
    if (llmWorkerRef.current) {
      llmWorkerRef.current.terminate();
      llmWorkerRef.current = null;
    }
    setAiLoading(false);
    setAiProgress(null);
    setAiModelReady(false);
    waitingForEnhance.current = false;
  };

  const handleRetryDownload = () => {
    setAiLoading(true);
    setAiProgress(null);
    let modelName = 'Xenova/LaMini-Flan-T5-248M';
    if (aiModelType === 'lite') modelName = 'Xenova/LaMini-Flan-T5-77M';
    initializeWorker(modelName);
  };

  const handleModelChange = (type: 'lite' | 'pro') => {
    if (type === aiModelType) return;
    setAiModelType(type);
    setAiModelReady(false);
    setAiProgress(null);
    
    if (llmWorkerRef.current) {
        let modelName = 'Xenova/LaMini-Flan-T5-248M';
        if (type === 'lite') modelName = 'Xenova/LaMini-Flan-T5-77M';
        
        llmWorkerRef.current.postMessage({ type: 'load', model: modelName });
    }
  };

  const handleAiEnhance = () => {
    // Check system compatibility again before action
    const sysCheck = checkSystemCapabilities();
    if (!sysCheck.compatible) {
      setSystemError(sysCheck.reason || "System incompatible");
      return;
    }

    if (!llmWorkerRef.current) {
      alert("AI Brain is initializing... Please wait a moment.");
      return;
    }
    
    if (!promptState.subject.trim()) {
      alert("Please type a subject (e.g. 'Cyberpunk Wolf') in the text box first!");
      return;
    }

    // If model is not ready, show loading state (which will show progress bar)
    if (!aiModelReady) {
       setAiLoading(true);
       waitingForEnhance.current = true;
    } else {
       setAiLoading(true);
       waitingForEnhance.current = true; // Also set here just in case
    }

    setAiResult(null);
    setAiOriginalInput(promptState.subject);
    
    // If model is ready, send the request. If not, we need to wait.
    // Actually, if we send 'enhance' while it's loading, the worker might drop it or queue it depending on implementation.
    // Our worker is simple. It processes messages in order.
    // So we CAN send it now! It will just sit in the message queue until 'load' finishes.
    
    const context = `${promptState.subject} in ${promptState.style} style for ${promptState.industry}`;
    llmWorkerRef.current.postMessage({ 
      type: 'enhance', 
      text: context, 
      id: Date.now(),
      model: 'Xenova/LaMini-Flan-T5-783M'
    });
  };

  // --- ARCHITECT LOGIC ---
  const generatePrompt = () => {
    const { subject, industry, assetType, style, composition, mood, palette, customColors } = promptState;
    
    // 1. Core Definition
    const typeStr = ASSET_TYPES[assetType].keywords;
    const industryStr = INDUSTRIES[industry].keywords;
    const styleStr = STYLES[style].keywords;
    const compStr = COMPOSITIONS[composition].keywords;
    const moodStr = MOODS[mood].keywords;
    
    // 2. Color Logic
    let colorStr = '';
    if (palette === 'custom') {
      colorStr = `custom palette: ${customColors.join(', ')}`;
    } else {
      const p = COLOR_PALETTES[palette as keyof typeof COLOR_PALETTES];
      if (p) {
        colorStr = `${p.keywords}, palette: ${p.colors.join(', ')}`;
      } else {
        colorStr = `custom palette: ${customColors.join(', ')}`;
      }
    }

    // 3. Engineering the "Super Duper" Prompt
    // Structure: [Role/Context] + [Subject] + [Style Modifiers] + [Technical Constraints] + [Parameters]
    
    const rolePrefix = "professional vector graphics of";
    const qualityBoosters = "award winning, behance feature, dribbble style, vectorizer.ai ready, perfect composition";
    const techSpecs = "white background, flat color, 2d, no gradients, clean lines, svg style, high contrast";
    const negativePrompt = "--no photorealistic, 3d render, blur, noise, watermark, text, realistic photo, shading, complex details";
    const parameters = "--v 6.0 --stylize 250";

    // Assemble the master prompt
    const finalPrompt = `/imagine prompt: ${rolePrefix} ${subject}, ${typeStr}, ${industryStr}, ${styleStr}, ${moodStr}, ${compStr}, ${colorStr}, ${qualityBoosters}, ${techSpecs} ${parameters} ${negativePrompt}`;
    
    setGeneratedPrompt(finalPrompt);
    setShowResultModal(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- VECTORIZER LOGIC ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setOriginalImage(result);
      const img = new Image();
      img.src = result;
      
      img.onload = () => {
        // Create canvas to extract ImageData
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          setIsProcessing(false);
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);

        // Configure ImageTracer
        const baseOptions = {
          ltres: 1,
          qtres: 1,
          pathomit: 8,
          rightangleenhance: true,
          colorsampling: 2,
          numberofcolors: 16,
          mincolorratio: 0,
          colorquantcycles: 3,
          scale: 1,
          simplifytolerance: 0,
          roundcoords: 1,
          lcpr: 0,
          qcpr: 0,
          desc: false,
          viewbox: true,
          blurradius: 0,
          blurdelta: 20
        };

        const options = { ...baseOptions, ...(sector ? SECTOR_PRESETS[sector] : {}) };

        // Initialize Worker
        const worker = new VectorizerWorker();
        
        worker.onmessage = (e: MessageEvent) => {
          if (e.data.type === 'success') {
            setSvgOutput(e.data.svg);
          } else {
            console.error('Vectorization failed:', e.data.error);
          }
          setIsProcessing(false);
          worker.terminate();
        };

        worker.onerror = (err: ErrorEvent) => {
          console.error('Worker error:', err);
          setIsProcessing(false);
          worker.terminate();
        };

        // Send data to worker
        worker.postMessage({ 
          imageData: {
            width: imageData.width,
            height: imageData.height,
            data: imageData.data
          }, 
          options 
        });
      };
    };
    
    reader.readAsDataURL(file);
  };

  const handleRemoveBackground = async () => {
    if (!originalImage) return;
    setIsRemovingBg(true);
    try {
      const blob = await removeBackground(originalImage);
      const url = URL.createObjectURL(blob);
      setOriginalImage(url);
    } catch (error) {
      console.error('Background removal failed:', error);
      alert('Failed to remove background. Please try a different image.');
    } finally {
      setIsRemovingBg(false);
    }
  };

  const handleUpscale = async () => {
    if (!originalImage) return;
    setIsUpscaling(true);
    try {
      const upscaler = new Upscaler();
      const upscaledSrc = await upscaler.upscale(originalImage);
      setOriginalImage(upscaledSrc);
    } catch (error) {
      console.error('Upscaling failed:', error);
      alert('Failed to upscale image. It might be too large or format unsupported.');
    } finally {
      setIsUpscaling(false);
    }
  };

  const downloadSVG = () => {
    if (!svgOutput) return;
    const blob = new Blob([svgOutput], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vector-trace.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPDF = async () => {
    if (!svgOutput) return;
    
    try {
      const { jsPDF } = await import('jspdf');
      await import('svg2pdf.js');

      const container = document.createElement('div');
      container.innerHTML = svgOutput;
      const svgElement = container.firstElementChild as SVGElement;
      
      if (!svgElement) return;

      // Get dimensions from viewBox or attributes
      let width = 595.28; // A4 width in pt
      let height = 841.89; // A4 height in pt
      
      if (svgElement.hasAttribute('viewBox')) {
        const viewBox = svgElement.getAttribute('viewBox')!.split(' ').map(Number);
        width = viewBox[2];
        height = viewBox[3];
      } else if (svgElement.hasAttribute('width') && svgElement.hasAttribute('height')) {
        width = parseFloat(svgElement.getAttribute('width')!);
        height = parseFloat(svgElement.getAttribute('height')!);
      }

      const doc = new jsPDF({
        orientation: width > height ? 'landscape' : 'portrait',
        unit: 'pt',
        format: [width, height]
      });

      await doc.svg(svgElement, {
        x: 0,
        y: 0,
        width: width,
        height: height
      });

      doc.save('vector-trace.pdf');
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try downloading SVG instead.');
    }
  };

  const handleSliderMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setComparePos((x / rect.width) * 100);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setZoom(1); // Reset zoom on toggle
  };

  const adjustZoom = (delta: number) => {
    setZoom(prev => Math.max(0.5, Math.min(5, prev + delta)));
  };

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.header}>
        <div style={styles.title}>
          <Cpu size={24} />
          Vector Command Center
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <a 
            href="/downloads/WordHacker404-Setup.exe" 
            download
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(10, 255, 106, 0.1)',
              border: '1px solid rgba(10, 255, 106, 0.3)',
              padding: '6px 12px',
              borderRadius: '4px',
              color: '#0aff6a',
              fontSize: '0.8rem',
              textDecoration: 'none',
              cursor: 'pointer',
              fontWeight: 600
            }}
            title="Download Desktop App for better performance"
          >
            <Download size={14} />
            <span>GET DESKTOP APP</span>
          </a>
          <div style={{ fontSize: '0.8rem', color: '#444' }}>v1.0.0</div>
        </div>
      </div>

      {/* TABS */}
      <div style={styles.tabContainer}>
        <button 
          style={styles.tab(mode === 'architect')} 
          onClick={() => setMode('architect')}
        >
          <Wand2 size={18} />
          Prompt Architect
        </button>
        <button 
          style={styles.tab(mode === 'vectorizer')} 
          onClick={() => setMode('vectorizer')}
        >
          <PenTool size={18} />
          Vectorizer
        </button>
      </div>

      {/* MODE: ARCHITECT */}
      {mode === 'architect' && (
        <div style={styles.section}>
          <div style={styles.grid}>
            <div style={{ ...styles.inputGroup, gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={styles.label}>Subject / Concept</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {!aiEnabled ? (
                    <button 
                      onClick={() => setAiEnabled(true)}
                      style={{ 
                        background: 'rgba(10, 255, 106, 0.1)', 
                        border: '1px solid #0aff6a', 
                        borderRadius: '4px', 
                        color: '#0aff6a', 
                        fontSize: '0.75rem', 
                        padding: '4px 12px', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        fontWeight: '600',
                        boxShadow: '0 0 10px rgba(10, 255, 106, 0.1)'
                      }}
                    >
                      <BrainCircuit size={14} /> Enable AI Brain
                    </button>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ display: 'flex', background: '#111', borderRadius: '4px', border: '1px solid #333', overflow: 'hidden' }}>
                        <button
                          onClick={() => handleModelChange('lite')}
                          style={{
                            background: aiModelType === 'lite' ? '#222' : 'transparent',
                            color: aiModelType === 'lite' ? '#fff' : '#666',
                            border: 'none',
                            padding: '4px 8px',
                            fontSize: '0.7rem',
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                          title="Fast (77M) - Good for simple ideas"
                        >
                          LITE
                        </button>
                        <button
                          onClick={() => handleModelChange('pro')}
                          style={{
                            background: aiModelType === 'pro' ? '#0aff6a' : 'transparent',
                            color: aiModelType === 'pro' ? '#000' : '#666',
                            border: 'none',
                            padding: '4px 8px',
                            fontSize: '0.7rem',
                            cursor: 'pointer',
                            fontWeight: 800
                          }}
                          title="Balanced (248M) - Recommended for most users"
                        >
                          PRO
                        </button>
                      </div>
                      <span style={{ color: '#0aff6a', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                        <BrainCircuit size={14} /> AI Active
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  style={{ ...styles.input, flex: 1 }} 
                  placeholder="e.g. A cybernetic wolf head..."
                  value={promptState.subject}
                  onChange={(e) => setPromptState({...promptState, subject: e.target.value})}
                />
                {aiEnabled && (
                  <button 
                    onClick={handleAiEnhance}
                    disabled={aiLoading}
                    style={{ 
                      background: aiLoading ? '#222' : '#1a1a1a', 
                      border: '1px solid #333', 
                      borderRadius: '8px', 
                      color: '#0aff6a', 
                      padding: '0 16px',
                      cursor: aiLoading ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: !aiLoading ? '0 0 8px rgba(10, 255, 106, 0.2)' : 'none',
                      minWidth: '110px',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                    title="Enhance with AI"
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                        <span>Thinking</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        <span>Enhance</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              {(aiLoading || (aiProgress && !aiModelReady)) && (
                <div style={{ marginTop: '8px', padding: '12px', background: '#0b0b0d', border: '1px solid #222', borderRadius: '8px' }}>
                  {aiProgress || (!aiModelReady && aiLoading) ? (
                    // DOWNLOAD PROGRESS
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', padding: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#0aff6a', fontSize: '0.9rem', fontWeight: 'bold' }}>
                        <Loader2 size={20} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                        <span>{aiProgress ? `DOWNLOADING NEURAL CORE (${Math.round(aiProgress.progress || 0)}%)` : 'CONNECTING...'}</span>
                      </div>
                      
                      <div style={{ width: '100%', maxWidth: '300px', height: '6px', background: '#222', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
                        {/* Percentage Loading Bar */}
                        <div style={{ 
                          width: `${Math.round(aiProgress?.progress || 0)}%`,
                          height: '100%',
                          background: '#0aff6a',
                          transition: 'width 0.2s ease-out'
                        }} />
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '300px', fontSize: '0.7rem', color: '#666', fontFamily: 'monospace' }}>
                         <span>{aiProgress?.file || 'Initializing...'}</span>
                         <span>{aiProgress?.loaded ? (aiProgress.loaded / 1024 / 1024).toFixed(1) + 'MB' : ''}</span>
                      </div>

                      {/* CONTROLS */}
                      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                        <button 
                          onClick={handleCancelDownload}
                          style={{
                            background: 'transparent',
                            border: '1px solid #333',
                            color: '#666',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            cursor: 'pointer',
                            textTransform: 'uppercase',
                            letterSpacing: '1px'
                          }}
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleRetryDownload}
                          style={{
                            background: 'rgba(10, 255, 106, 0.1)',
                            border: '1px solid rgba(10, 255, 106, 0.3)',
                            color: '#0aff6a',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            cursor: 'pointer',
                            textTransform: 'uppercase',
                            letterSpacing: '1px'
                          }}
                        >
                          Retry / Resume
                        </button>
                      </div>
                    </div>
                  ) : (
                    // GENERATION STATUS
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#0aff6a', fontSize: '0.8rem' }}>
                      <Loader2 size={14} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                      <span style={{ animation: 'pulse 1.5s infinite' }}>AI is dreaming up concepts...</span>
                    </div>
                  )}
                </div>
              )}
              {aiResult && (
                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* BEFORE */}
                  <div style={{ 
                    padding: '12px 16px', 
                    background: 'rgba(255, 255, 255, 0.02)', 
                    border: '1px dashed #333', 
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    color: '#888',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{ 
                      background: '#222', 
                      padding: '2px 6px', 
                      borderRadius: '4px', 
                      fontSize: '0.65rem', 
                      color: '#666', 
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap'
                    }}>Original Input</div>
                    <div style={{ fontStyle: 'italic', color: '#aaa' }}>"{aiOriginalInput}"</div>
                  </div>

                  {/* ARROW INDICATOR */}
                  <div style={{ display: 'flex', justifyContent: 'center', color: '#0aff6a', opacity: 0.5 }}>
                    <ArrowUpCircle size={20} style={{ transform: 'rotate(180deg)' }} />
                  </div>

                  {/* AFTER */}
                  <div style={{ 
                    padding: '24px', 
                    background: 'linear-gradient(145deg, rgba(10, 255, 106, 0.05) 0%, rgba(0,0,0,0.4) 100%)', 
                    border: '1px solid #0aff6a', 
                    borderRadius: '12px',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 0 20px rgba(10, 255, 106, 0.05)'
                  }}>
                    <div style={{ 
                      position: 'absolute', 
                      top: '-10px', 
                      left: '20px', 
                      background: '#0b0b0d', 
                      padding: '0 8px', 
                      fontSize: '0.75rem', 
                      color: '#0aff6a', 
                      fontWeight: 'bold', 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      border: '1px solid #0aff6a',
                      borderRadius: '4px'
                    }}>
                      <Sparkles size={12} /> AI ENHANCED CONCEPT
                    </div>
                    
                    <div style={{ 
                        marginTop: '8px', 
                        marginBottom: '20px', 
                        color: '#fff', 
                        fontSize: '1.15rem', 
                        lineHeight: '1.6',
                        whiteSpace: 'pre-wrap',
                        fontWeight: '500',
                        textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                    }}>
                        {aiResult}
                    </div>

                    <button 
                      onClick={() => {
                        setPromptState({ ...promptState, subject: aiResult });
                        setAiResult(null);
                        setAiOriginalInput(null);
                      }}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        gap: '8px',
                        background: '#0aff6a', 
                        border: 'none', 
                        borderRadius: '6px',
                        padding: '12px 20px',
                        color: '#000', 
                        fontSize: '0.9rem', 
                        fontWeight: '800',
                        cursor: 'pointer', 
                        width: '100%',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 12px rgba(10, 255, 106, 0.2)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      <Sparkles size={16} /> Use This Concept
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Industry / Niche</label>
              <select 
                style={styles.select}
                value={promptState.industry}
                onChange={(e) => setPromptState({...promptState, industry: e.target.value as keyof typeof INDUSTRIES})}
              >
                {Object.entries(INDUSTRIES).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Asset Type</label>
              <select 
                style={styles.select}
                value={promptState.assetType}
                onChange={(e) => setPromptState({...promptState, assetType: e.target.value as keyof typeof ASSET_TYPES})}
              >
                {Object.entries(ASSET_TYPES).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Art Style</label>
              <select 
                style={styles.select}
                value={promptState.style}
                onChange={(e) => setPromptState({...promptState, style: e.target.value as keyof typeof STYLES})}
              >
                {Object.entries(STYLES).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Composition</label>
              <select 
                style={styles.select}
                value={promptState.composition}
                onChange={(e) => setPromptState({...promptState, composition: e.target.value as keyof typeof COMPOSITIONS})}
              >
                {Object.entries(COMPOSITIONS).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Mood / Vibe</label>
              <select 
                style={styles.select}
                value={promptState.mood}
                onChange={(e) => setPromptState({...promptState, mood: e.target.value as keyof typeof MOODS})}
              >
                {Object.entries(MOODS).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>

            <div style={{...styles.inputGroup, gridColumn: '1 / -1'}}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={styles.label}>Project Palette (5 Colors)</label>
                <button 
                  onClick={() => {
                    const keys = Object.keys(COLOR_PALETTES);
                    const randomKey = keys[Math.floor(Math.random() * keys.length)];
                    const val = COLOR_PALETTES[randomKey as keyof typeof COLOR_PALETTES];
                    const newColors = [...val.colors];
                    while(newColors.length < 5) newColors.push(newColors[newColors.length - 1] || '#000000');
                    setPromptState({...promptState, palette: 'custom', customColors: newColors.slice(0, 5)});
                  }}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: '#0aff6a', 
                    fontSize: '0.75rem', 
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Shuffle Preset
                </button>
              </div>
              
              {/* Active 5 Colors (Editable) */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {promptState.customColors.map((color, index) => (
                  <div 
                    key={index} 
                    style={{ 
                      flex: 1, 
                      height: '48px', 
                      background: color, 
                      borderRadius: '8px', 
                      border: '1px solid #333',
                      position: 'relative',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      transition: 'transform 0.1s',
                    }}
                    title="Click to change color"
                  >
                    <input 
                      type="color" 
                      value={color}
                      onChange={(e) => {
                        const newColors = [...promptState.customColors];
                        newColors[index] = e.target.value;
                        setPromptState({ ...promptState, palette: 'custom', customColors: newColors });
                      }}
                      style={{
                        position: 'absolute',
                        top: '-50%',
                        left: '-50%',
                        width: '200%',
                        height: '200%',
                        opacity: 0,
                        cursor: 'pointer'
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button style={{ ...styles.button, marginTop: 'auto' }} onClick={generatePrompt}>
            <Sparkles size={18} /> Generate Engineering Prompt
          </button>

          {/* AI RESULT OVERLAY */}
          {aiResult && (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(12px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'fadeIn 0.3s ease-out'
            }}>
              <div style={{
                width: '90%',
                maxWidth: '600px',
                background: '#0b0b0d',
                border: '1px solid #0aff6a',
                borderRadius: '16px',
                boxShadow: '0 0 50px rgba(10, 255, 106, 0.15)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
              }}>
                 {/* Header */}
                 <div style={{ 
                   padding: '20px 24px', 
                   borderBottom: '1px solid #222', 
                   display: 'flex', 
                   justifyContent: 'space-between', 
                   alignItems: 'center', 
                   background: 'linear-gradient(90deg, rgba(10, 255, 106, 0.05) 0%, transparent 100%)' 
                 }}>
                    <span style={{ color: '#0aff6a', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '1px', fontSize: '0.9rem' }}>
                      <BrainCircuit size={20} /> AI ARCHITECT
                    </span>
                    <button 
                      onClick={() => setAiResult(null)} 
                      style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '4px', borderRadius: '4px', transition: 'all 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
                    >
                      <X size={24} />
                    </button>
                 </div>

                 {/* Content */}
                 <div style={{ padding: '32px 24px', color: '#e9eef6', fontSize: '1.15rem', lineHeight: '1.6', fontFamily: '"Inter", sans-serif', fontWeight: '500' }}>
                    <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Enhanced Concept</div>
                    {aiResult}
                 </div>

                 {/* Actions */}
                 <div style={{ padding: '24px', display: 'flex', gap: '16px', background: '#111', borderTop: '1px solid #222' }}>
                    <button 
                      onClick={handleAiEnhance} 
                      style={{ 
                        flex: 0.5, 
                        background: 'transparent', 
                        border: '1px solid #333', 
                        color: '#888', 
                        padding: '14px', 
                        borderRadius: '8px', 
                        cursor: 'pointer', 
                        fontWeight: '600',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Regenerate"
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#666'; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#888'; }}
                    >
                      <RefreshCcw size={18} />
                    </button>
                    <button 
                      onClick={() => setAiResult(null)} 
                      style={{ 
                        flex: 1, 
                        background: 'transparent', 
                        border: '1px solid #333', 
                        color: '#888', 
                        padding: '14px', 
                        borderRadius: '8px', 
                        cursor: 'pointer', 
                        fontWeight: '600',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#666'; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#888'; }}
                    >
                      Discard
                    </button>
                    <button 
                      onClick={() => {
                        setPromptState({ ...promptState, subject: aiResult });
                        setAiResult(null);
                        setAiOriginalInput(null);
                      }} 
                      style={{ 
                        flex: 2, 
                        background: '#0aff6a', 
                        border: 'none', 
                        color: '#000', 
                        padding: '14px', 
                        borderRadius: '8px', 
                        cursor: 'pointer', 
                        fontWeight: '800', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(10, 255, 106, 0.25)',
                        transition: 'transform 0.1s'
                      }}
                      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <Sparkles size={18} /> Use Concept
                    </button>
                 </div>
              </div>
            </div>
          )}

          {/* SYSTEM ERROR MODAL */}
          {systemError && (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.9)',
              backdropFilter: 'blur(10px)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}>
              <div style={{
                background: '#0b0b0d',
                border: '1px solid #d92e2e',
                borderRadius: '16px',
                padding: '32px',
                maxWidth: '500px',
                width: '100%',
                boxShadow: '0 0 50px rgba(217, 46, 46, 0.2)',
                animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', color: '#d92e2e' }}>
                  <AlertCircle size={32} />
                  <h2 style={{ margin: 0, fontSize: '1.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>System Incompatible</h2>
                </div>
                
                <p style={{ color: '#e9eef6', lineHeight: '1.6', marginBottom: '24px', fontSize: '1rem' }}>
                  {systemError}
                </p>

                <div style={{ background: '#1a1a1a', padding: '16px', borderRadius: '8px', marginBottom: '24px', borderLeft: '4px solid #d92e2e' }}>
                  <div style={{ color: '#888', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 'bold' }}>Recommendation</div>
                  <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
                    Please try accessing this tool from a desktop computer with at least 8GB of RAM and a modern GPU. The "Max Power" AI model is too heavy for this device.
                  </div>
                </div>

                <button 
                  onClick={() => setSystemError(null)}
                  style={{
                    width: '100%',
                    background: '#d92e2e',
                    color: '#fff',
                    border: 'none',
                    padding: '14px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}
                >
                  Acknowledge & Close
                </button>
              </div>
            </div>
          )}

          {/* RESULT MODAL */}
          {showResultModal && (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(8px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }} onClick={() => setShowResultModal(false)}>
              <div 
                style={{
                  background: '#111',
                  border: '1px solid #333',
                  borderRadius: '16px',
                  padding: '32px',
                  width: '100%',
                  maxWidth: '900px',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                  position: 'relative',
                  animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}
                onClick={e => e.stopPropagation()}
              >
                <button 
                  onClick={() => setShowResultModal(false)}
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    background: 'none',
                    border: 'none',
                    color: '#666',
                    cursor: 'pointer'
                  }}
                >
                  <X size={24} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', color: '#0aff6a' }}>
                  <CheckCircle2 size={32} />
                  <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Prompt Generated</h2>
                </div>

                <div style={{ 
                  background: '#050505', 
                  padding: '20px', 
                  borderRadius: '8px', 
                  border: '1px dashed #333',
                  marginBottom: '24px'
                }}>
                  <div style={styles.promptText}>{generatedPrompt}</div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={copyToClipboard}
                    style={{ ...styles.button, flex: 1 }}
                  >
                    {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                    {copied ? 'Copied to Clipboard' : 'Copy Prompt'}
                  </button>
                </div>

                <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #222' }}>
                  <h3 style={{ color: '#fff', fontSize: '1rem', marginBottom: '12px' }}>Prompt Engineering Breakdown</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div style={{ background: '#1a1a1a', padding: '12px', borderRadius: '8px' }}>
                      <div style={{ color: '#0aff6a', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>ROLE & CONTEXT</div>
                      <div style={{ color: '#888', fontSize: '0.8rem' }}>Sets the AI behavior to "Professional Vector Artist" to ensure high-quality output.</div>
                    </div>
                    <div style={{ background: '#1a1a1a', padding: '12px', borderRadius: '8px' }}>
                      <div style={{ color: '#0aff6a', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>STYLE MODIFIERS</div>
                      <div style={{ color: '#888', fontSize: '0.8rem' }}>Keywords like "flat color", "clean lines", and "svg style" force the AI to avoid photorealism.</div>
                    </div>
                    <div style={{ background: '#1a1a1a', padding: '12px', borderRadius: '8px' }}>
                      <div style={{ color: '#0aff6a', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>QUALITY BOOSTERS</div>
                      <div style={{ color: '#888', fontSize: '0.8rem' }}>"Behance feature" and "award winning" trigger higher aesthetic standards in the model.</div>
                    </div>
                    <div style={{ background: '#1a1a1a', padding: '12px', borderRadius: '8px' }}>
                      <div style={{ color: '#0aff6a', fontSize: '0.75rem', fontWeight: 700, marginBottom: '4px' }}>NEGATIVE PROMPTS</div>
                      <div style={{ color: '#888', fontSize: '0.8rem' }}>Explicitly forbids "3d render", "blur", and "shading" to ensure a clean vector-ready result.</div>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#888', fontSize: '0.9rem' }}>
                    <span style={{ background: '#222', padding: '2px 8px', borderRadius: '4px', color: '#0aff6a', fontSize: '0.75rem', fontWeight: 700 }}>PRO TIP</span>
                    <span>This prompt is optimized for Midjourney v6. For DALL-E 3, remove the "--v 6.0" parameter.</span>
                  </div>
                </div>
              </div>
              <style>{`
                @keyframes popIn {
                  from { opacity: 0; transform: scale(0.9); }
                  to { opacity: 1; transform: scale(1); }
                }
                @keyframes spin {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
                @keyframes pulse {
                  0% { opacity: 0.6; }
                  50% { opacity: 1; }
                  100% { opacity: 0.6; }
                }
              `}</style>
            </div>
          )}
        </div>
      )}

      {/* MODE: VECTORIZER */}
      {mode === 'vectorizer' && (
        <div style={styles.section}>
          {!sector ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
              {[
                { id: 'print', label: 'Screen Print', icon: '🖨️', desc: 'Clean paths, low colors' },
                { id: 'logo', label: 'Logo Restore', icon: '🍎', desc: 'Sharp corners, smooth' },
                { id: 'illustration', label: 'Illustration', icon: '🎨', desc: 'High detail, full color' },
                { id: 'cnc', label: 'CNC / Laser', icon: '🏗️', desc: 'B&W, machine ready' },
                { id: 'embroidery', label: 'Embroidery', icon: '🧶', desc: 'Simplified shapes' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSector(s.id as Sector)}
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '12px',
                    padding: '20px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <span style={{ fontSize: '2rem' }}>{s.icon}</span>
                  <span style={{ fontWeight: 700, color: '#fff' }}>{s.label}</span>
                  <span style={{ fontSize: '0.8rem', color: '#888' }}>{s.desc}</span>
                </button>
              ))}
            </div>
          ) : !svgOutput ? (
            <div 
              style={styles.dropZone}
              onClick={() => fileInputRef.current?.click()}
            >
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
                 <span style={{ background: '#222', padding: '4px 12px', borderRadius: '99px', fontSize: '0.8rem', color: '#0aff6a' }}>
                   Target: {sector.toUpperCase()}
                 </span>
                 <button 
                   onClick={(e) => { e.stopPropagation(); setSector(null); }}
                   style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}
                 >
                   Change
                 </button>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept="image/png, image/jpeg"
                onChange={handleFileUpload}
              />
              <Upload size={48} color="#333" style={{ marginBottom: '16px' }} />
              <h3 style={{ color: '#fff', marginBottom: '8px' }}>Upload Raster Image</h3>
              <p style={{ color: '#666', fontSize: '0.9rem' }}>
                Drag & drop or click to select PNG/JPG<br/>
                Best results with high contrast images
              </p>
              {isProcessing && (
                <div style={{ marginTop: '24px', color: '#0aff6a' }}>
                  Processing Vector Paths...
                </div>
              )}
            </div>
          ) : (
            <div style={styles.section}>
              <div 
                style={{ 
                  ...styles.resultBox, 
                  padding: 0, 
                  overflow: 'hidden', 
                  height: isFullscreen ? '85vh' : '400px', 
                  position: isFullscreen ? 'fixed' : 'relative',
                  top: isFullscreen ? '50%' : 'auto',
                  left: isFullscreen ? '50%' : 'auto',
                  transform: isFullscreen ? 'translate(-50%, -50%)' : 'none',
                  width: isFullscreen ? '95vw' : '100%',
                  maxWidth: isFullscreen ? '1200px' : '100%',
                  zIndex: isFullscreen ? 1000 : 1,
                  cursor: 'col-resize',
                  background: '#000',
                  border: isFullscreen ? '1px solid #333' : styles.resultBox.border
                }}
                ref={sliderRef}
                onMouseMove={(e) => e.buttons === 1 && handleSliderMove(e)}
                onTouchMove={handleSliderMove}
                onClick={handleSliderMove}
              >
                {/* Zoom/Fullscreen Controls */}
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  zIndex: 20,
                  display: 'flex',
                  gap: '8px',
                  background: 'rgba(0,0,0,0.6)',
                  padding: '4px',
                  borderRadius: '8px',
                  backdropFilter: 'blur(4px)'
                }}>
                  <button onClick={(e) => { e.stopPropagation(); adjustZoom(-0.25); }} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><ZoomOut size={20} /></button>
                  <span style={{ color: '#0aff6a', fontSize: '0.8rem', display: 'flex', alignItems: 'center' }}>{Math.round(zoom * 100)}%</span>
                  <button onClick={(e) => { e.stopPropagation(); adjustZoom(0.25); }} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><ZoomIn size={20} /></button>
                  <div style={{ width: '1px', background: '#444', margin: '0 4px' }} />
                  <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                    {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                  </button>
                </div>

                {/* Content Container with Zoom */}
                <div style={{ 
                  width: '100%', 
                  height: '100%', 
                  position: 'relative',
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center',
                  transition: 'transform 0.1s ease-out'
                }}>
                  {/* Original Image (Background) */}
                  {originalImage && (
                    <img 
                      src={originalImage} 
                      alt="Original" 
                      style={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'contain',
                        opacity: 0.5,
                        filter: 'grayscale(100%)'
                      }} 
                    />
                  )}

                  {/* Vector Result (Foreground, Clipped) */}
                  <div 
                    style={{ 
                      position: 'absolute', 
                      top: 0, 
                      left: 0, 
                      width: `${comparePos}%`, 
                      height: '100%', 
                      overflow: 'hidden',
                      borderRight: `2px solid #0aff6a`,
                      background: '#1a1a1a'
                    }}
                  >
                     <div style={{ width: isFullscreen ? '95vw' : '100%', maxWidth: isFullscreen ? '1200px' : '900px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div 
                          style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          dangerouslySetInnerHTML={{ __html: svgOutput }} 
                        />
                     </div>
                  </div>
                </div>

                {/* Slider Handle (Fixed Scale) */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: `${comparePos}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '32px',
                  height: '32px',
                  background: '#0aff6a',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 10px rgba(0,0,0,0.5)',
                  pointerEvents: 'none',
                  zIndex: 10
                }}>
                  <div style={{ width: '2px', height: '12px', background: '#000', margin: '0 2px' }} />
                  <div style={{ width: '2px', height: '12px', background: '#000', margin: '0 2px' }} />
                </div>

                {/* Labels */}
                <div style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(0,0,0,0.7)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', color: '#0aff6a', zIndex: 10 }}>VECTOR</div>
                <div style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(0,0,0,0.7)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', color: '#888', zIndex: 10 }}>ORIGINAL</div>
              </div>

              {isFullscreen && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 999 }} onClick={toggleFullscreen} />}

              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                 <button 
                  style={{ ...styles.button, flex: 1, background: isRemovingBg ? '#222' : '#333', color: '#fff', opacity: isRemovingBg ? 0.7 : 1 }}
                  onClick={handleRemoveBackground}
                  disabled={isRemovingBg || isUpscaling}
                >
                  {isRemovingBg ? <div className="spinner" /> : <Eraser size={18} />} 
                  {isRemovingBg ? 'Removing BG...' : 'Remove BG (AI)'}
                </button>
                <button 
                  style={{ ...styles.button, flex: 1, background: isUpscaling ? '#222' : '#333', color: '#fff', opacity: isUpscaling ? 0.7 : 1 }}
                  onClick={handleUpscale}
                  disabled={isRemovingBg || isUpscaling}
                >
                  {isUpscaling ? <div className="spinner" /> : <ArrowUpCircle size={18} />} 
                  {isUpscaling ? 'Upscaling (2x)...' : 'Upscale (AI)'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <button 
                  style={{ ...styles.button, flex: 1, background: '#222', color: 'white' }}
                  onClick={() => { setSvgOutput(null); setOriginalImage(null); }}
                >
                  <AlertCircle size={18} /> Reset
                </button>
                <button 
                  style={{ ...styles.button, flex: 1.5, background: '#333', color: '#fff' }}
                  onClick={downloadPDF}
                >
                  <FileText size={18} /> PDF
                </button>
                <button 
                  style={{ ...styles.button, flex: 2 }}
                  onClick={downloadSVG}
                >
                  <Download size={18} /> SVG
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


