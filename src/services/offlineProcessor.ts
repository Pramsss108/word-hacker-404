/**
 * M8: Offline Processing Worker
 * Dedicated worker for heavy audio processing tasks
 */

import { EffectSettings } from './audioService';
import { getEngineCore } from './engineCore';
import { qaSystem } from './qualityAssurance';

export interface OfflineProcessingTask {
  id: string;
  type: 'render' | 'export' | 'qa' | 'batch';
  audioBuffer: AudioBuffer;
  settings: EffectSettings;
  exportOptions?: any;
  priority: 'low' | 'normal' | 'high';
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface BatchProcessingOptions {
  tasks: Array<{
    id: string;
    audioBuffer: AudioBuffer;
    settings: EffectSettings;
    exportOptions?: any;
  }>;
  parallelLimit: number;
  qualityCheck: boolean;
}

/**
 * Offline Processing Manager
 */
export class OfflineProcessingManager {
  private static instance: OfflineProcessingManager;
  private tasks: Map<string, OfflineProcessingTask> = new Map();
  private activeProcesses: Set<string> = new Set();
  private maxConcurrentProcesses = navigator.hardwareConcurrency || 4;
  private progressCallbacks: Map<string, (progress: number, status: string) => void> = new Map();

  static getInstance(): OfflineProcessingManager {
    if (!OfflineProcessingManager.instance) {
      OfflineProcessingManager.instance = new OfflineProcessingManager();
    }
    return OfflineProcessingManager.instance;
  }

  /**
   * Queue offline rendering task
   */
  queueRenderTask(
    audioBuffer: AudioBuffer,
    settings: EffectSettings,
    priority: 'low' | 'normal' | 'high' = 'normal',
    onProgress?: (progress: number, status: string) => void
  ): string {
    const taskId = `render-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const task: OfflineProcessingTask = {
      id: taskId,
      type: 'render',
      audioBuffer,
      settings,
      priority,
      progress: 0,
      status: 'pending',
      createdAt: new Date()
    };

    this.tasks.set(taskId, task);
    
    if (onProgress) {
      this.progressCallbacks.set(taskId, onProgress);
    }

    this.processNextTask();
    return taskId;
  }

  /**
   * Queue export task
   */
  queueExportTask(
    audioBuffer: AudioBuffer,
    settings: EffectSettings,
    exportOptions: any,
    priority: 'low' | 'normal' | 'high' = 'normal',
    onProgress?: (progress: number, status: string) => void
  ): string {
    const taskId = `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const task: OfflineProcessingTask = {
      id: taskId,
      type: 'export',
      audioBuffer,
      settings,
      exportOptions,
      priority,
      progress: 0,
      status: 'pending',
      createdAt: new Date()
    };

    this.tasks.set(taskId, task);
    
    if (onProgress) {
      this.progressCallbacks.set(taskId, onProgress);
    }

    this.processNextTask();
    return taskId;
  }

  /**
   * Queue quality assurance task
   */
  queueQATask(
    audioBuffer: AudioBuffer,
    settings: EffectSettings,
    priority: 'low' | 'normal' | 'high' = 'normal',
    onProgress?: (progress: number, status: string) => void
  ): string {
    const taskId = `qa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const task: OfflineProcessingTask = {
      id: taskId,
      type: 'qa',
      audioBuffer,
      settings,
      priority,
      progress: 0,
      status: 'pending',
      createdAt: new Date()
    };

    this.tasks.set(taskId, task);
    
    if (onProgress) {
      this.progressCallbacks.set(taskId, onProgress);
    }

    this.processNextTask();
    return taskId;
  }

  /**
   * Queue batch processing task
   */
  queueBatchTask(
    options: BatchProcessingOptions,
    priority: 'low' | 'normal' | 'high' = 'low',
    onProgress?: (progress: number, status: string) => void
  ): string {
    const taskId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const task: OfflineProcessingTask = {
      id: taskId,
      type: 'batch',
      audioBuffer: options.tasks[0]?.audioBuffer, // Placeholder
      settings: options.tasks[0]?.settings, // Placeholder
      exportOptions: options,
      priority,
      progress: 0,
      status: 'pending',
      createdAt: new Date()
    };

    this.tasks.set(taskId, task);
    
    if (onProgress) {
      this.progressCallbacks.set(taskId, onProgress);
    }

    this.processNextTask();
    return taskId;
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId: string): OfflineProcessingTask | null {
    return this.tasks.get(taskId) || null;
  }

  /**
   * Cancel task
   */
  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    if (task.status === 'pending') {
      task.status = 'failed';
      task.error = 'Cancelled by user';
      task.completedAt = new Date();
      this.progressCallbacks.delete(taskId);
      return true;
    }

    return false;
  }

  /**
   * Get all pending tasks
   */
  getPendingTasks(): OfflineProcessingTask[] {
    return Array.from(this.tasks.values())
      .filter(task => task.status === 'pending')
      .sort((a, b) => {
        // Sort by priority, then by creation time
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(): {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    totalTasks: number;
  } {
    const tasks = Array.from(this.tasks.values());
    return {
      pending: tasks.filter(t => t.status === 'pending').length,
      processing: tasks.filter(t => t.status === 'processing').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      totalTasks: tasks.length
    };
  }

  /**
   * Clear completed tasks
   */
  clearCompletedTasks(): void {
    for (const [taskId, task] of this.tasks.entries()) {
      if (task.status === 'completed' || task.status === 'failed') {
        this.tasks.delete(taskId);
        this.progressCallbacks.delete(taskId);
      }
    }
  }

  /**
   * Process next task in queue
   */
  private processNextTask(): void {
    if (this.activeProcesses.size >= this.maxConcurrentProcesses) {
      return; // Already at capacity
    }

    const pendingTasks = this.getPendingTasks();
    if (pendingTasks.length === 0) {
      return; // No tasks to process
    }

    const nextTask = pendingTasks[0];
    this.activeProcesses.add(nextTask.id);
    nextTask.status = 'processing';
    nextTask.startedAt = new Date();

    this.executeTask(nextTask)
      .finally(() => {
        this.activeProcesses.delete(nextTask.id);
        nextTask.completedAt = new Date();
        
        // Process next task if queue is not empty
        setTimeout(() => this.processNextTask(), 10);
      });
  }

  /**
   * Execute a specific task
   */
  private async executeTask(task: OfflineProcessingTask): Promise<void> {
    const onProgress = this.progressCallbacks.get(task.id);
    
    try {
      switch (task.type) {
        case 'render':
          task.result = await this.executeRenderTask(task, onProgress);
          break;
        case 'export':
          task.result = await this.executeExportTask(task, onProgress);
          break;
        case 'qa':
          task.result = await this.executeQATask(task, onProgress);
          break;
        case 'batch':
          task.result = await this.executeBatchTask(task, onProgress);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      task.status = 'completed';
      task.progress = 1.0;
      
      if (onProgress) {
        onProgress(1.0, 'Completed');
      }

    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      
      if (onProgress) {
        onProgress(task.progress, `Failed: ${task.error}`);
      }
    }
  }

  /**
   * Execute render task
   */
  private async executeRenderTask(
    task: OfflineProcessingTask,
    onProgress?: (progress: number, status: string) => void
  ): Promise<AudioBuffer> {
    if (onProgress) onProgress(0.1, 'Initializing audio engine...');

    const engine = getEngineCore();
    await engine.ensureAudioContext();

    if (onProgress) onProgress(0.2, 'Starting offline rendering...');

    const processedBuffer = await engine.renderOffline(
      task.audioBuffer,
      task.settings,
      (progress) => {
        task.progress = 0.2 + progress * 0.8;
        if (onProgress) {
          onProgress(task.progress, `Rendering... ${Math.round(progress * 100)}%`);
        }
      }
    );

    if (onProgress) onProgress(0.95, 'Finalizing render...');

    return processedBuffer;
  }

  /**
   * Execute export task
   */
  private async executeExportTask(
    task: OfflineProcessingTask,
    onProgress?: (progress: number, status: string) => void
  ): Promise<Blob> {
    if (onProgress) onProgress(0.05, 'Starting export process...');

    // First render the audio
    const processedBuffer = await this.executeRenderTask(
      { ...task, type: 'render' },
      (progress, status) => {
        task.progress = progress * 0.7;
        if (onProgress) onProgress(task.progress, status);
      }
    );

    if (onProgress) onProgress(0.7, 'Encoding export format...');

    // Then export it
    const { exportService } = await import('./exportService');
    const blob = await exportService.exportAudio(
      processedBuffer,
      task.exportOptions,
      (progress) => {
        task.progress = 0.7 + progress * 0.3;
        if (onProgress) {
          onProgress(task.progress, `Exporting... ${Math.round(progress * 100)}%`);
        }
      }
    );

    return blob;
  }

  /**
   * Execute quality assurance task
   */
  private async executeQATask(
    task: OfflineProcessingTask,
    onProgress?: (progress: number, status: string) => void
  ): Promise<any> {
    if (onProgress) onProgress(0.05, 'Initializing quality assurance...');

    const report = await qaSystem.runMasterQualityInvigilator(
      task.audioBuffer,
      task.settings,
      (progress, testName) => {
        task.progress = progress;
        if (onProgress) onProgress(progress, testName);
      }
    );

    return report;
  }

  /**
   * Execute batch task
   */
  private async executeBatchTask(
    task: OfflineProcessingTask,
    onProgress?: (progress: number, status: string) => void
  ): Promise<any[]> {
    const options = task.exportOptions as BatchProcessingOptions;
    const results: any[] = [];
    const totalTasks = options.tasks.length;

    if (onProgress) onProgress(0, `Starting batch processing of ${totalTasks} tasks...`);

    for (let i = 0; i < totalTasks; i++) {
      const batchTask = options.tasks[i];
      
      try {
        if (onProgress) onProgress(i / totalTasks, `Processing task ${i + 1}/${totalTasks}...`);

        // Render the audio
        const engine = getEngineCore();
        await engine.ensureAudioContext();
        const processedBuffer = await engine.renderOffline(batchTask.audioBuffer, batchTask.settings);

        let result: any = processedBuffer;

        // Export if options provided
        if (batchTask.exportOptions) {
          const { exportService } = await import('./exportService');
          result = await exportService.exportAudio(processedBuffer, batchTask.exportOptions);
        }

        // Quality check if enabled
        if (options.qualityCheck) {
          const qaReport = await qaSystem.runMasterQualityInvigilator(
            batchTask.audioBuffer,
            batchTask.settings
          );
          result = { processed: result, qa: qaReport };
        }

        results.push({
          id: batchTask.id,
          status: 'completed',
          result
        });

      } catch (error) {
        results.push({
          id: batchTask.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      task.progress = (i + 1) / totalTasks;
    }

    if (onProgress) onProgress(1, `Batch processing completed: ${results.length} tasks`);

    return results;
  }
}

// Export singleton instance
export const offlineProcessor = OfflineProcessingManager.getInstance();