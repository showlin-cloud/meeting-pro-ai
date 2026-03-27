/**
 * Skill: WebWorkerTranscriber (本地 AI 轉錄引擎)
 * 
 * 驅動 Transformers.js (Whisper-tiny 模型)。
 * 已增加超時監控與緩存清理功能。
 */
export class WebWorkerTranscriber {
  private worker: Worker | null = null;
  private onResultCallback?: (result: any) => void;
  private onLogCallback?: (message: string) => void;
  private onErrorCallback?: (err: string) => void;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof window !== 'undefined') {
      this.worker = new Worker(new URL('../../workers/WebWorkerTranscriber.worker.ts', import.meta.url));
      
      this.worker.onmessage = (event) => {
        const { type, data, index, error, message } = event.data;
        
        if (type === 'transcription_result' && this.onResultCallback) {
          this.onResultCallback(event.data);
        } else if (type === 'transcription_error') {
          console.error(`Slice #${index} error:`, error);
          if (this.onErrorCallback) this.onErrorCallback(error);
          if (this.onLogCallback) this.onLogCallback(`[Error] ${error}`);
        } else if (type === 'log' && this.onLogCallback) {
          this.onLogCallback(message);
        }
      };
    }
  }

  processChunk(pcmData: Float32Array, index: number): void {
    if (!this.worker) this.initWorker();
    if (!this.worker) throw new Error('Web Worker not initialized.');
    this.worker.postMessage({ pcmData, index }, [pcmData.buffer]);
  }

  async clearCache(): Promise<void> {
    if (typeof window !== 'undefined' && 'caches' in window) {
      this.onLogCallback?.('正在執行深度緩存清理 (Cache API)...');
      await caches.delete('transformers-cache');
      this.onLogCallback?.('緩存已清除。正在重啟服務器...');
      this.terminate();
      this.initWorker();
    }
  }

  onResult(callback: (result: any) => void): void {
    this.onResultCallback = callback;
  }

  onLog(callback: (message: string) => void): void {
    this.onLogCallback = callback;
  }

  onError(callback: (err: string) => void): void {
    this.onErrorCallback = callback;
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
