'use server'

import { google } from 'googleapis';

export async function estimateCost(driveUrl: string, provider: 'groq' | 'openai') {
  try {
    // 1. Extract File ID from Drive URL
    const fileIdMatch = driveUrl.match(/(?:id=|d\/)([a-zA-Z0-9_-]{25,})/);
    const fileId = fileIdMatch ? fileIdMatch[1] : null;

    if (!fileId) {
      throw new Error("無效的 Google Drive 連結");
    }

    // 2. Init Google Drive API
    // (Requires authenticating with service account or API key in real world)
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    
    // NOTE: This usually needs process.env.GOOGLE_APPLICATION_CREDENTIALS or similar.
    const drive = google.drive({ version: 'v3', auth });

    // 3. Get Metadata
    // For audio/video, size is usually what we use if duration is missing,
    // but we can ask for videoMediaMetadata
    const res = await drive.files.get({
      fileId,
      fields: 'id, name, size, videoMediaMetadata',
    });

    const metadata = res.data;
    const sizeBytes = parseInt(metadata.size || '0', 10);
    
    // 4. Calculate Duration
    // If exact duration isn't available, we estimate based on file size (e.g. 1MB = ~1 min of audio roughly)
    // Or we rely on videoMediaMetadata.durationMillis
    let durationMillis = 0;
    if (metadata.videoMediaMetadata?.durationMillis) {
      durationMillis = parseInt(metadata.videoMediaMetadata.durationMillis, 10);
    } else {
      // rough estimation: assuming 1 MB/min for audio
      durationMillis = (sizeBytes / (1024 * 1024)) * 60 * 1000;
    }

    const durationHours = durationMillis / (1000 * 60 * 60);

    // 5. Calculate Cost
    // Prompt mentioned: 3hr = ~$0.33 USD roughly, so maybe Groq is $0.11/hr and OpenAI is slightly more?
    // Let's define rates per hour:
    const RATES = {
      groq: 0.11,     // $0.11 per hour (~$0.33 for 3hr)
      openai: 0.36,   // $0.36 per hour (~$1.08 for 3hr, standard whisper $0.006/min)
    };

    const costUsd = durationHours * RATES[provider];

    return {
      success: true,
      fileInfo: {
        name: metadata.name,
        durationHours: durationHours.toFixed(2),
        sizeMb: (sizeBytes / (1024 * 1024)).toFixed(2),
      },
      estimatedCostUsd: costUsd.toFixed(4)
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "估算成本時發生錯誤 (可能缺乏憑證或無權限存取)",
    };
  }
}
