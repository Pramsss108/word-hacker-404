import { unified } from 'unified';
import retextEnglish from 'retext-english';
import retextPassive from 'retext-passive';
import retextSimplify from 'retext-simplify';
import retextEquality from 'retext-equality';

export interface GrammarIssue {
  message: string;
  line: number;
  column: number;
  ruleId: string;
  source: string;
  actual?: string;
  expected?: string[];
  from: number;
  to: number;
}

export class GrammarEngine {
  private processor: any;

  constructor() {
    this.processor = unified()
      .use(retextEnglish)
      .use(retextPassive)
      .use(retextSimplify)
      .use(retextEquality);
  }

  async analyze(text: string): Promise<GrammarIssue[]> {
    if (!text.trim()) return [];

    try {
      const file = await this.processor.process(text);
      
      return file.messages.map((msg: any) => ({
        message: msg.message,
        line: msg.line || 0,
        column: msg.column || 0,
        ruleId: msg.ruleId || 'unknown',
        source: msg.source || 'retext',
        actual: msg.actual,
        expected: msg.expected,
        from: msg.position?.start?.offset ?? 0,
        to: msg.position?.end?.offset ?? 0
      }));
    } catch (error) {
      console.error('Grammar analysis failed:', error);
      return [];
    }
  }
}

export const grammarEngine = new GrammarEngine();
