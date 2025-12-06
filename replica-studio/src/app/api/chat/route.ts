import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const MODEL_NAME = "gemini-1.5-flash"

export const runtime = "nodejs"
export const maxDuration = 300

interface ChatPayload {
  messages?: Array<{
    role: "user" | "assistant"
    content: string
  }>
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 })
    }

    const body = (await request.json()) as ChatPayload
    const messages = Array.isArray(body.messages) ? body.messages : []
    if (!messages.length) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: MODEL_NAME })

    const contents = messages.map((message) => ({
      role: message.role === "user" ? "user" : "model",
      parts: [
        {
          text: message.content.slice(0, 4000),
        },
      ],
    }))

    const result = await model.generateContent({
      contents,
      generationConfig: {
        temperature: 0.55,
        maxOutputTokens: 512,
      },
    })

    const text = result.response.text() ?? "No response generated."

    return NextResponse.json({
      message: {
        role: "assistant" as const,
        content: text.trim(),
      },
    })
  } catch (error) {
    console.error("Gemini chat failed", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected error",
      },
      { status: 500 }
    )
  }
}
