export type AchievementCategory = "focus" | "shield" | "streak" | "mastery";
export type AchievementTier = "bronze" | "silver" | "gold" | "platinum";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  icon: string; // Icon identifier
  xpReward: number;
  tier: AchievementTier;
  maxProgress?: number;
  currentProgress?: number;
  isUnlocked: boolean;
  unlockedAt?: string; // ISO string
}

export interface XpBreakdownItem {
  label: string;
  xp: number;
  icon?: string;
}

export interface SessionRewardSummary {
  sessionId: string;
  earnedXp: number;
  breakdown: XpBreakdownItem[];
  previousLevel: number;
  newLevel: number;
  leveledUp: boolean;
  previousXp: number;
  currentXp: number;
  nextLevelXp: number;
  levelTitle: string;
  newAchievements: Achievement[];
  deflectionsShielded: number;
  streak: number;
  restTokenApplied?: boolean;
}

export interface UserGamificationState {
  level: number;
  title: string;
  currentXp: number;
  nextLevelXp: number;
  totalXp: number;
  levelProgressPercent: number;
  streakTokens: number; // Rest / freeze day tokens
  totalShieldsRepelled: number;
  unlockedAchievementIds: string[];
  unlockedAchievementDates: Record<string, string>; // id -> ISO date
  lastActiveDate: string | null;
  version: number;
}
