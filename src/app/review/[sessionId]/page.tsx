'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface ReportData {
  sessionId: string;
  caseName: string;
  caseType: string;
  caseDescription: string;
  userRole: string;
  opponentStyle: string;
  createdAt: number;
  status: string;
  stats: {
    totalMessages: number;
    judgeMessages: number;
    plaintiffMessages: number;
    defendantMessages: number;
    userMessages: number;
    phaseCount: number;
  };
  phaseGroups: {
    phase: string;
    count: number;
    messages: { role: string; content: string; phase: string; timestamp: number }[];
  }[];
  messages: { role: string; content: string; phase: string; timestamp: number }[];
}

const PHASE_LABELS: Record<string, string> = {
  PREPARATION: '开庭准备', INVESTIGATION: '法庭调查', EVIDENCE: '举证质证',
  CROSS_EXAMINATION: '法庭发问', DEBATE: '法庭辩论', FINAL_STATEMENT: '最后陈述',
  MEDIATION: '法庭调解', VERDICT: '当庭宣判', ADJOURNED: '休庭',
  OPENING_STATEMENTS: 'Opening Statements', REBUTTAL: 'Rebuttal',
  CLOSING_ARGUMENTS: 'Closing Arguments', ARBITRATOR_QUESTIONS: 'Tribunal Questions',
  AWARD: 'Award',
};

const ROLE: Record<string, string> = {
  judge: '审判长', plaintiff: '原告', defendant: '被告',
  arbitrator: 'Arbitrator', claimant: 'Claimant', respondent: 'Respondent',
};

function fmt(ts: number) {
  return new Date(ts).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function ReportPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/report`)
      .then(r => r.json())
      .then(d => {
        if (!d.error) setReport(d);
        else console.error(d.error);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sessionId]);

  const handleDownload = () => {
    if (!report) return;
    const phaseColors: Record<string, string> = {
      PREPARATION: '#6366f1', INVESTIGATION: '#0ea5e9', EVIDENCE: '#f59e0b',
      CROSS_EXAMINATION: '#8b5cf6', DEBATE: '#ef4444', FINAL_STATEMENT: '#10b981',
      MEDIATION: '#f97316', VERDICT: '#dc2626', ADJOURNED: '#6b7280',
    };
    const isArb = report.caseType === 'arbitration';

    const msgsHtml = report.messages.map(m => `
      <div style="margin-bottom:10px;padding:10px 14px;background:#f9fafb;border-radius:8px;border-left:3px solid ${phaseColors[m.phase] || '#d1d5db'};">
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:4px;">
          <span style="font-size:12px;font-weight:600;color:#374151">${ROLE[m.role] || m.role}</span>
          <span style="font-size:11px;color:#9ca3af">${PHASE_LABELS[m.phase] || m.phase}</span>
          <span style="font-size:11px;color:#9ca3af">${m.timestamp ? fmt(m.timestamp) : ''}</span>
        </div>
        <div style="font-size:13px;color:#374151;line-height:1.6;white-space:pre-wrap">${m.content}</div>
      </div>
    `).join('');

    const html = `<!DOCTYPE html>
<html lang="zh">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>庭审报告 - ${report.caseName}</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:800px;margin:0 auto;padding:40px 20px;color:#1f2937;}</style>
</head><body>
<div style="text-align:center;margin-bottom:32px;border-bottom:2px solid #e5e7eb;padding-bottom:24px;">
  <h1 style="font-size:24px;">⚖️ 庭审报告</h1>
  <p style="color:#6b7280;">${report.caseName}</p>
  <p style="color:#9ca3af;font-size:13px;">${new Date(report.createdAt).toLocaleString('zh-CN')}</p>
</div>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:32px;">
  <div style="text-align:center;padding:16px;background:#f3f4f6;border-radius:12px;"><div style="font-size:24px;font-weight:700;">${report.stats.totalMessages}</div><div style="font-size:12px;color:#6b7280;">总消息数</div></div>
  <div style="text-align:center;padding:16px;background:#eef2ff;border-radius:12px;"><div style="font-size:24px;font-weight:700;">${report.stats.judgeMessages}</div><div style="font-size:12px;color:#6366f1;">法官发言</div></div>
  <div style="text-align:center;padding:16px;background:#f0fdf4;border-radius:12px;"><div style="font-size:24px;font-weight:700;">${report.stats.userMessages}</div><div style="font-size:12px;color:#10b981;">你的发言</div></div>
  <div style="text-align:center;padding:16px;background:#f5f3ff;border-radius:12px;"><div style="font-size:24px;font-weight:700;">${report.stats.phaseCount}</div><div style="font-size:12px;color:#8b5cf6;">庭审阶段</div></div>
</div>
${msgsHtml}
<div style="margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#9ca3af;">
  <p>由 模拟法庭系统 自动生成 · 会话ID: ${report.sessionId.slice(0, 8)}...</p>
</div>
</body></html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `庭审报告_${report.caseName}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = window.location.href;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">正在加载庭审报告加载中...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <p className="text-destructive text-lg mb-2">报告未找到</p>
          <p className="text-muted-foreground text-sm mb-6">该庭审报告不存在或已过期</p>
          <Link href="/" className="text-primary hover:underline text-sm">返回首页</Link>
        </div>
      </div>
    );
  }

  const isArb = report.caseType === 'arbitration';

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border/40 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/>
              </svg>
            </Link>
            <span className="font-semibold text-sm truncate">{report.caseName}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors text-xs">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
              {copied ? '已复制' : '分享'}
            </button>
            <button onClick={handleDownload} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-medium">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              下载
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-5 py-8">
        {/* Header Stats */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/5 mb-3">
            <span className="text-3xl">⚖️</span>
          </div>
          <h1 className="text-2xl font-bold">庭审报告</h1>
          <p className="text-muted-foreground text-sm mt-1">{report.caseName}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {isArb ? '国际仲裁' : '民事'} · {new Date(report.createdAt).toLocaleString('zh-CN')}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="text-center p-4 bg-muted/50 rounded-xl">
            <div className="text-3xl font-bold">{report.stats.totalMessages}</div>
            <div className="text-xs text-muted-foreground mt-1">总消息数</div>
          </div>
          <div className="text-center p-4 bg-primary/5 rounded-xl">
            <div className="text-3xl font-bold text-primary">{report.stats.judgeMessages}</div>
            <div className="text-xs text-primary/70 mt-1">法官发言</div>
          </div>
          <div className="text-center p-4 bg-success/5 rounded-xl">
            <div className="text-3xl font-bold text-success">{report.stats.userMessages}</div>
            <div className="text-xs text-success/70 mt-1">你的发言</div>
          </div>
          <div className="text-center p-4 bg-chart-2/5 rounded-xl">
            <div className="text-3xl font-bold text-chart-2">{report.stats.phaseCount}</div>
            <div className="text-xs text-chart-2/70 mt-1">庭审阶段</div>
          </div>
        </div>

        {/* Case Info */}
        <div className="grid grid-cols-2 gap-4 mb-8 text-sm bg-muted/30 rounded-xl p-4">
          <div><span className="text-muted-foreground">案件类型：</span><span className="font-medium">{isArb ? '国际仲裁' : '民事'}</span></div>
          <div><span className="text-muted-foreground">对手风格：</span><span className="font-medium">{report.opponentStyle}</span></div>
          <div className="col-span-2"><span className="text-muted-foreground">案件描述：</span><span className="font-medium">{report.caseDescription}</span></div>
        </div>

        {/* Phase Breakdown */}
        <h2 className="font-semibold text-base mb-4">各阶段数据</h2>
        <div className="space-y-2 mb-10">
          {report.phaseGroups.map(pg => (
            <div key={pg.phase} className="flex items-center gap-3">
              <span className="text-xs font-medium w-28 shrink-0">{PHASE_LABELS[pg.phase] || pg.phase}</span>
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary/60 rounded-full transition-all"
                  style={{ width: `${Math.min((pg.count / Math.max(...report.phaseGroups.map(x => x.count))) * 100, 100)}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-8 text-right">{pg.count}</span>
            </div>
          ))}
        </div>

        {/* Messages */}
        <h2 className="font-semibold text-base mb-4">庭审记录</h2>
        <div className="space-y-3">
          {report.messages.map((msg, i) => {
            const phaseColors: Record<string, string> = {
              VERDICT: 'border-l-red-400', AWARD: 'border-l-amber-400',
              DEBATE: 'border-l-red-300', INVESTIGATION: 'border-l-sky-300',
              EVIDENCE: 'border-l-amber-300', FINAL_STATEMENT: 'border-l-emerald-300',
              MEDIATION: 'border-l-orange-300', PREPARATION: 'border-l-indigo-300',
            };
            return (
              <div key={i} className={`pl-4 border-l-2 ${phaseColors[msg.phase] || 'border-l-muted-foreground/20'} py-2`}>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-xs font-semibold ${
                    msg.role === 'judge' || msg.role === 'arbitrator' ? 'text-primary' :
                    msg.role === 'user' ? 'text-success' : 'text-muted-foreground'
                  }`}>
                    {ROLE[msg.role] || msg.role}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60 px-1.5 py-0.5 bg-muted/50 rounded">
                    {PHASE_LABELS[msg.phase] || msg.phase}
                  </span>
                  {msg.timestamp && (
                    <span className="text-[10px] text-muted-foreground/40">{fmt(msg.timestamp)}</span>
                  )}
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6 mt-10">
        <div className="max-w-4xl mx-auto px-5 text-center text-xs text-muted-foreground">
          <p>由 模拟法庭系统 自动生成</p>
          <p className="mt-1">
            <Link href="/" className="hover:text-foreground transition-colors">返回首页</Link>
            <span className="mx-2">·</span>
            <button onClick={handleDownload} className="hover:text-foreground transition-colors">下载报告</button>
          </p>
        </div>
      </footer>
    </div>
  );
}