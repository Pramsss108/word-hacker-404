import React, { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { EditorPane } from './EditorPane';
import { DiffPane } from './DiffPane';
import { StatsBar } from './StatsBar';
import { ControlPanel } from './ControlPanel';
import { SettingsModal } from './SettingsModal';
import { analysisEngine, AnalysisResult } from '../../lib/AnalysisEngine';
import { grammarEngine, GrammarIssue } from '../../lib/GrammarEngine';
import { groqService } from '../../services/groq';
import { ModeSelector } from './ModeSelector';
import { GrammarPanel } from './GrammarPanel';
import { DetectorPanel } from './DetectorPanel';
import { PlagiarismPanel } from './PlagiarismPanel';
import './NeuralEditor.css';

interface NeuralEditorProps {
  onExit: () => void;
}

export const NeuralEditor: React.FC<NeuralEditorProps> = ({ onExit }) => {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [stats, setStats] = useState<AnalysisResult>({
    readabilityScore: 0,
    wordCount: 0,
    sentenceCount: 0,
    passiveVoiceCount: 0,
    complexWordCount: 0,
    suggestions: []
  });
  const [grammarIssues, setGrammarIssues] = useState<GrammarIssue[]>([]);
  const [detectionResult, setDetectionResult] = useState<{ score: number; analysis: string } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [activeMode, setActiveMode] = useState<'paraphraser' | 'grammar' | 'detector' | 'plagiarism'>('paraphraser');
  const [isProcessing, setIsProcessing] = useState(false);
  // Default to 'cloud' as we use the Gateway now. No local check needed.
  const [brainStatus] = useState<'cloud'>('cloud');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      
      recognitionInstance.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setInputText(prev => prev + (prev ? ' ' : '') + finalTranscript);
        }
      };

      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && window.location.protocol === 'http:') {
             alert(`⚠️ BROWSER SECURITY BLOCK ⚠️\n\nYou are on "${window.location.hostname}". Browsers BLOCK the microphone on IP addresses.\n\nFIX: Change the URL in your address bar to "localhost".\n\nUse this: http://localhost:3001`);
          } else {
             alert("Microphone access denied. Please check your browser settings permissions.");
          }
        } else if (event.error === 'service-not-allowed') {
          alert("Voice service error. Ensure you are using 'localhost' or HTTPS.");
        }
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }
  }, []);

  const toggleVoice = () => {
    if (!recognition) {
      alert("Voice dictation not supported in this browser. Try Chrome on Desktop.");
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      try {
        recognition.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
        alert("Could not start microphone. If you are using an IP address (192.168...), please switch to 'localhost:3001'. Browsers block microphones on insecure connections.");
      }
    }
  };

  // Debounced analysis & Auto-Clear Output
  useEffect(() => {
    // Clear output when input changes to prevent "Red Wall" diffs
    if (outputText) {
      setOutputText('');
    }

    const timer = setTimeout(async () => {
      // Run basic stats
      const result = await analysisEngine.analyze(inputText);
      setStats(result);
      
      // Run grammar check
      const issues = await grammarEngine.analyze(inputText);
      setGrammarIssues(issues);
    }, 500);

    return () => clearTimeout(timer);
  }, [inputText]);

  const handleRewrite = async (mode: string) => {
    if (!inputText.trim()) return;
    
    // Force switch to paraphraser mode to see result
    setActiveMode('paraphraser');
    
    setIsProcessing(true);
    try {
      // Always use Groq (Cloud Gateway)
      const result = await groqService.rewrite(inputText, mode);
      setOutputText(result);
    } catch (error) {
      console.error(error);
      setOutputText("⚠️ Error: Neural Link Failed. Check internet connection.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScan = async () => {
    if (!inputText.trim()) return;
    setIsScanning(true);
    try {
      const result = await groqService.detectAI(inputText);
      setDetectionResult(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsScanning(false);
    }
  };

  const handleAccept = () => {
    if (outputText && !outputText.startsWith('⚠️')) {
      setInputText(outputText);
      setOutputText(''); // Clear output after accepting
    }
  };

  const handleClear = () => {
    setInputText('');
    setOutputText('');
  };

  return (
    <div className="neural-editor-container">
      {/* Background Grid Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      
      <div className="neural-top-bar">
        <button 
          onClick={onExit}
          className="neural-exit-btn"
        >
          <ChevronRight className="rotate-180" size={16} /> EXIT_NEURAL_NET
        </button>
      </div>

      <div className="mode-selector-container">
        <ModeSelector activeMode={activeMode} onChange={setActiveMode} />
      </div>

      {activeMode === 'paraphraser' && (
        <ControlPanel 
          onRewrite={handleRewrite} 
          isProcessing={isProcessing} 
          brainStatus={brainStatus} 
        />
      )}
      
      <div className={`neural-workspace mode-${activeMode}`}>
        <div className="neural-pane left">
          <EditorPane 
            value={inputText} 
            onChange={setInputText} 
            onClear={handleClear}
            isListening={isListening}
            onToggleVoice={toggleVoice}
            grammarIssues={activeMode === 'grammar' ? grammarIssues : []}
          />
        </div>
        <div className="neural-pane right">
          {activeMode === 'paraphraser' && (
            <DiffPane 
              original={inputText} 
              modified={outputText} 
              onAccept={handleAccept}
            />
          )}
          {activeMode === 'grammar' && (
            <GrammarPanel issues={grammarIssues} />
          )}
          {activeMode === 'detector' && (
            <DetectorPanel 
              score={detectionResult?.score ?? null}
              analysis={detectionResult?.analysis ?? null}
              isScanning={isScanning}
              onScan={handleScan}
            />
          )}
          {activeMode === 'plagiarism' && (
            <PlagiarismPanel text={inputText} />
          )}
        </div>
      </div>

      <StatsBar stats={stats} />

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        brainStatus={brainStatus}
      />
    </div>
  );
};
