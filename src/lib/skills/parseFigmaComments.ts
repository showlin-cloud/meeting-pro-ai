/**
 * Skill: parseFigmaComments (Figma 數據解析與索引引擎)
 * 
 * 專門建立『索引機制』，讓 AI 在讀取逐字稿時，若提到數字（如：129 號、那個點），能自動關聯至該 Comment 內容。
 */

export interface FigmaComment {
  id: string;
  content: string;
  coordinates: { x: number; y: number };
  author: string;
  status: 'resolved' | 'open' | string;
}

// 實務上正式環境請置於 Supabase, Redis 或其他 Database 中，此以 In-memory Map 示範
const globalCommentStore = new Map<string, FigmaComment>();

export const parseFigmaComments = {
  /**
   * 儲存來自 Figma Plugin 的 Comment 數據陣列
   */
  batchStore(comments: FigmaComment[]) {
    comments.forEach(comment => {
      // 若已有相同 ID 則覆寫更新狀態與內容
      globalCommentStore.set(comment.id, comment);
    });
  },

  /**
   * 建立供 LLM 讀取的『索引參考文檔 Context』
   * 當此字串附加於 prompt 時，AI 即可自動對應逐字稿中的編號與 Figma Comment 內容
   */
  buildAIContextIndex(): string {
    if (globalCommentStore.size === 0) {
      return '';
    }

    let indexContext = '### Figma 介面評論快速索引字典 (Reference Context)\n';
    indexContext += '如果你在下方會議逐字稿中看到參與者提及數字或編號 (例如：「第 132 號留言」、「這個點」)，請直接參照並運用以下真實的 Figma 評論內容：\n\n';

    for (const [id, c] of globalCommentStore.entries()) {
      indexContext += `* 【Comment #${id}】\n  - 發表人: ${c.author} (${c.status})\n  - 座標位置: X:${c.coordinates.x}, Y:${c.coordinates.y}\n  - 內容: "${c.content}"\n\n`;
    }

    return indexContext.trim();
  }
};
