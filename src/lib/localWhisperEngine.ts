'use client';

export async function decodeAudioBlobToFloat32Array(blob: Blob): Promise<Float32Array> {
  // Web Audio API handles mp3/wav decoding natively
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioContext({ sampleRate: 16000 });
  
  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  
  // Transformers.js expects 16kHz mono audio as Float32Array
  return audioBuffer.getChannelData(0);
}

export type WhisperEvent = 
  | { type: 'model_progress'; progress: number; file: string; status: string }
  | { type: 'ready' }
  | { type: 'chunk_update'; output: any }
  | { type: 'complete'; result: any }
  | { type: 'error'; message: string };

export class LocalWhisperEngine {
  private worker: Worker | null = null;
  private onEvent?: (event: WhisperEvent) => void;

  constructor(onEvent?: (event: WhisperEvent) => void) {
    this.onEvent = onEvent;
  }

  public init() {
    if (!this.worker) {
      this.worker = new Worker(new URL('../workers/whisper.worker.ts', import.meta.url), {
        type: 'module'
      });

      this.worker.addEventListener('message', (e) => {
        const { type, data, error } = e.data;
        
        if (type === 'progress') {
          // Model downloading progress
          this.onEvent?.({ 
            type: 'model_progress', 
            progress: data.progress, 
            file: data.file, 
            status: data.status 
          });
        } else if (type === 'ready') {
          this.onEvent?.({ type: 'ready' });
        } else if (type === 'chunk_update') {
          this.onEvent?.({ type: 'chunk_update', output: data });
        } else if (type === 'complete') {
          this.onEvent?.({ type: 'complete', result: data });
        } else if (type === 'error') {
          this.onEvent?.({ type: 'error', message: error });
        }
      });
    }

    this.worker.postMessage({ type: 'load' });
  }

  public transcribe(audioData: Float32Array) {
    if (!this.worker) throw new Error("Worker not initialized. Call init() first.");
    this.worker.postMessage({ type: 'transcribe', payload: { audioData } });
  }

  public terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
