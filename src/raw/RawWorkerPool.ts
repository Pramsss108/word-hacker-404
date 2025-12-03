import * as Comlink from 'comlink'
import { RawSession } from './RawSession'
import type {
  RawWorkerApi,
  RawWorkerJobPayload,
  RawWorkerPoolOptions,
  RawWorkerResult,
  SharedArrayBufferWatchdogReport,
} from './types'

interface WorkerHandle {
  worker: Worker
  remote: Comlink.Remote<RawWorkerApi>
  busy: boolean
}

interface PendingJob {
  payload: RawWorkerJobPayload
  resolve: (value: RawWorkerResult) => void
  reject: (reason?: unknown) => void
}

const WORKER_ENTRY = new URL('./raw-worker.ts', import.meta.url)
const DEFAULT_MAX_WORKERS = 2

export class RawWorkerPool {
  readonly watchdog: SharedArrayBufferWatchdogReport
  private readonly handles: WorkerHandle[] = []
  private readonly queue: PendingJob[] = []
  private destroyed = false

  constructor(options: RawWorkerPoolOptions = {}) {
    this.watchdog = getSharedArrayBufferWatchdogReport()
    const workerBudget = this.watchdog.available ? determineWorkerBudget(options.maxWorkers) : 1

    if (!this.watchdog.available) {
      console.warn('[RawWorkerPool] SharedArrayBuffer unavailable, using single-worker fallback', this.watchdog.reason)
    }

    for (let i = 0; i < workerBudget; i += 1) {
      this.handles.push(this.spawnWorker(i))
    }
  }

  get size(): number {
    return this.handles.length
  }

  async submitSession(session: RawSession): Promise<RawWorkerResult> {
    const payload = await session.toWorkerPayload()
    return this.submitPayload(payload)
  }

  submitPayload(payload: RawWorkerJobPayload): Promise<RawWorkerResult> {
    if (this.destroyed) {
      return Promise.reject(new Error('RawWorkerPool has been destroyed'))
    }
    return new Promise((resolve, reject) => {
      this.queue.push({ payload, resolve, reject })
      this.pumpQueue()
    })
  }

  shutdown(): void {
    this.destroyed = true
    this.queue.splice(0, this.queue.length)
    this.handles.forEach((handle) => {
      handle.remote[Comlink.releaseProxy]()
      handle.worker.terminate()
    })
    this.handles.length = 0
  }

  private spawnWorker(index: number): WorkerHandle {
    const worker = new Worker(WORKER_ENTRY, { type: 'module', name: `raw-worker-${index}` })
    const remote = Comlink.wrap<RawWorkerApi>(worker)
    return { worker, remote, busy: false }
  }

  private pumpQueue(): void {
    if (this.queue.length === 0) {
      return
    }
    const handle = this.handles.find((candidate) => !candidate.busy)
    if (!handle) {
      return
    }
    const job = this.queue.shift()
    if (!job) {
      return
    }
    this.dispatch(handle, job)
  }

  private async dispatch(handle: WorkerHandle, job: PendingJob): Promise<void> {
    handle.busy = true
    try {
      const result = await handle.remote.process(job.payload)
      job.resolve(result)
    } catch (error) {
      job.reject(error)
    } finally {
      handle.busy = false
      this.pumpQueue()
    }
  }
}

function determineWorkerBudget(maxWorkers?: number): number {
  if (maxWorkers && maxWorkers > 0) {
    return maxWorkers
  }
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || DEFAULT_MAX_WORKERS : DEFAULT_MAX_WORKERS
  return Math.min(Math.max(1, Math.floor(cores / 2)), 4)
}

export function getSharedArrayBufferWatchdogReport(): SharedArrayBufferWatchdogReport {
  if (typeof SharedArrayBuffer === 'undefined') {
    return { available: false, reason: 'SharedArrayBuffer is undefined in this environment' }
  }
  if (typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated === false) {
    return { available: false, reason: 'crossOriginIsolated is false; COOP/COEP headers missing' }
  }
  return { available: true }
}
