'use client';

import { useEffect, useState, useRef, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CaseDocument, CaseMaterial, CaseType, CourtMessage, CourtPhase, EvidenceItem, ImageEvidence, RoleId, SSEEvent, SessionState, UserActionType } from '@/types/court';
import { EvidenceUploader } from '@/components/courtroom/EvidenceUploader';
import TrialReport from '@/components/TrialReport';
import ErrorBoundary from '@/components/ErrorBoundary';

// ==================== Phase labels ====================
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

// Arbitration phase labels (English)
const ARBITRATION_PHASE_LABELS: Record<string, string> = {
  PREPARATION: 'Preparatory Phase',
  OPENING_STATEMENTS: 'Opening Statements',
  REBUTTAL: 'Rebuttal',
  CLOSING_ARGUMENTS: 'Closing Arguments',
  ARBITRATOR_QUESTIONS: 'Tribunal Questions',
  AWARD: 'Award',
  ADJOURNED: 'Adjourned',
};

const ROLE_LABELS: Record<string, string> = {
  judge: '审判长',
  plaintiff: '原告',
  defendant: '被告',
  arbitrator: 'Arbitrator',
  claimant: 'Claimant',
  respondent: 'Respondent',
};

function getRoleLabel(role: RoleId, caseType?: string): string {
  // Arbitration case
  if (caseType === 'arbitration') {
    if (role === 'judge' || role === 'arbitrator') return 'Arbitrator';
    if (role === 'plaintiff' || role === 'claimant') return 'Claimant';
    if (role === 'defendant' || role === 'respondent') return 'Respondent';
  }
  // Criminal case
  if (caseType === 'criminal') {
    if (role === 'judge') return '审判长';
    return role === 'plaintiff' ? '公诉方' : '辩护方';
  }
  // Civil case (default)
  if (role === 'judge') return '审判长';
  return role === 'plaintiff' ? '原告' : '被告';
}

function getPhaseLabel(phase: string, caseType?: string): string {
  if (caseType === 'arbitration') {
    return ARBITRATION_PHASE_LABELS[phase] || phase;
  }
  return PHASE_LABELS[phase] || phase;
}

// ==================== Message Bubble ====================
function VerdictCard({ message, caseType }: { message: CourtMessage; caseType?: string }) {
  const isArbitration = caseType === 'arbitration';
  const text = message.content;
  const now = new Date(message.timestamp).toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-primary/20 bg-gradient-to-b from-background to-primary/[0.02] shadow-lg">
      <div className="h-1.5 bg-gradient-to-r from-primary/80 via-primary to-primary/80" />
      <div className="flex justify-center pt-6 pb-2">
        <div className="w-14 h-14 rounded-full border-2 border-primary/20 flex items-center justify-center bg-primary/5">
          <span className="text-2xl">{isArbitration ? '\u2696\ufe0f' : '\u2696\ufe0f'}</span>
        </div>
      </div>
      <div className="text-center px-6">
        <h2 className="text-lg font-bold tracking-widest text-foreground">
          {isArbitration ? 'ARBITRAL AWARD' : '\u5224 \u51b3 \u4e66'}
        </h2>
        <div className="mt-1.5 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>
      <div className="relative mt-6 px-6 pb-4">
        <div className="absolute left-9 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/15 via-primary/5 to-transparent rounded-full" />
        <div className="pl-5">
          <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/85">
            {text}
          </div>
        </div>
      </div>
      <div className="px-6 pb-5 flex flex-col items-end text-sm text-muted-foreground">
        <div className="h-px w-48 bg-gradient-to-r from-transparent via-primary/20 to-transparent mb-3" />
        <div className="text-right">
          <p className="font-medium text-foreground/80">
            {isArbitration ? 'The Arbitral Tribunal' : '\u5ba1  \u5224  \u957f'}
          </p>
          <div className="relative inline-block mt-1">
            <span className="inline-block px-3 py-0.5 text-[11px] text-primary/60 border border-primary/20 rounded-sm bg-primary/[0.03] font-serif tracking-wider">
              {isArbitration ? 'TRIBUNAL SEAL' : '\u4eba\u6c11\u6cd5\u9662 \u5370'}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{now}</p>
          <p className="text-[10px] text-muted-foreground/40 mt-1 italic">
            {isArbitration ? 'This award is final and binding on the parties.' : '\u672c\u5224\u51b3\u4e3a\u7ec8\u5ba1\u5224\u51b3\u3002'}
          </p>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, caseType }: { message: CourtMessage; caseType?: string }) {
  const isJudge = message.role === 'judge';
  const isSystem = message.type === 'system';
  const isVerdict = message.type === 'verdict' || message.type === 'ruling';
  const isObjection = message.type === 'objection';

  if (isVerdict) {
    return <VerdictCard message={message} caseType={caseType} />;
  }

  return (
    <div className={`px-3 py-2.5 rounded-lg ${
      isJudge ? 'bg-muted/50 border-l-2 border-primary/60' :
      isSystem ? 'bg-muted/30 italic' :
      isObjection ? 'bg-destructive/5 border-l-2 border-destructive/40' :
      'bg-card shadow-sm'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-flex items-center justify-center min-w-[24px] h-5 px-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
          #{message.sequenceNumber ?? '?'}
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {getRoleLabel(message.role, caseType)}
        </span>
        <span className="text-[10px] text-muted-foreground/50 ml-auto">
          {new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
        {message.content}
      </p>
    </div>
  );
}

// ==================== Column Component ====================
function RoleColumn({
  role,
  label,
  status,
  messages,
  caseType,
  isUser,
}: {
  role: RoleId;
  label: string;
  status: 'speaking' | 'waiting' | 'muted';
  messages: CourtMessage[];
  caseType?: string;
  isUser: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const statusColors = {
    speaking: 'bg-success',
    waiting: 'bg-warning',
    muted: 'bg-outline',
  };

  const statusLabels = caseType === 'arbitration' 
    ? { speaking: 'Speaking', waiting: 'Waiting', muted: 'Muted' }
    : { speaking: '发言中', waiting: '等待中', muted: '静音' };

  return (
    <div className={`flex-1 flex flex-col min-w-0 ${
      status === 'speaking' ? 'bg-primary/[0.02]' : ''
    }`}>
      {/* 列头部 */}
      <div className={`px-4 py-3 border-b border-outline-variant/20 flex items-center gap-2.5 ${
        status === 'speaking' ? 'bg-primary/5' : ''
      }`}>
        <span className={`w-2.5 h-2.5 rounded-full ${statusColors[status]} shrink-0`} />
        <span className="font-semibold text-sm">{label}</span>
        {isUser && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">你</span>
        )}
        <span className="text-[10px] text-on-surface-variant ml-auto">{statusLabels[status]}</span>
      </div>

      {/* 消息列表 - 独立滚动 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {messages.length === 0 && (
          <div className="text-center text-on-surface-variant/40 text-xs py-8">
            {caseType === 'arbitration' ? 'Waiting for statement...' : '等待发言...'}
          </div>
        )}
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} caseType={caseType} />
        ))}
      </div>
    </div>
  );
}

// ==================== Laws Panel (Floating) ====================
function LawsPanel({ isOpen, onClose, caseType }: { isOpen: boolean; onClose: () => void; caseType?: string }) {
  const isArbitration = caseType === 'arbitration';
  const [laws, setLaws] = useState<Array<{ id: string; name: string; chapters: Array<{ id: string; name: string; articles: string[] }> }>>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLaws, setExpandedLaws] = useState<Set<string>>(new Set());
  const [searchResults, setSearchResults] = useState<Array<{ lawName: string; chapterName: string; article: string }>>([]);

  // 加载法律条文
  useEffect(() => {
    if (isOpen && laws.length === 0) {
      setLoading(true);
      const url = isArbitration ? '/api/laws?type=arbitration' : '/api/laws';
      fetch(url)
        .then(res => res.json())
        .then(data => {
          if (!data.error) setLaws(data);
        })
        .catch(e => console.error('Failed to load laws:', e))
        .finally(() => setLoading(false));
    }
  }, [isOpen, laws.length, isArbitration]);

  // 关键词搜索
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const results: Array<{ lawName: string; chapterName: string; article: string }> = [];
    laws.forEach(law => {
      law.chapters.forEach(chapter => {
        chapter.articles.forEach(article => {
          if (article.includes(query)) {
            results.push({ lawName: law.name, chapterName: chapter.name, article });
          }
        });
      });
    });
    setSearchResults(results);
  };

  const toggleLaw = (lawId: string) => {
    setExpandedLaws(prev => {
      const next = new Set(prev);
      if (next.has(lawId)) next.delete(lawId);
      else next.add(lawId);
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] max-w-full bg-surface border-l border-outline-variant/30 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
      {/* 头部 */}
      <div className="px-4 py-3 border-b border-outline-variant/20 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          {isArbitration ? (
            <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M2 12h20"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          ) : (
            <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          )}
          <span className="font-semibold text-sm">{isArbitration ? 'Laws & Rules' : '法律条文'}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-surface-container transition-colors"
        >
          <svg className="w-4 h-4 text-on-surface-variant" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* 搜索框 */}
      <div className="px-4 py-3 border-b border-outline-variant/20">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={isArbitration ? 'Search legal provisions...' : '输入关键词检索法律条文...'}
            className="w-full pl-9 pr-4 py-2.5 bg-surface-container rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-on-surface-variant/40"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => handleSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-surface rounded"
            >
              <svg className="w-4 h-4 text-on-surface-variant/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-sm">{isArbitration ? 'Loading...' : '加载中...'}</span>
            </div>
          </div>
        ) : searchQuery ? (
          // 搜索结果
          searchResults.length === 0 ? (
            <div className="text-center text-on-surface-variant/40 text-sm py-12">
              {isArbitration ? `No results found for "${searchQuery}"` : `未找到包含「${searchQuery}」的条文`}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-primary mb-3">{isArbitration ? `Found ${searchResults.length} provisions` : `找到 ${searchResults.length} 条相关条文`}</div>
              {searchResults.map((result, idx) => (
                <div key={idx} className="bg-surface-container/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-1.5 py-0.5 bg-primary/15 text-primary text-[10px] rounded">{result.lawName}</span>
                    <span className="text-[10px] text-on-surface-variant">{result.chapterName}</span>
                  </div>
                  <div className="text-xs text-on-surface leading-relaxed whitespace-pre-wrap">
                    {result.article}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          // 目录列表
          <div className="space-y-3">
            {laws.map(law => (
              <div key={law.id} className="bg-surface-container/50 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleLaw(law.id)}
                  className="w-full px-3 py-2.5 flex items-center justify-between bg-surface/30 hover:bg-surface-container transition-colors"
                >
                  <span className="text-xs font-medium text-primary">{law.name}</span>
                  <svg className={`w-4 h-4 text-on-surface-variant transition-transform ${expandedLaws.has(law.id) ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {expandedLaws.has(law.id) && (
                  <div className="border-t border-outline-variant/10">
                    {law.chapters.map(chapter => (
                      <div key={chapter.id} className="border-b border-outline-variant/5 last:border-b-0">
                        <div className="px-3 py-2 text-[11px] font-medium text-on-surface bg-surface-container/30">
                          {chapter.name}
                        </div>
                        <div className="px-3 py-2 space-y-1.5 max-h-64 overflow-y-auto">
                          {chapter.articles.map((article, idx) => (
                            <div key={idx} className="text-[11px] text-on-surface leading-relaxed">
                              {article}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isArbitration ? (
              <a
                href="https://uncitral.un.org"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-surface-container/30 rounded-lg hover:bg-surface-container transition-colors group"
              >
                <svg className="w-5 h-5 text-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M2 12h20"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-on-surface group-hover:text-primary transition-colors">United Nations Commission on International Trade Law</div>
                  <div className="text-[10px] text-on-surface-variant">uncitral.un.org</div>
                </div>
              </a>
            ) : (
              <a
                href="https://flk.npc.gov.cn/index"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-surface-container/30 rounded-lg hover:bg-surface-container transition-colors group"
              >
                <svg className="w-5 h-5 text-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-on-surface group-hover:text-primary transition-colors">全国人民代表大会常务委员会</div>
                  <div className="text-[10px] text-on-surface-variant">flk.npc.gov.cn</div>
                </div>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== Case Materials Sidebar ====================
function MaterialsSidebar({
  isOpen,
  onClose,
  documents,
  imageEvidence,
  activeTab,
  onTabChange,
  caseType,
}: {
  isOpen: boolean;
  onClose: () => void;
  documents: CaseDocument[];
  imageEvidence: ImageEvidence[];
  activeTab: 'complaint' | 'defense' | 'evidence' | 'other';
  onTabChange: (tab: 'complaint' | 'defense' | 'evidence' | 'other') => void;
  caseType?: CaseType;
}) {
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const isArbitration = caseType === 'arbitration';

  const complaintDocs = documents.filter(d => d.type === 'complaint');
  const defenseDocs = documents.filter(d => d.type === 'defense');
  const evidenceDocs = documents.filter(d => d.type === 'evidence');
  const otherDocs = documents.filter(d => d.type === 'other');

  const tabs: Array<{ key: 'complaint' | 'defense' | 'evidence' | 'other'; label: string; count: number }> = [
    { key: 'complaint', label: isArbitration ? 'Claim' : '起诉状', count: complaintDocs.length },
    { key: 'defense', label: isArbitration ? 'Defense' : '答辩状', count: defenseDocs.length },
    { key: 'evidence', label: isArbitration ? 'Evidence' : '证据材料', count: evidenceDocs.length },
    { key: 'other', label: isArbitration ? 'Other' : '其他材料', count: otherDocs.length },
  ];

  const tabLabels: Record<string, string> = {
    complaint: isArbitration ? 'Claim' : '起诉状',
    defense: isArbitration ? 'Defense' : '答辩状',
    evidence: isArbitration ? 'Evidence' : '证据材料',
    other: isArbitration ? 'Other' : '其他材料',
  };

  if (!isOpen) return null;

  return (
    <div className="w-96 shrink-0 bg-surface border-r border-outline-variant/20 flex flex-col overflow-hidden">
      {/* 头部 */}
      <div className="px-4 py-3 border-b border-outline-variant/20 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          <span className="font-semibold text-sm">{isArbitration ? 'Bundle' : '案件材料'}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-surface-container transition-colors"
        >
          <svg className="w-4 h-4 text-on-surface-variant" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* 标签切换 */}
      <div className="flex border-b border-outline-variant/20 shrink-0 overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => { onTabChange(tab.key); setExpandedDoc(null); }}
            className={`flex-1 px-2 py-2.5 text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1 px-1 rounded text-[10px] ${
                activeTab === tab.key ? 'bg-primary/15 text-primary' : 'bg-surface-container text-on-surface-variant'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {(activeTab === 'complaint' ? complaintDocs :
           activeTab === 'defense' ? defenseDocs :
           activeTab === 'evidence' ? evidenceDocs :
           otherDocs).length === 0 ? (
            <div className="text-center text-on-surface-variant/40 text-xs py-8">
              暂无{tabLabels[activeTab]}
            </div>
          ) : (
            (activeTab === 'complaint' ? complaintDocs :
             activeTab === 'defense' ? defenseDocs :
             activeTab === 'evidence' ? evidenceDocs :
             otherDocs).map(doc => (
              <div key={doc.id} className="bg-surface-container/50 rounded-lg overflow-hidden">
                {/* 文档头部 */}
                <div className="px-3 py-2.5 border-b border-outline-variant/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-primary">{doc.name}</div>
                      <div className="text-[10px] text-on-surface-variant mt-0.5">
                        {doc.ext.toUpperCase()} · {doc.fileSize}
                      </div>
                    </div>
                    {doc.sections && doc.sections.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                        className="p-1 rounded hover:bg-surface transition-colors"
                      >
                        <svg className={`w-4 h-4 text-on-surface-variant transition-transform ${expandedDoc === doc.id ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </button>
                    )}
                  </div>
                  {doc.sections && doc.sections.length > 0 && (
                    <div className="text-[10px] text-primary mt-1">{doc.sections.length} 个章节</div>
                  )}
                </div>

                {/* 文档内容预览 */}
                {(doc.extractedText || doc.evidenceItems) && (
                  <div className="px-3 py-2 space-y-3">
                    {/* 证据文字内容 */}
                    {doc.extractedText && (
                      <div className="text-xs text-on-surface leading-relaxed whitespace-pre-wrap font-sans max-h-60 overflow-y-auto bg-surface/30 rounded-lg p-3 border border-outline-variant/10">
                        {doc.extractedText}
                      </div>
                    )}
                    {/* 证据图片展示 */}
                    {doc.evidenceItems && doc.evidenceItems.filter(ev => ev.imageUrl).length > 0 && (
                      <div className="space-y-3 pt-2 border-t border-outline-variant/10">
                        <div className="text-[11px] font-medium text-on-surface-variant/60">证据影像</div>
                        {doc.evidenceItems.filter(ev => ev.imageUrl).map(ev => (
                          <div key={ev.id} className="bg-surface/30 rounded-lg overflow-hidden border border-outline-variant/10">
                            <div className="bg-muted/20">
                              <img src={ev.imageUrl} alt={ev.name} className="w-full max-h-64 object-contain" />
                            </div>
                            <div className="px-3 py-2 border-t border-outline-variant/10">
                              <div className="text-xs font-medium text-on-surface">{ev.name}</div>
                              <div className="text-[10px] text-on-surface-variant/60 mt-0.5">{ev.type} · {ev.source}提供</div>
                              <div className="text-[10px] text-on-surface-variant/40 mt-0.5">{ev.purpose}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 章节列表（可展开） */}
                {expandedDoc === doc.id && doc.sections && doc.sections.length > 0 && (
                  <div className="border-t border-outline-variant/10 bg-surface/30">
                    <div className="px-3 py-2 text-[10px] font-medium text-primary border-b border-outline-variant/10">
                      文档结构
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {doc.sections.map((section, idx) => (
                        <div key={idx} className="px-3 py-2 border-b border-outline-variant/5 last:border-b-0">
                          <div className="text-xs font-medium text-on-surface">{section.title}</div>
                          <div className="text-[11px] text-on-surface-variant/70 mt-0.5 line-clamp-2">
                            {section.content}{section.content.length > 100 ? '...' : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
      </div>
    </div>
  );
}

// ==================== Phase Stepper ====================
function PhaseStepper({ phases, currentPhase, currentSubPhaseName }: { phases: { id: CourtPhase; name: string; completed: boolean }[]; currentPhase: CourtPhase; currentSubPhaseName?: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {phases.map((phase, i) => (
          <div key={phase.id} className="flex items-center shrink-0">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
              phase.id === currentPhase
                ? 'bg-primary/15 text-primary'
                : phase.completed
                  ? 'bg-success/10 text-success'
                  : 'bg-surface-container/50 text-on-surface-variant/60'
            }`}>
              {phase.completed && phase.id !== currentPhase ? (
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <span className="w-3 h-3 rounded-full border-2 border-current" />
              )}
              {phase.name}
            </div>
            {i < phases.length - 1 && (
              <svg className="w-3 h-3 text-outline mx-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            )}
          </div>
        ))}
      </div>
      {currentSubPhaseName && (
        <div className="text-xs text-muted-foreground">
          {currentSubPhaseName}
        </div>
      )}
    </div>
  );
}

// ==================== Main Courtroom Page ====================
function CourtroomContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [messages, setMessages] = useState<CourtMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<RoleId>('judge');
  const [allowedActions, setAllowedActions] = useState<UserActionType[]>([]);
  const [currentPhase, setCurrentPhase] = useState<CourtPhase>('PREPARATION');
  const [currentSubPhase, setCurrentSubPhase] = useState<string>('');
  const [currentSubPhaseName, setCurrentSubPhaseName] = useState<string>('');
  const [phaseProgress, setPhaseProgress] = useState<{ current: number; total: number; phases: { id: CourtPhase; name: string; completed: boolean }[] }>({
    current: 1, total: 7, phases: [],
  });
  const [status, setStatus] = useState<'active' | 'paused' | 'completed'>('active');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeMaterialTab, setActiveMaterialTab] = useState<'complaint' | 'defense' | 'evidence' | 'other'>('complaint');
  const [lawsOpen, setLawsOpen] = useState(false);
  const [imageEvidence, setImageEvidence] = useState<ImageEvidence[]>([]);
  const [showUploader, setShowUploader] = useState(false);
  const [showReport, setShowReport] = useState(false);

  // 案件文档
  const documents = sessionState?.caseDocuments ?? [];

  // 初始化：先获取会话状态，再连接 SSE
  useEffect(() => {
    if (!sessionId) return;

    console.log('[Courtroom] 开始初始化, sessionId:', sessionId);

    // 先获取当前会话状态（解决 SSE 连接时序问题）
    fetch(`/api/sessions/${sessionId}`)
      .then(res => res.json())
      .then((data: SessionState) => {
        console.log('[Courtroom] 获取到会话状态, 消息数:', data.messages?.length || 0);
        if (data.sessionId) {
          setSessionState(data);
          setMessages(data.messages || []);
          setCurrentPhase(data.currentPhase);
          setCurrentSpeaker(data.currentSpeaker);
          setAllowedActions(data.allowedActions || []);
          // 确保 phaseProgress 不为 undefined
          setPhaseProgress(data.phaseProgress || { current: 1, total: 7, phases: [] });
          setStatus(data.status);
          setImageEvidence(data.imageEvidence || []);
        }
      })
      .catch((err) => {
        console.error('[Courtroom] 获取会话状态失败:', err);
      });

    // 使用 fetch + ReadableStream 替代 EventSource（更可靠）
    console.log('[Courtroom] 使用 fetch 连接 SSE...');
    let abortController: AbortController | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 10;

    async function connectSSE() {
      abortController = new AbortController();
      
      try {
        const response = await fetch(`/api/sessions/${sessionId}/stream`, {
          signal: abortController.signal,
        });

        if (!response.ok) {
          console.error('[Courtroom] SSE 连接失败:', response.status);
          scheduleReconnect();
          return;
        }

        setIsConnected(true);
        reconnectAttempts = 0; // 重置重连计数
        console.log('[Courtroom] SSE 连接成功');

        const reader = response.body?.getReader();
        if (!reader) {
          console.error('[Courtroom] 无法获取 reader');
          scheduleReconnect();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            // 流正常结束（服务器断开或网络问题）
            console.log('[Courtroom] SSE 流结束，准备重连');
            setIsConnected(false);
            scheduleReconnect();
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data.startsWith(':')) continue; // heartbeat

              try {
                const sseEvent: SSEEvent = JSON.parse(data);
                console.log('[Courtroom] 收到 SSE 事件:', sseEvent.type);
                
                // 直接处理事件
                switch (sseEvent.type) {
                  case 'system': {
                    const payload = sseEvent.payload as SessionState;
                    if (payload?.sessionId) {
                      setSessionState(payload);
                      setCurrentPhase(payload.currentPhase);
                      if (payload.currentSubPhaseName) setCurrentSubPhaseName(payload.currentSubPhaseName);
                      setCurrentSubPhase(payload.currentSubPhase ?? '');
                      // 只在初始化时（消息为空）用 system 事件中的 speaker
                      // 避免覆盖 speaking_turn 事件正确设置的 speaker
                      if (messages.length === 0) {
                        setCurrentSpeaker(payload.currentSpeaker);
                      }
                      setAllowedActions(payload.allowedActions);
                      setPhaseProgress(payload.phaseProgress || { current: 1, total: 7, phases: [] });
                      setStatus(payload.status);
                      // 只在消息列表为空时用 system 事件中的消息初始化
                      // 避免覆盖已通过 agent_message 添加的消息
                      if (payload.messages?.length && messages.length === 0) {
                        setMessages(payload.messages);
                      }
                    }
                    break;
                  }
                  case 'agent_message':
                  case 'user_message':
                  case 'objection_raised':
                  case 'objection_ruled':
                  case 'session_completed':
                  case 'verdict': {
                    const msg = sseEvent.payload as CourtMessage;
                    if (msg?.id) {
                      setMessages(prev => {
                        if (prev.some(m => m.id === msg.id)) return prev;
                        return [...prev, msg];
                      });
                    }
                    if (sseEvent.type === 'session_completed') {
                      setStatus('completed');
                      setShowReport(true);
                    }
                    break;
                  }
                  case 'phase_change': {
                    const payload = sseEvent.payload as { phase: CourtPhase; subPhase?: string; subPhaseName?: string; phaseProgress?: { current: number; total: number; phases?: { id: CourtPhase; name: string; completed: boolean }[] } };
                    if (payload?.phase) setCurrentPhase(payload.phase);
                    if (payload?.subPhase !== undefined) setCurrentSubPhase(payload.subPhase);
                    if (payload?.phaseProgress) {
                      setPhaseProgress({
                        ...payload.phaseProgress,
                        phases: payload.phaseProgress.phases ?? []
                      });
                    }
                    break;
                  }
                  case 'subphase_change': {
                    const payload = sseEvent.payload as { subPhase: string; subPhaseName: string };
                    if (payload?.subPhase !== undefined) setCurrentSubPhase(payload.subPhase);
                    break;
                  }
                  case 'speaking_turn': {
                    const payload = sseEvent.payload as { speaker: RoleId; allowedActions: UserActionType[]; subPhase?: string; subPhaseName?: string; phaseProgress?: { current: number; total: number; phases?: { id: CourtPhase; name: string; completed: boolean }[] } };
                    if (payload?.speaker) {
                      setCurrentSpeaker(payload.speaker);
                      setAllowedActions(payload.allowedActions ?? []);
                    }
                    if (payload?.subPhase !== undefined) setCurrentSubPhase(payload.subPhase);
                    if (payload?.phaseProgress) {
                      setPhaseProgress({
                        ...payload.phaseProgress,
                        phases: payload.phaseProgress.phases ?? []
                      });
                    }
                    break;
                  }
                  case 'session_paused': setStatus('paused'); break;
                  case 'session_resumed': setStatus('active'); break;
                  case 'image_uploaded':
                  case 'image_analyzed': {
                    const evidence = sseEvent.payload as ImageEvidence;
                    if (evidence?.id) {
                      setImageEvidence(prev => {
                        const exists = prev.some(e => e.id === evidence.id);
                        if (exists) return prev.map(e => e.id === evidence.id ? evidence : e);
                        return [...prev, evidence];
                      });
                    }
                    break;
                  }
                }
              } catch (err) {
                console.error('[SSE] 解析事件失败:', err);
              }
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('[Courtroom] SSE 错误:', err);
          setIsConnected(false);
          scheduleReconnect();
        }
      }
    }

    function scheduleReconnect() {
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error('[Courtroom] SSE 重连已达最大次数，停止重连');
        return;
      }
      reconnectAttempts++;
      // 指数退避: 2s, 3s, 5s, 9s, 17s...
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1) + 1000, 30000);
      console.log(`[Courtroom] ${delay}ms 后尝试第 ${reconnectAttempts} 次重连...`);
      reconnectTimer = setTimeout(() => {
        if (abortController) {
          try { abortController.abort(); } catch {}
        }
        connectSSE();
      }, delay);
    }

    connectSSE();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      abortController?.abort();
    };
  }, [sessionId]);

  // 发送消息
  async function handleSend(actionType: UserActionType = 'speak') {
    if (!inputText.trim() || !sessionId) return;
    setIsSending(true);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          action: { type: actionType, content: inputText.trim() },
        }),
      });

      const data = await res.json();
      if (!data.success) {
        alert(data.reason || data.error || '操作失败');
      }
      setInputText('');
    } catch {
      alert('网络错误，请重试');
    } finally {
      setIsSending(false);
    }
  }

  // 暂停/恢复
  async function handleTogglePause() {
    if (!sessionId) return;
    const endpoint = status === 'paused' ? 'resume' : 'pause';
    await fetch(`/api/sessions/${sessionId}/${endpoint}`, { method: 'POST' });
  }

  // 分类消息（使用 useMemo 避免每次渲染都过滤）
  const caseType = sessionState?.caseType;
  const isArbitration = caseType === 'arbitration';
  const judgeRole = isArbitration ? 'arbitrator' : 'judge';
  const plaintiffRole = isArbitration ? 'claimant' : 'plaintiff';
  const defendantRole = isArbitration ? 'respondent' : 'defendant';
  
  const judgeMessages = useMemo(() => messages.filter(m => m.role === judgeRole || m.role === 'judge' || m.role === 'arbitrator'), [messages, judgeRole]);
  const plaintiffMessages = useMemo(() => messages.filter(m => m.role === plaintiffRole || m.role === 'plaintiff' || m.role === 'claimant'), [messages, plaintiffRole]);
  const defendantMessages = useMemo(() => messages.filter(m => m.role === defendantRole || m.role === 'defendant' || m.role === 'respondent'), [messages, defendantRole]);
  const userRole = sessionState?.userRole ?? 'plaintiff';
  
  // Normalize user role for arbitration
  const normalizedUserRole: RoleId = isArbitration 
    ? (userRole === 'plaintiff' ? 'claimant' : userRole === 'defendant' ? 'respondent' : userRole as RoleId)
    : userRole as RoleId;
    
  const opponentRole: RoleId = isArbitration
    ? (normalizedUserRole === 'claimant' ? 'respondent' : 'claimant')
    : (normalizedUserRole === 'plaintiff' ? 'defendant' : 'plaintiff');

  const canSpeak = (currentSpeaker === normalizedUserRole || currentSpeaker === userRole) && status === 'active';
  const isUserPlaintiff = normalizedUserRole === 'claimant' || normalizedUserRole === 'plaintiff';

  return (
    <>
      <div className="h-screen h-[100dvh] flex flex-col bg-background overflow-hidden safe-area-top">
      {/* SSE 断连提示横幅 */}
      {!isConnected && (
        <div className="bg-warning/15 text-warning text-xs text-center py-1.5 px-4 border-b border-warning/20 shrink-0">
          {isArbitration ? 'Connection lost. Reconnecting...' : '连接已断开，正在尝试重连...'}
        </div>
      )}
      {/* 顶部状态栏 */}
      <header className="bg-surface shrink-0 border-b border-outline-variant/20 z-30">
        <div className="flex items-center justify-between px-5 h-13">
          {/* 左侧：案件名称 */}
          <div className="flex items-center gap-2.5 min-w-0">
            <svg className="w-4 h-4 text-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
              <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
              <path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
            </svg>
            <span className="font-semibold text-sm truncate">{sessionState?.caseName || '加载中...'}</span>
          </div>

          {/* 中间：阶段步骤条 */}
          <div className="flex-1 mx-6 hidden md:block">
            <PhaseStepper phases={phaseProgress.phases} currentPhase={currentPhase} currentSubPhaseName={currentSubPhaseName} />
          </div>

          {/* 右侧：控制按钮 */}
          <div className="flex items-center gap-2">
            {/* Bundle / 案件材料按钮 */}
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                sidebarOpen
                  ? 'bg-primary/15 text-primary'
                  : 'hover:bg-surface-container text-on-surface-variant'
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              {isArbitration ? 'Bundle' : '案件材料'}
              <span className="px-1 py-0.5 bg-surface-container rounded text-[10px]">{documents.length + imageEvidence.length}</span>
            </button>
            {/* 法律条文/Laws按钮 */}
            <button
              type="button"
              onClick={() => setLawsOpen(!lawsOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                lawsOpen
                  ? 'bg-primary/15 text-primary'
                  : 'hover:bg-surface-container text-on-surface-variant'
              }`}
            >
              {isArbitration ? (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M2 12h20"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
              )}
              {isArbitration ? 'Laws' : '法律条文'}
            </button>
            {/* 上传证据图片按钮 */}
            {allowedActions?.includes('upload_image') && sessionId && (
              <EvidenceUploader
                sessionId={sessionId}
                userRole={sessionState?.userRole === 'plaintiff' ? 'plaintiff' : 'defendant'}
                onUploadComplete={(newImage) => {
                  setImageEvidence(prev => [...prev, newImage]);
                }}
              />
            )}
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-error'}`} />
            <button
              type="button"
              onClick={handleTogglePause}
              className="p-1.5 rounded-lg hover:bg-surface-container transition-colors"
              title={status === 'paused' ? '恢复' : '暂停'}
            >
              {status === 'paused' ? (
                <svg className="w-4 h-4 text-success" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              )}
            </button>
          </div>
        </div>

        {/* 移动端阶段指示 */}
        <div className="px-5 pb-2 md:hidden">
          <div className="text-xs text-on-surface-variant">
            当前阶段：<span className="text-primary font-medium">{PHASE_LABELS[currentPhase] || currentPhase}</span>
            {sessionState?.currentSubPhaseName && (
              <span className="ml-2 text-muted-foreground">› {currentSubPhaseName}</span>
            )}
          </div>
        </div>
      </header>

      {/* 三列主体 + 侧边栏 */}
      <div className="flex-1 flex min-h-0">
        {/* 案件材料侧边栏 */}
        <MaterialsSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          documents={documents}
          imageEvidence={imageEvidence}
          activeTab={activeMaterialTab}
          onTabChange={setActiveMaterialTab}
          caseType={sessionState?.caseType}
        />

        {/* 三列主体 */}
        <div className="flex-1 flex min-h-0 overflow-x-auto md:overflow-x-visible">
          {/* 原告/申请人列 */}
          <RoleColumn
          role={plaintiffRole}
          label={getRoleLabel(plaintiffRole, caseType)}
          status={
            (currentSpeaker === plaintiffRole || currentSpeaker === 'plaintiff' || currentSpeaker === 'claimant') ? 'speaking' :
            plaintiffMessages.length > 0 ? 'waiting' : 'muted'
          }
          messages={plaintiffMessages}
          caseType={caseType}
          isUser={isUserPlaintiff}
        />

        {/* 分割线 */}
        <div className="w-px bg-outline-variant/20 shrink-0" />

        {/* 法官/仲裁员列 */}
        <RoleColumn
          role={judgeRole}
          label={getRoleLabel(judgeRole, caseType)}
          status={
            (currentSpeaker === judgeRole || currentSpeaker === 'judge' || currentSpeaker === 'arbitrator') ? 'speaking' : 'waiting'
          }
          messages={judgeMessages}
          caseType={caseType}
          isUser={false}
        />

        {/* 分割线 */}
        <div className="w-px bg-outline-variant/20 shrink-0" />

        {/* 被告/被申请人列 */}
        <RoleColumn
          role={defendantRole}
          label={getRoleLabel(defendantRole, caseType)}
          status={
            (currentSpeaker === defendantRole || currentSpeaker === 'defendant' || currentSpeaker === 'respondent') ? 'speaking' :
            defendantMessages.length > 0 ? 'waiting' : 'muted'
          }
          messages={defendantMessages}
          caseType={caseType}
          isUser={!isUserPlaintiff}
        />
      </div>

        {/* 法律条文浮窗 */}
        <LawsPanel isOpen={lawsOpen} onClose={() => setLawsOpen(false)} caseType={caseType} />
      </div>

      {/* 底部输入区 */}
      <div className="bg-surface border-t border-outline-variant/20 shrink-0 px-5 py-3">
        <div className="flex items-center gap-3">
          {/* 发言权状态 */}
          <div className="flex items-center gap-2 shrink-0">
            <span className={`w-2.5 h-2.5 rounded-full ${
              canSpeak ? 'bg-success' : 'bg-outline'
            }`} />
            <span className="text-xs text-on-surface-variant whitespace-nowrap">
              {status === 'paused' ? (isArbitration ? 'Arbitration paused' : '庭审已暂停') :
               status === 'completed' ? (isArbitration ? 'Arbitration completed' : '庭审已结束') :
               canSpeak ? (isArbitration ? 'Your turn to speak' : '轮到你发言') : 
               (isArbitration ? `Waiting for ${getRoleLabel(currentSpeaker, caseType)}` : `等待${getRoleLabel(currentSpeaker, caseType)}发言`)}
            </span>
          </div>

          {/* 输入框 */}
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && canSpeak) { e.preventDefault(); handleSend('speak'); } }}
            placeholder={canSpeak 
              ? (isArbitration ? 'Enter your statement...' : '请输入你的发言...') 
              : (isArbitration ? 'Waiting for authorization...' : '等待法官授权...')}
            disabled={!canSpeak || isSending || status !== 'active'}
            className="flex-1 px-4 py-2.5 bg-surface-container rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-on-surface-variant/40 disabled:opacity-50 disabled:cursor-not-allowed"
          />

          {/* 发送按钮 */}
          <button
            type="button"
            onClick={() => handleSend('speak')}
            disabled={!canSpeak || !inputText.trim() || isSending}
            className="px-4 py-2.5 bg-primary text-on-primary rounded-lg text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {isArbitration ? 'Send' : '发送'}
          </button>

          {/* 申请发言 */}
          {!canSpeak && status === 'active' && (
            <button
              type="button"
              onClick={() => { setInputText(isArbitration ? 'Request to speak' : '申请发言'); handleSend('request_speak'); }}
              disabled={isSending}
              className="px-3 py-2.5 border border-primary/30 text-primary rounded-lg text-xs font-medium hover:bg-primary/5 transition-all disabled:opacity-40 shrink-0"
            >
              {isArbitration ? 'Request to speak' : '申请发言'}
            </button>
          )}

          {/* 异议按钮 */}
          {status === 'active' && (
            <button
              type="button"
              onClick={() => {
                const reason = prompt('请输入异议理由：');
                if (reason?.trim()) {
                  setInputText(reason);
                  handleSend('object');
                }
              }}
              className="px-3 py-2.5 border border-error/30 text-error rounded-lg text-xs font-medium hover:bg-error/5 transition-all shrink-0"
            >
              异议
            </button>
          )}
        </div>
      </div>
    </div>

      {/* 庭审报告弹窗 */}
      {showReport && sessionId && (
        <TrialReport
          sessionId={sessionId}
          onClose={() => setShowReport(false)}
        />
      )}
    </>
  );
}


export default function CourtroomPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <ErrorBoundary>
        <CourtroomContent />
      </ErrorBoundary>
    </Suspense>
  );
}
