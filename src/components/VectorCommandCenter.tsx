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
  BrainCircuit,
  Sparkles,
  Loader2,
  ArrowLeft,
  Plus,
  Palette,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import VectorizerWorker from '../workers/vectorizer.worker?worker';
import { fetchToObjectURL, revokeObjectURL, objectUrlToImageData } from '../utils/imageLoader';
import { INDUSTRIES, STYLES, ASSET_TYPES, COMPOSITIONS, MOODS, COLOR_PALETTES } from '../data/promptPresets';
import { removeBackground } from '@imgly/background-removal';
import Upscaler from 'upscaler';

// --- TYPES ---
type Mode = 'architect' | 'vectorizer';
type Sector = 'print' | 'logo' | 'illustration' | 'cnc' | 'embroidery';

const SECTOR_PRESETS: Record<Sector, any> = {
  // High fidelity for print
  print: { 
    numberofcolors: 16, 
    pathomit: 1, 
    ltres: 0.1, 
    qtres: 0.1, 
    blurradius: 0, 
    blurdelta: 10 
  },
  // Ultra-sharp for logos (Geometric precision)
  logo: { 
    numberofcolors: 8, 
    ltres: 0.01, // Extremely precise line fitting
    qtres: 0.01, // Extremely precise curve fitting
    pathomit: 5, // Ignore tiny noise
    rightangleenhance: true, // Force sharp corners
    colorsampling: 2, // Deterministic sampling
    blurradius: 1, // Slight blur to smooth pixelation before tracing
    blurdelta: 5
  },
  // Rich detail for illustrations
  illustration: { 
    numberofcolors: 64, 
    ltres: 0.5, 
    qtres: 0.5, 
    pathomit: 0,
    blurradius: 0
  },
  // Clean paths for CNC/Cutting
  cnc: { 
    numberofcolors: 2, 
    colorsampling: 0, 
    blurradius: 2, // Smooth out jitters
    blurdelta: 10,
    ltres: 0.1,
    qtres: 0.1,
    pathomit: 20 // Ignore small debris
  },
  // Simplified for embroidery
  embroidery: { 
    numberofcolors: 8, 
    pathomit: 50, // Ignore small details
    blurradius: 2,
    ltres: 1,
    qtres: 1
  }
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
  checkerboard: {
    backgroundImage: `
      linear-gradient(45deg, #444 25%, transparent 25%),
      linear-gradient(-45deg, #444 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #444 75%),
      linear-gradient(-45deg, transparent 75%, #444 75%)
    `,
    backgroundSize: '20px 20px',
    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
    backgroundColor: '#333'
  },
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
    overflowY: 'auto' as const,
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
    background: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    border: '1px solid #333',
    borderRadius: '8px',
  }
};

interface VectorCommandCenterProps {
  onBack?: () => void;
  initialImageUrl?: string;
}

export default function VectorCommandCenter({ onBack, initialImageUrl }: VectorCommandCenterProps) {
  const [mode, setMode] = useState<Mode>(initialImageUrl ? 'vectorizer' : 'architect');

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
  const [generatedPrompts, setGeneratedPrompts] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [visualizingIndex, setVisualizingIndex] = useState<number | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // Vectorizer State
  const [svgOutput, setSvgOutput] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(initialImageUrl || null);
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
  const [showDebug, setShowDebug] = useState(false);
  const [invertSvgPreview, setInvertSvgPreview] = useState(false);
  const [autoAccent, setAutoAccent] = useState(true);
  const [accentColor, setAccentColor] = useState('#0aff6a');
  const [showAccentPicker, setShowAccentPicker] = useState(false);

  // Persist user preferences
  useEffect(() => {
    try {
      const savedAccent = localStorage.getItem('vcc:accentColor');
      const savedAuto = localStorage.getItem('vcc:autoAccent');
      if (savedAccent) setAccentColor(savedAccent);
      if (savedAuto !== null) setAutoAccent(savedAuto === '1');
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('vcc:accentColor', accentColor);
      localStorage.setItem('vcc:autoAccent', autoAccent ? '1' : '0');
    } catch (e) {
      // ignore
    }
  }, [accentColor, autoAccent]);

  // Publish snapshot to global debug hub when key state changes
  useEffect(() => {
    try {
      const hub = (window as any).__DEBUG_HUB__
      if (hub && typeof hub.set === 'function') {
        hub.set('vectorizer', {
          mode,
          originalImage,
          svgOutput: svgOutput ? 'Generated' : null,
          isProcessing,
          isRemovingBg,
          isUpscaling,
          zoom,
          comparePos,
          autoAccent,
          accentColor,
        })
      }
    } catch (e) {}
  }, [mode, originalImage, svgOutput, isProcessing, isRemovingBg, isUpscaling, zoom, comparePos, autoAccent, accentColor])

  // Auto-start vectorization if initial image is provided
  useEffect(() => {
    if (initialImageUrl) {
      // Small delay to ensure UI is ready
      setTimeout(() => runVectorization(initialImageUrl), 100);
    }
  }, [initialImageUrl]);

  // AI Brain State (Groq)
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiOriginalInput, setAiOriginalInput] = useState<string | null>(null);
  const [systemError, setSystemError] = useState<string | null>(null);

  const handleAiEnhance = async () => {
    if (!promptState.subject.trim()) {
      alert("Please type a subject (e.g. 'Cyberpunk Wolf') in the text box first!");
      return;
    }

    setAiLoading(true);
    setAiResult(null);
    setAiOriginalInput(promptState.subject);
    setSystemError(null);

    try {
      // Construct a rich context from all available state
      const context = `
        Subject: ${promptState.subject}
        Industry/Context: ${promptState.industry}
        Asset Type: ${promptState.assetType}
        Art Style: ${promptState.style}
        Composition: ${promptState.composition}
        Mood: ${promptState.mood}
        Color Palette: ${promptState.palette}
      `.trim();

      const messages = [
        { 
          role: 'system', 
          content: `You are a Master Prompt Engineer and Art Director specializing in Vector Graphics and SVG generation. 
Your task is to take the user's concept and transform it into a 'Master Prompt' optimized for high-end AI image generators (like Midjourney v6, DALL-E 3).

THEORY & RULES:
1. **Subject Clarity**: Define the subject with extreme precision.
2. **Medium Specification**: Enforce 'Vector Art', 'Flat Illustration', 'Clean Lines', 'Minimalist', 'Adobe Illustrator Style'.
3. **Composition**: Ensure 'White Background', 'Centered Composition', 'No Background Noise' to facilitate easy vectorization.
4. **Stylization**: Use keywords like 'Geometric', 'Sharp Edges', 'Vibrant Colors', 'Professional Corporate Art'.
5. **Negative Constraints**: Explicitly avoid 'Photorealistic', '3D render', 'Blur', 'Gradient', 'Shadows', 'Texture'.

OUTPUT FORMAT:
Return ONLY the optimized prompt string. Do not add conversational filler.
Format: [Subject Description], [Art Style & Medium], [Color Palette & Lighting], [Composition], [Technical Parameters --no photorealistic --v 6.0]` 
        },
        { role: 'user', content: `Generate a Master Vector Prompt for this concept:\n${context}` }
      ];

      const response = await fetch('https://ai-gateway.guitarguitarabhijit.workers.dev/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-secret': 'word-hacker-ai-secret'
        },
        body: JSON.stringify({
          messages: messages,
          mode: 'creative',
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`Gateway Error: ${response.status}`);
      }

      const data = await response.json();
      setAiResult(data.content);

    } catch (error: any) {
      console.error("AI Error:", error);
      setSystemError("AI Connection Failed: " + (error.message || "Unknown error"));
    } finally {
      setAiLoading(false);
    }
  };

  // --- ARCHITECT LOGIC ---
  const generatePrompt = async () => {
    const { subject, industry, assetType, style, composition, mood, palette, customColors } = promptState;

    if (!subject.trim()) {
      alert("Please enter a subject first!");
      return;
    }

    setAiLoading(true);
    setSystemError(null);

    // 1. Core Definition
    const typeStr = ASSET_TYPES[assetType].keywords;
    const industryStr = INDUSTRIES[industry].keywords;
    const styleStr = STYLES[style].keywords;
    const compStr = COMPOSITIONS[composition].keywords;
    const moodStr = MOODS[mood].keywords;

    // 2. Color Logic
    let colorStr = '';
    if (palette === 'custom') {
      colorStr = `Custom Hex Palette: ${customColors.join(', ')}`;
    } else {
      const p = COLOR_PALETTES[palette as keyof typeof COLOR_PALETTES];
      if (p) {
        colorStr = `${p.keywords}, Hex Palette: ${p.colors.join(', ')}`;
      } else {
        colorStr = `Custom Hex Palette: ${customColors.join(', ')}`;
      }
    }

    try {
      const context = `
        Subject: ${subject}
        Industry: ${industry} (${industryStr})
        Asset Type: ${assetType} (${typeStr})
        Style: ${style} (${styleStr})
        Composition: ${composition} (${compStr})
        Mood: ${mood} (${moodStr})
        Colors: ${colorStr}
      `.trim();

      const messages = [
        { 
          role: 'system', 
          content: `You are a LEGENDARY PROMPT ENGINEER and AI ARCHITECT.
Your goal is to write 3 DISTINCT "Master Commands" for an advanced AI Agent (like ChatGPT-4o or Gemini Ultra) to generate perfect vector illustrations.

RULES:
1. OUTPUT FORMAT: Return exactly 3 prompts separated by "|||". Do not add numbering or intro text.
2. TARGET: These prompts are for an AI AGENT, not a raw image model. Use natural, imperative language.
3. STYLE: Enforce "Flat Vector Art", "SVG Style", "Clean Lines", "Minimalist", "No Gradients".
4. COLOR: You MUST include the specific HEX CODES provided in the prompt.
5. TRANSPARENCY: Explicitly instruct the agent to ensure the subject is isolated on a solid white background or transparent background for easy PNG extraction.
6. VARIATIONS:
   - Prompt 1: THE PURIST (Strict, minimal, perfect geometry).
   - Prompt 2: THE CREATIVE (Dynamic, artistic, but still vector).
   - Prompt 3: THE AVANT-GARDE (Bold, unique, pushing boundaries).

STRUCTURE EACH PROMPT LIKE THIS:
"Generate a professional vector illustration of [Subject]. The style must be [Art Style] with [Composition]. Use this exact color palette: [Hex Codes]. The image should be [Mood] and suitable for [Industry]. Ensure clean lines, flat colors, and the subject is isolated on a white background for easy extraction. Do NOT use: 3D effects, photorealism, shadows, or text."

DO NOT SAY "Here are the prompts". JUST GIVE THE PROMPTS SEPARATED BY "|||".` 
        },
        { role: 'user', content: `GENERATE 3 MASTER AGENT PROMPTS FOR:\n${context}` }
      ];

      const response = await fetch('https://ai-gateway.guitarguitarabhijit.workers.dev/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-secret': 'word-hacker-ai-secret'
        },
        body: JSON.stringify({
          messages: messages,
          mode: 'creative',
          temperature: 0.85
        })
      });

      if (!response.ok) {
        throw new Error(`Gateway Error: ${response.status}`);
      }

      const data = await response.json();
      const rawContent = data.content || "";
      const prompts = rawContent.split('|||').map((p: string) => p.trim()).filter((p: string) => p.length > 0);
      
      setGeneratedPrompts(prompts);
      setShowResultModal(true);

    } catch (error: any) {
      console.error("Prompt Gen Error:", error);
      setSystemError("Failed to generate master prompt: " + error.message);
    } finally {
      setAiLoading(false);
    }
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
    } catch (err) {
      // Fallback for non-secure contexts or older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedIndex(index);
      } catch (e) {
        console.error('Copy failed', e);
        alert('Copy failed. Please manually select the text and copy.');
      }
      document.body.removeChild(textArea);
    }
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const visualizePrompt = async (prompt: string, index: number) => {
    setVisualizingIndex(index);
    setGeneratedImage(null);
    
    try {
      // 1. Clean Prompt (V5 - Maximum Compatibility)
      let coreSubject = prompt.split('.')[0] || prompt;
      coreSubject = coreSubject
        .replace(/^(Generate|Create|Design) (a|an) (professional|vector|minimalist)? (logo|illustration|icon|graphic) (of|for)? /i, '')
        .trim();

      const words = coreSubject.split(' ');
      if (words.length > 10) coreSubject = words.slice(0, 10).join(' ');

      const styleKeywords = "vector, flat, minimal, white background";
      const finalQuery = encodeURIComponent(`${coreSubject}, ${styleKeywords}`);
      
      // 2. URL Construction (Default size for reliability)
      const seed = Math.floor(Math.random() * 1000000);
      // FIX: 'pollinations.ai/p/' has CORS issues. Reverting to 'image.pollinations.ai' with 'flux'.
      const imageUrl = `https://image.pollinations.ai/prompt/${finalQuery}?seed=${seed}&model=flux&width=1024&height=1024&nologo=true`;

      console.log("Loading Image:", imageUrl);

      // 3. Load Image (Standard Method)
      const img = new Image();
      img.crossOrigin = "Anonymous"; // Required for vectorization
      
      img.onload = () => {
        setGeneratedImage(imageUrl);
        setVisualizingIndex(null);
      };

      img.onerror = () => {
        console.error("Image Load Error");
        alert("Failed to load image.\n\nTroubleshooting:\n1. Check your internet connection.\n2. Disable ad-blockers or privacy extensions (they may block the AI server).\n3. Try again in 10 seconds.");
        setVisualizingIndex(null);
      };

      img.src = imageUrl;

    } catch (error) {
      console.error("Visualization failed:", error);
      setVisualizingIndex(null);
    }
  };

  const transferToVectorizer = async () => {
    if (!generatedImage) return;
    
    try {
      // Use the generated image URL (could be an object URL or remote URL)
      setOriginalImage(generatedImage);
      setMode('vectorizer');
      setGeneratedImage(null);
      setShowResultModal(false);
      // Auto-start vectorization; runVectorization will prefetch if needed
      runVectorization(generatedImage);
    } catch (e) {
      console.error("Transfer failed", e);
      alert("Could not transfer image to vectorizer.");
    }
  };

  const runVectorization = async (imageSrc: string) => {
    setIsProcessing(true);
    
    let processingUrl = imageSrc;
    let createdObjectUrl = false;

    try {
      // If remote, fetch to an object URL to avoid CORS when reading pixels
      if (imageSrc.startsWith('http')) {
        try {
          processingUrl = await fetchToObjectURL(imageSrc);
          createdObjectUrl = true;
          setOriginalImage(processingUrl);
        } catch (e) {
          console.warn('Failed to fetch to object URL, falling back to remote URL', e);
          processingUrl = imageSrc;
        }
      }

      // Convert the (object) URL to ImageData reliably
      const imageData = await objectUrlToImageData(processingUrl);

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
        try { worker.terminate(); } catch (err) {}
        if (createdObjectUrl) {
          try { revokeObjectURL(processingUrl); } catch (e) {}
        }
      };

      worker.onerror = (err: ErrorEvent) => {
        console.error('Worker error:', err);
        setIsProcessing(false);
        try { worker.terminate(); } catch (e) {}
        if (createdObjectUrl) {
          try { revokeObjectURL(processingUrl); } catch (e) {}
        }
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
    } catch (err) {
      console.error('Vectorization pipeline failed:', err);
      setIsProcessing(false);
      alert('Vectorization failed: ' + (err instanceof Error ? err.message : String(err)));
      if (createdObjectUrl) {
        try { revokeObjectURL(processingUrl); } catch (e) {}
      }
    }
  };

  // --- VECTORIZER LOGIC ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setOriginalImage(result);
      runVectorization(result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBackground = async () => {
    if (!originalImage) return;
    setIsRemovingBg(true);
    try {
      // Pre-fetch as Blob to avoid CORS
      let processingUrl = originalImage;
      if (originalImage.startsWith('http')) {
        try {
            const response = await fetch(originalImage);
            const blob = await response.blob();
            processingUrl = URL.createObjectURL(blob);
        } catch (e) { console.warn("Blob fetch failed", e); }
      }

      const blob = await removeBackground(processingUrl);
      const url = URL.createObjectURL(blob);
      setOriginalImage(url);
      runVectorization(url);
    } catch (error: any) {
      console.error('Background removal failed:', error);
      alert(`Failed to remove background: ${error.message || error}`);
    } finally {
      setIsRemovingBg(false);
    }
  };

  const handleUpscale = async () => {
    if (!originalImage) return;
    setIsUpscaling(true);
    try {
      // Pre-fetch as Blob to avoid CORS
      let processingUrl = originalImage;
      if (originalImage.startsWith('http')) {
        try {
            const response = await fetch(originalImage);
            const blob = await response.blob();
            processingUrl = URL.createObjectURL(blob);
        } catch (e) { console.warn("Blob fetch failed", e); }
      }

      const upscaler = new Upscaler();
      const upscaledSrc = await upscaler.upscale(processingUrl);
      setOriginalImage(upscaledSrc);
      runVectorization(upscaledSrc);
    } catch (error: any) {
      console.error('Upscaling failed:', error);
      alert(`Failed to upscale image: ${error.message || error}`);
    } finally {
      setIsUpscaling(false);
    }
  };

  const handleMagicOptimize = async () => {
    if (!originalImage) return;
    setIsProcessing(true);
    
    try {
      // 0. Pre-fetch as Blob to avoid CORS issues with external URLs (like Pollinations)
      let processingUrl = originalImage;
      if (originalImage.startsWith('http')) {
        try {
            const response = await fetch(originalImage);
            const blob = await response.blob();
            processingUrl = URL.createObjectURL(blob);
        } catch (fetchError) {
            console.warn("Failed to pre-fetch image blob, trying direct URL:", fetchError);
        }
      }

      // 1. Upscale first (to get better edges)
      const upscaler = new Upscaler();
      const upscaledSrc = await upscaler.upscale(processingUrl);
      
      // 2. Remove Background (to clean noise)
      const blob = await removeBackground(upscaledSrc);
      const cleanUrl = URL.createObjectURL(blob);
      
      // 3. Update State & Vectorize
      setOriginalImage(cleanUrl);
      runVectorization(cleanUrl);
      
    } catch (error: any) {
      console.error("Magic Optimize failed:", error);
      alert(`Optimization failed: ${error.message || error}. \n\nTry 'Remove BG' or 'Upscale' individually.`);
      setIsProcessing(false);
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {onBack && (
            <button 
              onClick={onBack}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#666',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: 0
              }}
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div style={styles.title}>
            <Cpu size={24} />
            Vector Command Center
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => setShowDebug(!showDebug)} style={{ background: 'transparent', border: '1px solid #333', color: '#666', cursor: 'pointer', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px' }}>DEBUG</button>
          <div style={{ fontSize: '0.8rem', color: '#444' }}>v2.0.0 (Groq Enhanced)</div>
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
                      <span style={{ color: '#0aff6a', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                        <BrainCircuit size={14} /> Groq AI Active
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
                  onChange={(e) => setPromptState({ ...promptState, subject: e.target.value })}
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
              
              {systemError && (
                <div style={{ marginTop: '8px', padding: '12px', background: 'rgba(217, 46, 46, 0.1)', border: '1px solid #d92e2e', borderRadius: '8px', color: '#d92e2e', fontSize: '0.8rem' }}>
                  <AlertCircle size={14} style={{ display: 'inline', marginRight: '6px' }} />
                  {systemError}
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
                      background: '#0aff6a',
                      color: '#000',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '1px'
                    }}>
                      Groq Enhanced
                    </div>
                    <p style={{ lineHeight: 1.6, fontSize: '0.95rem', color: '#e9eef6' }}>
                      {aiResult}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                      <button
                        onClick={() => {
                          setPromptState({ ...promptState, subject: aiResult });
                          setAiResult(null);
                        }}
                        style={{
                          background: '#0aff6a',
                          color: '#000',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <CheckCircle2 size={14} /> Use This Concept
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Other Inputs */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>Industry</label>
              <select
                style={styles.select}
                value={promptState.industry}
                onChange={(e) => setPromptState({ ...promptState, industry: e.target.value as any })}
              >
                {Object.keys(INDUSTRIES).map(k => (
                  <option key={k} value={k}>{INDUSTRIES[k as keyof typeof INDUSTRIES].label}</option>
                ))}
              </select>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Asset Type</label>
              <select
                style={styles.select}
                value={promptState.assetType}
                onChange={(e) => setPromptState({ ...promptState, assetType: e.target.value as any })}
              >
                {Object.keys(ASSET_TYPES).map(k => (
                  <option key={k} value={k}>{ASSET_TYPES[k as keyof typeof ASSET_TYPES].label}</option>
                ))}
              </select>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Style</label>
              <select
                style={styles.select}
                value={promptState.style}
                onChange={(e) => setPromptState({ ...promptState, style: e.target.value as any })}
              >
                {Object.keys(STYLES).map(k => (
                  <option key={k} value={k}>{STYLES[k as keyof typeof STYLES].label}</option>
                ))}
              </select>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Composition</label>
              <select
                style={styles.select}
                value={promptState.composition}
                onChange={(e) => setPromptState({ ...promptState, composition: e.target.value as any })}
              >
                {Object.keys(COMPOSITIONS).map(k => (
                  <option key={k} value={k}>{COMPOSITIONS[k as keyof typeof COMPOSITIONS].label}</option>
                ))}
              </select>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Mood</label>
              <select
                style={styles.select}
                value={promptState.mood}
                onChange={(e) => setPromptState({ ...promptState, mood: e.target.value as any })}
              >
                {Object.keys(MOODS).map(k => (
                  <option key={k} value={k}>{MOODS[k as keyof typeof MOODS].label}</option>
                ))}
              </select>
            </div>

            <div style={{ ...styles.inputGroup, gridColumn: '1 / -1' }}>
              <label style={styles.label}>
                <Palette size={16} style={{ marginRight: '8px' }} />
                Color Architecture
              </label>
              
              {/* PALETTE GRID */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', 
                gap: '12px', 
                marginBottom: '16px' 
              }}>
                {Object.entries(COLOR_PALETTES).map(([key, p]) => (
                  <button
                    key={key}
                    onClick={() => setPromptState({ ...promptState, palette: key })}
                    style={{
                      background: promptState.palette === key ? 'rgba(10, 255, 106, 0.05)' : '#111',
                      border: promptState.palette === key ? '1px solid #0aff6a' : '1px solid #333',
                      borderRadius: '8px',
                      padding: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      transition: 'all 0.2s',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', height: '24px', borderRadius: '4px', overflow: 'hidden', width: '100%' }}>
                      {p.colors.map((c, i) => (
                        <div key={i} style={{ flex: 1, background: c }} />
                      ))}
                    </div>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      color: promptState.palette === key ? '#0aff6a' : '#888', 
                      fontWeight: 600 
                    }}>
                      {p.label}
                    </span>
                  </button>
                ))}
                
                {/* CUSTOM BUTTON */}
                <button
                  onClick={() => setPromptState({ ...promptState, palette: 'custom' })}
                  style={{
                    background: promptState.palette === 'custom' ? 'rgba(10, 255, 106, 0.05)' : '#111',
                    border: promptState.palette === 'custom' ? '1px solid #0aff6a' : '1px dashed #444',
                    borderRadius: '8px',
                    padding: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ 
                    height: '24px', 
                    width: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    background: '#222',
                    borderRadius: '4px',
                    color: '#666'
                  }}>
                    <Plus size={14} />
                  </div>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    color: promptState.palette === 'custom' ? '#0aff6a' : '#888', 
                    fontWeight: 600 
                  }}>
                    Custom Mixer
                  </span>
                </button>
              </div>

              {/* CUSTOM MIXER UI */}
              {promptState.palette === 'custom' && (
                <div style={{ 
                  background: '#111', 
                  border: '1px solid #333', 
                  borderRadius: '12px', 
                  padding: '20px',
                  display: 'flex',
                  gap: '24px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ flexShrink: 0 }}>
                    <HexColorPicker 
                      color={promptState.customColors[promptState.customColors.length - 1] || '#ffffff'} 
                      onChange={(newColor) => {
                        const newColors = [...promptState.customColors];
                        if (newColors.length === 0) newColors.push(newColor);
                        else newColors[newColors.length - 1] = newColor;
                        setPromptState({ ...promptState, customColors: newColors });
                      }} 
                      style={{ width: '160px', height: '160px' }}
                    />
                  </div>
                  
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>Active Palette</span>
                      <span style={{ fontSize: '0.75rem', color: '#666' }}>{promptState.customColors.length} / 5 Colors</span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {promptState.customColors.map((color, idx) => (
                        <div key={idx} style={{ position: 'relative' }}>
                          <div 
                            style={{ 
                              width: '48px', 
                              height: '48px', 
                              borderRadius: '8px', 
                              background: color,
                              border: idx === promptState.customColors.length - 1 ? '2px solid #fff' : '2px solid #333',
                              cursor: 'pointer',
                              boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                            }}
                            onClick={() => {
                              const newColors = [...promptState.customColors];
                              newColors.splice(idx, 1);
                              newColors.push(color);
                              setPromptState({ ...promptState, customColors: newColors });
                            }}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const newColors = promptState.customColors.filter((_, i) => i !== idx);
                              setPromptState({ ...promptState, customColors: newColors });
                            }}
                            style={{
                              position: 'absolute',
                              top: '-6px',
                              right: '-6px',
                              background: '#d92e2e',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '50%',
                              width: '18px',
                              height: '18px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontSize: '10px',
                              zIndex: 10
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      
                      {promptState.customColors.length < 5 && (
                        <button
                          onClick={() => {
                            setPromptState({ 
                              ...promptState, 
                              customColors: [...promptState.customColors, '#ffffff'] 
                            });
                          }}
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '8px',
                            border: '2px dashed #444',
                            background: 'transparent',
                            color: '#666',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Plus size={20} />
                        </button>
                      )}
                    </div>
                    
                    <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '8px', lineHeight: '1.4' }}>
                      Tip: Click a color to edit it. Use the picker on the left to adjust the active color.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: '24px' }}>
            <button 
              style={{
                ...styles.button,
                opacity: aiLoading ? 0.7 : 1,
                cursor: aiLoading ? 'wait' : 'pointer'
              }} 
              onClick={generatePrompt}
              disabled={aiLoading}
            >
              {aiLoading ? (
                <>
                  <Loader2 size={18} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                  Engineering Master Prompt...
                </>
              ) : (
                <>
                  <Sparkles size={18} /> Generate Master Prompt
                </>
              )}
            </button>
          </div>

          {showResultModal && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={styles.label}>Master Agent Prompts (ChatGPT / Gemini)</span>
                <button
                  onClick={generatePrompt}
                  disabled={aiLoading}
                  style={{
                    background: 'transparent',
                    border: '1px solid #333',
                    borderRadius: '4px',
                    color: '#0aff6a',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.75rem',
                    padding: '4px 8px'
                  }}
                >
                  <RefreshCw size={12} className={aiLoading ? "spin" : ""} />
                  Regenerate
                </button>
              </div>

              {generatedPrompts.map((prompt, idx) => (
                <div key={idx} style={styles.resultBox}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ 
                        background: '#0aff6a', 
                        color: '#000', 
                        fontSize: '0.65rem', 
                        fontWeight: 800, 
                        padding: '2px 6px', 
                        borderRadius: '4px',
                        textTransform: 'uppercase'
                      }}>
                        {idx === 0 ? 'The Purist' : idx === 1 ? 'The Creative' : 'The Avant-Garde'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => visualizePrompt(prompt, idx)}
                        disabled={visualizingIndex !== null}
                        style={{
                          background: visualizingIndex === idx ? '#222' : 'rgba(10, 255, 106, 0.1)',
                          border: '1px solid #0aff6a',
                          color: '#0aff6a',
                          cursor: visualizingIndex !== null ? 'wait' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.8rem',
                          padding: '4px 8px',
                          borderRadius: '4px'
                        }}
                      >
                        {visualizingIndex === idx ? <Loader2 size={14} className="spin" /> : <ImageIcon size={14} />}
                        {visualizingIndex === idx ? 'Generating...' : 'Visualize (Free)'}
                      </button>
                      <button
                        onClick={() => copyToClipboard(prompt, idx)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: copiedIndex === idx ? '#0aff6a' : '#666',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.8rem'
                        }}
                      >
                        {copiedIndex === idx ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                        {copiedIndex === idx ? 'COPIED' : 'COPY'}
                      </button>
                    </div>
                  </div>
                  <div style={styles.promptText}>{prompt}</div>
                </div>
              ))}

              {/* GENERATED IMAGE PREVIEW MODAL */}
              {generatedImage && (
                <div style={{
                  marginTop: '20px',
                  padding: '20px',
                  background: '#000',
                  border: '1px solid #333',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>AI Visualization Preview</span>
                    <button 
                      onClick={() => setGeneratedImage(null)}
                      style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer' }}
                    >
                      ×
                    </button>
                  </div>
                  
                  <div style={{ 
                    width: '100%', 
                    height: '300px', 
                    background: `url(${generatedImage}) center/contain no-repeat`,
                    borderRadius: '8px',
                    border: '1px dashed #333'
                  }} />

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={transferToVectorizer}
                      style={{
                        flex: 1,
                        background: '#0aff6a',
                        color: '#000',
                        border: 'none',
                        padding: '12px',
                        borderRadius: '8px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <PenTool size={16} />
                      Vectorize This Image
                    </button>
                    <a
                      href={generatedImage}
                      download="ai-concept.jpg"
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        flex: 1,
                        background: '#222',
                        color: '#fff',
                        border: '1px solid #333',
                        padding: '12px',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        textDecoration: 'none'
                      }}
                    >
                      <Download size={16} />
                      Download JPG
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODE: VECTORIZER */}
      {mode === 'vectorizer' && (
        <div style={styles.section}>
          {!originalImage ? (
            <div
              style={styles.dropZone}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={48} color="#333" style={{ marginBottom: '16px' }} />
              <h3 style={{ color: '#fff', marginBottom: '8px' }}>Upload Image to Vectorize</h3>
              <p style={{ color: '#666', fontSize: '0.9rem' }}>JPG, PNG, BMP supported. Max 5MB.</p>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleFileUpload}
              />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* TOOLBAR */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{ ...styles.button, background: '#222', color: '#fff', padding: '8px 16px', fontSize: '0.8rem' }}
                >
                  <Upload size={14} /> New Image
                </button>
                
                <div style={{ width: '1px', background: '#333', margin: '0 8px' }} />

                <button
                  onClick={handleRemoveBackground}
                  disabled={isRemovingBg}
                  style={{ ...styles.button, background: '#222', color: '#fff', padding: '8px 16px', fontSize: '0.8rem' }}
                >
                  {isRemovingBg ? <Loader2 size={14} className="spin" /> : <Eraser size={14} />}
                  Remove BG
                </button>

                <button
                  onClick={handleUpscale}
                  disabled={isUpscaling}
                  style={{ ...styles.button, background: '#222', color: '#fff', padding: '8px 16px', fontSize: '0.8rem' }}
                >
                  {isUpscaling ? <Loader2 size={14} className="spin" /> : <Maximize size={14} />}
                  AI Upscale (2x)
                </button>

                <button
                  onClick={handleMagicOptimize}
                  disabled={isProcessing || isRemovingBg || isUpscaling}
                  style={{ 
                    ...styles.button, 
                    background: 'linear-gradient(135deg, #0aff6a 0%, #00cc55 100%)', 
                    color: '#000', 
                    padding: '8px 16px', 
                    fontSize: '0.8rem',
                    boxShadow: '0 0 10px rgba(10, 255, 106, 0.2)'
                  }}
                >
                  <Wand2 size={14} /> Magic Optimize
                </button>

                <div style={{ width: '1px', background: '#333', margin: '0 8px' }} />

                <div style={{ display: 'flex', gap: '4px', background: '#111', borderRadius: '6px', padding: '2px' }}>
                  {(['print', 'logo', 'illustration', 'cnc', 'embroidery'] as Sector[]).map(s => (
                    <button
                      key={s}
                      onClick={() => setSector(s)}
                      style={{
                        background: sector === s ? '#0aff6a' : 'transparent',
                        color: sector === s ? '#000' : '#666',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '6px 10px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        fontWeight: 600,
                        textTransform: 'capitalize'
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* PREVIEW AREA */}
              <div style={{ 
                flex: 1, 
                position: 'relative', 
                overflow: 'hidden', 
                borderRadius: '8px', 
                border: '1px solid #222',
                ...styles.checkerboard 
              }}>
                {isProcessing && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.8)',
                    zIndex: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0aff6a'
                  }}>
                    <Loader2 size={48} className="spin" style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
                    <div style={{ fontWeight: 600, letterSpacing: '1px' }}>TRACING VECTORS...</div>
                  </div>
                )}

                {/* COMPARISON SLIDER */}
                <div
                  ref={sliderRef}
                  onMouseMove={handleSliderMove}
                  onTouchMove={handleSliderMove}
                  style={{
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                    cursor: 'col-resize',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {/* RASTER LAYER (Bottom) */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}>
                    <img
                      src={originalImage}
                      crossOrigin="anonymous"
                      style={{
                        maxWidth: '90%',
                        maxHeight: '90%',
                        objectFit: 'contain',
                        transform: `scale(${zoom})`,
                        transition: 'transform 0.1s'
                      }}
                    />
                  </div>

                  {/* VECTOR LAYER (Top - Clipped) */}
                  {svgOutput && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      clipPath: `inset(0 0 0 ${comparePos}%)`,
                      ...styles.checkerboard // Use checkerboard to occlude raster layer but show transparency
                    }}>
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: `scale(${zoom})`,
                        transition: 'transform 0.1s',
                        // apply optional preview filter when toggle enabled
                        filter: invertSvgPreview ? 'invert(1) hue-rotate(140deg) saturate(1.8) brightness(1.2)' : 'none'
                      }}
                      // IMPORTANT: render the SVG and force full size
                      dangerouslySetInnerHTML={{ __html: (() => {
                        if (!svgOutput) return '';
                        // ensure svg scales to container
                        let s = svgOutput.replace('<svg ', '<svg style="width:100%; height:100%;" ');

                        // Helper: detect dark colors in SVG
                        const detectShouldAccent = (str: string) => {
                          const rgbRe = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/g;
                          const hexRe = /#([0-9a-fA-F]{3,6})/g;
                          let total = 0, dark = 0;
                          let m;
                          while ((m = rgbRe.exec(str)) !== null) {
                            total++;
                            const r = parseInt(m[1], 10), g = parseInt(m[2], 10), b = parseInt(m[3], 10);
                            const avg = (r + g + b) / 3;
                            if (avg < 80) dark++;
                          }
                          while ((m = hexRe.exec(str)) !== null) {
                            total++;
                            let hex = m[0].slice(1);
                            if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
                            const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
                            const avg = (r + g + b) / 3;
                            if (avg < 80) dark++;
                          }
                          if (total === 0) return false;
                          return (dark / total) > 0.6;
                        };

                        // If autoAccent enabled and svg appears dark, inject style to force accent color
                        try {
                          const should = autoAccent && detectShouldAccent(s);
                          if (should) {
                            // avoid duplicating defs if already present
                            if (!/data-accent-injected/.test(s)) {
                              s = s.replace(/<svg([^>]*)>/, (match) => {
                                return `${match}<defs data-accent-injected><style>path,rect,circle,ellipse,polygon,polyline,line,g{fill:${accentColor} !important; stroke:${accentColor} !important}</style></defs>`;
                              });
                            }
                          }
                        } catch (e) {
                          console.warn('Accent injection failed', e);
                        }

                        return s;
                      })() }}
                      />
                    </div>
                  )}

                  {/* SLIDER HANDLE */}
                  {svgOutput && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: `${comparePos}%`,
                      width: '2px',
                      background: '#0aff6a',
                      zIndex: 5,
                      pointerEvents: 'none'
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '24px',
                        height: '24px',
                        background: '#0aff6a',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 10px rgba(10, 255, 106, 0.5)'
                      }}>
                        <div style={{ width: '2px', height: '12px', background: '#000', margin: '0 1px' }} />
                        <div style={{ width: '2px', height: '12px', background: '#000', margin: '0 1px' }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* ZOOM CONTROLS */}
                <div style={{
                  position: 'absolute',
                  bottom: '16px',
                  right: '16px',
                  display: 'flex',
                  gap: '8px',
                  background: 'rgba(0,0,0,0.8)',
                  padding: '4px',
                  borderRadius: '8px',
                  zIndex: 20
                }}>
                  <button onClick={() => adjustZoom(-0.5)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}><ZoomOut size={16} /></button>
                  <span style={{ color: '#fff', fontSize: '0.8rem', display: 'flex', alignItems: 'center' }}>{Math.round(zoom * 100)}%</span>
                  <button onClick={() => adjustZoom(0.5)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}><ZoomIn size={16} /></button>
                  <div style={{ width: '1px', background: '#444', margin: '0 4px' }} />
                  <button onClick={toggleFullscreen} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}>
                    {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                  </button>
                  {/* QUICK PREVIEW CONTROLS */}
                  <div style={{ width: '1px', background: '#444', margin: '0 4px' }} />
                  <button onClick={() => setInvertSvgPreview(prev => !prev)} title="Invert Preview" style={{ background: invertSvgPreview ? '#0aff6a' : 'transparent', border: '1px solid #333', padding: '6px', borderRadius: '6px', cursor: 'pointer', color: invertSvgPreview ? '#000' : '#fff' }}>
                    {invertSvgPreview ? <CheckCircle2 size={14} /> : <Eraser size={14} />}
                  </button>
                  <button onClick={() => setAutoAccent(prev => !prev)} title="Auto Accent" style={{ background: autoAccent ? '#0aff6a' : 'transparent', border: '1px solid #333', padding: '6px', borderRadius: '6px', cursor: 'pointer', color: autoAccent ? '#000' : '#fff' }}>
                    <Sparkles size={14} />
                  </button>
                  <button onClick={() => setShowAccentPicker(prev => !prev)} title="Accent Color" style={{ width: '28px', height: '28px', background: accentColor, border: '1px solid #333', borderRadius: '6px', cursor: 'pointer' }} />
                </div>
              </div>
              {showAccentPicker && (
                <div style={{ position: 'absolute', right: '16px', bottom: '64px', zIndex: 30, background: 'rgba(0,0,0,0.95)', padding: '8px', borderRadius: '8px', border: '1px solid #333' }}>
                  <div style={{ width: '160px', background: '#111', padding: '8px', borderRadius: '8px' }}>
                    <HexColorPicker color={accentColor} onChange={(c) => setAccentColor(c)} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowAccentPicker(false)} style={{ padding: '6px 10px', background: '#222', color: '#fff', border: '1px solid #444' }}>Done</button>
                    <button onClick={() => { setAccentColor('#0aff6a'); setShowAccentPicker(false); }} style={{ padding: '6px 10px', background: '#0aff6a', color: '#000', border: 'none' }}>Reset</button>
                  </div>
                </div>
              )}

              {/* FOOTER ACTIONS */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button
                  onClick={downloadSVG}
                  disabled={!svgOutput}
                  style={{ ...styles.button, background: !svgOutput ? '#222' : '#0aff6a', color: !svgOutput ? '#666' : '#000' }}
                >
                  <Download size={18} /> Download SVG
                </button>
                <button
                  onClick={downloadPDF}
                  disabled={!svgOutput}
                  style={{ ...styles.button, background: '#222', color: !svgOutput ? '#666' : '#fff' }}
                >
                  <FileText size={18} /> Download PDF
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {/* DEBUG PANEL */}
      {showDebug && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '300px',
          background: 'rgba(0,0,0,0.9)',
          border: '1px solid #0aff6a',
          borderRadius: '8px',
          padding: '16px',
          zIndex: 9999,
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#0aff6a',
          boxShadow: '0 0 20px rgba(0,0,0,0.5)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #333', paddingBottom: '4px' }}>
            <strong>DEBUGGER</strong>
            <button onClick={() => setShowDebug(false)} style={{ background: 'transparent', border: 'none', color: '#0aff6a', cursor: 'pointer' }}>×</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div>Mode: {mode}</div>
            <div>Original Image: {originalImage ? 'Loaded' : 'Null'}</div>
            <div>SVG Output: {svgOutput ? 'Generated' : 'Null'}</div>
            <div>Processing: {isProcessing ? 'YES' : 'No'}</div>
            <div>Removing BG: {isRemovingBg ? 'YES' : 'No'}</div>
            <div>Upscaling: {isUpscaling ? 'YES' : 'No'}</div>
            <div>Zoom: {zoom.toFixed(2)}x</div>
            <div>Compare Pos: {comparePos}%</div>
            <div style={{ marginTop: '8px', borderTop: '1px solid #333', paddingTop: '4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button onClick={() => { 
                const debugInfo = { mode, originalImage, svgOutput: svgOutput ? 'Generated' : null, isProcessing, isRemovingBg, isUpscaling, zoom, comparePos };
                navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
                alert('Debug info copied to clipboard!');
              }} style={{ background: '#0aff6a', color: '#000', border: 'none', padding: '6px 10px', cursor: 'pointer', flex: 1, fontWeight: 'bold' }}>
                Copy Debug Info
              </button>

              <button onClick={() => setInvertSvgPreview(prev => !prev)} style={{ background: invertSvgPreview ? '#0aff6a' : '#222', color: invertSvgPreview ? '#000' : '#fff', border: '1px solid #444', padding: '6px 10px', cursor: 'pointer' }}>
                {invertSvgPreview ? 'SVG: Inverted' : 'Invert SVG Preview'}
              </button>

              <button onClick={() => setAutoAccent(prev => !prev)} style={{ background: autoAccent ? '#0aff6a' : '#222', color: autoAccent ? '#000' : '#fff', border: '1px solid #444', padding: '6px 10px', cursor: 'pointer' }}>
                {autoAccent ? 'Auto Accent: ON' : 'Auto Accent: OFF'}
              </button>

              <button onClick={() => setShowAccentPicker(prev => !prev)} title="Accent Color" style={{ width: '36px', height: '36px', background: accentColor, border: '1px solid #444', borderRadius: '6px', cursor: 'pointer' }} />

              <button onClick={() => { 
                  console.log('SVG Output:', svgOutput); 
                  if (svgOutput) {
                      navigator.clipboard.writeText(svgOutput.substring(0, 500));
                      alert('First 500 chars of SVG copied to clipboard!');
                  } else {
                      alert('No SVG to copy');
                  }
              }} style={{ background: '#222', color: '#fff', border: '1px solid #444', padding: '6px 10px', cursor: 'pointer' }}>
                Copy SVG Source
              </button>
            </div>
            {showAccentPicker && (
              <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ width: '160px', background: '#111', padding: '8px', borderRadius: '8px' }}>
                  <HexColorPicker color={accentColor} onChange={(c) => setAccentColor(c)} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ color: '#999', fontSize: '12px' }}>Accent Color</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setShowAccentPicker(false)} style={{ padding: '6px 10px', background: '#222', color: '#fff', border: '1px solid #444' }}>Done</button>
                    <button onClick={() => { setAccentColor('#0aff6a'); }} style={{ padding: '6px 10px', background: '#0aff6a', color: '#000', border: 'none' }}>Reset</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
