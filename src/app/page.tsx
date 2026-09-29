'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CaseType, RoleId } from '@/types/court';
import { PRESET_CASES, PresetCase } from '@/lib/data/preset-cases';
import { ARBITRATION_PRESET_CASES, ArbitrationCase } from '@/lib/data/arbitration-cases';
import { CaseCard } from '@/components/courtroom/CaseCard';
import { MedalsButton } from '@/components/MedalsModal';

interface UploadedFile {
  id: string;
  type: 'complaint' | 'defense' | 'evidence' | 'other';
  name: string;
  file: File;
  uploaded: boolean;
  error?: string;
}

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<'select' | 'custom'>('select');
  const [caseType, setCaseType] = useState<CaseType>('civil');
  const [caseName, setCaseName] = useState('');
  const [caseDescription, setCaseDescription] = useState('');
  const [userRole, setUserRole] = useState<RoleId>('plaintiff');
  const [opponentStyle, setOpponentStyle] = useState<'standard' | 'aggressive' | 'moderate'>('standard');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [trialCount, setTrialCount] = useState(0);
  const [trialCountLoaded, setTrialCountLoaded] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetCase | null>(null);
  const [presetRoleModal, setPresetRoleModal] = useState(false);

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => {
        setTrialCount(data.totalTrials);
        setTrialCountLoaded(true);
      })
      .catch(() => {
        setTrialCountLoaded(true); // 标记为已加载，使用默认值 0
      });
  }, []);
  const [selectedArbitrationCase, setSelectedArbitrationCase] = useState<ArbitrationCase | null>(null);
  const [arbitrationRoleModal, setArbitrationRoleModal] = useState(false);

  const plaintiffLabel = caseType === 'civil' ? '原告' : caseType === 'criminal' ? '公诉方' : 'Claimant';
  const defendantLabel = caseType === 'civil' ? '被告' : caseType === 'criminal' ? '辩护方' : 'Respondent';

  // 检查必填文件是否已上传
  const hasComplaint = uploadedFiles.some(f => f.type === 'complaint' && f.uploaded);
  const hasDefense = uploadedFiles.some(f => f.type === 'defense' && f.uploaded);

  function handleFileSelect(type: 'complaint' | 'defense' | 'evidence' | 'other', event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'docx' && ext !== 'pdf') {
        setError(`文件 "${file.name}" 格式不支持，请上传 docx 或 pdf 格式`);
        continue;
      }

      const id = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const displayName = type === 'evidence' && files.length > 1
        ? `证据材料 ${uploadedFiles.filter(f => f.type === 'evidence').length + i + 1}`
        : type === 'complaint' ? '起诉状'
        : type === 'defense' ? '答辩状'
        : '其他材料';

      setUploadedFiles(prev => [...prev, {
        id,
        type,
        name: displayName,
        file,
        uploaded: false,
      }]);
    }

    event.target.value = '';
  }

  function removeFile(id: string) {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  }

  async function uploadDocuments(sessionId: string): Promise<boolean> {
    const filesToUpload = uploadedFiles.filter(f => !f.uploaded);
    if (filesToUpload.length === 0) return true;

    setUploadingCount(filesToUpload.length);

    for (const fileInfo of filesToUpload) {
      try {
        const formData = new FormData();
        formData.append('file', fileInfo.file);
        formData.append('type', fileInfo.type);
        formData.append('name', fileInfo.name);
        formData.append('userRole', userRole);

        const res = await fetch(`/api/sessions/${sessionId}/documents`, {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          setUploadedFiles(prev =>
            prev.map(f => f.id === fileInfo.id ? { ...f, uploaded: true } : f)
          );
        } else {
          const data = await res.json();
          setUploadedFiles(prev =>
            prev.map(f => f.id === fileInfo.id ? { ...f, error: data.error || '上传失败' } : f)
          );
        }
      } catch {
        setUploadedFiles(prev =>
          prev.map(f => f.id === fileInfo.id ? { ...f, error: '网络错误' } : f)
        );
      }

      setUploadingCount(prev => Math.max(0, prev - 1));
    }

    return uploadedFiles.every(f => f.uploaded);
  }

  async function handleStartCustom() {
    if (!caseName.trim()) {
      setError('请输入案件名称');
      return;
    }
    if (!caseDescription.trim()) {
      setError('请输入案件描述');
      return;
    }
    if (!hasComplaint) {
      setError('请上传起诉状（必填）');
      return;
    }
    if (!hasDefense) {
      setError('请上传答辩状（必填）');
      return;
    }
    setError('');
    setIsCreating(true);

    try {
      // 1. 先创建会话
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseType,
          caseName,
          caseDescription,
          userRole,
          opponentStyle,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '创建会话失败');
        setIsCreating(false);
        return;
      }

      const sessionId = data.sessionId;

      // 2. 上传文档
      await uploadDocuments(sessionId);

      // 3. 跳转到庭审页面
      router.push(`/courtroom?sessionId=${sessionId}`);
    } catch {
      setError('网络错误，请重试');
      setIsCreating(false);
    }
  }

  function handleSelectPreset(preset: PresetCase) {
    setSelectedPreset(preset);
    setPresetRoleModal(true);
  }

  async function handleStartPreset(role: RoleId) {
    if (!selectedPreset) return;
    setPresetRoleModal(false);
    setIsCreating(true);

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseType: selectedPreset.caseType,
          caseName: selectedPreset.caseName,
          caseDescription: selectedPreset.caseDescription,
          userRole: role,
          opponentStyle: 'standard' as const,
          presetCaseId: selectedPreset.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '创建会话失败');
        setIsCreating(false);
        return;
      }

      router.push(`/courtroom?sessionId=${data.sessionId}`);
    } catch {
      setError('网络错误，请重试');
      setIsCreating(false);
    }
  }

  const civilCases = PRESET_CASES.filter(c => c.caseType === 'civil');
  const criminalCases = PRESET_CASES.filter(c => c.caseType === 'criminal');

  function handleSelectArbitration(arbCase: ArbitrationCase) {
    setSelectedArbitrationCase(arbCase);
    setArbitrationRoleModal(true);
  }

  async function handleStartArbitration(role: 'claimant' | 'respondent') {
    if (!selectedArbitrationCase) return;
    setArbitrationRoleModal(false);
    setIsCreating(true);

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseType: 'arbitration',
          caseName: selectedArbitrationCase.name,
          caseDescription: selectedArbitrationCase.description,
          userRole: role,
          opponentStyle: 'standard' as const,
          arbitrationCaseId: selectedArbitrationCase.id,
          language: 'English',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create session');
        setIsCreating(false);
        return;
      }

      router.push(`/courtroom?sessionId=${data.sessionId}`);
    } catch {
      setError('Network error, please retry');
      setIsCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 导航栏 */}
      <header className="bg-surface sticky top-0 z-40 border-b border-outline-variant/30">
        <div className="max-w-7xl mx-auto h-14 flex items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
              <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
              <path d="M7 21h10"/>
              <path d="M12 3v18"/>
              <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
            </svg>
            <span className="font-bold text-lg tracking-tight">模拟法庭</span>
            {trialCountLoaded && (<>
              <span className="mx-2 text-outline-variant/40">|</span>
              <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium whitespace-nowrap">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                累计开庭 {trialCount + 50} 次
              </span>
            </>)}
            {!trialCountLoaded && (
              <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />
                加载中...
              </span>
            )}
          </div>
          <nav className="flex items-center gap-6 text-sm">
            <MedalsButton />
            <Link
              href="/settings"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              设置
            </Link>
          </nav>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="space-y-10">
          {/* 标题 */}
          <div className="text-center">
            <h1 className="text-2xl font-bold">选择挑战副本</h1>
            <p className="text-muted-foreground mt-1.5">
              从经典案例副本中选择，或上传自定义案件材料
            </p>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {/* 模式切换 */}
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 p-1 bg-muted rounded-lg w-fit">
              <button
                onClick={() => setMode('select')}
                className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
                  mode === 'select'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  经典副本
                </span>
              </button>
              <button
                onClick={() => setMode('custom')}
                className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
                  mode === 'custom'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" x2="12" y1="3" y2="15"/>
                  </svg>
                  自定义上传
                </span>
              </button>
            </div>
          </div>

          {/* 经典案例选择 */}
          {mode === 'select' ? (
            <div className="space-y-8">
              {/* 民事副本 */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-semibold">民事副本</h2>
                    <p className="text-xs text-muted-foreground">民事纠纷类经典案例</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {civilCases.map(preset => (
                    <CaseCard
                      key={preset.id}
                      case={preset}
                      onSelect={() => handleSelectPreset(preset)}
                      disabled={isCreating}
                    />
                  ))}
                </div>
              </section>

              {/* 刑事副本 */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-semibold">刑事副本</h2>
                    <p className="text-xs text-muted-foreground">刑事案件类经典案例</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {criminalCases.map(preset => (
                    <CaseCard
                      key={preset.id}
                      case={preset}
                      onSelect={() => handleSelectPreset(preset)}
                      disabled={isCreating}
                    />
                  ))}
                </div>
              </section>

              {/* 国际仲裁副本 */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="2" y1="12" x2="22" y2="12"/>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-semibold">International Arbitration</h2>
                    <p className="text-xs text-muted-foreground">International Commercial Arbitration Moot Problems (VIS/Frankfurt/FDI)</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ARBITRATION_PRESET_CASES.map((arbCase: ArbitrationCase) => (
                    <div
                      key={arbCase.id}
                      onClick={() => !isCreating && handleSelectArbitration(arbCase)}
                      className={`bg-card rounded-xl border border-outline-variant/30 overflow-hidden cursor-pointer transition-all hover:border-primary/50 hover:shadow-md ${
                        isCreating ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {/* 封面图 */}
                      {arbCase.imageUrl ? (
                        <div className="h-32 bg-muted relative overflow-hidden">
                          <img
                            src={arbCase.imageUrl}
                            alt={arbCase.name}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
                        </div>
                      ) : (
                        <div className="h-32 bg-purple-500/10 flex items-center justify-center">
                          <svg className="w-12 h-12 text-purple-500/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="2" y1="12" x2="22" y2="12"/>
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                          </svg>
                        </div>
                      )}
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-medium text-sm line-clamp-2">{arbCase.name}</h3>
                            <p className="text-xs text-muted-foreground mt-1">{arbCase.year}</p>
                          </div>
                          <div className="shrink-0 w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                            <svg className="w-4 h-4 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"/>
                              <line x1="2" y1="12" x2="22" y2="12"/>
                              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                            </svg>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-3">{arbCase.description}</p>
                        {arbCase.sourceUrl && (
                          <a
                            href={arbCase.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs text-purple-500 hover:text-purple-600 transition-colors"
                          >
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                              <polyline points="15 3 21 3 21 9"/>
                              <line x1="10" y1="14" x2="21" y2="3"/>
                            </svg>
                            {arbCase.sourceLabel || '案例来源'}
                          </a>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="px-2 py-0.5 bg-muted rounded">{arbCase.seatOfArbitration}</span>
                          <span className="px-2 py-0.5 bg-muted rounded">{arbCase.governingLaw[0]}</span>
                        </div>
                        <div className="flex items-center gap-4 pt-2 border-t border-outline-variant/20 text-xs">
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                              <span className="text-[8px] text-blue-600">C</span>
                            </div>
                            <span className="text-muted-foreground">{arbCase.parties.claimant.name.split(' ')[0]}</span>
                          </div>
                          <span className="text-muted-foreground">v.</span>
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center">
                              <span className="text-[8px] text-red-600">R</span>
                            </div>
                            <span className="text-muted-foreground">{arbCase.parties.respondent.name.split(' ')[0]}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            /* 自定义上传模式 */
            <div className="space-y-8">
              {/* 案件基本信息 */}
              <section className="bg-card rounded-xl border border-outline-variant/30 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-outline-variant/20">
                  <h2 className="font-medium flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" x2="8" y1="13" y2="13"/>
                      <line x1="16" x2="8" y1="17" y2="17"/>
                      <polyline points="10 9 9 9 8 9"/>
                    </svg>
                    案件信息
                  </h2>
                </div>
                <div className="p-5 space-y-5">
                  {/* 案件类型 */}
                  <div>
                    <label className="block text-sm font-medium mb-2">案件类型</label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setCaseType('civil')}
                        className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                          caseType === 'civil'
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-outline bg-surface text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        民事案件
                      </button>
                      <button
                        type="button"
                        onClick={() => setCaseType('criminal')}
                        className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                          caseType === 'criminal'
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-outline bg-surface text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        刑事案件
                      </button>
                      <button
                        type="button"
                        onClick={() => setCaseType('arbitration')}
                        className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                          caseType === 'arbitration'
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-outline bg-surface text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        国际仲裁
                      </button>
                    </div>
                  </div>

                  {/* 案件名称 */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      案件名称 <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={caseName}
                      onChange={e => setCaseName(e.target.value)}
                      placeholder="例如：张某与李某借贷纠纷案"
                      className="w-full px-4 py-2.5 rounded-lg border border-outline bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>

                  {/* 案件描述 */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      案件描述 <span className="text-destructive">*</span>
                    </label>
                    <textarea
                      value={caseDescription}
                      onChange={e => setCaseDescription(e.target.value)}
                      placeholder="请简要描述案件背景、当事人信息、争议焦点等..."
                      rows={4}
                      className="w-full px-4 py-2.5 rounded-lg border border-outline bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                    />
                  </div>

                  {/* 角色选择 */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {caseType === 'arbitration' ? 'Your Role' : '您的角色'}
                    </label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setUserRole(caseType === 'arbitration' ? 'claimant' : 'plaintiff')}
                        className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                          (caseType === 'arbitration' ? userRole === 'claimant' : userRole === 'plaintiff')
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-outline bg-surface text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        {plaintiffLabel}
                      </button>
                      <button
                        type="button"
                        onClick={() => setUserRole(caseType === 'arbitration' ? 'respondent' : 'defendant')}
                        className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                          (caseType === 'arbitration' ? userRole === 'respondent' : userRole === 'defendant')
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-outline bg-surface text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        {defendantLabel}
                      </button>
                    </div>
                  </div>

                  {/* 对手风格 */}
                  <div>
                    <label className="block text-sm font-medium mb-2">对手 AI 风格</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'standard', label: '标准', desc: '专业理性' },
                        { value: 'aggressive', label: '激进', desc: '积极进攻' },
                        { value: 'moderate', label: '温和', desc: '稳健说理' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setOpponentStyle(opt.value as typeof opponentStyle)}
                          className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                            opponentStyle === opt.value
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-outline bg-surface text-muted-foreground hover:border-primary/50'
                          }`}
                        >
                          <div className="font-medium">{opt.label}</div>
                          <div className="text-xs opacity-70">{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* 案件材料上传 */}
              <section className="bg-card rounded-xl border border-outline-variant/30 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-outline-variant/20">
                  <h2 className="font-medium flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" x2="12" y1="3" y2="15"/>
                    </svg>
                    案件材料
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    支持 docx、pdf 格式，文档中的图片会被自动提取
                  </p>
                </div>
                <div className="p-5 space-y-5">
                  {/* 起诉状 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">
                        起诉状 <span className="text-destructive">*</span>
                      </label>
                      {hasComplaint && (
                        <span className="text-xs text-primary flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6 9 17l-5-5"/>
                          </svg>
                          已上传
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        ref={el => { fileInputRefs.current['complaint'] = el; }}
                        type="file"
                        accept=".docx,.pdf"
                        onChange={e => handleFileSelect('complaint', e)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRefs.current['complaint']?.click()}
                        className="px-4 py-2 rounded-lg border border-dashed border-outline bg-surface hover:border-primary/50 text-sm text-muted-foreground transition-colors"
                      >
                        + 选择文件
                      </button>
                      {uploadedFiles.filter(f => f.type === 'complaint').map(f => (
                        <div key={f.id} className="flex items-center gap-2 text-sm">
                          <span className="text-foreground">{f.name}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(f.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 6 6 18M6 6l12 12"/>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 答辩状 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">
                        答辩状 <span className="text-destructive">*</span>
                      </label>
                      {hasDefense && (
                        <span className="text-xs text-primary flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 6 9 17l-5-5"/>
                          </svg>
                          已上传
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        ref={el => { fileInputRefs.current['defense'] = el; }}
                        type="file"
                        accept=".docx,.pdf"
                        onChange={e => handleFileSelect('defense', e)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRefs.current['defense']?.click()}
                        className="px-4 py-2 rounded-lg border border-dashed border-outline bg-surface hover:border-primary/50 text-sm text-muted-foreground transition-colors"
                      >
                        + 选择文件
                      </button>
                      {uploadedFiles.filter(f => f.type === 'defense').map(f => (
                        <div key={f.id} className="flex items-center gap-2 text-sm">
                          <span className="text-foreground">{f.name}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(f.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 6 6 18M6 6l12 12"/>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 证据材料 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        证据材料 <span className="text-xs">(可选，可上传多份)</span>
                      </label>
                    </div>
                    <div className="space-y-2">
                      <input
                        ref={el => { fileInputRefs.current['evidence'] = el; }}
                        type="file"
                        accept=".docx,.pdf"
                        multiple
                        onChange={e => handleFileSelect('evidence', e)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRefs.current['evidence']?.click()}
                        className="px-4 py-2 rounded-lg border border-dashed border-outline bg-surface hover:border-primary/50 text-sm text-muted-foreground transition-colors"
                      >
                        + 添加证据材料
                      </button>
                      {uploadedFiles.filter(f => f.type === 'evidence').map(f => (
                        <div key={f.id} className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-lg text-sm">
                          <span className="text-foreground">{f.name}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(f.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 6 6 18M6 6l12 12"/>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 其他材料 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        其他材料 <span className="text-xs">(可选)</span>
                      </label>
                    </div>
                    <div className="space-y-2">
                      <input
                        ref={el => { fileInputRefs.current['other'] = el; }}
                        type="file"
                        accept=".docx,.pdf"
                        multiple
                        onChange={e => handleFileSelect('other', e)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRefs.current['other']?.click()}
                        className="px-4 py-2 rounded-lg border border-dashed border-outline bg-surface hover:border-primary/50 text-sm text-muted-foreground transition-colors"
                      >
                        + 添加其他材料
                      </button>
                      {uploadedFiles.filter(f => f.type === 'other').map(f => (
                        <div key={f.id} className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-lg text-sm">
                          <span className="text-foreground">{f.name}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(f.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 6 6 18M6 6l12 12"/>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* 提交按钮 */}
              <button
                onClick={handleStartCustom}
                disabled={isCreating}
                className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? '创建中...' : '开始庭审'}
              </button>

              {/* 上传进度 */}
              {uploadingCount > 0 && (
                <div className="text-center text-sm text-muted-foreground">
                  正在上传文档 ({uploadingCount} 个待处理)
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* 作者其他项目 */}
      <div className="max-w-2xl mx-auto px-4 pb-10">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span className="text-sm text-muted-foreground whitespace-nowrap">作者其他项目：</span>
          <a
            href="https://lawcite.cn"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-outline bg-card hover:bg-muted hover:border-primary/50 transition-all text-sm font-medium"
          >
            <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
            </svg>
            法律文书与检索助手
          </a>
          <a
            href="https://play4compliance.coze.site"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-outline bg-card hover:bg-muted hover:border-primary/50 transition-all text-sm font-medium"
          >
            <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
            企业法务合规宣传助手
          </a>
        </div>
        <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
          <span>联系作者</span>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="16" rx="2"/>
            <path d="M8 2v2M16 2v2M3 10h18"/>
          </svg>
          <span className="font-medium">小红书@摸鱼魔法师</span>
        </div>
      </div>

      {/* 经典案例角色选择对话框 */}
      {presetRoleModal && selectedPreset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setPresetRoleModal(false)}
          />
          <div className="relative bg-card rounded-xl border border-outline-variant/30 p-6 w-full max-w-sm mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold mb-2">
              选择您的角色
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              选择您在此案件中扮演的角色
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => handleStartPreset('plaintiff')}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-outline bg-muted/50 hover:bg-muted hover:border-primary/50 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl">⚖️</span>
                </div>
                <span className="font-medium">
                  {selectedPreset.caseType === 'civil' ? '原告方' : '公诉方'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {selectedPreset.caseType === 'civil' ? '发起诉讼的一方' : '代表国家提起公诉'}
                </span>
              </button>
              <button
                onClick={() => handleStartPreset('defendant')}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-outline bg-muted/50 hover:bg-muted hover:border-primary/50 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center">
                  <span className="text-2xl">🛡️</span>
                </div>
                <span className="font-medium">
                  {selectedPreset.caseType === 'civil' ? '被告方' : '辩护方'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {selectedPreset.caseType === 'civil' ? '被诉的一方' : '为被告人辩护'}
                </span>
              </button>
            </div>
            <button
              onClick={() => setPresetRoleModal(false)}
              className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 国际仲裁角色选择对话框 */}
      {arbitrationRoleModal && selectedArbitrationCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setArbitrationRoleModal(false)}
          />
          <div className="relative bg-card rounded-xl border border-outline-variant/30 p-6 w-full max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-semibold mb-2">
              Select Your Role
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {selectedArbitrationCase.name}
            </p>
            <div className="bg-muted/50 rounded-lg p-3 mb-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-foreground">Tribunal:</span>
                <span>{selectedArbitrationCase.tribunal}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">Seat:</span>
                <span>{selectedArbitrationCase.seatOfArbitration}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => handleStartArbitration('claimant')}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-outline bg-muted/50 hover:bg-muted hover:border-primary/50 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <span className="text-2xl">📋</span>
                </div>
                <span className="font-medium">Claimant</span>
                <span className="text-xs text-muted-foreground text-center">
                  {selectedArbitrationCase.parties.claimant.name}
                </span>
              </button>
              <button
                onClick={() => handleStartArbitration('respondent')}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-outline bg-muted/50 hover:bg-muted hover:border-primary/50 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <span className="text-2xl">🛡️</span>
                </div>
                <span className="font-medium">Respondent</span>
                <span className="text-xs text-muted-foreground text-center">
                  {selectedArbitrationCase.parties.respondent.name}
                </span>
              </button>
            </div>
            <button
              onClick={() => setArbitrationRoleModal(false)}
              className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
