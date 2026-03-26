import { pipeline, env } from '@xenova/transformers';

// 針對瀏覽器環境最佳化
env.allowLocalModels = false;
env.useBrowserCache = true;

/**
 * Skill: WebWorkerTranscriber (本地 AI 轉錄引擎) - Web Worker Context
 * 
 * 使用 Transformers.js (Whisper-tiny) 在背景執行神經網路推論。
 */
let transcriberPromise: Promise<any> | null = null;

async function getTranscriber() {
  if (!transcriberPromise) {
    transcriberPromise = pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny');
  }
  return transcriberPromise;
}

self.addEventListener('message', async (event: MessageEvent) => {
  const { pcmData, index } = event.data;

  try {
    const transcriber = await getTranscriber();

    // 進行音軌片段轉錄 (利用 5 分鐘 raw PCM)
    // 傳入 Float32Array 供 Transformers.js 直接解析
    const result = await transcriber(pcmData, { 
      chunk_length_s: 30, 
      stride_length_s: 5, 
      return_timestamps: true,
      language: 'chinese',
      task: 'transcribe'
    });

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
    self.postMessage({
      type: 'transcription_error',
      index,
      error: error instanceof Error ? error.message : 'Unknown transcription error'
    });
  }
});
