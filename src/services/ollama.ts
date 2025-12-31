/**
 * 🦙 OLLAMA CLIENT (Local AI)
 * Connects to the user's local Ollama instance.
 * Default URL: http://localhost:11434
 */

export interface OllamaResponse {
  response: string;
  done: boolean;
  context?: number[];
}

const OLLAMA_URL = 'http://localhost:11434/api/generate';

export class OllamaService {
  
  /**
   * Check if Ollama is running locally
   */
  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch('http://localhost:11434/api/tags');
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  /**
   * Generate text using a local model
   * @param prompt The user's text + instructions
   * @param model 'mistral' | 'llama3' | 'tinyllama'
   */
  async generate(prompt: string, model: string = 'mistral'): Promise<string> {
    try {
      const response = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          prompt: prompt,
          stream: false // We want the full response at once for now
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama Error: ${response.statusText}`);
      }

      const data = await response.json() as OllamaResponse;
      return data.response;
    } catch (error) {
      console.error("Ollama Generation Failed:", error);
      throw error;
    }
  }
}

export const ollamaService = new OllamaService();
