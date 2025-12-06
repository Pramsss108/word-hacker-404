const FALLBACK_MODEL = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb'

export const MODEL_ASSET_MAP: Record<string, string> = {
  human_intestine:
    'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/BrainStem/glTF-Binary/BrainStem.glb',
  cow_intestine:
    'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/Avocado/glTF-Binary/Avocado.glb',
  lion_intestine:
    'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/Fox/glTF-Binary/Fox.glb',
  human_heart:
    'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
  planet_earth:
    'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/Duck/glTF-Binary/Duck.glb',
  planet_mars:
    'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/BoomBox/glTF-Binary/BoomBox.glb',
  car_chassis:
    'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/Buggy/glTF-Binary/Buggy.glb',
  engine_block:
    'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/2CylinderEngine/glTF-Binary/2CylinderEngine.glb',
}

export function resolveModelAsset(query?: string): string | null {
  if (!query) {
    return null
  }
  return MODEL_ASSET_MAP[query] ?? FALLBACK_MODEL
}
