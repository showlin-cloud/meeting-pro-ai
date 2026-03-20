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
      const audioData = payload.audioData as Float32Array;
      console.log("[WORKER] Received audioData. Length:", audioData?.length);
      
      if (!audioData || audioData.length === 0) {
        throw new Error("Empty or invalid audioData received in worker.");
      }

      const transcriber = await PipelineSingleton.getInstance(() => {});
      self.postMessage({ type: 'log', data: "Inference Engine Engaged (ゴゴゴ...)" });

      // --- MANUAL CHUNKING LOGIC FOR STABILITY ---
      const SAMPLE_RATE = 16000;
      const CHUNK_SIZE_S = 300; // 5 minutes per chunk
      const OVERLAP_S = 10;     // 10 seconds overlap to avoid mid-word cuts
      const CHUNK_SIZE_SAMPLES = CHUNK_SIZE_S * SAMPLE_RATE;
      const OVERLAP_SAMPLES = OVERLAP_S * SAMPLE_RATE;

      const totalSamples = audioData.length;
      const chunks = [];
      
      // Calculate chunks
      for (let i = 0; i < totalSamples; i += (CHUNK_SIZE_SAMPLES - OVERLAP_SAMPLES)) {
        const start = i;
        const end = Math.min(i + CHUNK_SIZE_SAMPLES, totalSamples);
        chunks.push(audioData.slice(start, end));
        if (end === totalSamples) break;
      }

      console.log(`[WORKER] Sliced audio into ${chunks.length} segments for processing.`);
      self.postMessage({ type: 'log', data: `Detected long audio. Sliced into ${chunks.length} segments.` });

      const allResults = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunkOffsetS = i * (CHUNK_SIZE_S - OVERLAP_S);
        console.log(`[WORKER] Processing segment ${i + 1}/${chunks.length} (Offset: ${chunkOffsetS}s)`);
        self.postMessage({ type: 'log', data: `Processing Segment ${i + 1}/${chunks.length}...` });

        const segmentResult = await transcriber(chunks[i], {
          chunk_length_s: 30,
          stride_length_s: 5,
          language: 'chinese',
          task: 'transcribe',
          return_timestamps: true,
        });

        // Offset timestamps in this segment result
        if (segmentResult.chunks) {
          const offsetChunks = segmentResult.chunks.map((c: any) => ({
            ...c,
            timestamp: [
              c.timestamp[0] + chunkOffsetS,
              c.timestamp[1] !== null ? c.timestamp[1] + chunkOffsetS : null
            ]
          }));
          allResults.push(...offsetChunks);
          
          // Send incremental update to UI
          self.postMessage({ type: 'chunk_update', data: allResults });
        }
      }

      console.log("[WORKER] All segments complete.");
      self.postMessage({ type: 'complete', data: { chunks: allResults } });

    } catch (err: any) {
      console.error("[WORKER] Transcribe error:", err);
      self.postMessage({ type: 'error', error: `[INFERENCE_FAILURE] ${err.message}` });
    }
  }
});
