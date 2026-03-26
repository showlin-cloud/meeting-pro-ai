/**
 * Skill: WebWorkerTranscriber (本地 AI 轉錄引擎)
 * 
 * 驅動 Transformers.js (Whisper-tiny/base 模型)。
 * 已增加日誌中繼功能。
 */
export class WebWorkerTranscriber {
  private worker: Worker | null = null;
  private onResultCallback?: (result: any) => void;
  private onLogCallback?: (message: string) => void;

  constructor() {
    if (typeof window !== 'undefined') {
      this.worker = new Worker(new URL('../../workers/WebWorkerTranscriber.worker.ts', import.meta.url));
      
      this.worker.onmessage = (event) => {
        const { type, data, index, error, message } = event.data;
        
        if (type === 'transcription_result' && this.onResultCallback) {
          this.onResultCallback(event.data);
        } else if (type === 'transcription_error') {
          console.error(`Slice #${index} error:`, error);
          if (this.onLogCallback) this.onLogCallback(`[Error] Slice #${index}: ${error}`);
        } else if (type === 'log' && this.onLogCallback) {
          this.onLogCallback(message);
        }
      };
    }
  }

  processChunk(pcmData: Float32Array, index: number): void {
    if (!this.worker) throw new Error('Web Worker not initialized.');
    // Transfer pcmData.buffer for zero-copy performance
    this.worker.postMessage({ pcmData, index }, [pcmData.buffer]);
  }

  onResult(callback: (result: any) => void): void {
    this.onResultCallback = callback;
  }

  onLog(callback: (message: string) => void): void {
    this.onLogCallback = callback;
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
