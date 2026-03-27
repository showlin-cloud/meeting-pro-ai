import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

/**
 * Skill: LocalStreamProcessor (本地流處理器)
 * 
 * 使用 ffmpeg.wasm 實作音軌提取與分片。
 * 已強化日誌系統，將內部狀態傳回前端觀測窗。
 */
export class LocalStreamProcessor {
  private ffmpeg: FFmpeg | null = null;
  private isAborted: boolean = false;
  private onLogCallback?: (msg: string) => void;

  onLog(callback: (msg: string) => void) {
    this.onLogCallback = callback;
  }

  private log(message: string) {
    console.log(`[FFmpeg-Core] ${message}`);
    this.onLogCallback?.(message);
  }

  private async loadFFmpeg(): Promise<FFmpeg> {
    if (this.ffmpeg) return this.ffmpeg;

    this.log('正在加載 FFmpeg 核心組件 (wasm)...');
    const ffmpeg = new FFmpeg();
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    
    try {
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      this.log('FFmpeg 核心加載成功。');
    } catch (err: any) {
      this.log(`[Critical] FFmpeg 載入失敗: ${err.message}`);
      throw err;
    }
    
    this.ffmpeg = ffmpeg;
    return ffmpeg;
  }

  abort(): void {
    this.log("收到中斷要求，停止處理。");
    this.isAborted = true;
  }

  async processStream(
    file: File, 
    onChunk: (pcmData: Float32Array, index: number) => void,
    onProgress: (p: number) => void
  ): Promise<void> {
    this.isAborted = false;
    this.log(`準備處理檔案: ${file.name} (大小: ${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    
    const ffmpeg = await this.loadFFmpeg();
    
    const mountPoint = '/mnt';
    const inputPath = `${mountPoint}/${file.name}`;
    const outputPattern = 'chunk_%03d.raw';

    try {
      this.log(`正在掛載 VFS (WORKERFS)...`);
      try {
        await ffmpeg.createDir(mountPoint);
      } catch (dirErr) {
        // 目錄可能已存在
      }

      await ffmpeg.mount('WORKERFS' as any, {
        files: [file]
      }, mountPoint);
      this.log(`檔案已映射至 ${inputPath}`);

      ffmpeg.on('progress', ({ progress }) => {
        onProgress(Math.round(progress * 100));
      });

      this.log(`開始提取音軌 (16kHz PCM)...`);
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
      this.log(`音軌提取/切片完成。正在讀取數據...`);

      const files = await ffmpeg.listDir('.');
      const chunks = files
        .filter(f => f.name.startsWith('chunk_') && !f.isDir)
        .sort((a, b) => a.name.localeCompare(b.name));

      this.log(`總共生成 ${chunks.length} 個片段。`);

      for (let i = 0; i < chunks.length; i++) {
        if (this.isAborted) break;
        this.log(`正在讀取第 ${i+1}/${chunks.length} 個片段...`);
        const data = await ffmpeg.readFile(chunks[i].name);
        const f32 = new Float32Array((data as Uint8Array).buffer);
        onChunk(f32, i);
        await ffmpeg.deleteFile(chunks[i].name);
      }
      this.log(`所有片段處理完畢。`);

    } catch (error: any) {
      this.log(`[ProcessorError] ${error.message}`);
      throw error;
    } finally {
      try {
        await ffmpeg.unmount(mountPoint);
        this.log(`資源釋放 (Unmount) 完成。`);
      } catch (unmountErr) {
        // 靜默處理
      }
    }
  }
}
