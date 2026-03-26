/**
 * Skill: WebWorkerTranscriber (本地 AI 轉錄引擎)
 * 
 * 驅動 Transformers.js (Whisper-tiny/base 模型)。
 */
export class WebWorkerTranscriber {
  private worker: Worker | null = null;
  private onResultCallback?: (result: any) => void;

  constructor() {
    if (typeof window !== 'undefined') {
      this.worker = new Worker(new URL('../../workers/WebWorkerTranscriber.worker.ts', import.meta.url));
      
      this.worker.onmessage = (event) => {
        if (event.data.type === 'transcription_result' && this.onResultCallback) {
          this.onResultCallback(event.data);
        } else if (event.data.type === 'transcription_error') {
          console.error('Transcription error:', event.data.error);
        }
      };
    }
  }

  /**
   * Process a 5-minute audio chunk (raw PCM Float32Array)
   */
  processChunk(pcmData: Float32Array, index: number): void {
    if (!this.worker) {
      throw new Error('Web Worker not initialized.');
    }
    
    // 將 5 分鐘片段傳送給 Web Worker (使用 Transferable 可提升性能)
    this.worker.postMessage({ pcmData, index }, [pcmData.buffer]);
  }

  onResult(callback: (result: any) => void): void {
    this.onResultCallback = callback;
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
