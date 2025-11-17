/**
 * Worker Pool Manager
 * PHRASE 10: Manages worker threads for parallel RAW processing
 * 
 * Features:
 * - Pool of 2-4 workers based on CPU cores
 * - Task queue with priority
 * - Graceful fallback to single worker
 * - SharedArrayBuffer detection
 */

import type { WorkerTask, WorkerResponse } from './raw-worker'

type TaskCallback = (response: WorkerResponse) => void

interface QueuedTask {
  task: WorkerTask
  callback: TaskCallback
  priority: number
}

export class WorkerPool {
  private workers: Worker[] = []
  private queue: QueuedTask[] = []
  private activeWorkers = new Set<number>()
  private taskCallbacks = new Map<string, TaskCallback>()
  private workerCount: number
  private isSingleWorkerFallback = false

  constructor(workerCount?: number) {
    // Detect optimal worker count (leave 1 core for main thread)
    const cores = navigator.hardwareConcurrency || 4
    this.workerCount = workerCount || Math.min(Math.max(cores - 1, 2), 4)

    this.initializeWorkers()
  }

  private initializeWorkers(): void {
    try {
      // Check SharedArrayBuffer support (COOP/COEP headers required)
      const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined'
      
      if (!hasSharedArrayBuffer) {
        console.warn('[WorkerPool] SharedArrayBuffer not available (COOP/COEP headers missing)')
        console.warn('[WorkerPool] Falling back to single worker mode')
        this.isSingleWorkerFallback = true
        this.workerCount = 1
      }

      for (let i = 0; i < this.workerCount; i++) {
        const worker = new Worker(
          new URL('./raw-worker.ts', import.meta.url),
          { type: 'module' }
        )

        worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
          this.handleWorkerMessage(i, event.data)
        }

        worker.onerror = (error) => {
          console.error(`[WorkerPool] Worker ${i} error:`, error)
          this.activeWorkers.delete(i)
          this.processQueue()
        }

        this.workers.push(worker)
      }

      console.log(`[WorkerPool] Initialized ${this.workerCount} workers`)
      console.log(`[WorkerPool] SharedArrayBuffer: ${hasSharedArrayBuffer ? 'Available' : 'Unavailable'}`)
    } catch (err) {
      console.error('[WorkerPool] Failed to initialize workers:', err)
      this.isSingleWorkerFallback = true
      this.workerCount = 0
    }
  }

  /**
   * Submit task to worker pool
   * Returns promise that resolves when task completes
   */
  async submitTask(
    task: WorkerTask,
    priority = 0
  ): Promise<WorkerResponse> {
    return new Promise((resolve, reject) => {
      const callback: TaskCallback = (response) => {
        // Progress ping — keep task alive
        if (response.progress && !response.result && !response.error) {
          return
        }

        if (response.success || response.error) {
          this.taskCallbacks.delete(task.id)
          if (response.success) {
            resolve(response)
          } else {
            reject(new Error(response.error || 'Worker task failed'))
          }
        }
      }

      this.taskCallbacks.set(task.id, callback)
      
      const queuedTask: QueuedTask = { task, callback, priority }
      
      // Insert by priority (higher priority first)
      const insertIndex = this.queue.findIndex(t => t.priority < priority)
      if (insertIndex === -1) {
        this.queue.push(queuedTask)
      } else {
        this.queue.splice(insertIndex, 0, queuedTask)
      }

      this.processQueue()
    })
  }

  private processQueue(): void {
    if (this.queue.length === 0) return

    // Find available worker
    for (let i = 0; i < this.workers.length; i++) {
      if (!this.activeWorkers.has(i) && this.queue.length > 0) {
        const queuedTask = this.queue.shift()!
        this.activeWorkers.add(i)
        
        // Post task to worker with transferable buffers
        const transferList: Transferable[] = []
        if (queuedTask.task.payload.fileBuffer) {
          transferList.push(queuedTask.task.payload.fileBuffer)
        }
        if (queuedTask.task.payload.rawBuffer) {
          transferList.push(queuedTask.task.payload.rawBuffer.buffer)
        }

        if (transferList.length > 0) {
          this.workers[i].postMessage(queuedTask.task, transferList)
        } else {
          this.workers[i].postMessage(queuedTask.task)
        }
      }
    }
  }

  private handleWorkerMessage(workerId: number, response: WorkerResponse): void {
    const callback = this.taskCallbacks.get(response.id)
    
    if (callback) {
      callback(response)
      
      // Task complete - free worker
      if (response.success || response.error) {
        this.activeWorkers.delete(workerId)
        this.processQueue()
      }
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      totalWorkers: this.workerCount,
      activeWorkers: this.activeWorkers.size,
      queueLength: this.queue.length,
      isSingleWorkerFallback: this.isSingleWorkerFallback
    }
  }

  /**
   * Terminate all workers
   */
  terminate(): void {
    for (const worker of this.workers) {
      worker.terminate()
    }
    this.workers = []
    this.activeWorkers.clear()
    this.queue = []
    this.taskCallbacks.clear()
    console.log('[WorkerPool] All workers terminated')
  }
}

// Singleton instance
let workerPool: WorkerPool | null = null

export function getWorkerPool(): WorkerPool {
  if (!workerPool) {
    workerPool = new WorkerPool()
  }
  return workerPool
}

export function terminateWorkerPool(): void {
  if (workerPool) {
    workerPool.terminate()
    workerPool = null
  }
}
