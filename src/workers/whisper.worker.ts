import { pipeline, env } from '@xenova/transformers';

// Configure environment for browser execution
env.allowLocalModels = false;

class PipelineSingleton {
  static task = 'automatic-speech-recognition' as const;
  static model = 'Xenova/whisper-tiny';
  static instance: any = null;

  static async getInstance(progress_callback: Function) {
    if (this.instance === null) {
      this.instance = await pipeline(this.task, this.model, { progress_callback });
    }
    return this.instance;
  }
}

self.addEventListener('message', async (event) => {
  const { type, payload } = event.data;

  if (type === 'load') {
    try {
      await PipelineSingleton.getInstance((progress: any) => {
        self.postMessage({ type: 'progress', data: progress });
      });
      self.postMessage({ type: 'ready' });
    } catch (err: any) {
      self.postMessage({ type: 'error', error: err.message });
    }
  }

  if (type === 'transcribe') {
    try {
      const transcriber = await PipelineSingleton.getInstance(() => {});
      const audioData = payload.audioData; // Expected: Float32Array
      
      const result = await transcriber(audioData, {
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: true,
        callback_function: (chunk_progress: any) => {
          self.postMessage({ type: 'chunk_update', data: chunk_progress });
        }
      });

      self.postMessage({ type: 'complete', data: result });
    } catch (err: any) {
      self.postMessage({ type: 'error', error: err.message });
    }
  }
});
