import { pipeline, env } from '@xenova/transformers';

// 針對瀏覽器環境最佳化
env.allowLocalModels = false;
env.useBrowserCache = true;

/**
 * Skill: WebWorkerTranscriber (本地 AI 轉錄引擎) - Web Worker Context
 * 
 * 使用 Transformers.js (Whisper-tiny) 在背景執行神經網路推論。
 * 增加詳細日誌與進度回傳以利調試。
 */
let transcriberPromise: Promise<any> | null = null;

const log = (message: string) => {
  self.postMessage({ type: 'log', message: `[NeuralWorker] ${message}` });
};

async function getTranscriber() {
  if (!transcriberPromise) {
    log('正在初始化 Transformers.js Pipeline (Whisper-tiny)...');
    transcriberPromise = pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
      progress_callback: (progress: any) => {
        if (progress.status === 'progress') {
           self.postMessage({ 
             type: 'log', 
             message: `[ModelData] 下載中: ${progress.file} (${Math.round(progress.loaded / progress.total * 100)}%)` 
           });
        } else if (progress.status === 'done') {
           log(`模型組件下載完成: ${progress.file}`);
        }
      }
    });
  }
  return transcriberPromise;
}

self.addEventListener('message', async (event: MessageEvent) => {
  const { pcmData, index } = event.data;

  if (!pcmData) {
    log(`[Error] 收到空的音訊數據 (Slice #${index})`);
    return;
  }

  log(`[Inference] 啟動 Slice #${index} 轉錄，數據長度: ${pcmData.length} samples`);

  try {
    const transcriber = await getTranscriber();
    log(`[Inference] 模型加載完畢，開始推理 Slice #${index}...`);

    const startTime = Date.now();
    const result = await transcriber(pcmData, { 
      chunk_length_s: 30, 
      stride_length_s: 5, 
      return_timestamps: true,
      language: 'chinese',
      task: 'transcribe'
    });
    const duration = (Date.now() - startTime) / 1000;

    log(`[Inference] Slice #${index} 完成！耗時: ${duration.toFixed(2)}s`);

    // 實時產出帶有時間戳的文字數據回傳前端
    self.postMessage({
      type: 'transcription_result',
      index,
      data: {
        text: result.text,
        chunks: result.chunks
      }
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    log(`[CriticalError] Slice #${index} 發生錯誤: ${errorMsg}`);
    self.postMessage({
      type: 'transcription_error',
      index,
      error: errorMsg
    });
  }
});
