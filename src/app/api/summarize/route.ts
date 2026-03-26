import { Anthropic } from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

/**
 * API Route: /api/summarize
 * 
 * POST: 接收逐字稿並生成 80/20 摘要與 Mermaid 心智圖。
 * GET: 系統診斷 (Ping)，確認 API KEY 是否有效。
 */

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function GET() {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ status: 'error', message: 'Missing ANTHROPIC_API_KEY' }, { status: 500 });
    }
    
    // 發送一個極簡請求測試 Key
    await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'ping' }],
    });
    
    return NextResponse.json({ 
      status: 'ok', 
      model: 'Claude-3.5-Sonnet (Cloud)',
      connectivity: 'stable'
    });
  } catch (err: any) {
    console.error('API Key Verification Failed:', err);
    return NextResponse.json({ 
      status: 'error', 
      message: err.message || 'API key invalid or connectivity issue' 
    }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const { transcript } = await req.json();

    if (!transcript) {
      return NextResponse.json({ error: 'No transcript provided' }, { status: 400 });
    }

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 4000,
      system: `你是一位資深的會議分析官。請遵循以下 Rule:
1. 80% 通用結構：包含會議時間、核心決議、待辦清單 (Action Items)。
2. 20% 定義結構：根據會議內容（如 Wireframe、Kick-off）動態調整重點。
3. 末尾產出 Mermaid 語法的心智圖。
請使用繁體中文回答。`,
      messages: [
        {
          role: 'user',
          content: `請分析以下會議逐字稿並完成摘要：\n\n${transcript}`,
        },
      ],
    });

    // 解析 Claude 的回答
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected content type from Claude');
    }

    const text = content.text;
    
    // 簡單提取 Mermaid
    const mermaidMatch = text.match(/```mermaid([\s\S]*?)```/);
    const mindMapSyntax = mermaidMatch ? mermaidMatch[1].trim() : '';
    const structuredNotes = text.replace(/```mermaid[\s\S]*?```/, '').trim();

    return NextResponse.json({
      structuredNotes,
      mindMapSyntax,
    });
  } catch (error: any) {
    console.error('Claude API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
