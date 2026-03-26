import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

/**
 * Skill: LocalStreamProcessor (本地流處理器)
 * 
 * 使用 ffmpeg.wasm 實作音軌提取與分片。
 * 輸出 raw pcm (f32le, 16kHz, mono) 供 Transformers.js 直接使用。
 */
export class LocalStreamProcessor {
  private ffmpeg: FFmpeg | null = null;
  private isAborted: boolean = false;

  private async loadFFmpeg(): Promise<FFmpeg> {
    if (this.ffmpeg) return this.ffmpeg;

    const ffmpeg = new FFmpeg();
    // 使用穩定版本
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    
    this.ffmpeg = ffmpeg;
    return ffmpeg;
  }

  abort(): void {
    console.log("LocalStreamProcessor processing aborted by user.");
    this.isAborted = true;
  }

  async processStream(
    file: File, 
    onChunk: (pcmData: Float32Array, index: number) => void,
    onProgress: (p: number) => void
  ): Promise<void> {
    this.isAborted = false;
    const ffmpeg = await this.loadFFmpeg();
    
    const inputFileName = 'input_media';
    const outputPattern = 'chunk_%03d.raw';

    // 寫入檔案
    const fileData = new Uint8Array(await file.arrayBuffer());
    await ffmpeg.writeFile(inputFileName, fileData);

    ffmpeg.on('progress', ({ progress }) => {
      onProgress(Math.round(progress * 100));
    });

    /**
     * 輸出格式：
     * -f segment: 分段
     * -segment_time 300: 5 分鐘
     * -ac 1: 單聲道
     * -ar 16000: 16kHz
     * -f f32le: raw float 32-bit little endian (Whisper 直接吃此格式)
     * -acodec pcm_f32le
     */
    await ffmpeg.exec([
      '-i', inputFileName,
      '-f', 'segment',
      '-segment_time', '300',
      '-ac', '1',
      '-ar', '16000',
      '-f', 'f32le',
      '-acodec', 'pcm_f32le',
      outputPattern
    ]);

    const files = await ffmpeg.listDir('.');
    const chunks = files
      .filter(f => f.name.startsWith('chunk_') && !f.isDir)
      .sort((a, b) => a.name.localeCompare(b.name));

    for (let i = 0; i < chunks.length; i++) {
      if (this.isAborted) break;
      const data = await ffmpeg.readFile(chunks[i].name);
      // 將 Uint8Array 轉為 Float32Array
      const f32 = new Float32Array((data as Uint8Array).buffer);
      onChunk(f32, i);
      await ffmpeg.deleteFile(chunks[i].name);
    }

    await ffmpeg.deleteFile(inputFileName);
  }
}
