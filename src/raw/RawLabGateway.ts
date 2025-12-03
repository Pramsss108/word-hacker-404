import { RawSession } from './RawSession'
import { RawWorkerPool } from './RawWorkerPool'
import type { RawSessionOptions, RawWorkerPoolOptions, RawWorkerResult } from './types'

let singletonPool: RawWorkerPool | null = null

export function ensureRawWorkerPool(options?: RawWorkerPoolOptions): RawWorkerPool {
  if (!singletonPool) {
    singletonPool = new RawWorkerPool(options)
  }
  return singletonPool
}

export async function ingestRawBlob(blob: Blob, options?: RawSessionOptions): Promise<RawWorkerResult> {
  const session = await RawSession.create(blob, options)
  const pool = ensureRawWorkerPool()
  return pool.submitSession(session)
}

export function shutdownRawWorkerPool(): void {
  if (singletonPool) {
    singletonPool.shutdown()
    singletonPool = null
  }
}
