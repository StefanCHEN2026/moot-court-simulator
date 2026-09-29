import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/court/session-manager';

/** GET /api/sessions/[sessionId] — 获取会话状态 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = getSession(sessionId);

  if (!session) {
    return NextResponse.json(
      { error: '会话不存在' },
      { status: 404 }
    );
  }

  return NextResponse.json(session.getState());
}

/** DELETE /api/sessions/[sessionId] — 删除会话 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const { removeSession } = await import('@/lib/court/session-manager');
  const session = getSession(sessionId);

  if (!session) {
    return NextResponse.json(
      { error: '会话不存在' },
      { status: 404 }
    );
  }

  removeSession(sessionId);
  return NextResponse.json({ message: '会话已删除' });
}
