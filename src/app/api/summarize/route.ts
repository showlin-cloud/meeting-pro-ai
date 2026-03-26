import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  try {
    const { transcript, figmaContext } = await req.json();

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });

    const prompt = `
你是一位專業的會議分析師與設計顧問。請針對以下「逐字稿」內容，並結合「Figma 提供之原始設計假設」，產出 80/20 比例的精華摘要。

### 80% 通用結構：
1. 會議時間與主題。
2. 核心決議。
3. 待辦清單 (Action Items)。

### 20% 特定情境 (Figma 回饋對齊)：
- 針對逐字稿中提及之 Figma Comment (如 #129, #132)，比對其「原始設計假設」與「會議後共識」。

### 心智圖附加：
- 在摘要末尾，產出一份基於會議內容的心智圖文字（優先使用 Mermaid 語法）。

---
**Figma 原始設計假設與上下文：**
${figmaContext || '無特定上下文'}

---
**逐字稿內容：**
${transcript}
`.trim();

    const message = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseContent = message.content[0].type === 'text' ? message.content[0].text : '';

    // 簡單解析 Mermaid 語法
    const mermaidMatch = responseContent.match(/```mermaid([\s\S]*?)```/);
    const mermaidSyntax = mermaidMatch ? mermaidMatch[1].trim() : 'graph TD\n  A[會議開始] --> B[無意圖解析]';

    return NextResponse.json({
      structuredNotes: responseContent.replace(/```mermaid[\s\S]*?```/, '').trim(),
      mindMapSyntax: mermaidSyntax,
    });

  } catch (error) {
    console.error('Summarize API Error:', error);
    return NextResponse.json({ error: 'Failed to summarize transcript' }, { status: 500 });
  }
}
