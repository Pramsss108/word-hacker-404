import { pipeline, env } from '@xenova/transformers';

// Skip local model checks since we're in browser
env.allowLocalModels = false;
env.useBrowserCache = true;

class AIHandler {
  static instance: any = null;
  static currentModel = 'Xenova/LaMini-Flan-T5-783M'; // Default to Max Power
  static loadingPromise: Promise<any> | null = null;

  static async getInstance(modelName: string | null, progressCallback: (data: any) => void = () => {}) {
    // If requesting a different model than loaded, reset instance
    if (modelName && modelName !== this.currentModel) {
      this.instance = null;
      this.loadingPromise = null;
      this.currentModel = modelName;
    }

    if (this.instance) {
      return this.instance;
    }

    if (!this.loadingPromise) {
      this.loadingPromise = pipeline('text2text-generation', this.currentModel, {
        progress_callback: progressCallback
      }).then((inst: any) => {
        this.instance = inst;
        // Keep loadingPromise around or clear it? 
        // If we clear it, subsequent calls get this.instance.
        // If we keep it, they await it.
        // Better to clear it so we don't hold onto the promise forever, though it resolves to instance.
        // Actually, just returning this.instance is fine.
        return inst;
      });
    }
    
    return this.loadingPromise;
  }
}

self.addEventListener('message', async (event) => {
  const { type, text, id, model } = event.data;

  try {
    if (type === 'load') {
      self.postMessage({ type: 'progress', data: { status: 'init', file: 'Checking Cache...' } });
      // Allow switching models dynamically, default to 783M
      await AIHandler.getInstance(model || 'Xenova/LaMini-Flan-T5-783M', (data) => {
        self.postMessage({ type: 'progress', data });
      });
      self.postMessage({ type: 'ready', model: AIHandler.currentModel });
    }  
    else if (type === 'enhance') {
      const generator = await AIHandler.getInstance(null, () => {});
      
      // SANITIZATION & DICTIONARY STRATEGY
      // 1. Strip trigger words ("make", "create") that cause the "I am an AI" refusal.
      // 2. Frame the task as a "Dictionary Definition" of a symbol. This is a text task, not an image task.
      let cleanInput = text
        .replace(/(make|create|design|generate|draw) a (logo|icon|image|picture|photo) (for|of)?/gi, "")
        .replace(/my business/gi, "")
        .trim();

      const prompt = `Define the visual symbol for "${cleanInput}". Symbol: A`;
      
      const output = await generator(prompt, {
        max_new_tokens: 60,
        temperature: 0.5,     // Low temp for factual definitions
        repetition_penalty: 1.3,
        do_sample: true,      
        top_k: 40,            
      });

      let resultText = output[0].generated_text.trim();
      
      // Reconstruct
      if (!resultText.startsWith("A ") && !resultText.startsWith("a ")) {
         resultText = "A " + resultText;
      }
      
      // Polish
      resultText = "A minimalist vector icon of " + resultText.substring(2);

      self.postMessage({ 
        type: 'result', 
        id, 
        text: resultText
      });
    }
    else if (type === 'explain') {
      const generator = await AIHandler.getInstance(null, () => {});
      
      const prompt = `Explain why this design concept works: ${text}`;
      
      const output = await generator(prompt, {
        max_new_tokens: 60,
        temperature: 0.5,
      });

      self.postMessage({ 
        type: 'result', 
        id, 
        text: output[0].generated_text 
      });
    }
  } catch (error) {
    self.postMessage({ type: 'error', error: error });
  }
});
