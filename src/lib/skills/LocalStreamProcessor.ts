import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

/**
 * Skill: LocalStreamProcessor (本地流處理器)
 * 
 * 使用 ffmpeg.wasm 實作音軌提取與分片。
 * 採用 WORKERFS 掛載技術，直接映射本地 File 物件，支援最高 20GB 且不占用記憶體。
 */
export class LocalStreamProcessor {
  private ffmpeg: FFmpeg | null = null;
  private isAborted: boolean = false;

  private async loadFFmpeg(): Promise<FFmpeg> {
    if (this.ffmpeg) return this.ffmpeg;

    const ffmpeg = new FFmpeg();
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
    
    // 定義掛載路徑與檔名
    const mountPoint = '/mnt';
    const inputPath = `${mountPoint}/${file.name}`;
    const outputPattern = 'chunk_%03d.raw';

    /**
     * 核心修復：使用 WORKERFS 掛載本地 File 物件
     * 這可以防止 .arrayBuffer() 導致的 NotReadableError 與 20GB 記憶體溢位。
     */
    try {
      await ffmpeg.mount('WORKERFS', {
        files: [file]
      }, mountPoint);

      ffmpeg.on('progress', ({ progress }) => {
        onProgress(Math.round(progress * 100));
      });

      // 執行 FFmpeg 提取音軌並分段為 raw PCM
      await ffmpeg.exec([
        '-i', inputPath,
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
        const f32 = new Float32Array((data as Uint8Array).buffer);
        onChunk(f32, i);
        // 清理暫存分片
        await ffmpeg.deleteFile(chunks[i].name);
      }

    } catch (error) {
      console.error("LocalStreamProcessor Critical Error:", error);
      throw error;
    } finally {
      // 卸載目錄以釋放資源
      try {
        await ffmpeg.unmount(mountPoint);
      } catch (unmountErr) {
        console.warn("Unmount failed (likely already unmounted):", unmountErr);
      }
    }
  }
}
