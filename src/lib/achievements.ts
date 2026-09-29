import { CaseType, RoleId } from '@/types/court';

// 成就类型
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'trial' | 'case' | 'skill' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlocked: boolean;
  unlockedAt?: string;
  progress?: {
    current: number;
    target: number;
  };
}

// 成就定义
export const ACHIEVEMENTS: Omit<Achievement, 'unlocked' | 'unlockedAt' | 'progress'>[] = [
  // 庭审成就
  {
    id: 'first_trial',
    name: '初出茅庐',
    description: '完成你的第一场模拟庭审',
    icon: 'gavel',
    category: 'trial',
    rarity: 'common',
  },
  {
    id: 'trial_master_5',
    name: '庭审达人',
    description: '累计完成5场庭审',
    icon: 'scales',
    category: 'trial',
    rarity: 'common',
  },
  {
    id: 'trial_master_20',
    name: '资深法官',
    description: '累计完成20场庭审',
    icon: 'crown',
    category: 'trial',
    rarity: 'rare',
  },
  {
    id: 'trial_master_50',
    name: '律政精英',
    description: '累计完成50场庭审',
    icon: 'trophy',
    category: 'trial',
    rarity: 'epic',
  },
  {
    id: 'winning_streak_3',
    name: '连胜新星',
    description: '连续赢得3场庭审',
    icon: 'flame',
    category: 'trial',
    rarity: 'rare',
  },
  {
    id: 'winning_streak_10',
    name: '常胜将军',
    description: '连续赢得10场庭审',
    icon: 'zap',
    category: 'trial',
    rarity: 'legendary',
  },

  // 案件成就
  {
    id: 'civil_case',
    name: '民事先锋',
    description: '完成一场民事案件庭审',
    icon: 'file-text',
    category: 'case',
    rarity: 'common',
  },
  {
    id: 'criminal_case',
    name: '刑事卫士',
    description: '完成一场刑事案件庭审',
    icon: 'shield',
    category: 'case',
    rarity: 'common',
  },
  {
    id: 'all_cases_civil',
    name: '民事全通',
    description: '完成所有民事经典案例',
    icon: 'check-circle',
    category: 'case',
    rarity: 'epic',
  },
  {
    id: 'all_cases_criminal',
    name: '刑事全通',
    description: '完成所有刑事经典案例',
    icon: 'check-square',
    category: 'case',
    rarity: 'epic',
  },

  // 技能成就
  {
    id: 'quick_witted',
    name: '机敏善辩',
    description: '在辩论环节获得法官3次以上认可',
    icon: 'message-circle',
    category: 'skill',
    rarity: 'rare',
  },
  {
    id: 'evidence_master',
    name: '证据大师',
    description: '成功举证质证5次',
    icon: 'search',
    category: 'skill',
    rarity: 'rare',
  },
  {
    id: 'objection_master',
    name: '异议高手',
    description: '提出10次有效异议',
    icon: 'alert-triangle',
    category: 'skill',
    rarity: 'epic',
  },
  {
    id: 'perfect_argument',
    name: '完美论证',
    description: '单场庭审获得法官满分评价',
    icon: 'star',
    category: 'skill',
    rarity: 'legendary',
  },

  // 特殊成就
  {
    id: 'plaintif_win',
    name: '原告之胜',
    description: '以原告身份赢得庭审',
    icon: 'user-check',
    category: 'special',
    rarity: 'rare',
  },
  {
    id: 'defendant_win',
    name: '被告之胜',
    description: '以被告身份赢得庭审',
    icon: 'shield-check',
    category: 'special',
    rarity: 'rare',
  },
  {
    id: 'dark_horse',
    name: '黑马逆袭',
    description: '以低难度案例战胜高难度对手',
    icon: 'trending-up',
    category: 'special',
    rarity: 'legendary',
  },
  {
    id: 'marathon',
    name: '庭审马拉松',
    description: '一天内完成3场以上庭审',
    icon: 'clock',
    category: 'special',
    rarity: 'epic',
  },
  {
    id: 'veteran',
    name: '模拟法庭守护者',
    description: '累计完成100场庭审',
    icon: 'award',
    category: 'special',
    rarity: 'legendary',
  },
];

// 成就颜色映射
export const RARITY_COLORS = {
  common: { bg: 'bg-slate-100 dark:bg-slate-800', border: 'border-slate-300 dark:border-slate-600', text: 'text-slate-600 dark:text-slate-300', glow: '' },
  rare: { bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-400', text: 'text-blue-600 dark:text-blue-400', glow: 'shadow-blue-500/50' },
  epic: { bg: 'bg-purple-100 dark:bg-purple-900/30', border: 'border-purple-400', text: 'text-purple-600 dark:text-purple-400', glow: 'shadow-purple-500/50' },
  legendary: { bg: 'bg-amber-100 dark:bg-amber-900/30', border: 'border-amber-400', text: 'text-amber-600 dark:text-amber-400', glow: 'shadow-amber-500/50' },
};

// 分类名称映射
export const CATEGORY_NAMES = {
  trial: '庭审成就',
  case: '案件成就',
  skill: '技能成就',
  special: '特殊成就',
};

// 获取成就统计数据
export function getAchievementStats(achievements: Achievement[]) {
  const total = ACHIEVEMENTS.length;
  const unlocked = achievements.filter(a => a.unlocked).length;
  const byCategory = {
    trial: { total: 0, unlocked: 0 },
    case: { total: 0, unlocked: 0 },
    skill: { total: 0, unlocked: 0 },
    special: { total: 0, unlocked: 0 },
  };

  ACHIEVEMENTS.forEach(a => {
    byCategory[a.category].total++;
  });
  achievements.filter(a => a.unlocked).forEach(a => {
    byCategory[a.category].unlocked++;
  });

  return { total, unlocked, byCategory };
}

// 解锁成就
export function unlockAchievement(achievementId: string): Achievement | null {
  if (typeof window === 'undefined') return null;

  const saved = localStorage.getItem('court-achievements');
  let achievements: Achievement[] = [];

  if (saved) {
    achievements = JSON.parse(saved);
  } else {
    achievements = ACHIEVEMENTS.map(a => ({ ...a, unlocked: false }));
  }

  const index = achievements.findIndex(a => a.id === achievementId);
  if (index === -1) return null;

  if (achievements[index].unlocked) return null; // 已经解锁

  achievements[index] = {
    ...achievements[index],
    unlocked: true,
    unlockedAt: new Date().toISOString(),
  };

  localStorage.setItem('court-achievements', JSON.stringify(achievements));
  return achievements[index];
}

// 检查并更新成就（根据条件）
export function checkAndUpdateAchievements(context: {
  trialCount?: number;
  civilCaseCount?: number;
  criminalCaseCount?: number;
  plaintiffWin?: boolean;
  defendantWin?: boolean;
  consecutiveWins?: number;
}): Achievement[] {
  if (typeof window === 'undefined') return [];

  const unlocked: Achievement[] = [];

  // 第一场庭审
  if (context.trialCount === 1) {
    const result = unlockAchievement('first_trial');
    if (result) unlocked.push(result);
  }

  // 庭审次数成就
  if (context.trialCount === 5) {
    const result = unlockAchievement('trial_master_5');
    if (result) unlocked.push(result);
  }
  if (context.trialCount === 20) {
    const result = unlockAchievement('trial_master_20');
    if (result) unlocked.push(result);
  }
  if (context.trialCount === 50) {
    const result = unlockAchievement('trial_master_50');
    if (result) unlocked.push(result);
  }
  if (context.trialCount === 100) {
    const result = unlockAchievement('veteran');
    if (result) unlocked.push(result);
  }

  // 连胜成就
  if (context.consecutiveWins === 3) {
    const result = unlockAchievement('winning_streak_3');
    if (result) unlocked.push(result);
  }
  if (context.consecutiveWins === 10) {
    const result = unlockAchievement('winning_streak_10');
    if (result) unlocked.push(result);
  }

  // 案件类型成就
  if ((context.civilCaseCount ?? 0) >= 1) {
    const result = unlockAchievement('civil_case');
    if (result) unlocked.push(result);
  }
  if ((context.criminalCaseCount ?? 0) >= 1) {
    const result = unlockAchievement('criminal_case');
    if (result) unlocked.push(result);
  }

  // 胜负成就
  if (context.plaintiffWin) {
    const result = unlockAchievement('plaintif_win');
    if (result) unlocked.push(result);
  }
  if (context.defendantWin) {
    const result = unlockAchievement('defendant_win');
    if (result) unlocked.push(result);
  }

  return unlocked;
}

// 获取所有成就
export function getAllAchievements(): Achievement[] {
  if (typeof window === 'undefined') {
    return ACHIEVEMENTS.map(a => ({ ...a, unlocked: false }));
  }

  const saved = localStorage.getItem('court-achievements');
  if (saved) {
    const savedData = JSON.parse(saved);
    return ACHIEVEMENTS.map(a => {
      const savedAchievement = savedData.find((s: Achievement) => s.id === a.id);
      return savedAchievement || { ...a, unlocked: false };
    });
  }

  return ACHIEVEMENTS.map(a => ({ ...a, unlocked: false }));
}

