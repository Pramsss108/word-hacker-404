/**
 * ⚡ GROQ CLOUD CLIENT (Online AI)
 * Ultra-fast inference using Llama 3 70B via Cloudflare Gateway.
 * No client-side API key required.
 */

const GATEWAY_URL = 'https://ai-gateway.guitarguitarabhijit.workers.dev/v1/chat';
const ACCESS_SECRET = 'word-hacker-ai-secret';

export class GroqService {
  
  // Always returns true as we use the public gateway
  hasKey(): boolean {
    return true;
  }

  async rewrite(text: string, mode: string): Promise<string> {
    const systemPrompt = this.getSystemPrompt(mode);

    try {
      const response = await fetch(GATEWAY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-secret': ACCESS_SECRET
        },
        body: JSON.stringify({
          mode: 'general', // Gateway handles system prompt injection based on mode, but we can also pass messages
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text }
          ],
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || `Gateway Error: ${response.status}`);
      }

      const data = await response.json();
      return data.content || "";
    } catch (error) {
      console.error("Groq Gateway Error:", error);
      throw error;
    }
  }

  async detectAI(text: string): Promise<{ score: number; analysis: string }> {
    try {
      const response = await fetch(GATEWAY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-secret': ACCESS_SECRET
        },
        body: JSON.stringify({
          mode: 'general',
          messages: [
            { role: "system", content: "You are an AI detection expert. Analyze the text and estimate the probability it was written by AI. Return JSON: { \"score\": number (0-100), \"analysis\": string (short explanation) }." },
            { role: "user", content: text }
          ],
          temperature: 0.1
        })
      });

      if (!response.ok) throw new Error("Gateway Error");
      
      const data = await response.json();
      // The gateway returns { content: string, ... }
      // We need to parse the content if it's JSON, or handle it if it's text
      try {
        return JSON.parse(data.content);
      } catch {
        // Fallback if not valid JSON
        return { score: 0, analysis: data.content || "Detection failed." };
      }
    } catch (error) {
      console.error("Detection Error:", error);
      return { score: 0, analysis: "Detection failed." };
    }
  }


  private getSystemPrompt(mode: string): string {
    const basePrompt = "You are an expert editor. Output ONLY the rewritten text. Do not add quotes, preambles, or explanations.";
    
    switch (mode) {
      case 'fluency':
        return `${basePrompt} Fix grammar, spelling, and punctuation errors. Keep the tone natural.`;
      case 'formal':
        return `${basePrompt} Make the text more formal, professional, and academic. Remove slang.`;
      case 'shorten':
        return `${basePrompt} Shorten the text by removing fluff and redundancy. Keep the core meaning.`;
      case 'creative':
        return `${basePrompt} Rewrite the text in a more creative and engaging way. Use vivid vocabulary.`;
      case 'security':
        return "You are a cybersecurity expert. Analyze the provided process information for potential threats. Be concise and decisive.";
      default:
        return `${basePrompt} Improve the clarity and flow of the text.`;
    }
  }
}

export const groqService = new GroqService();
