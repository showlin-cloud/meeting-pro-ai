import { pipeline, env } from '@xenova/transformers';

// Configure environment for browser execution
env.allowLocalModels = false;

class PipelineSingleton {
  static task = 'automatic-speech-recognition' as const;
  static model = 'Xenova/whisper-tiny';
  static instance: any = null;

  static async getInstance(progress_callback: Function) {
    if (this.instance === null) {
      console.log("[WORKER] Initializing PipelineSingleton for model:", this.model);
      this.instance = await pipeline(this.task, this.model, { progress_callback });
      console.log("[WORKER] Model pipeline initialized successfully.");
    }
    return this.instance;
  }
}

self.addEventListener('message', async (event) => {
  const { type, payload } = event.data;

  if (type === 'load') {
    console.log("[WORKER] Load command received.");
    try {
      await PipelineSingleton.getInstance((progress: any) => {
        self.postMessage({ type: 'progress', data: progress });
      });
      console.log("[WORKER] Model is READY.");
      self.postMessage({ type: 'ready' });
    } catch (err: any) {
      console.error("[WORKER] Load error:", err);
      self.postMessage({ type: 'error', error: err.message });
    }
  }

  if (type === 'transcribe') {
    console.log("[WORKER] Transcribe command received.");
    try {
      const audioData = payload.audioData; // Expected: Float32Array
      console.log("[WORKER] Received audioData. Length:", audioData?.length);
      
      if (!audioData || audioData.length === 0) {
        throw new Error("Empty or invalid audioData received in worker.");
      }

      console.log("[WORKER] Fetching transcriber instance...");
      const transcriber = await PipelineSingleton.getInstance(() => {});
      
      console.log("[WORKER] Starting inference...");
      self.postMessage({ type: 'log', data: "Inference Engine Engaged (ゴゴゴ...)" });

      const result = await transcriber(audioData, {
        chunk_length_s: 30,
        stride_length_s: 5,
        language: 'chinese', // Priority for user language
        task: 'transcribe',
        return_timestamps: true,
        callback_function: (chunk_progress: any) => {
          // Track partial updates
          // console.log("[WORKER] Chunk update:", chunk_progress);
          self.postMessage({ type: 'chunk_update', data: chunk_progress });
        }
      });

      console.log("[WORKER] Inference COMPLETE.");
      self.postMessage({ type: 'complete', data: result });
    } catch (err: any) {
      console.error("[WORKER] Transcribe error:", err);
      // Detailed error for UI
      self.postMessage({ type: 'error', error: `[INFERENCE_FAILURE] ${err.message}` });
    }
  }
});
