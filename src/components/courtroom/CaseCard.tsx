'use client';

import { PresetCase } from '@/lib/data/preset-cases';
import { Scale, FileText, Home, Car, Briefcase, Star, Trophy, Zap, ImageIcon } from 'lucide-react';
import { CaseType } from '@/types/court';
import Image from 'next/image';
import { useState } from 'react';

const iconMap = {
  balance: Scale,
  document: FileText,
  home: Home,
  car: Car,
  briefcase: Briefcase,
};

const caseTypeLabel: Record<CaseType, string> = {
  civil: '民事',
  criminal: '刑事',
  arbitration: 'International Arbitration',
};

const caseTypeColor: Record<CaseType, string> = {
  civil: 'text-blue-400',
  criminal: 'text-red-400',
  arbitration: 'text-purple-400',
};

interface CaseCardProps {
  case: PresetCase;
  onSelect: () => void;
  disabled?: boolean;
}

function StarRating({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= level
              ? 'fill-amber-400 text-amber-400'
              : 'fill-slate-700 text-slate-600'
          }`}
        />
      ))}
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: '入门' | '进阶' | '挑战' }) {
  const colors = {
    入门: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    进阶: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    挑战: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${colors[difficulty]}`}>
      {difficulty}
    </span>
  );
}

export function CaseCard({ case: c, onSelect, disabled }: CaseCardProps) {
  const Icon = iconMap[c.iconType] || Scale;
  const [imgError, setImgError] = useState(false);

  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className="relative w-full text-left rounded-xl border transition-all duration-300 bg-slate-800/50 border-slate-700/50 hover:border-slate-600 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
    >
      {/* 内容层 */}
      <div className="relative z-10 p-5">
        {/* 封面图展示窗口 */}
        {c.imageUrl && !imgError ? (
          <div className="mb-3 rounded-lg overflow-hidden bg-slate-700/30 h-28 relative">
            <img
              src={c.imageUrl}
              alt={c.caseName}
              loading="lazy"
              className="w-full h-full object-cover object-center"
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          <div className="mb-3 rounded-lg bg-slate-700/30 h-28 flex items-center justify-center">
            <Icon className="w-10 h-10 text-slate-500" />
          </div>
        )}

        {/* 难度星级 */}
        <div className="flex items-center justify-between mb-3">
          <StarRating level={c.starLevel} />
          <DifficultyBadge difficulty={c.difficulty} />
        </div>

        {/* 案例图标和信息 */}
        <div className="flex items-start gap-4">
          {/* 案例图标 */}
          <div className="shrink-0 w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center">
            <Icon className="w-5 h-5 text-slate-400" />
          </div>

          {/* 文字信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-medium ${caseTypeColor[c.caseType]}`}>
                {caseTypeLabel[c.caseType]}
              </span>
              {c.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400"
                >
                  {tag}
                </span>
              ))}
            </div>
            <h3 className="font-semibold text-sm leading-tight mb-1 text-slate-200">
              {c.caseName}
            </h3>
            <p className="text-xs text-slate-500 line-clamp-2">{c.summary}</p>
          </div>
        </div>

        {/* 通关奖励 */}
        <div className="mt-4 pt-3 border-t border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-medium text-slate-400">通关奖励</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {c.rewards.map((reward, idx) => (
              <span
                key={idx}
                className="text-xs px-2 py-1 rounded bg-slate-700/30 text-slate-400 flex items-center gap-1"
              >
                <Zap className="w-3 h-3 text-amber-500" />
                {reward}
              </span>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}
