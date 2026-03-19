/**
 * 上傳壓縮後的音訊檔至 Groq API 進行語音轉文字 (Whisper)
 * Groq 的 Whisper 限制：通常為 25MB (與 OpenAI 相同)。
 * 因此實作會將音檔切成小片段進行多併發或依序上傳。
 */

const CHUNK_SIZE = 24 * 1024 * 1024; // 24MB 切片大小

export async function uploadCompressedAudio(
  audioBlob: Blob,
  groqApiKey: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  if (!groqApiKey) {
    throw new Error("請提供 Groq API Key");
  }

  const totalSize = audioBlob.size;
  const chunks: Blob[] = [];

  // 將音檔依照大小切片
  for (let offset = 0; offset < totalSize; offset += CHUNK_SIZE) {
    chunks.push(audioBlob.slice(offset, offset + CHUNK_SIZE, 'audio/mp3'));
  }

  let fullTranscript = '';
  let completedChunks = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const formData = new FormData();
    // Groq whisper 支援的 model 名稱例如: whisper-large-v3
    formData.append('model', 'whisper-large-v3');
    // 給予切片一個 .mp3 的正確副檔名，幫助 API 辨識
    formData.append('file', chunk, `chunk_${i}.mp3`);
    formData.append('response_format', 'text');

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`上傳至 Groq 失敗 (Chunk ${i + 1}/${chunks.length}): ${errorText}`);
    }

    const text = await response.text();
    fullTranscript += text + '\n\n';

    completedChunks++;
    if (onProgress) {
      onProgress((completedChunks / chunks.length) * 100);
    }
  }

  return fullTranscript.trim();
}
