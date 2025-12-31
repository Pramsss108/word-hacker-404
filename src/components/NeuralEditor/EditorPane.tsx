import React, { useState, useRef } from 'react';
import { Trash2, Mic, MicOff } from 'lucide-react';
import { SynonymMenu } from './SynonymMenu';
import { GrammarTooltip } from './GrammarTooltip';
import { MOCK_SYNONYMS } from '../../lib/synonyms';
import { GrammarIssue } from '../../lib/GrammarEngine';

interface EditorPaneProps {
  value: string;
  onChange: (text: string) => void;
  onClear: () => void;
  isListening?: boolean;
  onToggleVoice?: () => void;
  grammarIssues?: GrammarIssue[];
}

export const EditorPane: React.FC<EditorPaneProps> = ({ 
  value, 
  onChange, 
  onClear,
  isListening = false,
  onToggleVoice,
  grammarIssues = []
}) => {
  const [synonymMenu, setSynonymMenu] = useState<{
    visible: boolean;
    word: string;
    synonyms: string[];
    position: { x: number; y: number };
    selectionStart: number;
    selectionEnd: number;
  } | null>(null);
  
  const [activeIssue, setActiveIssue] = useState<{
    issue: GrammarIssue;
    position: { x: number; y: number };
  } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (textareaRef.current && backdropRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
    }
    // Hide tooltips on scroll
    setActiveIssue(null);
    setSynonymMenu(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const cursorIndex = textarea.selectionStart;

    // Check for grammar issues at cursor
    const issue = grammarIssues.find(i => cursorIndex >= i.from && cursorIndex <= i.to);
    
    if (issue) {
      setActiveIssue({
        issue,
        position: { x: e.clientX, y: e.clientY }
      });
      setSynonymMenu(null); // Close synonym menu if open
    } else {
      setActiveIssue(null);
    }
  };

  const handleFixGrammar = (replacement: string) => {
    if (!activeIssue) return;
    
    const { issue } = activeIssue;
    const before = value.substring(0, issue.from);
    const after = value.substring(issue.to);
    const newValue = before + replacement + after;
    
    onChange(newValue);
    setActiveIssue(null);
  };

  const renderHighlights = () => {
    if (!grammarIssues.length) return value;

    const sortedIssues = [...grammarIssues].sort((a, b) => a.from - b.from);
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    sortedIssues.forEach((issue, index) => {
      // Add text before issue
      if (issue.from > lastIndex) {
        elements.push(value.substring(lastIndex, issue.from));
      }

      // Add highlighted issue
      const issueText = value.substring(issue.from, issue.to);
      const className = issue.ruleId === 'retext-passive' ? 'highlight-warning' : 'highlight-error';
      
      elements.push(
        <span key={`${index}-${issue.from}`} className={className}>
          {issueText}
        </span>
      );

      lastIndex = issue.to;
    });

    // Add remaining text
    if (lastIndex < value.length) {
      elements.push(value.substring(lastIndex));
    }

    // Add a trailing space to ensure last line renders correctly if empty
    if (value.endsWith('\n')) {
      elements.push('\n');
    }

    return elements;
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    // Get the word at the cursor
    const word = text.substring(start, end).trim().toLowerCase();
    
    if (word && MOCK_SYNONYMS[word]) {
      // Calculate approximate position (this is tricky in textarea, so we use mouse position)
      setSynonymMenu({
        visible: true,
        word,
        synonyms: MOCK_SYNONYMS[word],
        position: { x: e.clientX, y: e.clientY },
        selectionStart: start,
        selectionEnd: end
      });
      setActiveIssue(null); // Close grammar tooltip
    }
  };

  const handleSynonymSelect = (synonym: string) => {
    if (!synonymMenu) return;

    const before = value.substring(0, synonymMenu.selectionStart);
    const after = value.substring(synonymMenu.selectionEnd);
    const newValue = before + synonym + after;
    
    onChange(newValue);
    setSynonymMenu(null);
  };

  return (
    <>
      <div className="pane-header">
        <div className="flex items-center gap-2">
          <span className="pane-title">SOURCE_INPUT</span>
          <span className="pane-badge editable">EDITABLE</span>
        </div>
        <div className="flex items-center gap-2">
          {onToggleVoice && (
            <button
              onClick={onToggleVoice}
              className={`transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-gray-500 hover:text-white'}`}
              title={isListening ? "Stop Dictation" : "Start Dictation"}
            >
              {isListening ? <MicOff size={14} /> : <Mic size={14} />}
            </button>
          )}
          <button 
            onClick={onClear}
            className="text-gray-500 hover:text-red-400 transition-colors"
            title="Clear Text"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className="neural-editor-wrapper">
        <div ref={backdropRef} className="editor-backdrop">
          {renderHighlights()}
        </div>
        <textarea
          ref={textareaRef}
          className="neural-textarea"
          placeholder="Paste your text here to begin neural enhancement... (Double-click words for synonyms)"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          spellCheck={false}
        />
        {synonymMenu && (
          <SynonymMenu
            word={synonymMenu.word}
            synonyms={synonymMenu.synonyms}
            position={synonymMenu.position}
            onSelect={handleSynonymSelect}
            onClose={() => setSynonymMenu(null)}
          />
        )}
        {activeIssue && (
          <GrammarTooltip
            issue={activeIssue.issue}
            position={activeIssue.position}
            onFix={handleFixGrammar}
            onIgnore={() => setActiveIssue(null)}
            onClose={() => setActiveIssue(null)}
          />
        )}
      </div>
    </>
  );
};
