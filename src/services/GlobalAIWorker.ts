import { useRef } from 'react';

// Singleton worker instance to persist across component unmounts
let globalWorker: Worker | null = null;
let globalWorkerStatus: 'idle' | 'loading' | 'ready' | 'error' = 'idle';
let globalWorkerProgress: any = null;

export const useGlobalAIWorker = () => {
  const workerRef = useRef<Worker | null>(null);

  const initWorker = () => {
    if (!globalWorker) {
      globalWorker = new Worker(new URL('../workers/llm.worker.ts', import.meta.url), {
        type: 'module'
      });
      globalWorkerStatus = 'loading';
      
      // Start loading immediately (Default to PRO 248M for stability)
      globalWorker.postMessage({ type: 'load', model: 'Xenova/LaMini-Flan-T5-248M' });
    }
    workerRef.current = globalWorker;
    return globalWorker;
  };

  return {
    initWorker,
    getWorker: () => globalWorker,
    getStatus: () => globalWorkerStatus,
    getProgress: () => globalWorkerProgress
  };
};
