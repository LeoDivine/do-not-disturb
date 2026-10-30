/**
 * Gamification & Flow Progression Store
 * Local-first engine for XP, Level Tiers, Zen Shields, Compassionate Streaks,
 * and Serene Focus Milestones.
 */

import {
  Achievement,
  SessionRewardSummary,
  UserGamificationState,
  XpBreakdownItem,
} from "./types";
import { ACHIEVEMENTS_CATALOG } from "./achievements-data";
import {
  getStoredSessions,
  SessionHistoryRecord,
  toLocalDateString,
} from "../sessions/session-store";
import { getDeflectionLogs } from "../blocking/blocklist-store";

export const GAMIFICATION_STORAGE_KEY = "dnd_gamification_v1";
export const GAMIFICATION_UPDATED_EVENT = "dnd-gamification-updated";
export const SESSION_REWARD_EVENT = "dnd-session-reward";

export const LEVEL_TITLES: { minLevel: number; title: string }[] = [
  { minLevel: 50, title: "Enlightened Ascendant" },
  { minLevel: 40, title: "Grandmaster of Flow" },
  { minLevel: 30, title: "Zen Master" },
  { minLevel: 25, title: "Flow Architect" },
  { minLevel: 20, title: "Shield Sovereign" },
  { minLevel: 15, title: "Flow Artisan" },
  { minLevel: 10, title: "Deep Diver" },
  { minLevel: 7, title: "Flow Seeker" },
  { minLevel: 5, title: "Deliberate Thinker" },
  { minLevel: 3, title: "Mindful Pacer" },
  { minLevel: 2, title: "Calm Observer" },
  { minLevel: 1, title: "Novice Focus" },
];

/**
 * Returns title corresponding to current level
 */
export function getLevelTitle(level: number): string {
  const match = LEVEL_TITLES.find((t) => level >= t.minLevel);
  return match ? match.title : "Novice Focus";
}

/**
 * Level progression formula:
 * Level 1 starts at 0 XP, requires 300 XP to reach Level 2.
 * Higher levels scale gently and reward consistency.
 */
export function getXpRequiredForLevel(level: number): number {
  if (level <= 1) return 300;
  // Scaled curve: 300 + 150 * (level - 1)^1.25 rounded to nearest 25
  const raw = 300 + Math.pow(level - 1, 1.25) * 160;
  return Math.round(raw / 25) * 25;
}

/**
 * Calculates level from total lifetime XP
 */
export function calculateLevelFromTotalXp(totalXp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
} {
  let level = 1;
  let remainingXp = Math.max(0, totalXp);

  while (true) {
    const required = getXpRequiredForLevel(level);
    if (remainingXp < required) {
      const progressPercent = Math.min(100, Math.round((remainingXp / required) * 100));
      return {
        level,
        currentLevelXp: remainingXp,
        nextLevelXp: required,
        progressPercent,
      };
    }
    remainingXp -= required;
    level += 1;
  }
}

/**
 * Default empty state
 */
export function getDefaultGamificationState(): UserGamificationState {
  return {
    level: 1,
    title: "Novice Focus",
    currentXp: 0,
    nextLevelXp: 300,
    totalXp: 0,
    levelProgressPercent: 0,
    streakTokens: 2, // 2 initial Compassionate Rest tokens
    totalShieldsRepelled: 0,
    unlockedAchievementIds: [],
    unlockedAchievementDates: {},
    lastActiveDate: null,
    version: 1,
  };
}

/**
 * Retrieve user gamification state from localStorage
 */
export function getStoredGamification(): UserGamificationState {
  if (typeof window === "undefined") {
    return getDefaultGamificationState();
  }

  try {
    const raw = localStorage.getItem(GAMIFICATION_STORAGE_KEY);
    if (!raw) {
      const initial = getDefaultGamificationState();
      // Sync with any existing completed sessions if first time loading
      const bootstrapped = bootstrapFromExistingHistory(initial);
      saveStoredGamification(bootstrapped);
      return bootstrapped;
    }

    const parsed: Partial<UserGamificationState> = JSON.parse(raw);
    const totalXp = typeof parsed.totalXp === "number" ? parsed.totalXp : 0;
    const { level, currentLevelXp, nextLevelXp, progressPercent } =
      calculateLevelFromTotalXp(totalXp);

    return {
      level,
      title: getLevelTitle(level),
      currentXp: currentLevelXp,
      nextLevelXp,
      totalXp,
      levelProgressPercent: progressPercent,
      streakTokens: typeof parsed.streakTokens === "number" ? parsed.streakTokens : 2,
      totalShieldsRepelled:
        typeof parsed.totalShieldsRepelled === "number" ? parsed.totalShieldsRepelled : 0,
      unlockedAchievementIds: Array.isArray(parsed.unlockedAchievementIds)
        ? parsed.unlockedAchievementIds
        : [],
      unlockedAchievementDates: parsed.unlockedAchievementDates || {},
      lastActiveDate: parsed.lastActiveDate || null,
      version: parsed.version || 1,
    };
  } catch {
    return getDefaultGamificationState();
  }
}

/**
 * Save user gamification state
 */
export function saveStoredGamification(state: UserGamificationState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GAMIFICATION_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(
      new CustomEvent(GAMIFICATION_UPDATED_EVENT, { detail: state })
    );
  } catch (err) {
    console.error("Failed to save gamification state:", err);
  }
}

/**
 * If the user already has session history in DND before gamification was introduced,
 * gracefully bootstrap their initial XP and basic achievements so they keep credit!
 */
function bootstrapFromExistingHistory(base: UserGamificationState): UserGamificationState {
  try {
    const sessions = getStoredSessions();
    if (sessions.length === 0) return base;

    let baseBonusXp = 0;
    let shieldsRepelled = 0;
    const unlockedIds = new Set<string>(base.unlockedAchievementIds);
    const dates: Record<string, string> = { ...base.unlockedAchievementDates };
    const nowIso = new Date().toISOString();

    for (const sess of sessions) {
      if (sess.mode !== "focus") continue;
      // XP: 10 per minute
      const minutes = Math.floor(sess.actualSeconds / 60);
      baseBonusXp += minutes * 10;
      if (sess.statusSuccess) {
        baseBonusXp += 50; // Completion bonus
      }
      if (sess.deflectionsCount && sess.deflectionsCount > 0) {
        shieldsRepelled += sess.deflectionsCount;
      }
    }

    if (sessions.length > 0) {
      unlockedIds.add("first_spark");
      dates["first_spark"] = dates["first_spark"] || sessions[sessions.length - 1].completedAt || nowIso;
    }
    const successfulCount = sessions.filter((s) => s.statusSuccess).length;
    if (successfulCount >= 10) {
      unlockedIds.add("steady_cadence");
      dates["steady_cadence"] = nowIso;
    }
    if (successfulCount >= 25) {
      unlockedIds.add("sprint_veteran");
      dates["sprint_veteran"] = nowIso;
    }
    if (successfulCount >= 100) {
      unlockedIds.add("century_sprint");
      dates["century_sprint"] = nowIso;
    }
    if (shieldsRepelled >= 1) {
      unlockedIds.add("shield_initiate");
      dates["shield_initiate"] = nowIso;
    }
    if (shieldsRepelled >= 10) {
      unlockedIds.add("shield_sentinel");
      dates["shield_sentinel"] = nowIso;
    }
    if (shieldsRepelled >= 25) {
      unlockedIds.add("digital_fortress");
      dates["digital_fortress"] = nowIso;
    }
    if (shieldsRepelled >= 50) {
      unlockedIds.add("impenetrable_sanctuary");
      dates["impenetrable_sanctuary"] = nowIso;
    }
    if (shieldsRepelled >= 100) {
      unlockedIds.add("zen_aegis");
      dates["zen_aegis"] = nowIso;
    }

    const totalHours = sessions.filter((s) => s.mode === "focus").reduce((a, s) => a + s.actualSeconds, 0) / 3600;
    if (totalHours >= 1) {
      unlockedIds.add("hour_power");
      dates["hour_power"] = nowIso;
    }
    if (totalHours >= 5) {
      unlockedIds.add("flow_apprentice");
      dates["flow_apprentice"] = nowIso;
    }
    if (totalHours >= 10) {
      unlockedIds.add("flow_adept");
      dates["flow_adept"] = nowIso;
    }
    if (totalHours >= 50) {
      unlockedIds.add("flow_virtuoso");
      dates["flow_virtuoso"] = nowIso;
    }
    if (totalHours >= 100) {
      unlockedIds.add("centurion");
      dates["centurion"] = nowIso;
    }

    const { level, currentLevelXp, nextLevelXp, progressPercent } =
      calculateLevelFromTotalXp(baseBonusXp);

    return {
      ...base,
      totalXp: baseBonusXp,
      level,
      title: getLevelTitle(level),
      currentXp: currentLevelXp,
      nextLevelXp,
      levelProgressPercent: progressPercent,
      totalShieldsRepelled: shieldsRepelled,
      unlockedAchievementIds: Array.from(unlockedIds),
      unlockedAchievementDates: dates,
    };
  } catch {
    return base;
  }
}

/**
 * Returns all achievements with live user progress and unlocked status
 */
export function getAchievementsWithProgress(): Achievement[] {
  const state = getStoredGamification();
  const sessions = getStoredSessions();
  const deflections = getDeflectionLogs();

  const totalFocusSeconds = sessions
    .filter((s) => s.mode === "focus")
    .reduce((acc, s) => acc + s.actualSeconds, 0);
  const totalFocusHours = totalFocusSeconds / 3600;

  const completedCount = sessions.filter(
    (s) => s.mode === "focus" && s.statusSuccess
  ).length;

  const totalDeflectionsCount = deflections.length;

  // Calculate daily session tallies for multi-session streaks and hat-trick records
  const dailyCounts: Record<string, number> = {};
  for (const s of sessions) {
    if (s.mode === "focus" && s.statusSuccess && (s.completedAt || s.startedAt)) {
      const d = (s.completedAt || s.startedAt).split("T")[0];
      dailyCounts[d] = (dailyCounts[d] || 0) + 1;
    }
  }
  const maxDailySessions = Object.values(dailyCounts).reduce((m, c) => Math.max(m, c), 0);

  return ACHIEVEMENTS_CATALOG.map((def) => {
    const isUnlocked = state.unlockedAchievementIds.includes(def.id);
    let currentProgress = 0;

    switch (def.id) {
      case "first_spark":
        currentProgress = completedCount >= 1 ? 1 : 0;
        break;
      case "zen_intent":
        currentProgress = sessions.some(
          (s) => s.mode === "focus" && s.statusSuccess && Boolean(s.intent || s.goal || (s as any).targetIntent || (s as any).primaryAnchor)
        )
          ? 1
          : 0;
        break;
      case "steady_cadence":
        currentProgress = Math.min(10, completedCount);
        break;
      case "deep_diver":
        currentProgress = sessions.some((s) => s.mode === "focus" && s.actualSeconds >= 2700 && s.statusSuccess)
          ? 1
          : 0;
        break;
      case "endurance_master":
        currentProgress = sessions.some((s) => s.mode === "focus" && s.actualSeconds >= 3600 && s.statusSuccess)
          ? 1
          : 0;
        break;
      case "iron_will":
        currentProgress = sessions.some(
          (s) => s.mode === "focus" && s.statusSuccess && s.deflectionsCount === 0 && s.actualSeconds >= 1500
        )
          ? 1
          : 0;
        break;
      case "daily_trio":
        currentProgress = Math.min(3, maxDailySessions);
        break;
      case "high_output_five":
        currentProgress = Math.min(5, maxDailySessions);
        break;
      case "quad_sprint":
        currentProgress = Math.min(4, maxDailySessions);
        break;
      case "sprint_veteran":
        currentProgress = Math.min(def.maxProgress || 25, completedCount);
        break;
      case "century_sprint":
        currentProgress = Math.min(def.maxProgress || 100, completedCount);
        break;
      case "shield_initiate":
        currentProgress = totalDeflectionsCount >= 1 ? 1 : 0;
        break;
      case "shield_sentinel":
        currentProgress = Math.min(10, totalDeflectionsCount);
        break;
      case "digital_fortress":
        currentProgress = Math.min(def.maxProgress || 25, totalDeflectionsCount);
        break;
      case "impenetrable_sanctuary":
        currentProgress = Math.min(50, totalDeflectionsCount);
        break;
      case "zen_aegis":
        currentProgress = Math.min(def.maxProgress || 100, totalDeflectionsCount);
        break;
      case "unshakable_focus":
        currentProgress = sessions.some((s) => (s.deflectionsCount || 0) >= 3 && s.statusSuccess)
          ? 3
          : 0;
        break;
      case "serene_clarity":
        currentProgress = sessions.some((s) => (s.deflectionsCount || 0) >= 5 && s.statusSuccess)
          ? 5
          : 0;
        break;
      case "early_bird":
        currentProgress = sessions.some(
          (s) => s.mode === "focus" && s.statusSuccess && new Date(s.completedAt || s.startedAt).getHours() < 8
        )
          ? 1
          : 0;
        break;
      case "noon_oasis":
        currentProgress = sessions.some((s) => {
          const h = new Date(s.completedAt || s.startedAt).getHours();
          return s.mode === "focus" && s.statusSuccess && h >= 12 && h < 14;
        })
          ? 1
          : 0;
        break;
      case "night_owl":
        currentProgress = sessions.some(
          (s) => s.mode === "focus" && s.statusSuccess && new Date(s.completedAt || s.startedAt).getHours() >= 22
        )
          ? 1
          : 0;
        break;
      case "weekend_warrior":
        currentProgress = sessions.some((s) => {
          const d = new Date(s.completedAt || s.startedAt).getDay();
          return s.mode === "focus" && s.statusSuccess && (d === 0 || d === 6);
        })
          ? 1
          : 0;
        break;
      case "hour_power":
        currentProgress = Math.min(1, Math.round(totalFocusHours * 10) / 10);
        break;
      case "flow_apprentice":
        currentProgress = Math.min(5, Math.round(totalFocusHours * 10) / 10);
        break;
      case "flow_adept":
        currentProgress = Math.min(10, Math.round(totalFocusHours * 10) / 10);
        break;
      case "flow_virtuoso":
        currentProgress = Math.min(50, Math.round(totalFocusHours * 10) / 10);
        break;
      case "centurion":
        currentProgress = Math.min(100, Math.round(totalFocusHours * 10) / 10);
        break;
      case "level_5_ascendant":
        currentProgress = Math.min(5, state.level);
        break;
      case "level_10_ascendant":
        currentProgress = Math.min(10, state.level);
        break;
      case "streak_3":
      case "streak_7":
      case "streak_14":
      case "streak_30":
        // Evaluated during session reward evaluation
        currentProgress = isUnlocked ? (def.maxProgress || 1) : 0;
        break;
      default:
        currentProgress = isUnlocked ? (def.maxProgress || 1) : 0;
    }

    return {
      ...def,
      isUnlocked,
      unlockedAt: state.unlockedAchievementDates[def.id],
      currentProgress,
    };
  });
}

/**
 * Calculates XP and rewards for a completed focus session
 */
export function processSessionRewards(
  session: SessionHistoryRecord,
  streakCount: number = 1
): SessionRewardSummary {
  const currentState = getStoredGamification();
  const previousLevel = currentState.level;
  const previousXp = currentState.currentXp;

  const breakdown: XpBreakdownItem[] = [];
  let totalSessionXp = 0;

  // 1. Base Focus Time XP (+10 XP per minute)
  const focusMinutes = Math.max(1, Math.floor(session.actualSeconds / 60));
  const timeXp = focusMinutes * 10;
  breakdown.push({
    label: `${focusMinutes}m Focused Flow`,
    xp: timeXp,
    icon: "clock",
  });
  totalSessionXp += timeXp;

  // 2. Full Target Completion Bonus
  if (session.statusSuccess) {
    const completionBonus = 50;
    breakdown.push({
      label: "Target Reached Bonus",
      xp: completionBonus,
      icon: "target",
    });
    totalSessionXp += completionBonus;
  }

  // 3. Zero-Distraction Zen Bonus (if completed without deflections)
  if (session.statusSuccess && session.deflectionsCount === 0) {
    const zenBonus = 35;
    breakdown.push({
      label: "Serene Silence (0 Distractions)",
      xp: zenBonus,
      icon: "sparkles",
    });
    totalSessionXp += zenBonus;
  }

  // 4. Deflection Shield Resilience Bonus (+15 XP per deflection absorbed)
  const deflectionsShielded = session.deflectionsCount || 0;
  if (deflectionsShielded > 0) {
    const shieldXp = deflectionsShielded * 15;
    breakdown.push({
      label: `${deflectionsShielded} Distraction${deflectionsShielded > 1 ? "s" : ""} Shielded`,
      xp: shieldXp,
      icon: "shield",
    });
    totalSessionXp += shieldXp;
  }

  // 5. Streak Momentum Bonus
  if (streakCount >= 3) {
    const streakBonus = Math.min(50, streakCount * 5);
    breakdown.push({
      label: `${streakCount}-Day Streak Cadence`,
      xp: streakBonus,
      icon: "flame",
    });
    totalSessionXp += streakBonus;
  }

  // Update total XP and Level
  const newTotalXp = currentState.totalXp + totalSessionXp;
  const { level: newLevel, currentLevelXp, nextLevelXp } =
    calculateLevelFromTotalXp(newTotalXp);
  const leveledUp = newLevel > previousLevel;
  const levelTitle = getLevelTitle(newLevel);

  // Update Shields Repelled
  const newTotalShields = currentState.totalShieldsRepelled + deflectionsShielded;

  // Fetch session history for milestone and achievement calculations
  const storedSessions = getStoredSessions();
  const exists = storedSessions.some((s) => s.id === session.id);
  const allSessions = exists ? storedSessions : [session, ...storedSessions];

  const totalFocusSeconds = allSessions
    .filter((s) => s.mode === "focus")
    .reduce((acc, s) => acc + s.actualSeconds, 0);

  const completedSessions = allSessions.filter(
    (s) => s.mode === "focus" && s.statusSuccess
  );
  const completedCount = completedSessions.length;

  // Check and unlock achievements
  const allAchievements = getAchievementsWithProgress();
  const newlyUnlocked: Achievement[] = [];
  const updatedUnlockedIds = new Set(currentState.unlockedAchievementIds);
  const updatedDates = { ...currentState.unlockedAchievementDates };
  const nowIso = new Date().toISOString();

  // Evaluate each milestone
  const checkUnlock = (id: string, condition: boolean) => {
    if (condition && !updatedUnlockedIds.has(id)) {
      updatedUnlockedIds.add(id);
      updatedDates[id] = nowIso;
      const found = allAchievements.find((a) => a.id === id);
      if (found) {
        newlyUnlocked.push({
          ...found,
          isUnlocked: true,
          unlockedAt: nowIso,
        });
      }
    }
  };

  checkUnlock("first_spark", completedCount >= 1);
  checkUnlock("zen_intent", Boolean(session.intent || session.goal || (session as any).targetIntent || (session as any).primaryAnchor));
  checkUnlock("steady_cadence", completedCount >= 10);
  checkUnlock(
    "deep_diver",
    session.actualSeconds >= 2700 && session.statusSuccess
  );
  checkUnlock(
    "endurance_master",
    session.actualSeconds >= 3600 && session.statusSuccess
  );
  checkUnlock(
    "iron_will",
    session.statusSuccess && deflectionsShielded === 0 && session.actualSeconds >= 1500
  );
  checkUnlock("sprint_veteran", completedCount >= 25);
  checkUnlock("century_sprint", completedCount >= 100);

  // Daily multi-session checks
  const todayStr = toLocalDateString(new Date());
  const todayCompletedCount = completedSessions.filter(
    (s) => (s.completedAt || s.startedAt || "").startsWith(todayStr)
  ).length;
  if (session.statusSuccess) {
    checkUnlock("daily_trio", todayCompletedCount >= 3);
    checkUnlock(
      "quad_sprint",
      todayCompletedCount >= 4 || (session.cycle !== undefined && session.cycle >= 4)
    );
    checkUnlock("high_output_five", todayCompletedCount >= 5);
  }

  // Shield milestones
  checkUnlock("shield_initiate", deflectionsShielded >= 1 || newTotalShields >= 1);
  checkUnlock("shield_sentinel", newTotalShields >= 10);
  checkUnlock("digital_fortress", newTotalShields >= 25);
  checkUnlock("impenetrable_sanctuary", newTotalShields >= 50);
  checkUnlock("zen_aegis", newTotalShields >= 100);
  checkUnlock("unshakable_focus", deflectionsShielded >= 3 && session.statusSuccess);
  checkUnlock("serene_clarity", deflectionsShielded >= 5 && session.statusSuccess);

  // Time of day & weekend checks
  const sessionHour = new Date(session.completedAt || session.startedAt).getHours();
  checkUnlock("early_bird", sessionHour < 8);
  checkUnlock("noon_oasis", sessionHour >= 12 && sessionHour < 14 && session.statusSuccess);
  checkUnlock("night_owl", sessionHour >= 22);

  const dayOfWeek = new Date().getDay();
  checkUnlock("weekend_warrior", (dayOfWeek === 0 || dayOfWeek === 6) && session.statusSuccess);

  // Streak milestones
  checkUnlock("streak_3", streakCount >= 3);
  checkUnlock("streak_7", streakCount >= 7);
  checkUnlock("streak_14", streakCount >= 14);
  checkUnlock("streak_30", streakCount >= 30);

  // Cumulative hours checks
  const cumulativeHours = totalFocusSeconds / 3600;
  checkUnlock("hour_power", cumulativeHours >= 1);
  checkUnlock("flow_apprentice", cumulativeHours >= 5);
  checkUnlock("flow_adept", cumulativeHours >= 10);
  checkUnlock("flow_virtuoso", cumulativeHours >= 50);
  checkUnlock("centurion", cumulativeHours >= 100);

  // Level milestones
  checkUnlock("level_5_ascendant", newLevel >= 5);
  checkUnlock("level_10_ascendant", newLevel >= 10);

  // Calculate bonus XP from newly unlocked achievements
  let achievementBonusXp = 0;
  for (const ach of newlyUnlocked) {
    achievementBonusXp += ach.xpReward;
  }
  if (achievementBonusXp > 0) {
    breakdown.push({
      label: `Achievements (${newlyUnlocked.length} Unlocked)`,
      xp: achievementBonusXp,
      icon: "award",
    });
    totalSessionXp += achievementBonusXp;
  }

  // Recalculate level if achievement bonuses triggered a jump
  const finalTotalXp = newTotalXp + achievementBonusXp;
  const finalCalc = calculateLevelFromTotalXp(finalTotalXp);

  // Compassionate rest token accrual: earn 1 token every 5 days of streak
  let currentTokens = currentState.streakTokens;
  if (streakCount > 0 && streakCount % 5 === 0 && streakCount > 0) {
    currentTokens = Math.min(5, currentTokens + 1); // Cap at 5 rest tokens
  }

  const updatedState: UserGamificationState = {
    ...currentState,
    level: finalCalc.level,
    title: getLevelTitle(finalCalc.level),
    currentXp: finalCalc.currentLevelXp,
    nextLevelXp: finalCalc.nextLevelXp,
    totalXp: finalTotalXp,
    levelProgressPercent: finalCalc.progressPercent,
    streakTokens: currentTokens,
    totalShieldsRepelled: newTotalShields,
    unlockedAchievementIds: Array.from(updatedUnlockedIds),
    unlockedAchievementDates: updatedDates,
    lastActiveDate: todayStr,
  };

  saveStoredGamification(updatedState);

  const summary: SessionRewardSummary = {
    sessionId: session.id,
    earnedXp: totalSessionXp,
    breakdown,
    previousLevel,
    newLevel: finalCalc.level,
    leveledUp: finalCalc.level > previousLevel,
    previousXp,
    currentXp: finalCalc.currentLevelXp,
    nextLevelXp: finalCalc.nextLevelXp,
    levelTitle: getLevelTitle(finalCalc.level),
    newAchievements: newlyUnlocked,
    deflectionsShielded,
    streak: streakCount,
  };

  // Cache latest reward summary for the modal to display immediately
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("dnd_latest_session_reward", JSON.stringify(summary));
      window.dispatchEvent(
        new CustomEvent(SESSION_REWARD_EVENT, { detail: summary })
      );
    } catch (e) {
      console.error("Failed to dispatch session reward event:", e);
    }
  }

  return summary;
}

/**
 * Manually consume a Compassionate Rest Token to protect a streak
 */
export function useCompassionateRestToken(): boolean {
  const state = getStoredGamification();
  if (state.streakTokens <= 0) return false;

  const todayStr = toLocalDateString(new Date());
  saveStoredGamification({
    ...state,
    streakTokens: state.streakTokens - 1,
    lastActiveDate: todayStr,
  });
  return true;
}
