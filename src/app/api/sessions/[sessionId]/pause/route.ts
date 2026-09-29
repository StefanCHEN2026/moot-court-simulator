import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/court/session-manager';

/** POST /api/sessions/[sessionId]/pause — 暂停庭审 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = getSession(sessionId);

  if (!session) {
    return NextResponse.json({ error: '会话不存在' }, { status: 404 });
  }

  session.pause();
  return NextResponse.json({ status: 'paused' });
}
