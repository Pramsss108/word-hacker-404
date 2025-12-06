
"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Player } from "@remotion/player"
import type { PlayerRef } from "@remotion/player"
import { UniversalComposition } from "@/remotion/UniversalComposition"

// --- TYPES ---
type RenderStatus = "pending" | "rendering" | "completed" | "failed"

interface RenderJob {
  id: string
  status: RenderStatus
  url?: string
  message?: string
}

// --- DEFAULT JSON (FROM USER) ---
const DEFAULT_JSON = {
  "projectSettings": {
    "width": 1080,
    "height": 1920,
    "fps": 60,
    "durationInFrames": 2160
  },
  "scenes": [
    {
      "id": "scene_01_human_length",
      "duration": 480,
      "model": "/models/human.glb",
      "repeatModel": 1,
      "camera": {
        "position": [
          0,
          1,
          4.5
        ],
        "target": [
          0,
          0.8,
          0
        ],
        "action": "orbit"
      },
      "overlay": {
        "type": "measure_line",
        "color": "#ff4444",
        "label": "3.5x Height",
        "value": "3.5x",
        "heightMultiplier": 3.5,
        "startFrame": 30
      }
    },
    {
      "id": "scene_02_cow_length",
      "duration": 600,
      "model": "/models/cow.glb",
      "repeatModel": 10,
      "camera": {
        "position": [
          5,
          1,
          0
        ],
        "target": [
          -3,
          0.5,
          0
        ],
        "action": "pan"
      },
      "overlay": {
        "type": "measure_line",
        "color": "#ff8888",
        "label": "20x Length",
        "value": "20x",
        "heightMultiplier": 20.0,
        "startFrame": 45
      }
    },
    {
      "id": "scene_03_lion_length",
      "duration": 480,
      "model": "/models/lion.glb",
      "repeatModel": 1,
      "camera": {
        "position": [
          3,
          1,
          2
        ],
        "target": [
          0,
          0.5,
          0
        ],
        "action": "zoom_in"
      },
      "overlay": {
        "type": "measure_line",
        "color": "#ff4444",
        "label": "2x Length",
        "value": "2x",
        "heightMultiplier": 2.0,
        "startFrame": 30
      }
    },
    {
      "id": "scene_04_human_ph",
      "duration": 200,
      "model": "/models/human.glb",
      "repeatModel": 1,
      "camera": {
        "position": [
          0,
          0.5,
          3
        ],
        "target": [
          0,
          0.5,
          0
        ],
        "action": "static"
      },
      "overlay": {
        "type": "gauge",
        "color": "#ff0000",
        "label": "Stomach pH",
        "value": "1.5",
        "startFrame": 10
      }
    },
    {
      "id": "scene_05_lion_ph",
      "duration": 200,
      "model": "/models/lion.glb",
      "repeatModel": 1,
      "camera": {
        "position": [
          2,
          0.5,
          2
        ],
        "target": [
          0,
          0.5,
          0
        ],
        "action": "static"
      },
      "overlay": {
        "type": "gauge",
        "color": "#cc0000",
        "label": "Carnivore pH",
        "value": "1.0",
        "startFrame": 10
      }
    },
    {
      "id": "scene_06_cow_ph",
      "duration": 200,
      "model": "/models/cow.glb",
      "repeatModel": 1,
      "camera": {
        "position": [
          2,
          1,
          3
        ],
        "target": [
          0,
          1,
          0
        ],
        "action": "static"
      },
      "overlay": {
        "type": "gauge",
        "color": "#00ff00",
        "label": "Herbivore pH",
        "value": "6.0",
        "startFrame": 10
      }
    }
  ]
}

export default function Home() {
  const playerRef = useRef<PlayerRef | null>(null)
  const [playerHandle, setPlayerHandle] = useState<PlayerRef | null>(null)
  
  // State for the JSON content
  const [jsonContent, setJsonContent] = useState(JSON.stringify(DEFAULT_JSON, null, 2))
  const [parsedConfig, setParsedConfig] = useState(DEFAULT_JSON)
  const [error, setError] = useState<string | null>(null)

  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isRendering, setIsRendering] = useState(false)
  const [renderProgress, setRenderProgress] = useState(0)
  
  // Parse JSON when it changes
  useEffect(() => {
    try {
      const parsed = JSON.parse(jsonContent)
      setParsedConfig(parsed)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [jsonContent])

  const { width, height, fps, durationInFrames } = parsedConfig.projectSettings

  const handleFrameUpdate = (event: { detail: { frame: number } }) => {
    setCurrentFrame(Math.floor(event.detail.frame))
  }

  useEffect(() => {
    if (!playerHandle) return
    playerHandle.addEventListener("frameupdate", handleFrameUpdate)
    return () => playerHandle.removeEventListener("frameupdate", handleFrameUpdate)
  }, [playerHandle])

  useEffect(() => {
    if (!playerHandle) return
    if (isPlaying) playerHandle.play()
    else playerHandle.pause()
  }, [isPlaying, playerHandle])

  const attachPlayerRef = (instance: PlayerRef | null) => {
    playerRef.current = instance
    setPlayerHandle(instance)
  }

  const handleExport = async () => {
    setIsRendering(true)
    setRenderProgress(0)

    try {
      const response = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          json: jsonContent
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Render failed')
      }

      const data = await response.json()
      
      // Download the video
      const link = document.createElement('a')
      link.href = data.url
      link.download = `replica-${data.jobId}.mp4`
      link.click()
      
      alert(`✅ Video exported successfully! (${data.frames} frames, ${data.sceneCount} scenes)`)
      setIsRendering(false)
    } catch (e) {
      alert('❌ Export failed: ' + (e as Error).message)
      setIsRendering(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white px-6 py-10 font-mono">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: PREVIEW */}
        <div className="space-y-6">
          <header>
            <h1 className="text-2xl font-bold text-[#0aff6a] mb-2">REPLICA ENGINE v1.0</h1>
            <p className="text-gray-400 text-sm">Previewing {width}x{height} @ {fps}fps ({width > height ? 'Landscape' : width < height ? 'Portrait' : 'Square'})</p>
          </header>

          <div className="border border-[#1f1f1f] rounded-2xl overflow-hidden bg-black shadow-[0_0_50px_rgba(10,255,106,0.1)]" 
               style={{ aspectRatio: `${width} / ${height}`, maxHeight: '70vh', margin: '0 auto' }}>
            <Player
              ref={attachPlayerRef}
              component={UniversalComposition}
              durationInFrames={durationInFrames}
              compositionWidth={width}
              compositionHeight={height}
              fps={fps}
              loop
              autoPlay
              controls={false}
              inputProps={{ sceneConfig: parsedConfig }}
              style={{ width: "100%", height: "100%" }}
            />
          </div>

          <div className="flex items-center gap-4 bg-[#111] p-4 rounded-xl border border-[#222]">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-6 py-2 bg-[#0aff6a] text-black font-bold rounded hover:bg-[#00cc55] transition"
            >
              {isPlaying ? "PAUSE" : "PLAY"}
            </button>
            
            <button
              onClick={handleExport}
              disabled={isRendering}
              className="px-6 py-2 bg-[#ff4444] text-white font-bold rounded hover:bg-[#cc3333] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRendering ? `RENDERING ${renderProgress}%` : "EXPORT MP4"}
            </button>
            
            <div className="flex-1">
              <input
                type="range"
                min={0}
                max={durationInFrames - 1}
                value={currentFrame}
                onChange={(e) => {
                  setIsPlaying(false)
                  playerHandle?.seekTo(Number(e.target.value))
                }}
                className="w-full accent-[#0aff6a]"
              />
            </div>
            <span className="text-xs text-[#0aff6a]">{currentFrame} / {durationInFrames}</span>
          </div>
        </div>

        {/* RIGHT COLUMN: EDITOR */}
        <div className="flex flex-col h-[80vh]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">SCRIPT EDITOR</h2>
            {error && <span className="text-red-500 text-xs bg-red-900/20 px-2 py-1 rounded">{error}</span>}
          </div>
          
          <textarea
            value={jsonContent}
            onChange={(e) => setJsonContent(e.target.value)}
            className="flex-1 w-full bg-[#0c0c0f] text-[#a9b7c6] p-4 rounded-xl border border-[#1c1c1f] focus:border-[#0aff6a] focus:outline-none font-mono text-sm leading-relaxed resize-none"
            spellCheck={false}
          />
          
          <div className="mt-4 p-4 bg-[#111] rounded-xl border border-[#222] text-xs text-gray-500">
            <p>INSTRUCTIONS:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Drop .glb files into <span className="text-[#0aff6a]">replica-studio/public/models/</span></li>
              <li>Reference them in JSON as <span className="text-[#0aff6a]">/models/filename.glb</span></li>
              <li>Edit JSON above to change camera, overlays, or duration.</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  )
}
