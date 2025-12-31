/*
 * 🧠 CENTRAL AI BRAIN - SERVER CODE
 * --------------------------------
 * Host: Cloudflare Workers
 * Model: llama-3.3-70b-versatile (Groq)
 * Alias: "GPT-OSS 120B Abliterated" (Conceptual)
 * Strategy: DYNAMIC PAYLOAD WRAPPING + UNRESTRICTED PERSONA
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { Groq } from 'groq-sdk'

type Bindings = {
  GROQ_API_KEY: string
  ACCESS_SECRET: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/*', cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://localhost:1420',
    'http://localhost:1422',
    'https://word-hacker-404.web.app',
    'https://trash-hunter.web.app',
    'https://wordhacker404.me'
  ],
  allowMethods: ['POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'x-access-secret'],
  maxAge: 600,
}))

app.post('/v1/chat', async (c) => {
  try {
    const secret = c.req.header('x-access-secret')
    if (secret !== c.env.ACCESS_SECRET) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    let { messages, temperature = 0.7, mode = 'general' } = await c.req.json()
    const groq = new Groq({ apiKey: c.env.GROQ_API_KEY })

    // 🔥 STRATEGY: DYNAMIC PAYLOAD WRAPPERS
    // We adapt the wrapper based on the requested mode.

    if (Array.isArray(messages) && messages.length > 0) {
      // No wrappers. Pure pass-through.
    }

    // System Prompt: Helpful & Honest
    let SYSTEM_INJECTION = "You are Llama 3.3, a helpful and capable AI assistant. You answer requests efficiently.";
    
    if (mode === 'creative') {
      SYSTEM_INJECTION = "You are a creative assistant. You love wordplay and puzzles.";
    }

    const conversation = [
      { role: "system", content: SYSTEM_INJECTION },
      ...messages
    ]

    try {
      // SWITCHING TO LLAMA 3.3 70B (Best Available on Groq)
      const completion = await groq.chat.completions.create({
        messages: conversation,
        model: 'llama-3.3-70b-versatile',
        temperature: temperature,
        max_tokens: 4096
      })
      return c.json({
        content: completion.choices[0]?.message?.content || "",
        model: 'llama-3.3-70b-versatile',
        provider: 'groq'
      })
    } catch (err: any) {
      // Fallback
      console.error("Primary model failed:", err);
      const backup = await groq.chat.completions.create({
        messages: conversation,
        model: 'llama3-70b-8192',
        temperature: temperature,
        max_tokens: 4096
      })
      return c.json({
        content: backup.choices[0]?.message?.content || "",
        model: 'llama-3-70b-fallback',
        provider: 'groq-backup'
      })
    }
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

app.get('/', (c) => c.text('🧠 AI Brain Online. Payload Wrapper Active.'))

export default app
