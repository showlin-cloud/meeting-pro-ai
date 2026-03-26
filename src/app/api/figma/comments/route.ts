import { NextResponse } from 'next/server';
import { parseFigmaComments, FigmaComment } from '@/lib/skills/parseFigmaComments';

/**
 * POST /api/figma/comments
 * 
 * 接收外部 JSON 的 API 端點，專門存儲來自 Figma Plugin 的 Comment 數據。
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const comments: FigmaComment[] = body.comments;

    // 基礎驗證
    if (!comments || !Array.isArray(comments)) {
      return NextResponse.json(
        { error: 'Invalid JSON payload. Expected { "comments": FigmaComment[] }' }, 
        { status: 400 }
      );
    }

    // 呼叫解析引擎將資料建檔至全局快取或 DB
    parseFigmaComments.batchStore(comments);

    return NextResponse.json({
      success: true,
      message: `Successfully indexed ${comments.length} new or updated Figma comments.`,
      indexedCount: comments.length
    });

  } catch (error) {
    console.error('Figma comments Webhook Error:', error);
    return NextResponse.json(
      { error: 'Server failed to parse Figma comments.' },
      { status: 500 }
    );
  }
}
