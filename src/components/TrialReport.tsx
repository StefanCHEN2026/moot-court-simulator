'use client';

import { useState, useEffect, useCallback } from 'react';
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
  PREPARATION: '开庭准备',
  INVESTIGATION: '法庭调查',
  EVIDENCE: '举证质证',
  CROSS_EXAMINATION: '法庭发问',
  DEBATE: '法庭辩论',
  FINAL_STATEMENT: '最后陈述',
  MEDIATION: '法庭调解',
  VERDICT: '当庭宣判',
  ADJOURNED: '休庭',
  OPENING_STATEMENTS: 'Opening Statements',
  REBUTTAL: 'Rebuttal',
  CLOSING_ARGUMENTS: 'Closing Arguments',
  ARBITRATOR_QUESTIONS: 'Tribunal Questions',
  AWARD: 'Award',
};

const ROLE_LABELS: Record<string, string> = {
  judge: '审判长',
  plaintiff: '原告',
  defendant: '被告',
  arbitrator: 'Arbitrator',
  claimant: 'Claimant',
  respondent: 'Respondent',
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleString('zh-CN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

interface TrialReportProps {
  sessionId: string;
  onClose: () => void;
}

export default function TrialReport({ sessionId, onClose }: TrialReportProps) {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/report`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          console.error('Report error:', data.error);
        } else {
          setReport(data);
        }
      })
      .catch(err => console.error('Failed to load report:', err))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const getPhaseLabel = useCallback((phase: string) => {
    return PHASE_LABELS[phase] || phase;
  }, []);

  const getRoleLabel = useCallback((role: string) => {
    return ROLE_LABELS[role] || role;
  }, []);

  // Generate HTML for download
  const generateReportHTML = useCallback(() => {
    if (!report) return '';
    const phaseColors: Record<string, string> = {
      PREPARATION: '#6366f1', INVESTIGATION: '#0ea5e9', EVIDENCE: '#f59e0b',
      CROSS_EXAMINATION: '#8b5cf6', DEBATE: '#ef4444', FINAL_STATEMENT: '#10b981',
      MEDIATION: '#f97316', VERDICT: '#dc2626', ADJOURNED: '#6b7280',
    };
    const isArb = report.caseType === 'arbitration';
    const caseTypeLabel = isArb ? 'Arbitration' : 'Civil';

    const roleRows = report.phaseGroups.map(pg => `
              <tr>
                <td style="padding:8px 12px;border:1px solid #e5e7eb;font-size:13px">${getPhaseLabel(pg.phase)}</td>
                <td style="padding:8px 12px;border:1px solid #e5e7eb;font-size:13px">${pg.count}</td>
              </tr>
            `).join('');

    const messagesHTML = report.messages.map(msg => {
      const roleColor = msg.role === 'judge' || msg.role === 'judge' || msg.role === 'arbitrator' ? '#6366f1'
        : msg.role === 'user' ? '#10b981' : '#6b7280';
      return `
              <div style="margin-bottom:10px;padding:10px 14px;background:#f9fafb;border-radius:8px;border-left:3px solid ${phaseColors[msg.phase] || '#d1d5db'};">
                <div style="display:flex;gap:8px;align-items:center;margin-bottom:4px;">
                  <span style="font-size:12px;font-weight:600;color:${roleColor}">${getRoleLabel(msg.role)}</span>
                  <span style="font-size:11px;color:#9ca3af">${getPhaseLabel(msg.phase)}</span>
                  <span style="font-size:11px;color:#9ca3af">${msg.timestamp ? formatTime(msg.timestamp) : ''}</span>
                </div>
                <div style="font-size:13px;color:#374151;line-height:1.6;white-space:pre-wrap">${msg.content}</div>
              </div>
            `;
    }).join('');

    return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>庭审报告 - ${report.caseName}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #1f2937; }
  h1,h2,h3 { margin: 0; } }
</style>
</head>
<body>
  <div style="text-align:center;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #e5e7eb;">
    <div style="font-size:40px;margin-bottom:8px;">⚖️</div>
    <h1 style="font-size:22px;font-weight:700;">庭审报告</h1>
    <p style="color:#6b7280;font-size:14px;">${report.caseName}</p>
    <p style="color:#9ca3af;font-size:12px;">类型: ${caseTypeLabel} | 时间: ${new Date(report.createdAt).toLocaleString('zh-CN')}</p>
  </div>

  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:32px;">
    <div style="text-align:center;padding:16px;background:#f3f4f6;border-radius:12px;">
      <div style="font-size:24px;font-weight:700;">${report.stats.totalMessages}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px;">总消息数</div>
    </div>
    <div style="text-align:center;padding:16px;background:#eef2ff;border-radius:12px;">
      <div style="font-size:24px;font-weight:700;">${report.stats.judgeMessages}</div>
      <div style="font-size:12px;color:#6366f1;margin-top:4px;">法官发言</div>
    </div>
    <div style="text-align:center;padding:16px;16px;background:#f0fdf4;border-radius:12px;">
      <div style="font-size:24px;font-weight:700;">${report.stats.userMessages}</div>
      <div style="font-size:12px;color:#10b981;margin-top:4px;">你的发言</div>
    </div>
    <div style="text-align:center;padding:16px;background:#f5f3ff;border-radius:12px;">
      <div style="font-size:24px;font-weight:700;">${report.stats.phaseCount}</div>
      <div style="font-size:12px;color:#8b5cf6;margin-top:4px;">庭审阶段</div>
    </div>
  </div>

  <h2 style="font-size:16px;font-weight:600;margin-bottom:12px;">各阶段发言统计</h2>
  <table style="width:100%;border-collapse:collapse;margin-bottom:32px;">
    <thead>
      <tr style="background:#f9fafb;">
        <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;border:1px solid #e5e7eb;">阶段</th>
        <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;border:1px solid #e5e7eb;">消息数</th>
      </tr>
    </thead>
    <tbody>
      ${roleRows}
    </tbody>
  </table>

  <h2 style="font-size:16px;font-weight:600;margin-bottom:12px;">庭审记录</h2>
  ${messagesHTML}

  <div style="margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#9ca3af;">
    <p>由 模拟法庭系统 自动生成</p>
    <p>会话ID: ${report.sessionId}</p>
  </div>
</body>
</html>`;
  }, [report, getPhaseLabel, getRoleLabel]);

  const handleDownload = useCallback(() => {
    const html = generateReportHTML();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `庭审报告_${report?.caseName || 'trial'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [generateReportHTML, report]);

  const handleShare = useCallback(async () => {
    const shareUrl = `${window.location.origin}/review/${sessionId}`;
    try {
        await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [sessionId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-card rounded-2xl p-8 shadow-xl max-w-lg w-full mx-4 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">正在生成庭审报告...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-card rounded-2xl p-8 shadow-xl max-w-lg w-full mx-4 text-center">
          <p className="text-destructive text-sm mb-4">无法生成报告</p>
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-primary text-white text-sm">关闭</button>
        </div>
      </div>
    );
  }

  const isArbitration = report.caseType === 'arbitration';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="min-h-full flex items-start justify-center p-4-center pt-12 pb-20" onClick={(e) => e.stopPropagation()}>
        <div className="bg-card rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-border/40">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{isArbitration ? '\u2696\ufe0f' : '\u2696\ufe0f'}</span>
                <div>
                  <h2 className="text-xl font-bold text-foreground">庭审报告</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">{report.caseName}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-3 bg-muted/50 rounded-xl">
                <div className="text-2xl font-bold text-foreground">{report.stats.totalMessages}</div>
                <div className="text-xs text-muted-foreground mt-0.5">总消息数</div>
              </div>
              <div className="text-center p-3 bg-primary/5 rounded-xl">
                <div className="text-2xl font-bold text-primary">{report.stats.judgeMessages}</div>
                <div className="text-xs text-primary/70 mt-0.5">{isArbitration ? '仲裁员' : '法官'}发言</div>
              </div>
              <div className="text-center p-3 bg-success/5 rounded-xl">
                <div className="text-2xl font-bold text-success">{report.stats.userMessages}</div>
                <div className="text-xs text-success/70 mt-0.5">你的发言</div>
              </div>
              <div className="text-center p-3 bg-chart-2/5 rounded-xl">
                <div className="text-2xl font-bold text-chart-2">{report.stats.phaseCount}</div>
                <div className="text-xs text-chart-2/70 mt-0.5">庭审阶段</div>
              </div>
            </div>

            {/* Case Info */}
            <div className="grid grid-cols-2 gap-4 text-sm mt-4">
              <div>
                <span className="text-muted-foreground">案件类型：</span>
                <span className="font-medium">{isArbitration ? '国际仲裁' : '民事'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">你的角色：</span>
                <span className="font-medium">{isArbitration ? 'Claimant' : '原告'}</span>
                </div>
              <div>
                <span className="text-muted-foreground">对手风格：</span>
                <span className="font-medium">{report.opponentStyle}</span>
              </div>
              <div>
                <span className="text-muted-foreground">庭审时间：</span>
                <span className="font-medium">{new Date(report.createdAt).toLocaleString('zh-CN')}</span>
              </div>
            </div>
          </div>

          {/* Phase Statistics */}
          <div className="px-8 py-6 border-b border-border/40">
            <h3 className="font-semibold text-sm mb-3">各阶段数据</h3>
            <div className="space-y-2">
              {report.phaseGroups.map((pg) => (
                <div key={pg.phase} className="flex items-center gap-3">
                  <span className="text-xs font-medium w-24 shrink-0">{getPhaseLabel(pg.phase)}</span>
                  <div className="flex-grow">
                    <div className="flex gap-0.5">
                      {Array.from({ length: Math.min(pg.count, 20) }).map((_, i) => (
                        <div
                          key={i}
                          className="h-4 rounded-sm bg-primary/30"
                          style={{ width: `${100 / Math.min(pg.count, 20)}%` }}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">{pg.count}</span>
                </div>
              ))}
              {report.phaseGroups.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">暂无阶段数据</p>
              )}
            </div>
          </div>

          {/* Message Timeline */}
          <div className="px-8 py-6 max-h-96 overflow-y-auto">
            <h3 className="font-semibold text-sm mb-3">庭审记录（最近{report.messages.length}条）</h3>
            <div className="space-y-3">
              {report.messages.map((msg, i) => {
                const phaseColors: Record<string, string> = {
                  VERDICT: 'border-red-400 bg-red-50/30', AWARD: 'f2f2f2',
                };
                const borderColor = phaseColors[msg.phase] ? 'border-l-red-400' : 'border-l-muted-foreground/20';
                return (
                  <div key={i} className={`pl-3 border-l-2 ${borderColor} py-1`}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-semibold ${
                        msg.role === 'judge' || msg.role === 'arbitrator' ? 'text-primary' :
                        msg.role === 'user' ? 'text-success' : 'text-muted-foreground'
                      }`}>
                        {getRoleLabel(msg.role)}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60">
                        {getPhaseLabel(msg.phase)}
                      </span>
                      {msg.timestamp && (
                        <span className="text-[10px] text-muted-foreground/40">
                          {formatTime(msg.timestamp)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground/80 line-clamp-3">
                      {msg.content}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-8 py-5 border-t border-border/40 flex items-center justify-between">
            <Link
              href={`/review/${sessionId}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              target="_blank"
            >
              查看完整报告 →
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                  <polyline points="16 6 12 2 8 6"/>
                  <line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
                {copied ? '已复制链接' : '分享链接'}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                下载报告
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}