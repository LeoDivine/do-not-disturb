import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getCurrentUser } from "../../../lib/auth";
import { SyncPayload } from "../../../lib/sync/sync-types";

export async function fetchCloudSyncPayload(userId: string): Promise<SyncPayload> {
  const [dbUser, blocklist, shortcuts, presets, streak, focusSessions, rawDeflections] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true },
    }),
    prisma.blockedWebsite.findMany({
      where: { userId },
      orderBy: { deflections: "desc" },
    }),
    prisma.userShortcut.findMany({
      where: { userId },
    }),
    prisma.timerPreset.findMany({
      where: { userId },
    }),
    prisma.userStreak.findUnique({
      where: { userId },
    }),
    prisma.focusSession.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 200,
    }),
    prisma.deflectionEvent.findMany({
      where: { userId },
      orderBy: { attemptedAt: "desc" },
      take: 100,
    }).catch(() => []),
  ]);

  let gamification: any = null;
  let achievements: any[] = [];
  try {
    if ((prisma as any).userGamification) {
      gamification = await (prisma as any).userGamification.findUnique({
        where: { userId },
      });
    }
    if ((prisma as any).userAchievement) {
      achievements = await (prisma as any).userAchievement.findMany({
        where: { userId },
      });
    }
  } catch (e) {
    console.warn("Could not query gamification from database:", e);
  }

  // Extract special metadata stored in user shortcuts table
  const visualModeShortcut = shortcuts.find((s) => s.actionType === "__visual_mode__");
  const shortcutsEnabledShortcut = shortcuts.find((s) => s.actionType === "__shortcuts_enabled__");
  const primaryAnchorShortcut = shortcuts.find((s) => s.actionType === "__primary_anchor__");
  const sessionIntentShortcut = shortcuts.find((s) => s.actionType === "__session_intent__");
  const normalShortcuts = shortcuts.filter(
    (s) => !s.actionType.startsWith("__")
  );

  // Extract latest primary anchor & session intent
  const latestWithGoal = focusSessions.find((fs) => fs.goal || fs.intent);

  return {
    blocklist: blocklist.map((b) => ({
      id: b.id,
      url: b.url,
      domain: b.url,
      active: b.active,
      deflections: b.deflections,
      icon: b.icon,
    })),
    shortcuts: normalShortcuts.map((s) => ({
      actionType: s.actionType,
      keys: s.keys,
    })),
    settings: dbUser?.settings
      ? {
          deepFocusMinutes: dbUser.settings.deepFocusMinutes,
          shortBreakMinutes: dbUser.settings.shortBreakMinutes,
          longBreakMinutes: dbUser.settings.longBreakMinutes,
          longBreakCadence: dbUser.settings.longBreakCadence,
          autoStartBreaks: dbUser.settings.autoStartBreaks,
          autoStartFocus: dbUser.settings.autoStartFocus,
          strictBlocking: dbUser.settings.strictBlocking,
          acousticPreset: dbUser.settings.acousticPreset,
          bgAmbienceVolume: dbUser.settings.bgAmbienceVolume,
          completionChime: dbUser.settings.completionChime,
          theme: dbUser.settings.theme,
        }
      : undefined,
    presets: presets.map((p) => ({
      name: p.name,
      focusMinutes: p.focusMinutes,
      shortBreak: p.shortBreak,
      longBreak: p.longBreak,
      cycles: p.cycles,
      isDefault: p.isDefault,
    })),
    streak: streak
      ? {
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
          totalFocusHours: streak.totalFocusHours,
          lastActiveDate: streak.lastActiveDate?.toISOString(),
        }
      : undefined,
    sessions: focusSessions.map((fs) => ({
      id: fs.id,
      sessionCode: fs.sessionCode || `#SESS-${fs.id.slice(-4)}`,
      timeDisplay: fs.startedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      startedAt: fs.startedAt.toISOString(),
      completedAt: fs.completedAt ? fs.completedAt.toISOString() : fs.startedAt.toISOString(),
      mode: (fs.mode.toLowerCase() === "short_break" ? "shortBreak" : fs.mode.toLowerCase() === "long_break" ? "longBreak" : "focus") as any,
      protocol: fs.protocol || "Deep Focus",
      target: fs.target || "25:00 / 25:00",
      plannedSeconds: fs.plannedDuration,
      actualSeconds: fs.actualDuration,
      blocks: `${fs.deflectionsCount} distracted attempts`,
      blockColor: fs.deflectionsCount === 0 ? "text-emerald-500" : "text-amber-500",
      status: (fs.status === "COMPLETED" ? "Completed" : "Ended early") as any,
      statusSuccess: fs.status === "COMPLETED",
      deflectionsCount: fs.deflectionsCount,
      goal: fs.goal || undefined,
      intent: fs.intent || undefined,
      notes: fs.notes || undefined,
    })),
    gamification: gamification
      ? {
          level: gamification.level,
          currentXp: gamification.currentXp,
          nextLevelXp: gamification.nextLevelXp,
          totalXp: gamification.totalXp,
          streakTokens: gamification.streakTokens,
          totalShieldsRepelled: gamification.totalShieldsRepelled,
          lastActiveDate: gamification.lastActiveDate,
          unlockedAchievementIds: achievements.map((a) => a.achievementId),
          unlockedAchievementDates: achievements.reduce((acc, a) => {
            acc[a.achievementId] = a.unlockedAt.toISOString();
            return acc;
          }, {} as Record<string, string>),
        }
      : undefined,
    primaryAnchor: primaryAnchorShortcut?.keys?.[0] || latestWithGoal?.goal || undefined,
    sessionIntent: sessionIntentShortcut?.keys?.[0] || latestWithGoal?.intent || undefined,
    visualMode: visualModeShortcut?.keys?.[0] || undefined,
    shortcutsEnabled: shortcutsEnabledShortcut ? shortcutsEnabledShortcut.keys?.[0] === "true" : undefined,
    deflectionLogs: Array.isArray(rawDeflections)
      ? rawDeflections.map((d) => ({
          id: d.id,
          domain: d.path || d.url,
          url: d.url,
          timestamp: new Date(d.attemptedAt).getTime(),
        }))
      : [],
    exportedAt: new Date().toISOString(),
    version: "1.0.0",
  };
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Create an account or sign in to sync." },
        { status: 401 }
      );
    }

    const payload = await fetchCloudSyncPayload(user.id);
    return NextResponse.json({ success: true, data: payload, user });
  } catch (error) {
    console.error("Sync pull error:", error);
    return NextResponse.json(
      { error: "Failed to pull cloud sync data." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Create an account or sign in to sync." },
        { status: 401 }
      );
    }

    const rawBody = await req.json().catch(() => null);
    if (!rawBody || typeof rawBody !== "object") {
      return NextResponse.json({ error: "Invalid sync payload format." }, { status: 400 });
    }

    const body = rawBody as SyncPayload;

    // 1. Batch Sync Blocklist (capped at 500 items)
    if (Array.isArray(body.blocklist) && body.blocklist.length > 0) {
      const blocklistSlice = body.blocklist.slice(0, 500);
      const existing = await prisma.blockedWebsite.findMany({
        where: { userId: user.id },
      });
      const existingMap = new Map(existing.map((b) => [b.url.toLowerCase(), b]));
      const toCreate: Array<{
        userId: string;
        url: string;
        active: boolean;
        deflections: number;
        icon: string;
      }> = [];
      const updatePromises: Promise<any>[] = [];

      for (const item of blocklistSlice) {
        const url = (item.url || item.domain || "").toLowerCase().trim();
        if (!url) continue;

        const current = existingMap.get(url);
        if (current) {
          const nextDeflections = Math.max(current.deflections, item.deflections || 0);
          const nextActive = item.active !== false;
          const nextIcon = item.icon || current.icon;
          if (
            current.deflections !== nextDeflections ||
            current.active !== nextActive ||
            current.icon !== nextIcon
          ) {
            updatePromises.push(
              prisma.blockedWebsite.update({
                where: { id: current.id },
                data: {
                  active: nextActive,
                  deflections: nextDeflections,
                  icon: nextIcon,
                },
              })
            );
          }
        } else {
          existingMap.set(url, {} as any);
          toCreate.push({
            userId: user.id,
            url,
            active: item.active !== false,
            deflections: item.deflections || 0,
            icon: item.icon || "link",
          });
        }
      }

      if (toCreate.length > 0) {
        await prisma.blockedWebsite.createMany({ data: toCreate });
      }
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
      }
    }

    // 2. Batch Sync Shortcuts using a single transaction
    if (Array.isArray(body.shortcuts) && body.shortcuts.length > 0) {
      const shortcutOps = body.shortcuts
        .filter((s) => s.actionType && Array.isArray(s.keys))
        .map((shortcut) =>
          prisma.userShortcut.upsert({
            where: {
              userId_actionType: {
                userId: user.id,
                actionType: shortcut.actionType,
              },
            },
            create: {
              userId: user.id,
              actionType: shortcut.actionType,
              keys: shortcut.keys,
            },
            update: {
              keys: shortcut.keys,
            },
          })
        );
      if (shortcutOps.length > 0) {
        await prisma.$transaction(shortcutOps);
      }
    }

    // 3. Sync Settings
    if (body.settings) {
      await prisma.userSettings.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          deepFocusMinutes: body.settings.deepFocusMinutes ?? 25,
          shortBreakMinutes: body.settings.shortBreakMinutes ?? 5,
          longBreakMinutes: body.settings.longBreakMinutes ?? 15,
          longBreakCadence: body.settings.longBreakCadence ?? 4,
          autoStartBreaks: body.settings.autoStartBreaks ?? true,
          autoStartFocus: body.settings.autoStartFocus ?? false,
          strictBlocking: body.settings.strictBlocking ?? "STRICT",
          acousticPreset: body.settings.acousticPreset ?? "rain",
          bgAmbienceVolume: body.settings.bgAmbienceVolume ?? 65,
          completionChime: body.settings.completionChime ?? true,
          theme: body.settings.theme ?? "SYSTEM",
        },
        update: {
          ...body.settings,
        },
      });
    }

    // 4. Batch Sync Presets
    if (Array.isArray(body.presets) && body.presets.length > 0) {
      const existingPresets = await prisma.timerPreset.findMany({
        where: { userId: user.id },
      });
      const presetMap = new Map(existingPresets.map((p) => [p.name.toLowerCase().trim(), p]));
      const toCreatePresets: Array<any> = [];
      const updatePresetPromises: Promise<any>[] = [];

      for (const preset of body.presets) {
        const name = preset.name?.trim();
        if (!name) continue;
        const existing = presetMap.get(name.toLowerCase());
        if (existing) {
          updatePresetPromises.push(
            prisma.timerPreset.update({
              where: { id: existing.id },
              data: {
                focusMinutes: preset.focusMinutes,
                shortBreak: preset.shortBreak,
                longBreak: preset.longBreak,
                cycles: preset.cycles,
              },
            })
          );
        } else {
          presetMap.set(name.toLowerCase(), {} as any);
          toCreatePresets.push({
            userId: user.id,
            name,
            focusMinutes: preset.focusMinutes,
            shortBreak: preset.shortBreak,
            longBreak: preset.longBreak,
            cycles: preset.cycles,
            isDefault: preset.isDefault ?? false,
          });
        }
      }

      if (toCreatePresets.length > 0) {
        await prisma.timerPreset.createMany({ data: toCreatePresets });
      }
      if (updatePresetPromises.length > 0) {
        await Promise.all(updatePresetPromises);
      }
    }

    // 5. Batch Sync Focus Sessions
    if (Array.isArray(body.sessions) && body.sessions.length > 0) {
      const validSessions = body.sessions.filter((s) => s && s.startedAt);
      if (validSessions.length > 0) {
        const dates = validSessions.map((s) => new Date(s.startedAt));
        const existingSessions = await prisma.focusSession.findMany({
          where: {
            userId: user.id,
            startedAt: { in: dates },
          },
          select: { startedAt: true },
        });
        const existingDateSet = new Set(
          existingSessions.map((es) => es.startedAt.getTime())
        );

        const toCreateSessions: Array<any> = [];
        const seenTimes = new Set<number>();
        for (const s of validSessions) {
          const startedDate = new Date(s.startedAt);
          const time = startedDate.getTime();
          if (isNaN(time) || existingDateSet.has(time) || seenTimes.has(time)) {
            continue;
          }
          seenTimes.add(time);

          toCreateSessions.push({
            userId: user.id,
            sessionCode: s.sessionCode || null,
            startedAt: startedDate,
            completedAt: s.completedAt ? new Date(s.completedAt) : null,
            plannedDuration: s.plannedSeconds || 1500,
            actualDuration: s.actualSeconds || 0,
            deflectionsCount: s.deflectionsCount || 0,
            mode: s.mode === "shortBreak" ? "SHORT_BREAK" : s.mode === "longBreak" ? "LONG_BREAK" : "FOCUS",
            status: s.statusSuccess ? "COMPLETED" : "STOPPED",
            protocol: s.protocol || null,
            target: s.target || null,
            goal: s.goal || null,
            intent: s.intent || null,
            notes: s.notes || null,
          });
        }

        if (toCreateSessions.length > 0) {
          await prisma.focusSession.createMany({
            data: toCreateSessions,
          });
        }
      }
    }

    // 6. Gamification, Level, XP & Achievements
    if (body.gamification) {
      try {
        if ((prisma as any).userGamification) {
          const g = body.gamification;
          const existing = await (prisma as any).userGamification.findUnique({
            where: { userId: user.id },
          });

          const targetLevel = Math.max(existing?.level ?? 1, g.level ?? 1);
          const targetTotalXp = Math.max(existing?.totalXp ?? 0, g.totalXp ?? 0);
          const targetStreakTokens = Math.max(existing?.streakTokens ?? 2, g.streakTokens ?? 2);
          const targetShields = Math.max(existing?.totalShieldsRepelled ?? 0, g.totalShieldsRepelled ?? 0);

          await (prisma as any).userGamification.upsert({
            where: { userId: user.id },
            create: {
              userId: user.id,
              level: targetLevel,
              currentXp: g.currentXp ?? 0,
              nextLevelXp: g.nextLevelXp ?? 300,
              totalXp: targetTotalXp,
              streakTokens: targetStreakTokens,
              totalShieldsRepelled: targetShields,
              lastActiveDate: g.lastActiveDate ?? null,
            },
            update: {
              level: targetLevel,
              currentXp: g.currentXp ?? existing?.currentXp ?? 0,
              nextLevelXp: g.nextLevelXp ?? existing?.nextLevelXp ?? 300,
              totalXp: targetTotalXp,
              streakTokens: targetStreakTokens,
              totalShieldsRepelled: targetShields,
              lastActiveDate: g.lastActiveDate ?? existing?.lastActiveDate,
            },
          });

          if (
            (prisma as any).userAchievement &&
            Array.isArray(g.unlockedAchievementIds) &&
            g.unlockedAchievementIds.length > 0
          ) {
            const existingAch = await (prisma as any).userAchievement.findMany({
              where: {
                userId: user.id,
                achievementId: { in: g.unlockedAchievementIds },
              },
              select: { achievementId: true },
            });
            const existingAchSet = new Set(existingAch.map((a: any) => a.achievementId));

            const newAchievements = g.unlockedAchievementIds
              .filter((id) => !existingAchSet.has(id))
              .map((achievementId) => {
                const unlockedAtStr = g.unlockedAchievementDates?.[achievementId];
                return {
                  userId: user.id,
                  achievementId,
                  unlockedAt: unlockedAtStr ? new Date(unlockedAtStr) : new Date(),
                };
              });

            if (newAchievements.length > 0) {
              await (prisma as any).userAchievement.createMany({
                data: newAchievements,
              });
            }
          }
        }
      } catch (err) {
        console.warn("Could not sync gamification to database:", err);
      }
    }

    // 7. Sync Streak
    if (body.streak) {
      try {
        const existingStreak = await prisma.userStreak.findUnique({
          where: { userId: user.id },
        });

        const targetCurrent = Math.max(existingStreak?.currentStreak ?? 0, body.streak.currentStreak ?? 0);
        const targetLongest = Math.max(existingStreak?.longestStreak ?? 0, body.streak.longestStreak ?? 0);
        const targetHours = Math.max(existingStreak?.totalFocusHours ?? 0, body.streak.totalFocusHours ?? 0);
        const targetDate = body.streak.lastActiveDate ? new Date(body.streak.lastActiveDate) : new Date();

        await prisma.userStreak.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            currentStreak: targetCurrent,
            longestStreak: targetLongest,
            totalFocusHours: targetHours,
            lastActiveDate: targetDate,
          },
          update: {
            currentStreak: targetCurrent,
            longestStreak: targetLongest,
            totalFocusHours: targetHours,
            lastActiveDate: targetDate,
          },
        });
      } catch (err) {
        console.warn("Could not sync streak to database:", err);
      }
    }

    // 8. Batch Sync Deflection Logs
    if (Array.isArray(body.deflectionLogs) && body.deflectionLogs.length > 0) {
      try {
        const logsSlice = body.deflectionLogs.slice(0, 50).filter((l) => l.url || l.domain);
        if (logsSlice.length > 0) {
          const timestamps = logsSlice.map((l) => (l.timestamp ? new Date(l.timestamp) : new Date()));
          const existingLogs = await prisma.deflectionEvent.findMany({
            where: {
              userId: user.id,
              attemptedAt: { in: timestamps },
            },
            select: { attemptedAt: true, url: true },
          });
          const existingKeySet = new Set(
            existingLogs.map((el) => `${el.url}_${el.attemptedAt.getTime()}`)
          );

          const toCreateLogs: Array<any> = [];
          const seenKeys = new Set<string>();
          for (const log of logsSlice) {
            const attemptedAt = log.timestamp ? new Date(log.timestamp) : new Date();
            const targetUrl = (log.url || log.domain).toLowerCase();
            const key = `${targetUrl}_${attemptedAt.getTime()}`;
            if (existingKeySet.has(key) || seenKeys.has(key)) continue;
            seenKeys.add(key);

            toCreateLogs.push({
              userId: user.id,
              url: targetUrl,
              path: log.domain || null,
              attemptedAt,
            });
          }

          if (toCreateLogs.length > 0) {
            await prisma.deflectionEvent.createMany({
              data: toCreateLogs,
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.warn("Could not sync deflection events to database:", err);
      }
    }

    // 9. Batch Sync Metadata Shortcuts in a transaction
    const metaOps: any[] = [];
    if (typeof body.visualMode === "string" && body.visualMode) {
      metaOps.push(
        prisma.userShortcut.upsert({
          where: {
            userId_actionType: {
              userId: user.id,
              actionType: "__visual_mode__",
            },
          },
          create: {
            userId: user.id,
            actionType: "__visual_mode__",
            keys: [body.visualMode],
          },
          update: {
            keys: [body.visualMode],
          },
        })
      );
    }

    if (typeof body.shortcutsEnabled === "boolean") {
      metaOps.push(
        prisma.userShortcut.upsert({
          where: {
            userId_actionType: {
              userId: user.id,
              actionType: "__shortcuts_enabled__",
            },
          },
          create: {
            userId: user.id,
            actionType: "__shortcuts_enabled__",
            keys: [String(body.shortcutsEnabled)],
          },
          update: {
            keys: [String(body.shortcutsEnabled)],
          },
        })
      );
    }

    if (typeof body.primaryAnchor === "string" && body.primaryAnchor.trim()) {
      metaOps.push(
        prisma.userShortcut.upsert({
          where: {
            userId_actionType: {
              userId: user.id,
              actionType: "__primary_anchor__",
            },
          },
          create: {
            userId: user.id,
            actionType: "__primary_anchor__",
            keys: [body.primaryAnchor.trim()],
          },
          update: {
            keys: [body.primaryAnchor.trim()],
          },
        })
      );
    }

    if (typeof body.sessionIntent === "string" && body.sessionIntent.trim()) {
      metaOps.push(
        prisma.userShortcut.upsert({
          where: {
            userId_actionType: {
              userId: user.id,
              actionType: "__session_intent__",
            },
          },
          create: {
            userId: user.id,
            actionType: "__session_intent__",
            keys: [body.sessionIntent.trim()],
          },
          update: {
            keys: [body.sessionIntent.trim()],
          },
        })
      );
    }

    if (metaOps.length > 0) {
      await prisma.$transaction(metaOps).catch(() => {});
    }

    // Return the fresh consolidated cloud state directly to eliminate second pull request
    const updatedPayload = await fetchCloudSyncPayload(user.id);

    return NextResponse.json({
      success: true,
      data: updatedPayload,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Sync push error:", error);
    return NextResponse.json(
      { error: "Failed to push sync data to cloud." },
      { status: 500 }
    );
  }
}
