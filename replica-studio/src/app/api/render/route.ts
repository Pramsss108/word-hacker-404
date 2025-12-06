import { NextRequest, NextResponse } from "next/server"
import path from "node:path"
import { promises as fs } from "node:fs"
import { bundle } from "@remotion/bundler"
import { renderMedia, selectComposition } from "@remotion/renderer"
import type { UniversalSceneConfig } from "@/types/schema"
import { extractScenesFromJson } from "@/lib/scene-parser"

export const runtime = "nodejs"
export const maxDuration = 300

const COMPOSITION_ID = "universal-sequence"
let serveUrlPromise: Promise<string> | null = null

async function getServeUrl() {
  if (!serveUrlPromise) {
    serveUrlPromise = bundle(path.join(process.cwd(), "remotion", "index.ts"))
  }
  return serveUrlPromise
}

interface RenderRequestBody {
  json?: string
}

interface RenderResponseBody {
  jobId: string
  status: "completed"
  url: string
  frames: number
  sceneCount: number
}

export async function POST(request: NextRequest) {
  let scenes: UniversalSceneConfig[] = []
  try {
    const body = (await request.json()) as RenderRequestBody
    if (typeof body.json !== "string") {
      return NextResponse.json({ error: "Missing JSON payload" }, { status: 400 })
    }
    scenes = extractScenesFromJson(body.json)
    if (!scenes.length) {
      return NextResponse.json({ error: "No valid scenes found" }, { status: 400 })
    }

    const inputProps = { scenes }
    const serveUrl = await getServeUrl()

    const composition = await selectComposition({
      serveUrl,
      id: COMPOSITION_ID,
      inputProps,
    })

    const outputDir = path.join(process.cwd(), "public", "renders")
    await fs.mkdir(outputDir, { recursive: true })
    const jobId = `job-${Date.now()}`
    const outputLocation = path.join(outputDir, `${jobId}.mp4`)

    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation,
      inputProps,
      chromiumOptions: {
        headless: true,
      },
    })

    const response: RenderResponseBody = {
      jobId,
      status: "completed",
      url: `/renders/${jobId}.mp4`,
      frames: composition.durationInFrames,
      sceneCount: scenes.length,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Render job failed", error)
    return NextResponse.json(
      {
        error: "Render failed",
        details: error instanceof Error ? error.message : "Unknown error",
        sceneCount: scenes.length,
      },
      { status: 500 }
    )
  }
}
