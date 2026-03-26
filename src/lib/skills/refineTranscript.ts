/**
 * Skill: refineTranscript (對話微調機制)
 * 
 * 允許 User 透過對話視窗輸入修改指令。
 * AI 根據指令對已生成的 Markdown 內容進行局部更新，而不是全部重新生成。
 */

export interface RefineInstruction {
  currentMarkdown: string;
  userCommand: string; // 例如：「請將 [某項目] 的優先級調高並加入備註。」
}

/**
 * 局部更新生成的 Markdown (Mock 函數架構，實際會向後端傳遞)
 * 
 * @param payload - 帶有當前 Markdown 全文與指令的使用者要求
 * @returns 更新過後的全新 Markdown 文本
 */
export async function refineTranscript(payload: RefineInstruction): Promise<string> {
  const systemPrompt = `
你是一位精準的文檔架構師，負責對原本已經整理好的會議紀錄 Markdown 文本進行「局部更新」。
任務守則：
1. 完全遵從用戶提出的微調指令 (例如擴充節點、修正負責人、調高優先級、產出 Mermaid)。
2. 【除了修改涉及的部分外，未提及之章節必須保持原狀保留】。
3. 你的輸出「只能」直接包含全新的 MD 文件字串，嚴禁在開頭附上任何問候語或客套話 (如：好的、這是為您修改的...)。
  `.trim();

  try {
    const response = await fetch('/api/summarize/refine', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        systemPrompt,
        currentMarkdown: payload.currentMarkdown,
        userCommand: payload.userCommand
      }),
    });

    if (!response.ok) {
      throw new Error(`Refine API request failed with status: ${response.status}`);
    }

    const data = await response.json();
    return data.refinedMarkdown || data.text; 
  } catch (error) {
    console.error('Failed to refine transcript:', error);
    throw error;
  }
}
