'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ACHIEVEMENTS, Achievement, RARITY_COLORS, CATEGORY_NAMES, getAchievementStats } from '@/lib/achievements';
import {
  Gavel,
  Scale,
  Crown,
  Trophy,
  Flame,
  Zap,
  FileText,
  Shield,
  CheckCircle,
  CheckSquare,
  MessageCircle,
  Search,
  AlertTriangle,
  Star,
  UserCheck,
  ShieldCheck,
  TrendingUp,
  Clock,
  Award,
  Lock,
  X,
} from 'lucide-react';

// 图标映射
const ICON_MAP: Record<string, React.ReactNode> = {
  gavel: <Gavel className="w-8 h-8" />,
  scales: <Scale className="w-8 h-8" />,
  crown: <Crown className="w-8 h-8" />,
  trophy: <Trophy className="w-8 h-8" />,
  flame: <Flame className="w-8 h-8" />,
  zap: <Zap className="w-8 h-8" />,
  'file-text': <FileText className="w-8 h-8" />,
  shield: <Shield className="w-8 h-8" />,
  'check-circle': <CheckCircle className="w-8 h-8" />,
  'check-square': <CheckSquare className="w-8 h-8" />,
  'message-circle': <MessageCircle className="w-8 h-8" />,
  search: <Search className="w-8 h-8" />,
  'alert-triangle': <AlertTriangle className="w-8 h-8" />,
  star: <Star className="w-8 h-8" />,
  'user-check': <UserCheck className="w-8 h-8" />,
  'shield-check': <ShieldCheck className="w-8 h-8" />,
  'trending-up': <TrendingUp className="w-8 h-8" />,
  clock: <Clock className="w-8 h-8" />,
  award: <Award className="w-8 h-8" />,
};

interface MedalsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MedalsModal({ open, onOpenChange }: MedalsModalProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    // 从 localStorage 加载成就
    const saved = localStorage.getItem('court-achievements');
    if (saved) {
      const savedData = JSON.parse(saved);
      // 合并保存的成就状态和预设成就
      const merged = ACHIEVEMENTS.map(a => {
        const savedAchievement = savedData.find((s: Achievement) => s.id === a.id);
        return savedAchievement || { ...a, unlocked: false };
      });
      setAchievements(merged);
    } else {
      // 初始化未解锁的成就
      setAchievements(ACHIEVEMENTS.map(a => ({ ...a, unlocked: false })));
    }
  }, [open]);

  const stats = getAchievementStats(achievements);

  const filteredAchievements = activeCategory === 'all'
    ? achievements
    : achievements.filter(a => a.category === activeCategory);

  const categories = ['all', 'trial', 'case', 'skill', 'special'] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">法师勋章</DialogTitle>
              <p className="text-sm text-muted-foreground">
                已解锁 {stats.unlocked}/{stats.total} 个成就
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* 分类筛选 */}
        <div className="flex gap-2 flex-shrink-0 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              }`}
            >
              {cat === 'all' ? '全部' : CATEGORY_NAMES[cat as keyof typeof CATEGORY_NAMES]}
              {cat !== 'all' && (
                <span className="ml-2 text-xs opacity-70">
                  {stats.byCategory[cat as keyof typeof stats.byCategory]?.unlocked || 0}
                  /{stats.byCategory[cat as keyof typeof stats.byCategory]?.total || 0}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 成就列表 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto flex-1 pr-2">
          {filteredAchievements.map(achievement => {
            const colors = RARITY_COLORS[achievement.rarity];
            return (
              <div
                key={achievement.id}
                className={`
                  relative rounded-xl p-4 transition-all duration-300
                  ${achievement.unlocked ? colors.bg : 'bg-muted/50'}
                  ${achievement.unlocked ? `border-2 ${colors.border}` : 'border border-border opacity-60'}
                  ${achievement.unlocked ? 'hover:scale-105 hover:shadow-lg' : ''}
                  ${achievement.unlocked && colors.glow ? `hover:shadow-[0_0_20px_var(--tw-shadow-color)]` : ''}
                `}
              >
                {/* 稀有度标签 */}
                <div className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium ${colors.text} ${colors.bg}`}>
                  {achievement.rarity === 'legendary' && '传说'}
                  {achievement.rarity === 'epic' && '史诗'}
                  {achievement.rarity === 'rare' && '稀有'}
                  {achievement.rarity === 'common' && '普通'}
                </div>

                {/* 图标 */}
                <div className={`flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-3 ${
                  achievement.unlocked ? colors.bg : 'bg-muted'
                }`}>
                  {achievement.unlocked ? (
                    <div className={colors.text}>
                      {ICON_MAP[achievement.icon]}
                    </div>
                  ) : (
                    <Lock className="w-8 h-8 text-muted-foreground/50" />
                  )}
                </div>

                {/* 名称和描述 */}
                <h3 className={`font-bold text-center mb-1 ${achievement.unlocked ? '' : 'text-muted-foreground'}`}>
                  {achievement.unlocked ? achievement.name : '???'}
                </h3>
                <p className={`text-xs text-center ${achievement.unlocked ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>
                  {achievement.unlocked ? achievement.description : '未解锁'}
                </p>

                {/* 解锁时间 */}
                {achievement.unlocked && achievement.unlockedAt && (
                  <p className="text-[10px] text-center text-muted-foreground/60 mt-2">
                    {new Date(achievement.unlockedAt).toLocaleDateString('zh-CN')}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 成就徽章按钮组件
export function MedalsButton({ className }: { className?: string }) {
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('court-achievements');
    if (saved) {
      const data = JSON.parse(saved);
      setUnlockedCount(data.filter((a: Achievement) => a.unlocked).length);
    }
  }, []);

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className={`relative flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium shadow-lg hover:shadow-xl transition-all hover:scale-105 ${className}`}
      >
        <Award className="w-5 h-5" />
        <span className="hidden sm:inline">法师勋章</span>
        {unlockedCount > 0 && (
          <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md">
            {unlockedCount}
          </span>
        )}
      </button>
      <MedalsModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
