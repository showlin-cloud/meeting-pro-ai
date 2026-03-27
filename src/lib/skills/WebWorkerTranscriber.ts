/**
 * Skill: WebWorkerTranscriber (本地 AI 轉錄引擎)
 * 
 * 驅動 Transformers.js (Whisper-tiny 模型)。
 * 已增加深度初始化日誌與心跳偵測。
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
      try {
        this.onLogCallback?.('正在初始化 Web Worker 實例...');
        this.worker = new Worker(
          new URL('../../workers/WebWorkerTranscriber.worker.ts', import.meta.url),
          { type: 'module' }
        );
        
        this.worker.onerror = (e) => {
          const msg = `Worker Script Error: ${e.message} at ${e.filename}:${e.lineno}`;
          console.error(msg, e);
          this.onErrorCallback?.(msg);
          this.onLogCallback?.(`[Critical] ${msg}`);
        };

        this.worker.onmessageerror = (e) => {
          this.onLogCallback?.('[Critical] Worker Message Error (序列化失敗)');
        };

        this.worker.onmessage = (event) => {
          const { type, data, index, error, message } = event.data;
          
          if (type === 'transcription_result' && this.onResultCallback) {
            this.onResultCallback(event.data);
          } else if (type === 'transcription_error') {
            console.error(`Slice #${index} error:`, error);
            if (this.onErrorCallback) this.onErrorCallback(error);
            this.onLogCallback?.(`[Error] ${error}`);
          } else if (type === 'log' && this.onLogCallback) {
            this.onLogCallback(message);
          } else if (type === 'pong') {
            this.onLogCallback?.('Worker 響應測試 (Pong): 正常通訊中');
          }
        };

        // 發送初始測試
        this.worker.postMessage({ type: 'ping' });

      } catch (err: any) {
        const msg = `Worker Creation Failed: ${err.message}`;
        this.onErrorCallback?.(msg);
        this.onLogCallback?.(`[Critical] ${msg}`);
      }
    }
  }

  processChunk(pcmData: Float32Array, index: number): void {
    if (!this.worker) this.initWorker();
    if (!this.worker) {
      this.onLogCallback?.('[Error] 無法啟動 Worker 實例。');
      return;
    }
    this.onLogCallback?.(`[Inference] 正在傳送第 ${index} 分段至背景線程...`);
    this.worker.postMessage({ type: 'inference', pcmData, index }, [pcmData.buffer]);
  }

  async clearCache(): Promise<void> {
    if (typeof window !== 'undefined' && 'caches' in window) {
      this.onLogCallback?.('執行深度緩存清理 (Cache API)...');
      await caches.delete('transformers-cache');
      this.terminate();
      this.initWorker();
    }
  }

  onResult(callback: (result: any) => void): void {
    this.onResultCallback = callback;
  }

  onLog(callback: (message: string) => void): void {
    this.onLogCallback = callback;
    // 如果已經在初始化，補發一條日誌
    if (this.worker) this.onLogCallback('Worker 實例已存在。');
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
