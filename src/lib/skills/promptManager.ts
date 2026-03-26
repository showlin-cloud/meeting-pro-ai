/**
 * Skill: promptManager (動態 Prompt 存儲結構)
 * 
 * 建立一個可擴展的模板庫 (Template Library)。
 * 允許未來新增如 'Legal Review' 或 'Marketing Brainstorming' 等 20% 的特定規則模組，
 * 且不影響現有的 80% 通用核心。
 */

export type MeetingCategory = 'Wireframe' | 'Technical' | 'Project' | 'Legal Review' | 'Marketing Brainstorming' | 'General';

export interface PromptTemplate {
  core80: string;
  dynamic20: Record<string, string>;
}

export const promptManager = {
  template: {
    core80: `
### 80% 通用架構 (必備項目)
- 會議基本資訊表
- 核心結果摘要與決議事項
- 確認事項彙整表 (包含負責方與狀態)
- 後續追蹤事項表 (包含負責人、截止日、優先級)
    `.trim(),
    
    dynamic20: {
      'Wireframe': `
### 20% 專業模組 (Figma/Wireframe 特化)
- 結構化討論表：每一項議題必須標註對應的『Figma Comment 編號』。
- 內容對比：呈現『原始設計假設』與『實際需求/共識結論』的對照。
- 技術追蹤：獨立標註『待確認事項』，特別是涉及技術可行性（如 SQL 比對、資安規範）的部分。
`.trim(),
      'Technical': `建立「技術細節與決策」章節，包含邏輯確認、保底方案、技術可行性評估。`,
      'Project': `建立「里程碑與時程壓力說明」章節。`,
      'Legal Review': `建立「法務與合規風險」章節，紀錄條款疑義與針對特定合約的修改建議。`,
      'Marketing Brainstorming': `建立「行銷靈感與客群定位」章節，包含核心賣點、目標受眾痛點與投放渠道策略。`,
    }
  } as PromptTemplate,

  /**
   * 根據使用者意圖組裝出最終的 Dynamic Template Prompt
   */
  buildPrompt(category: MeetingCategory | string, specificRequirements: string[], audience: string): string {
    const base = this.template.core80;
    const module20 = this.template.dynamic20[category] || '';
    const reqs = specificRequirements.length > 0 ? `\n### 額外模組需求:\n- ${specificRequirements.join('\n- ')}` : '';
    const targetAudience = audience ? `\n### 目標讀者定位:\n- 請針對【${audience}】的視角來優化語氣與技術深度。` : '';

    return `
${base}

${module20 ? module20 : '### 20% 特定專業內容\n- 偵測為自定義或一般類別，請依據會議脈絡自動萃取出最重要的兩項專業要點。'}
${reqs}
${targetAudience}

### 外部數據對齊與整合
- 若偵測到從 Figma Plugin 匯入的 JSON 數據參考，你必須主動將逐字稿內容與 Comment 編號進行精準匹配。

### 視覺化要求
- 在整份文件輸出的文末，必須以 Mermaid 語法輸出本次會議邏輯的心智圖 (Mind map)。
    `.trim();
  },

  /**
   * 擴充介面：允許未來無限期彈性新增 20% 的特定規則模組
   */
  addDynamicModule(categoryName: string, moduleInstruction: string) {
    this.template.dynamic20[categoryName] = moduleInstruction;
  }
};
