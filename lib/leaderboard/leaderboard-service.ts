import { prisma } from "../prisma";
import { getLevelTitle } from "../gamification/gamification-store";
import {
  LeaderboardEntry,
  LeaderboardMetric,
  LeaderboardResponse,
  LeaderboardTimeframe,
  LeaderboardUser,
} from "./types";

interface ComputeLeaderboardParams {
  metric?: LeaderboardMetric;
  timeframe?: LeaderboardTimeframe;
  currentUserId?: string | null;
  guestStats?: {
    name?: string;
    totalXp?: number;
    level?: number;
    focusHours?: number;
    streak?: number;
    shieldsRepelled?: number;
  };
}

function getStartOfTimeframe(timeframe: LeaderboardTimeframe): Date | null {
  const now = new Date();
  if (timeframe === "this_week") {
    // Current week starting Monday 00:00:00
    const d = new Date(now);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (timeframe === "this_month") {
    // Current month starting 1st day 00:00:00
    return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  }
  return null;
}

export async function getLeaderboardData({
  metric = "xp",
  timeframe = "all_time",
  currentUserId = null,
  guestStats,
}: ComputeLeaderboardParams): Promise<LeaderboardResponse> {
  const allUsersMap = new Map<string, LeaderboardUser>();

  const startDate = getStartOfTimeframe(timeframe);

  // 1. Query actual database users — NO dummy data
  try {
    const dbUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        gamification: {
          select: {
            level: true,
            totalXp: true,
            totalShieldsRepelled: true,
          },
        },
        streak: {
          select: {
            currentStreak: true,
            totalFocusHours: true,
          },
        },
        sessions: {
          where: {
            status: "COMPLETED",
            ...(startDate ? { startedAt: { gte: startDate } } : {}),
          },
          select: {
            actualDuration: true,
            startedAt: true,
          },
        },
      },
      take: 200,
    });

    for (const u of dbUsers) {
      const sessionSeconds = u.sessions.reduce(
        (acc, s) => acc + (s.actualDuration || 0),
        0
      );
      const sessionHours = Math.round((sessionSeconds / 3600) * 10) / 10;

      let focusHours = sessionHours;
      if (timeframe === "all_time" && u.streak?.totalFocusHours) {
        focusHours = Math.max(
          sessionHours,
          Math.round(u.streak.totalFocusHours * 10) / 10
        );
      }

      let totalXp = u.gamification?.totalXp ?? 0;
      if (timeframe !== "all_time") {
        // Compute timeframe-specific XP from actual completed sessions:
        // ~2 XP per focused minute + 25 XP completion bonus
        const sessionXp = u.sessions.reduce((acc, s) => {
          const minutes = Math.floor((s.actualDuration || 0) / 60);
          return acc + minutes * 2 + 25;
        }, 0);
        totalXp = sessionXp;
      }

      const level = u.gamification?.level ?? 1;
      const streak = u.streak?.currentStreak ?? 0;
      const shields = u.gamification?.totalShieldsRepelled ?? 0;

      const displayName =
        u.name || (u.email ? u.email.split("@")[0] : "Focus User");

      allUsersMap.set(u.id, {
        id: u.id,
        name: displayName,
        email: u.email,
        avatarUrl: u.avatarUrl,
        level,
        levelTitle: getLevelTitle(level),
        totalXp,
        focusHours,
        streak,
        shieldsRepelled: shields,
      });
    }
  } catch (err) {
    console.error("Database query failed while generating leaderboard:", err);
  }

  // 2. Identify and resolve current user
  let resolvedCurrentUserId: string | null = null;

  if (currentUserId) {
    resolvedCurrentUserId = currentUserId;
    if (allUsersMap.has(currentUserId)) {
      const existing = allUsersMap.get(currentUserId)!;
      if (guestStats) {
        // Merge client-side active session updates if available
        if (timeframe === "all_time") {
          existing.totalXp = Math.max(existing.totalXp, guestStats.totalXp ?? 0);
          existing.focusHours = Math.max(existing.focusHours, guestStats.focusHours ?? 0);
        }
        existing.level = Math.max(existing.level, guestStats.level ?? 1);
        existing.levelTitle = getLevelTitle(existing.level);
        existing.streak = Math.max(existing.streak, guestStats.streak ?? 0);
        existing.shieldsRepelled = Math.max(existing.shieldsRepelled, guestStats.shieldsRepelled ?? 0);
      }
      allUsersMap.set(currentUserId, existing);
    } else {
      // Newly created/authenticated user without DB gamification record yet
      const level = guestStats?.level ?? 1;
      allUsersMap.set(currentUserId, {
        id: currentUserId,
        name: guestStats?.name || "You",
        email: null,
        avatarUrl: null,
        level,
        levelTitle: getLevelTitle(level),
        totalXp: guestStats?.totalXp ?? 0,
        focusHours: guestStats?.focusHours ?? 0,
        streak: guestStats?.streak ?? 0,
        shieldsRepelled: guestStats?.shieldsRepelled ?? 0,
      });
    }
  } else if (guestStats) {
    // Unauthenticated guest user: place their local progress in the ranking
    resolvedCurrentUserId = "guest-local-user";
    const level = guestStats.level ?? 1;
    allUsersMap.set(resolvedCurrentUserId, {
      id: resolvedCurrentUserId,
      name: guestStats.name || "You (Local)",
      email: null,
      avatarUrl: null,
      level,
      levelTitle: getLevelTitle(level),
      totalXp: guestStats.totalXp ?? 0,
      focusHours: guestStats.focusHours ?? 0,
      streak: guestStats.streak ?? 0,
      shieldsRepelled: guestStats.shieldsRepelled ?? 0,
    });
  }

  // 3. Score users according to chosen metric
  const userList = Array.from(allUsersMap.values());

  const scoredList = userList.map((user) => {
    const isCurrentUser = Boolean(
      resolvedCurrentUserId && user.id === resolvedCurrentUserId
    );

    let rawScore = 0;
    if (metric === "xp") {
      rawScore = user.totalXp;
    } else if (metric === "hours") {
      rawScore = user.focusHours;
    } else if (metric === "streak") {
      rawScore = user.streak;
    }

    let scoreDisplay = "";
    if (metric === "xp") {
      scoreDisplay = `${rawScore.toLocaleString()} XP`;
    } else if (metric === "hours") {
      scoreDisplay = `${rawScore.toFixed(1)} hrs`;
    } else if (metric === "streak") {
      scoreDisplay = `${rawScore} ${rawScore === 1 ? "day" : "days"}`;
    }

    return {
      ...user,
      isCurrentUser,
      score: rawScore,
      scoreDisplay,
    };
  });

  // 4. Sort descending by score, tiebreak by totalXp, then focusHours, then name
  scoredList.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.totalXp !== a.totalXp) return b.totalXp - a.totalXp;
    if (b.focusHours !== a.focusHours) return b.focusHours - a.focusHours;
    return a.name.localeCompare(b.name);
  });

  // 5. Assign 1-based ranks
  const rankedEntries: LeaderboardEntry[] = scoredList.map((item, idx) => {
    const rank = idx + 1;
    const percentile = Math.max(
      1,
      Math.round((rank / Math.max(1, scoredList.length)) * 100)
    );
    return {
      ...item,
      rank,
      percentile,
    };
  });

  // 6. Find current user entry and surrounding competitor context
  const currentIndex = rankedEntries.findIndex((e) => e.isCurrentUser);
  const currentUser = currentIndex !== -1 ? rankedEntries[currentIndex] : null;

  // First place entry
  const firstPlace = rankedEntries.length > 0 ? rankedEntries[0] : null;

  // User directly above current user (Rank N - 1)
  let userAbove: LeaderboardResponse["userAbove"] = null;
  if (currentUser && currentIndex > 0) {
    const above = rankedEntries[currentIndex - 1];
    const diff = Math.max(0, above.score - currentUser.score);
    let diffDisplay = "";
    if (metric === "xp") {
      diffDisplay = `${diff.toLocaleString()} XP to pass`;
    } else if (metric === "hours") {
      diffDisplay = `${diff.toFixed(1)} hrs to pass`;
    } else if (metric === "streak") {
      diffDisplay = `${diff} ${diff === 1 ? "day" : "days"} to pass`;
    }

    userAbove = {
      entry: above,
      diff,
      diffDisplay,
    };
  }

  // User directly below current user (Rank N + 1)
  let userBelow: LeaderboardResponse["userBelow"] = null;
  if (currentUser && currentIndex < rankedEntries.length - 1) {
    const below = rankedEntries[currentIndex + 1];
    const diff = Math.max(0, currentUser.score - below.score);
    let leadDisplay = "";
    if (metric === "xp") {
      leadDisplay = `${diff.toLocaleString()} XP lead`;
    } else if (metric === "hours") {
      leadDisplay = `${diff.toFixed(1)} hrs lead`;
    } else if (metric === "streak") {
      leadDisplay = `${diff} ${diff === 1 ? "day" : "days"} lead`;
    }

    userBelow = {
      entry: below,
      diff,
      diffDisplay: leadDisplay,
    };
  }

  // 7. Enforce: "keep the total amount of record to 25"
  // and: "for a logged in user, their record and position should always be in view, even though they are the last"
  const MAX_RECORDS = 25;
  let topEntries: LeaderboardEntry[] = [];

  if (rankedEntries.length <= MAX_RECORDS) {
    topEntries = [...rankedEntries];
  } else {
    // There are more than 25 records
    if (currentIndex === -1 || currentIndex < MAX_RECORDS) {
      // User is within the top 25 (or not logged in): simply take the top 25
      topEntries = rankedEntries.slice(0, MAX_RECORDS);
    } else {
      // Current user is beyond rank 25 (e.g. rank 30 or the last rank):
      // Keep total records to exactly 25 by showing top 24 records + the current user record!
      topEntries = [
        ...rankedEntries.slice(0, MAX_RECORDS - 1),
        rankedEntries[currentIndex],
      ];
    }
  }

  return {
    metric,
    timeframe,
    totalParticipants: rankedEntries.length,
    firstPlace,
    currentUser,
    userAbove,
    userBelow,
    topEntries,
    generatedAt: new Date().toISOString(),
  };
}
