/**
 * Skill: WebWorkerTranscriber (本地 AI 轉錄引擎)
 * 
 * 定義：驅動 Transformers.js (Whisper-tiny/base 模型)。
 * 核心指令：所有 AI 推論必須在 Web Worker 中執行。接收由 LocalStreamProcessor 傳來的 5 分鐘片段，
 * 實時產出帶有時間戳的 JSON 數據，並即時回傳前端進行渲染。
 */

export class WebWorkerTranscriber {
  private worker: Worker | null = null;
  private onResultCallback?: (result: any) => void;

  constructor() {
    // 實例化 Web Worker 來執行 Transformers.js
    if (typeof window !== 'undefined') {
      this.worker = new Worker(new URL('../../workers/WebWorkerTranscriber.worker.ts', import.meta.url));
      
      this.worker.onmessage = (event) => {
        if (event.data.type === 'transcription_result' && this.onResultCallback) {
          this.onResultCallback(event.data.data);
        } else if (event.data.type === 'transcription_error') {
          console.error('Transcription error:', event.data.error);
        }
      };
    }
  }

  /**
   * Process a 5-minute audio chunk received from LocalStreamProcessor
   * @param buffer 5-minute MP3 chunk
   * @param index Chunk index
   */
  processChunk(buffer: ArrayBuffer, index: number): void {
    if (!this.worker) {
      throw new Error('Web Worker not initialized.');
    }
    
    // 將 5 分鐘片段傳送給 Web Worker 進行神經網路推論
    this.worker.postMessage({ buffer, index });
  }

  /**
   * 註冊實時回傳的處理函數，前端可藉此進行渲染更新
   * @param callback 回呼函式，用來接收帶有時間戳的 JSON 數據
   */
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
