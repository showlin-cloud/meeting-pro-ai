import { pipeline, env } from '@xenova/transformers';

// 深度錯誤捕獲
self.onerror = (message, source, lineno, colno, error) => {
  self.postMessage({ type: 'log', message: `[Critical-Internal] Worker Uncaught Error: ${message} at ${source}:${lineno}` });
};

// 針對瀏覽器環境最佳化
env.allowLocalModels = false;
env.useBrowserCache = true;

/**
 * Skill: NeuralWorker (本地 AI 轉錄引擎) - Web Worker Context
 */
let transcriberPromise: Promise<any> | null = null;
let isInitializing = false;

const log = (message: string) => {
  self.postMessage({ type: 'log', message: `[NeuralWorker] ${message}` });
};

async function getTranscriber() {
  if (transcriberPromise) return transcriberPromise;
  
  if (isInitializing) {
     log('模型正在啟動，請稍候...');
     return transcriberPromise;
  }

  isInitializing = true;
  log('正在初次加載神經網路 (Xenova/whisper-tiny)...');

  const timeoutId = setTimeout(() => {
    log('[Critical] 模型下載超時 (60s)！請檢查網絡或清理緩存。');
    self.postMessage({ type: 'transcription_error', error: 'Model loading timeout' });
  }, 60000);

  try {
    transcriberPromise = pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
      progress_callback: (p: any) => {
        if (p.status === 'progress') {
           self.postMessage({ 
             type: 'log', 
             message: `[ModelData] 加載中: ${p.file} (${Math.round(p.loaded / p.total * 100)}%)` 
           });
        }
      }
    });

    const p = await transcriberPromise;
    clearTimeout(timeoutId);
    isInitializing = false;
    log('神經網路已就緒。');
    return p;

  } catch (err: any) {
    clearTimeout(timeoutId);
    isInitializing = false;
    log(`[Error] 模型加載失敗: ${err.message}`);
    transcriberPromise = null;
    throw err;
  }
}

self.addEventListener('message', async (event: MessageEvent) => {
  const { type, pcmData, index } = event.data;

  if (type === 'ping') {
    self.postMessage({ type: 'pong' });
    return;
  }

  if (type === 'clear_cache') {
    log('收到緩存清理指令...');
    return;
  }

  if (type === 'inference') {
    if (!pcmData) return;

    log(`[Inference] 收到第 ${index} 片段，準備推論...`);

    try {
      const transcriber = await getTranscriber();
      const startTime = Date.now();
      
      const result = await transcriber(pcmData, { 
        chunk_length_s: 30, 
        stride_length_s: 5, 
        return_timestamps: true,
        language: 'chinese',
        task: 'transcribe'
      });
      
      const duration = (Date.now() - startTime) / 1000;
      log(`[Inference] 第 ${index} 片段轉錄完成，耗時: ${duration.toFixed(2)}s`);

      self.postMessage({
        type: 'transcription_result',
        index,
        data: {
          text: result.text,
          chunks: result.chunks
        }
      });

    } catch (error: any) {
      log(`[CriticalError] ${error.message}`);
      self.postMessage({ type: 'transcription_error', index, error: error.message });
    }
  }
});

log('Worker 腳本已完成載入並啟動。');
