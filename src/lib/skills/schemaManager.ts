/**
 * Skill: schemaManager (動態架構管理)
 * 
 * 實作動態 JSON 結構定義表，允許 User 直接透過自然語言對話
 * 切換不同的會議紀錄摘要格式（Schema Template）。
 */

// 定義 Schema 結構
export interface MeetingSchema {
  name: string;             // 範本名稱 (e.g. 'Wireframe', '採購功能討論')
  description: string;      // 讓 AI 理解該套用的情境
  structureRequirements: string[]; // 具體輸出的段落與欄位結構
}

// 建立 JSON 配置表：對應不同的會議目的與產出格式
export const schemas: Record<string, MeetingSchema> = {
  'Wireframe': {
    name: 'Wireframe',
    description: '針對介面設計或原型設計討論的專屬架構',
    structureRequirements: [
      '必須包含「Figma 討論表」結構',
      '標註對應的『Figma Comment 編號』',
      '原始設計假設 vs 實際需求/共識結論對比',
    ]
  },
  'Procurement': {
    name: '採購功能討論',
    description: '外部系統整合與採購評估會議',
    structureRequirements: [
      '核心功能需求清單',
      '必須包含「API 成本與權重配比」結構表',
      '廠商評估優缺點總結',
      '下一步議價或測試行動',
    ]
  },
  'General': {
    name: '通用預設',
    description: '一般日常決策或無特定範本時使用',
    structureRequirements: [
      '會議基本資訊、核心結果摘要',
      '確認事項彙整表 (包含負責方與狀態)',
      '後續追蹤事項表 (包含負責人、截止日、優先級)',
    ]
  }
};

export const schemaManager = {
  /**
   * 根據對話裡提到的範本關鍵字，自動回傳對應的結構規範字串。
   * 允許 User 講出 "請依照 [某範本名] 的格式來整理" 來啟用對應架構。
   */
  getSchemaInstruction(userCommand: string): string {
    let matchedSchema = schemas['General']; // 預設

    // 簡單的關鍵字比對 (實務上也可交由 LLM 判斷 Intent)
    if (userCommand.includes('Wireframe') || userCommand.includes('原型') || userCommand.includes('設計')) {
      matchedSchema = schemas['Wireframe'];
    } else if (userCommand.includes('採購') || userCommand.includes('Procurement')) {
      matchedSchema = schemas['Procurement'];
    } else {
      // 支援進一步彈性比對字典裡的 name
      for (const key of Object.keys(schemas)) {
        if (userCommand.toLowerCase().includes(schemas[key].name.toLowerCase())) {
          matchedSchema = schemas[key];
          break;
        }
      }
    }

    return `
請你嚴格按照名為【${matchedSchema.name}】的自定義模板格式進行輸出。
本模板的核心目的為：${matchedSchema.description}
以下為你必須在 Markdown 紀錄中建立的具體結構與章節：
- ${matchedSchema.structureRequirements.join('\n- ')}

(注意：在輸出結果中不要提及你正在使用哪一個模板，直接套用上述格式產出最終文檔即可)
    `.trim();
  },

  /**
   * 擴充機制：允許運行時或後台管理系統注入新的自訂範本
   */
  registerSchema(key: string, schema: MeetingSchema) {
    schemas[key] = schema;
  }
};
