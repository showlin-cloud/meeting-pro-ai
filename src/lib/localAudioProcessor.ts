import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

export async function loadFfmpeg(onProgress?: (ratio: number) => void): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg;
  
  ffmpeg = new FFmpeg();
  
  if (onProgress) {
    ffmpeg.on('progress', ({ progress }) => {
      onProgress(progress);
    });
  }

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });
  
  return ffmpeg;
}

export async function localAudioProcessor(
  videoFile: File,
  onProgress?: (ratio: number) => void
): Promise<Blob> {
  const ffmpegInstance = await loadFfmpeg(onProgress);

  const inputFileName = videoFile.name;
  const outputFileName = `output.mp3`;

  // 1. 為了支援 3GB 以上的大檔案，我們不把檔案讀進 MEMFS
  // 改用 WORKERFS 掛載原生 File 物件進行流式讀取。
  await ffmpegInstance.createDir('/worker');
  await ffmpegInstance.mount('WORKERFS' as any, {
    files: [videoFile]
  }, '/worker');

  const inputPath = `/worker/${inputFileName}`;

  // 2. 執行 FFmpeg 將音軌提取並縮減 (16kHz 64kbps MP3)
  await ffmpegInstance.exec([
    '-i', inputPath,
    '-vn',
    '-acodec', 'libmp3lame',
    '-ar', '16000',
    '-ac', '1',
    '-b:a', '64k',
    outputFileName
  ]);

  // 3. 從 MEMFS 讀取處理後的輸出檔 (壓縮後很小，安全放進記憶體)
  const data = await ffmpegInstance.readFile(outputFileName);
  const blob = new Blob([new Uint8Array(data as any)], { type: 'audio/mp3' });

  // 4. 清理掛載點與檔案
  await ffmpegInstance.unmount('/worker');
  try {
    ffmpegInstance.deleteDir('/worker');
  } catch(e) {}
  ffmpegInstance.deleteFile(outputFileName);

  return blob;
}
