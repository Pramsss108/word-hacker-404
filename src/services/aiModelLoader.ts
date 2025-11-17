import type { AIVocalShieldEngine } from './aiVocalEngine'

export type AIModelSize = 'tiny' | 'medium' | 'large'

type StatusCallback = (message: string) => void

const MODEL_REGISTRY: Record<AIModelSize, { url: string; label: string; approxMB: number }> = {
  tiny: {
    url: '/models/ai/tiny/model.json',
    label: 'Tiny — mobile safe',
    approxMB: 3
  },
  medium: {
    url: '/models/ai/medium/model.json',
    label: 'Medium — balanced',
    approxMB: 12
  },
  large: {
    url: '/models/ai/large/model.json',
    label: 'Large — studio',
    approxMB: 48
  }
}

let tfPromise: Promise<typeof import('@tensorflow/tfjs')> | null = null
const engineCache: Partial<Record<AIModelSize, Promise<AIVocalShieldEngine>>> = {}
const modelCache: Partial<Record<AIModelSize, Promise<import('@tensorflow/tfjs').GraphModel | null>>> = {}

async function loadTf(onStatus?: StatusCallback) {
  if (!tfPromise) {
    tfPromise = (async () => {
      onStatus?.('Loading TensorFlow.js runtime...')
      const tf = await import('@tensorflow/tfjs')
      try {
        await tf.setBackend('webgl')
      } catch {
        await tf.setBackend('cpu')
      }
      await tf.ready()
      return tf
    })()
  }
  return tfPromise
}

async function ensureModel(size: AIModelSize, onStatus?: StatusCallback) {
  if (!modelCache[size]) {
    modelCache[size] = (async () => {
      const tf = await loadTf(onStatus)
      const registry = MODEL_REGISTRY[size]
      try {
        onStatus?.(`Fetching ${registry.label} weights (~${registry.approxMB}MB)...`)
        return await tf.loadGraphModel(registry.url)
      } catch (err) {
        console.warn(`[AI Loader] Optional model ${size} failed to load`, err)
        return null
      }
    })()
  }
  return modelCache[size]!
}

export async function getAiEngine(size: AIModelSize, onStatus?: StatusCallback): Promise<AIVocalShieldEngine> {
  if (!engineCache[size]) {
    engineCache[size] = (async () => {
      await loadTf(onStatus)
      const module = await import('./aiVocalEngine')

      onStatus?.(`Spinning up AI engine (${size})...`)
      const engine = new module.AIVocalShieldEngine()
      await engine.initialize()
      await ensureModel(size, onStatus)
      return engine
    })()
  }
  return engineCache[size]!
}

export const getModelSummary = (size: AIModelSize) => MODEL_REGISTRY[size]
