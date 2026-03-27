import { Anthropic } from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

/**
 * API Route: /api/summarize
 * 
 * POST: 
 *   - mode="format": 將原始逐字稿轉換為專業 Markdown 表格 (含講者與時間戳)。
 *   - mode="summarize": 生成 80/20 摘要與心智圖。
 */

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(req: Request) {
  try {
    const { transcript, mode } = await req.json();

    if (!transcript) {
      return NextResponse.json({ error: 'No transcript provided' }, { status: 400 });
    }

    if (mode === 'format') {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 4000,
        system: `你是一位專業的會議記錄員。你的任務是將提供的原始逐字稿轉換為完整且格式正確的「專業會議記錄」。

【限制條件】
1. 格式：使用 Markdown 表格輸出，包含 | 時間戳 | 講者 | 對話內容 |。
2. 完整度：必須一字一句記錄，包含所有贅字(如：那個、然後、呃)，絕對不可以有任何遺漏或潤飾。
3. 辨識：請透過語意區分講者 A、B、C，並在切換講者或每隔約 30 秒標註時間。
4. 禁令：嚴禁添加主觀評論、嚴禁刪減內容、嚴禁修改對話、嚴禁簡化。
5. 語言：原始錄音說什麼語言就寫什麼語言（通常為繁體中文）。`,
        messages: [{ role: 'user', content: `請將以下原始逐字稿轉換為上述規範的 Markdown 表格：\n\n${transcript}` }],
      });

      const content = response.content[0];
      if (content.type !== 'text') throw new Error('Unexpected content type');
      return NextResponse.json({ formattedTranscript: content.text });
    }

    // Default: Summarize Mode
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 4000,
      system: `你是一位資深的會議分析官。請遵循以下 Rule:
1. 80% 通用結構：包含會議時間、核心決議、待辦清單 (Action Items)。
2. 20% 定義結構：根據會議內容動態調整重點。
3. 末尾產出 Mermaid 語法的心智圖。
請使用繁體中文回答。`,
      messages: [{ role: 'user', content: `請分析以下會議逐字稿並完成摘要：\n\n${transcript}` }],
    });

    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Unexpected content type');

    const text = content.text;
    const mermaidMatch = text.match(/```mermaid([\s\S]*?)```/);
    const mindMapSyntax = mermaidMatch ? mermaidMatch[1].trim() : '';
    const structuredNotes = text.replace(/```mermaid[\s\S]*?```/, '').trim();

    return NextResponse.json({ structuredNotes, mindMapSyntax });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  // Connectivity Check
  try {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('Missing Key');
    await anthropic.messages.create({ model: 'claude-3-5-sonnet-20240620', max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] });
    return NextResponse.json({ status: 'ok' });
  } catch (err: any) {
    return NextResponse.json({ status: 'error', message: err.message }, { status: 401 });
  }
}
