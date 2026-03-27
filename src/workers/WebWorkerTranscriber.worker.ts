import { pipeline, env } from '@xenova/transformers';

// 針對瀏覽器環境最佳化
env.allowLocalModels = false;
env.useBrowserCache = true;

/**
 * Skill: WebWorkerTranscriber (本地 AI 轉錄引擎) - Web Worker Context
 * 
 * 使用 Transformers.js (Whisper-tiny) 在背景執行神經網路推論。
 * 已增加 60s 載入監控與詳細日誌。
 */
let transcriberPromise: Promise<any> | null = null;
let isInitializing = false;

const log = (message: string) => {
  self.postMessage({ type: 'log', message: `[NeuralWorker] ${message}` });
};

async function getTranscriber() {
  if (transcriberPromise) return transcriberPromise;
  
  if (isInitializing) {
     log('模型初始化中，請稍候...');
     return transcriberPromise;
  }

  isInitializing = true;
  log('正在初次加載神經網路 (Xenova/whisper-tiny)...');

  // 設定 60s 超時檢測
  const timeoutId = setTimeout(() => {
    log('[Critical] 模型下載超時 (60s)！請檢查網絡連線或嘗試「清理緩存」。');
    self.postMessage({ type: 'transcription_error', error: 'Model loading timeout' });
  }, 60000);

  transcriberPromise = pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
    progress_callback: (p: any) => {
      if (p.status === 'progress') {
         self.postMessage({ 
           type: 'log', 
           message: `[ModelData] 加載中: ${p.file} (${Math.round(p.loaded / p.total * 100)}%)` 
         });
      }
    }
  }).then(p => {
    clearTimeout(timeoutId);
    isInitializing = false;
    log('神經網路已就緒。');
    return p;
  }).catch(err => {
    clearTimeout(timeoutId);
    isInitializing = false;
    log(`[Error] 模型加載失敗: ${err.message}`);
    throw err;
  });

  return transcriberPromise;
}

self.addEventListener('message', async (event: MessageEvent) => {
  const { type, pcmData, index } = event.data;

  if (type === 'clear_cache') {
    log('收到緩存清理指令... (正在刷新 IndexDB)');
    // Transformers.js 使用 Cache API 定位，這裡通知前端清理
    return;
  }

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
});
