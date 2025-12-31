import { unified } from 'unified';
import retextEnglish from 'retext-english';
import retextPassive from 'retext-passive';
import retextSimplify from 'retext-simplify';
// @ts-ignore
import textReadability from 'text-readability';

export interface AnalysisResult {
  readabilityScore: number;
  wordCount: number;
  sentenceCount: number;
  passiveVoiceCount: number;
  complexWordCount: number;
  suggestions: Suggestion[];
}

export interface Suggestion {
  type: 'passive' | 'complex' | 'other';
  message: string;
  index: number;
  length: number;
  original: string;
}

export class AnalysisEngine {
  private processor: any;

  constructor() {
    this.processor = unified()
      .use(retextEnglish)
      .use(retextPassive)
      .use(retextSimplify);
  }

  async analyze(text: string): Promise<AnalysisResult> {
    if (!text.trim()) {
      return {
        readabilityScore: 0,
        wordCount: 0,
        sentenceCount: 0,
        passiveVoiceCount: 0,
        complexWordCount: 0,
        suggestions: []
      };
    }

    const file = await this.processor.process(text);
    
    const suggestions: Suggestion[] = file.messages.map((msg: any) => ({
      type: msg.source === 'retext-passive' ? 'passive' : (msg.source === 'retext-simplify' ? 'complex' : 'other'),
      message: msg.reason,
      index: msg.position?.start?.offset || 0,
      length: (msg.position?.end?.offset || 0) - (msg.position?.start?.offset || 0),
      original: text.slice(msg.position?.start?.offset || 0, msg.position?.end?.offset || 0)
    }));

    // text-readability might throw on empty or weird text
    let readabilityScore = 0;
    try {
        readabilityScore = textReadability.fleschKincaidGrade(text);
    } catch (e) {
        console.warn("Readability calculation failed", e);
    }

    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;

    return {
      readabilityScore: isNaN(readabilityScore) ? 0 : readabilityScore,
      wordCount,
      sentenceCount,
      passiveVoiceCount: suggestions.filter(s => s.type === 'passive').length,
      complexWordCount: suggestions.filter(s => s.type === 'complex').length,
      suggestions
    };
  }
}

export const analysisEngine = new AnalysisEngine();
