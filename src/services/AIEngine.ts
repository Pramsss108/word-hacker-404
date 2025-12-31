
// src/services/AIEngine.ts

/**
 * 🧠 AI BRAIN CLIENT
 * Connecting to your Private Central Intelligence Server
 */

// Configuration
// In production, this would be your Cloudflare Worker URL
// For now, let's assume you've deployed it
const BRAIN_URL = import.meta.env.VITE_AI_GATEWAY_URL || "https://my-ai-brain.workers.dev";
const ACCESS_SECRET = import.meta.env.VITE_AI_ACCESS_SECRET || "my-secret-password";

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface AIResponse {
    content: string;
    model: string;
    error?: string;
}

class AIEngineService {

    /**
     * Send a message to the Central Brain
     * Uses Llama 3.3 70B by default
     */
    async chat(messages: ChatMessage[], systemPrompt?: string, mode: 'general' | 'security' | 'creative' = 'general'): Promise<AIResponse> {
        try {
            // Clone messages to avoid mutating state
            let finalMessages = messages.map(m => ({ ...m }));
            
            // CLEAN PASS-THROUGH
            // No client-side injection. We trust the backend or the model itself.
            
            const payload = {
                messages: finalMessages,
                system: systemPrompt || "You are a helpful AI assistant specialized in word games and coding.",
                temperature: mode === 'creative' ? 0.9 : 0.7,
                mode: mode
            };

            const response = await fetch(`${BRAIN_URL}/v1/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-access-secret': ACCESS_SECRET
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Brain connection failed: ${response.statusText}`);
            }

            const data = await response.json();
            return {
                content: data.content,
                model: data.model
            };

        } catch (error: any) {
            console.error("❌ AI Brain Error:", error);
            return {
                content: "",
                model: "error",
                error: error.message || "Unknown error occurred"
            };
        }
    }

    /**
     * Simulate streaming for better UX
     * (Since Gateway is unary for now to keep it free/simple)
     */
    async *chatStreamSimulated(messages: ChatMessage[], systemPrompt?: string) {
        // 1. Get full response
        const result = await this.chat(messages, systemPrompt);

        if (result.error) {
            yield `Error: ${result.error}`;
            return;
        }

        // 2. Stream it out character by character
        const words = result.content.split(' ');
        for (const word of words) {
            yield word + " ";
            // Tiny random delay to feel like "thinking"
            await new Promise(r => setTimeout(r, Math.random() * 30 + 10));
        }
    }
}

export const aiEngine = new AIEngineService();
