import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { verifyPassword, createToken, setSessionCookie } from "../../../../lib/auth";
import { SyncPayload } from "../../../../lib/sync/sync-types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, mergePayload } = body as {
      email?: string;
      password?: string;
      mergePayload?: SyncPayload;
    };

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    if (password.length > 128 || email.length > 254) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // If local merge was requested on sign in:
    if (mergePayload?.blocklist && mergePayload.blocklist.length > 0) {
      // Find existing to avoid duplicates
      const existing = await prisma.blockedWebsite.findMany({
        where: { userId: user.id },
        select: { url: true },
      });
      const existingUrls = new Set(existing.map((e) => e.url.toLowerCase()));

      const toInsert = mergePayload.blocklist
        .filter((b) => !existingUrls.has((b.url || b.domain).toLowerCase()))
        .map((b) => ({
          userId: user.id,
          url: (b.url || b.domain).toLowerCase(),
          active: b.active !== false,
          deflections: b.deflections || 0,
          icon: b.icon || "link",
        }));

      if (toInsert.length > 0) {
        await prisma.blockedWebsite.createMany({
          data: toInsert,
          skipDuplicates: true,
        });
      }
    }

    // Merge shortcuts
    if (mergePayload?.shortcuts && mergePayload.shortcuts.length > 0) {
      const shortcutOps = mergePayload.shortcuts
        .filter((s) => s.actionType && Array.isArray(s.keys))
        .map((s) =>
          prisma.userShortcut.upsert({
            where: {
              userId_actionType: {
                userId: user.id,
                actionType: s.actionType,
              },
            },
            create: {
              userId: user.id,
              actionType: s.actionType,
              keys: s.keys,
            },
            update: {
              keys: s.keys,
            },
          })
        );
      if (shortcutOps.length > 0) {
        await prisma.$transaction(shortcutOps).catch(() => {});
      }
    }

    // Merge focus sessions if provided
    if (Array.isArray(mergePayload?.sessions) && mergePayload.sessions.length > 0) {
      const validSessions = mergePayload.sessions.filter((s) => s && s.startedAt);
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
            sessionCode: s.sessionCode || undefined,
            startedAt: startedDate,
            completedAt: s.completedAt ? new Date(s.completedAt) : undefined,
            plannedDuration: s.plannedSeconds || 1500,
            actualDuration: s.actualSeconds || 0,
            deflectionsCount: s.deflectionsCount || 0,
            mode: s.mode === "shortBreak" ? "SHORT_BREAK" : s.mode === "longBreak" ? "LONG_BREAK" : "FOCUS",
            status: s.statusSuccess ? "COMPLETED" : "STOPPED",
            protocol: s.protocol || "Deep Focus",
            target: s.target || "25:00 / 25:00",
            goal: s.goal || undefined,
            intent: s.intent || undefined,
            notes: s.notes || undefined,
          });
        }

        if (toCreateSessions.length > 0) {
          await prisma.focusSession.createMany({
            data: toCreateSessions,
          }).catch(() => {});
        }
      }
    }

    // Merge streak if provided
    if (mergePayload?.streak) {
      try {
        const existingStreak = await prisma.userStreak.findUnique({
          where: { userId: user.id },
        });

        const targetCurrent = Math.max(existingStreak?.currentStreak ?? 0, mergePayload.streak.currentStreak ?? 0);
        const targetLongest = Math.max(existingStreak?.longestStreak ?? 0, mergePayload.streak.longestStreak ?? 0);
        const targetHours = Math.max(existingStreak?.totalFocusHours ?? 0, mergePayload.streak.totalFocusHours ?? 0);
        const targetDate = mergePayload.streak.lastActiveDate ? new Date(mergePayload.streak.lastActiveDate) : new Date();

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
        console.warn("Could not merge streak during login:", err);
      }
    }

    // Merge gamification, Flow XP & achievements
    if (mergePayload?.gamification) {
      try {
        if ((prisma as any).userGamification) {
          const g = mergePayload.gamification;
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
            for (const achievementId of g.unlockedAchievementIds) {
              const unlockedAtStr = g.unlockedAchievementDates?.[achievementId];
              const unlockedAt = unlockedAtStr ? new Date(unlockedAtStr) : new Date();

              await (prisma as any).userAchievement.upsert({
                where: {
                  userId_achievementId: {
                    userId: user.id,
                    achievementId,
                  },
                },
                create: {
                  userId: user.id,
                  achievementId,
                  unlockedAt,
                },
                update: {},
              });
            }
          }
        }
      } catch (err) {
        console.warn("Could not merge gamification during login:", err);
      }
    }

    // Merge deflection logs if provided
    if (Array.isArray(mergePayload?.deflectionLogs) && mergePayload.deflectionLogs.length > 0) {
      try {
        const userBlockedWebsites = await prisma.blockedWebsite.findMany({
          where: { userId: user.id },
          select: { id: true, url: true },
        });
        const websiteMap = new Map(userBlockedWebsites.map((w) => [w.url.toLowerCase(), w.id]));

        for (const log of mergePayload.deflectionLogs.slice(0, 100)) {
          if (!log.url && !log.domain) continue;
          const attemptedAt = log.timestamp ? new Date(log.timestamp) : new Date();
          const targetUrl = (log.url || log.domain).toLowerCase();

          const existingLog = await prisma.deflectionEvent.findFirst({
            where: {
              userId: user.id,
              url: targetUrl,
              attemptedAt,
            },
          });

          if (!existingLog) {
            await prisma.deflectionEvent.create({
              data: {
                userId: user.id,
                websiteId: websiteMap.get(targetUrl) || null,
                url: targetUrl,
                path: log.domain || null,
                attemptedAt,
              },
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.warn("Could not merge deflection logs during login:", err);
      }
    }

    // Merge presets if provided
    if (Array.isArray(mergePayload?.presets) && mergePayload.presets.length > 0) {
      for (const preset of mergePayload.presets) {
        if (!preset.name) continue;
        const existing = await prisma.timerPreset.findFirst({
          where: { userId: user.id, name: preset.name },
        });
        if (!existing) {
          await prisma.timerPreset.create({
            data: {
              userId: user.id,
              name: preset.name,
              focusMinutes: preset.focusMinutes,
              shortBreak: preset.shortBreak,
              longBreak: preset.longBreak,
              cycles: preset.cycles,
              isDefault: preset.isDefault ?? false,
            },
          }).catch(() => {});
        }
      }
    }

    // Merge shortcuts if provided
    if (Array.isArray(mergePayload?.shortcuts) && mergePayload.shortcuts.length > 0) {
      for (const s of mergePayload.shortcuts) {
        if (!s.actionType || !Array.isArray(s.keys)) continue;
        await prisma.userShortcut.upsert({
          where: {
            userId_actionType: {
              userId: user.id,
              actionType: s.actionType,
            },
          },
          create: {
            userId: user.id,
            actionType: s.actionType,
            keys: s.keys,
          },
          update: {
            keys: s.keys,
          },
        }).catch(() => {});
      }
    }

    // Merge UI preferences & active anchor metadata
    if (typeof mergePayload?.visualMode === "string" && mergePayload.visualMode) {
      await prisma.userShortcut.upsert({
        where: {
          userId_actionType: {
            userId: user.id,
            actionType: "__visual_mode__",
          },
        },
        create: {
          userId: user.id,
          actionType: "__visual_mode__",
          keys: [mergePayload.visualMode],
        },
        update: {
          keys: [mergePayload.visualMode],
        },
      }).catch(() => {});
    }

    if (typeof mergePayload?.shortcutsEnabled === "boolean") {
      await prisma.userShortcut.upsert({
        where: {
          userId_actionType: {
            userId: user.id,
            actionType: "__shortcuts_enabled__",
          },
        },
        create: {
          userId: user.id,
          actionType: "__shortcuts_enabled__",
          keys: [String(mergePayload.shortcutsEnabled)],
        },
        update: {
          keys: [String(mergePayload.shortcutsEnabled)],
        },
      }).catch(() => {});
    }

    if (typeof mergePayload?.primaryAnchor === "string" && mergePayload.primaryAnchor.trim()) {
      await prisma.userShortcut.upsert({
        where: {
          userId_actionType: {
            userId: user.id,
            actionType: "__primary_anchor__",
          },
        },
        create: {
          userId: user.id,
          actionType: "__primary_anchor__",
          keys: [mergePayload.primaryAnchor.trim()],
        },
        update: {
          keys: [mergePayload.primaryAnchor.trim()],
        },
      }).catch(() => {});
    }

    if (typeof mergePayload?.sessionIntent === "string" && mergePayload.sessionIntent.trim()) {
      await prisma.userShortcut.upsert({
        where: {
          userId_actionType: {
            userId: user.id,
            actionType: "__session_intent__",
          },
        },
        create: {
          userId: user.id,
          actionType: "__session_intent__",
          keys: [mergePayload.sessionIntent.trim()],
        },
        update: {
          keys: [mergePayload.sessionIntent.trim()],
        },
      }).catch(() => {});
    }

    const token = createToken(user.id);
    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Failed to sign in. Please try again." },
      { status: 500 }
    );
  }
}
