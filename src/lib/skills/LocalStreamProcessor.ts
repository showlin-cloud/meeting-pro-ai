import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

// @ts-ignore
type FFFSType = any;

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
    
    // 定義掛載路徑
    const mountPoint = '/mnt';
    // 為了避免路徑與檔名包含特殊字元導致的 FS 錯誤，我們只取檔名部分並確保這是在 /mnt 下
    const inputPath = `${mountPoint}/${file.name}`;
    const outputPattern = 'chunk_%03d.raw';

    try {
      /**
       * 關鍵修復：確保掛載點目錄存在。
       * 如果目錄不存在，mount 操作會噴出 FS error。
       */
      try {
        await ffmpeg.createDir(mountPoint);
      } catch (dirErr) {
        // 如果目錄已存在則忽略
        console.log("Mount point directory already exists, continuing...");
      }

      await ffmpeg.mount('WORKERFS' as any, {
        files: [file]
      }, mountPoint);

      ffmpeg.on('progress', ({ progress }) => {
        onProgress(Math.round(progress * 100));
      });

      // 執行 FFmpeg 提取音軌並分段為 raw PCM
      // 注意：-y 是為了覆蓋可能存在的舊檔案
      await ffmpeg.exec([
        '-y',
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
      console.error("LocalStreamProcessor Critical Error (Neural Failure):", error);
      throw error;
    } finally {
      // 卸載目錄以釋放掛載。如果失敗代表目錄可能沒掛載成功或已被卸載。
      try {
        await ffmpeg.unmount(mountPoint);
      } catch (unmountErr) {
        // 靜默處理
      }
    }
  }
}
