import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/court/session-manager';
import { CourtMessage } from '@/types/court';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: '会话不存在或已过期' }, { status: 404 });
  }

  const state = session.getState();
  const messages = state.messages;

  // 统计数据
  const totalMessages = messages.length;
  const judgeMsgs = messages.filter((m) => m.role === 'judge' || m.role === 'arbitrator');
  const plaintiffMsgs = messages.filter((m) => m.role === 'plaintiff' || m.role === 'claimant');
  const defendantMsgs = messages.filter((m) => m.role === 'defendant' || m.role === 'respondent');
  const userMsgs = messages.filter((m) => m.role === state.userRole);

  // 按阶段分组
  const phaseGroups: Record<string, CourtMessage[]> = {};
  for (const msg of messages) {
    const phase = msg.phase || 'unknown';
    if (!phaseGroups[phase]) phaseGroups[phase] = [];
    phaseGroups[phase].push(msg);
  }

  const report = {
    sessionId,
    caseName: state.caseName,
    caseType: state.caseType,
    caseDescription: state.caseDescription,
    userRole: state.userRole,
    opponentStyle: state.opponentStyle,
    createdAt: state.createdAt,
    status: state.status,
    stats: {
      totalMessages,
      judgeMessages: judgeMsgs.length,
      plaintiffMessages: plaintiffMsgs.length,
      defendantMessages: defendantMsgs.length,
      userMessages: userMsgs.length,
      phaseCount: Object.keys(phaseGroups).length,
    },
    phaseGroups: Object.entries(phaseGroups).map(([phase, msgs]) => ({
      phase,
      count: msgs.length,
      messages: msgs.slice(-10),
    })),
    messages: messages.slice(-50),
  };

  return NextResponse.json(report);
}
