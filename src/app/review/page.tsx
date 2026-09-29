'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CourtMessage, CourtPhase, SessionState } from '@/types/court';

const PHASE_LABELS: Record<string, string> = {
  PREPARATION: '开庭准备',
  INVESTIGATION: '法庭调查',
  EVIDENCE: '举证质证',
  CROSS_EXAMINATION: '法庭发问',
  DEBATE: '法庭辩论',
  FINAL_STATEMENT: '最后陈述',
  MEDIATION: '法庭调解',
  VERDICT: '当庭宣判',
  ADJOURNED: '休庭',
};

const ROLE_COLORS: Record<string, string> = {
  judge: 'border-primary',
  plaintiff: 'border-success',
  defendant: 'border-blue-500',
};

export default function ReviewPage() {
  const [sessions, setSessions] = useState<SessionState[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionState | null>(null);
  const [filterPhase, setFilterPhase] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sessions')
      .then(res => res.json())
      .then(data => {
        setSessions(data.sessions || []);
        if (data.sessions?.length > 0) {
          setSelectedSession(data.sessions[0]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const messages = selectedSession?.messages ?? [];
  const filteredMessages = filterPhase === 'all'
    ? messages
    : messages.filter(m => m.phase === filterPhase);

  // Stats
  const totalMessages = messages.length;
  const objectionCount = messages.filter(m => m.type === 'objection').length;
  const phaseSet = new Set(messages.map(m => m.phase));
  const phaseCount = phaseSet.size;

  const plaintiffCount = messages.filter(m => m.role === 'plaintiff').length;
  const defendantCount = messages.filter(m => m.role === 'defendant').length;

  const availablePhases = Array.from(phaseSet);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-on-surface-variant">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 导航栏 */}
      <header className="bg-surface sticky top-0 z-40 border-b border-outline-variant/30">
        <div className="max-w-7xl mx-auto h-14 flex items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
              <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
              <path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
            </svg>
            <span className="font-bold text-lg tracking-tight">模拟法庭</span>
          </div>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/" className="text-on-surface-variant hover:text-on-surface transition-colors">庭前准备</Link>
            <Link href="/review" className="text-primary font-medium">庭审复盘</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-10">
        {/* 标题区 */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">庭审复盘</h1>
          <p className="text-on-surface-variant">
            {selectedSession ? selectedSession.caseName : '暂无庭审记录'}
          </p>
        </div>

        {!selectedSession ? (
          <div className="bg-surface rounded-xl p-12 shadow-card text-center">
            <p className="text-on-surface-variant">尚未完成任何庭审，请先进行一次庭审训练。</p>
            <Link href="/" className="inline-block mt-4 px-6 py-2.5 bg-primary text-on-primary rounded-lg text-sm font-medium hover:bg-primary/90 transition-all">
              开始庭审
            </Link>
          </div>
        ) : (
          <>
            {/* 统计卡片 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-surface rounded-xl p-5 shadow-card text-center">
                <div className="text-3xl font-bold text-primary">{totalMessages}</div>
                <div className="text-sm text-on-surface-variant mt-1">总发言次数</div>
              </div>
              <div className="bg-surface rounded-xl p-5 shadow-card text-center">
                <div className="text-3xl font-bold text-error">{objectionCount}</div>
                <div className="text-sm text-on-surface-variant mt-1">异议次数</div>
              </div>
              <div className="bg-surface rounded-xl p-5 shadow-card text-center">
                <div className="text-3xl font-bold text-on-surface">{phaseCount}</div>
                <div className="text-sm text-on-surface-variant mt-1">阶段数</div>
              </div>
            </div>

            {/* 阶段筛选 */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <button
                type="button"
                onClick={() => setFilterPhase('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${
                  filterPhase === 'all'
                    ? 'bg-primary/15 text-primary'
                    : 'bg-surface-container/50 text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                全部
              </button>
              {availablePhases.map(phase => (
                <button
                  key={phase}
                  type="button"
                  onClick={() => setFilterPhase(phase)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${
                    filterPhase === phase
                      ? 'bg-primary/15 text-primary'
                      : 'bg-surface-container/50 text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  {PHASE_LABELS[phase] || phase}
                </button>
              ))}
            </div>

            {/* 时间线消息列表 */}
            <div className="space-y-0">
              {filteredMessages.map((msg, i) => (
                <div key={msg.id} className="flex gap-3 relative">
                  {/* 时间线竖线 */}
                  {i < filteredMessages.length - 1 && (
                    <div className="absolute left-[15px] top-8 bottom-0 w-px bg-outline-variant/30" />
                  )}
                  {/* 角色头像 */}
                  <div className={`w-[30px] h-[30px] rounded-full border-2 ${ROLE_COLORS[msg.role] || 'border-outline'} bg-surface flex items-center justify-center shrink-0 z-10`}>
                    <span className="text-[10px] font-bold text-on-surface-variant">
                      {msg.role === 'judge' ? '法' : msg.role === 'plaintiff' ? '原' : '被'}
                    </span>
                  </div>
                  {/* 消息内容 */}
                  <div className="flex-1 pb-4 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold">
                        {msg.role === 'judge' ? '审判长' : msg.role === 'plaintiff' ? '原告' : '被告'}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant">
                        {PHASE_LABELS[msg.phase] || msg.phase}
                      </span>
                      <span className="text-[10px] text-on-surface-variant/50 ml-auto">
                        #{msg.sequenceNumber ?? i + 1}
                      </span>
                    </div>
                    <p className="text-sm text-on-surface leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* 各方分析 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface rounded-xl p-5 shadow-card space-y-3">
                <h3 className="font-semibold text-sm">原告方分析</h3>
                <div className="text-xs text-on-surface-variant space-y-1">
                  <div>发言次数：<span className="text-on-surface font-medium">{plaintiffCount}次</span></div>
                  <div>核心论点：基于庭审记录归纳</div>
                </div>
              </div>
              <div className="bg-surface rounded-xl p-5 shadow-card space-y-3">
                <h3 className="font-semibold text-sm">被告方分析</h3>
                <div className="text-xs text-on-surface-variant space-y-1">
                  <div>发言次数：<span className="text-on-surface font-medium">{defendantCount}次</span></div>
                  <div>核心论点：基于庭审记录归纳</div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
