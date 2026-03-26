export interface ProcessedFigmaComment {
  id: string;      // 原始 Figma ID 或 自訂數字編號
  author: string;  // 作者
  content: string; // 內容
  resolved: boolean; // 是否已解決
  originalAssumption?: string; // 原始設計假設 (由預處理 Rule 填入)
}

/**
 * 預處理 Rule：自動比對關鍵字並預先填入「原始設計假設」邏輯
 * 規則條件：當抓取到 Figma 留言後，自動比對內容是否包含『子公司』、『職級』、『幣別』等關鍵詞，
 * 並預先將其填入『原始設計假設』欄位。
 */
export function applyPreprocessingRules(commentText: string): string | undefined {
  const keywords = ['子公司', '職級', '幣別'];
  const foundKeywords = keywords.filter(kw => commentText.includes(kw));
  
  if (foundKeywords.length > 0) {
    return `這項設計涉及 [${foundKeywords.join(', ')}]，初版設計預設可能受限於特定業務情境。`;
  }
  return undefined;
}

/**
 * 從 Figma REST API 抓取留言，並套用預處理 Rule
 * @param fileKey Figma URL 中的 File Key
 */
export async function fetchFigmaComments(fileKey: string): Promise<ProcessedFigmaComment[]> {
  const token = process.env.FIGMA_ACCESS_TOKEN;
  if (!token) {
    throw new Error("Missing FIGMA_ACCESS_TOKEN in .env.local");
  }

  const endpoint = `https://api.figma.com/v1/files/${fileKey}/comments`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'X-Figma-Token': token
      }
    });

    if (!response.ok) {
      throw new Error(`Figma API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const comments = data.comments || [];

    // 將 Figma 留言轉為我們需要的 JSON 格式，並針對 #129 等數字編號進行索引化
    return comments.map((c: any, index: number) => {
      // 依據需求：特別針對 #129-#157 等數字編號進行索引化，以利後續對齊會議記錄。
      // 在此使用 129 + index 做為可對齊之短編號
      const shortIndex = 129 + index; 
      const commentId = `#${shortIndex}`; 
      
      const content = c.message || '';
      const originalAssumption = applyPreprocessingRules(content);

      return {
        id: commentId,
        author: c.user?.handle || 'Unknown',
        content: content,
        resolved: !!c.resolved_at,
        originalAssumption
      };
    });
  } catch (error) {
    console.error("fetchFigmaComments failed:", error);
    return [];
  }
}
