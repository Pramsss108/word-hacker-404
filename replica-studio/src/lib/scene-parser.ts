import type {
  CameraPathPreset,
  EnvironmentPreset,
  OverlayType,
  UniversalSceneConfig,
} from "@/types/schema"

const VALID_ENVIRONMENTS: EnvironmentPreset[] = ["studio", "space", "outdoor"]
const VALID_CAMERAS: CameraPathPreset[] = ["orbit", "pan_horizontal", "zoom_in"]
const VALID_OVERLAYS: OverlayType[] = ["neon_line", "floating_text", "gauge"]

export function extractScenesFromJson(raw: string): UniversalSceneConfig[] {
  try {
    const parsed = JSON.parse(raw)
    const candidate = Array.isArray(parsed?.scenes)
      ? parsed.scenes
      : Array.isArray(parsed)
        ? parsed
        : []
    return normalizeScenes(candidate)
  } catch {
    return []
  }
}

export function normalizeScenes(payload: unknown): UniversalSceneConfig[] {
  if (!Array.isArray(payload)) {
    return []
  }
  return payload
    .map((scene, index) => sanitizeScene(scene, index))
    .filter(Boolean) as UniversalSceneConfig[]
}

function sanitizeScene(scene: unknown, index: number): UniversalSceneConfig | null {
  if (scene == null || typeof scene !== "object") {
    return null
  }
  const candidate = scene as Record<string, unknown>
  const id = typeof candidate.id === "string" && candidate.id.trim().length > 0
    ? candidate.id
    : `scene-${index + 1}`
  const duration = Number(candidate.durationInFrames)
  const modelQuery = typeof candidate.modelQuery === "string" && candidate.modelQuery.trim().length > 0
    ? candidate.modelQuery
    : "human_intestine"
  const environment = isEnvironment(candidate.environment) ? candidate.environment : "studio"
  const cameraPath = isCamera(candidate.cameraPath) ? candidate.cameraPath : "orbit"
  const overlays = normalizeOverlays(candidate.overlays)

  return {
    id,
    durationInFrames: Number.isFinite(duration) && duration > 0 ? Math.floor(duration) : 240,
    modelQuery,
    environment,
    cameraPath,
    overlays,
  }
}

function normalizeOverlays(value: unknown): UniversalSceneConfig["overlays"] {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .map((entry, index) => {
      if (entry == null || typeof entry !== "object") {
        return null
      }
      const raw = entry as Record<string, unknown>
      const type = isOverlay(raw.type) ? raw.type : "floating_text"
      const triggerFrame = Number(raw.triggerFrame)
      const data = typeof raw.data === "object" && raw.data != null ? (raw.data as Record<string, unknown>) : {}
      return {
        type,
        triggerFrame: Number.isFinite(triggerFrame) ? triggerFrame : Math.max(0, index * 30),
        data,
      }
    })
    .filter(Boolean) as UniversalSceneConfig["overlays"]
}

function isEnvironment(value: unknown): value is EnvironmentPreset {
  return typeof value === "string" && VALID_ENVIRONMENTS.includes(value as EnvironmentPreset)
}

function isCamera(value: unknown): value is CameraPathPreset {
  return typeof value === "string" && VALID_CAMERAS.includes(value as CameraPathPreset)
}

function isOverlay(value: unknown): value is OverlayType {
  return typeof value === "string" && VALID_OVERLAYS.includes(value as OverlayType)
}
