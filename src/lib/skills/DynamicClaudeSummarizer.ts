/**
 * Skill: DynamicClaudeSummarizer (動態摘要分析器)
 * 
 * 定義：串接後端 API 呼叫 Claude 3 (Haiku/Sonnet)。
 * 核心指令：將逐字稿發送至 /api/summarize。必須支援雙重輸出：(1) 結構化會議紀錄 (2) 視覺化心智圖語法（Mermaid 或 Markdown 清單）。
 */

export interface SummaryOutput {
  structuredNotes: string;
  mindMapSyntax: string;
}

export class DynamicClaudeSummarizer {
  /**
   * 將逐字稿發送至 `/api/summarize`
   * @param transcript The full transcript text
   * @returns 雙重輸出：結構化會議紀錄與視覺化心智圖語法
   */
  async summarize(transcript: string): Promise<SummaryOutput> {
    const response = await fetch('/api/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transcript }),
    });

    if (!response.ok) {
      throw new Error(`Summary API failed with status: ${response.status}`);
    }

    const data: SummaryOutput = await response.json();
    return data;
  }
}
