import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/court/session-manager';
import { UserAction } from '@/types/court';

/** POST /api/messages — 用户发送消息 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, action } = body as {
      sessionId: string;
      action: UserAction;
    };

    if (!sessionId || !action) {
      return NextResponse.json(
        { error: '缺少必填字段：sessionId, action' },
        { status: 400 }
      );
    }

    if (!['speak', 'object', 'request_speak', 'submit_evidence'].includes(action.type)) {
      return NextResponse.json(
        { error: '不支持的 action.type' },
        { status: 400 }
      );
    }

    if (!action.content || action.content.trim() === '') {
      return NextResponse.json(
        { error: '消息内容不能为空' },
        { status: 400 }
      );
    }

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: '会话不存在' },
        { status: 404 }
      );
    }

    const result = await session.handleUserAction(action);

    return NextResponse.json({
      success: result.success,
      reason: result.reason,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.error('[API] 处理消息失败:', errMsg);
    return NextResponse.json(
      { error: '处理消息失败', reason: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
