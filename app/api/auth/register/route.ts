import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { hashPassword, createToken, setSessionCookie } from "../../../../lib/auth";
import { SyncPayload } from "../../../../lib/sync/sync-types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name, initialPayload } = body as {
      email?: string;
      password?: string;
      name?: string;
      initialPayload?: SyncPayload;
    };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim()) || email.length > 254) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 }
      );
    }

    if (!password || password.length < 6 || password.length > 128) {
      return NextResponse.json(
        { error: "Password must be between 6 and 128 characters." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check existing
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = hashPassword(password);

    // Create user and migrate initial guest state
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name?.trim() || normalizedEmail.split("@")[0],
        passwordHash,
        settings: {
          create: {
            deepFocusMinutes: initialPayload?.settings?.deepFocusMinutes ?? 25,
            shortBreakMinutes: initialPayload?.settings?.shortBreakMinutes ?? 5,
            longBreakMinutes: initialPayload?.settings?.longBreakMinutes ?? 15,
            longBreakCadence: initialPayload?.settings?.longBreakCadence ?? 4,
            autoStartBreaks: initialPayload?.settings?.autoStartBreaks ?? true,
            autoStartFocus: initialPayload?.settings?.autoStartFocus ?? false,
            strictBlocking: initialPayload?.settings?.strictBlocking ?? "STRICT",
            acousticPreset: initialPayload?.settings?.acousticPreset ?? "rain",
            bgAmbienceVolume: initialPayload?.settings?.bgAmbienceVolume ?? 65,
            completionChime: initialPayload?.settings?.completionChime ?? true,
            theme: initialPayload?.settings?.theme ?? "SYSTEM",
          },
        },
        streak: {
          create: {
            currentStreak: initialPayload?.streak?.currentStreak ?? 0,
            longestStreak: initialPayload?.streak?.longestStreak ?? 0,
            totalFocusHours: initialPayload?.streak?.totalFocusHours ?? 0,
          },
        },
      },
    });

    // Save initial gamification state if provided
    if (initialPayload?.gamification) {
      try {
        if ((prisma as any).userGamification) {
          await (prisma as any).userGamification.create({
            data: {
              userId: user.id,
              level: initialPayload.gamification.level ?? 1,
              currentXp: initialPayload.gamification.currentXp ?? 0,
              nextLevelXp: initialPayload.gamification.nextLevelXp ?? 300,
              totalXp: initialPayload.gamification.totalXp ?? 0,
              streakTokens: initialPayload.gamification.streakTokens ?? 2,
              totalShieldsRepelled: initialPayload.gamification.totalShieldsRepelled ?? 0,
              lastActiveDate: initialPayload.gamification.lastActiveDate ?? null,
            },
          });
        }
      } catch (err) {
        console.warn("Could not save initial gamification state:", err);
      }
    }

    // Save initial achievements if provided
    if (
      initialPayload?.gamification?.unlockedAchievementIds &&
      initialPayload.gamification.unlockedAchievementIds.length > 0
    ) {
      try {
        if ((prisma as any).userAchievement) {
          const dates = initialPayload.gamification.unlockedAchievementDates || {};
          for (const achId of initialPayload.gamification.unlockedAchievementIds) {
            await (prisma as any).userAchievement.create({
              data: {
                userId: user.id,
                achievementId: achId,
                unlockedAt: dates[achId] ? new Date(dates[achId]) : new Date(),
              },
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.warn("Could not save initial achievements:", err);
      }
    }

    // Save initial presets if provided
    if (Array.isArray(initialPayload?.presets) && initialPayload.presets.length > 0) {
      const validPresets = initialPayload.presets.filter((p) => p && p.name);
      if (validPresets.length > 0) {
        await prisma.timerPreset.createMany({
          data: validPresets.map((preset) => ({
            userId: user.id,
            name: preset.name,
            focusMinutes: preset.focusMinutes,
            shortBreak: preset.shortBreak,
            longBreak: preset.longBreak,
            cycles: preset.cycles,
            isDefault: preset.isDefault ?? false,
          })),
        }).catch(() => {});
      }
    }

    // Save initial shortcuts if provided
    if (initialPayload?.shortcuts && initialPayload.shortcuts.length > 0) {
      await prisma.userShortcut.createMany({
        data: initialPayload.shortcuts.map((s) => ({
          userId: user.id,
          actionType: s.actionType,
          keys: s.keys,
        })),
        skipDuplicates: true,
      });
    }

    // Save UI preferences, toggles & active focus anchor metadata
    const extraShortcuts: { actionType: string; keys: string[] }[] = [];
    if (typeof initialPayload?.visualMode === "string" && initialPayload.visualMode) {
      extraShortcuts.push({ actionType: "__visual_mode__", keys: [initialPayload.visualMode] });
    }
    if (typeof initialPayload?.shortcutsEnabled === "boolean") {
      extraShortcuts.push({ actionType: "__shortcuts_enabled__", keys: [String(initialPayload.shortcutsEnabled)] });
    }
    if (typeof initialPayload?.primaryAnchor === "string" && initialPayload.primaryAnchor.trim()) {
      extraShortcuts.push({ actionType: "__primary_anchor__", keys: [initialPayload.primaryAnchor.trim()] });
    }
    if (typeof initialPayload?.sessionIntent === "string" && initialPayload.sessionIntent.trim()) {
      extraShortcuts.push({ actionType: "__session_intent__", keys: [initialPayload.sessionIntent.trim()] });
    }

    if (extraShortcuts.length > 0) {
      await prisma.userShortcut.createMany({
        data: extraShortcuts.map((s) => ({
          userId: user.id,
          actionType: s.actionType,
          keys: s.keys,
        })),
        skipDuplicates: true,
      }).catch(() => {});
    }

    // Save initial blocklist if provided
    if (initialPayload?.blocklist && initialPayload.blocklist.length > 0) {
      await prisma.blockedWebsite.createMany({
        data: initialPayload.blocklist.map((b) => ({
          userId: user.id,
          url: (b.url || b.domain).toLowerCase(),
          active: b.active !== false,
          deflections: b.deflections || 0,
          icon: b.icon || "link",
        })),
        skipDuplicates: true,
      });
    }

    // Save initial focus sessions if provided
    if (Array.isArray(initialPayload?.sessions) && initialPayload.sessions.length > 0) {
      const validSessions = initialPayload.sessions.filter((s) => s && s.startedAt);
      if (validSessions.length > 0) {
        const toCreate = validSessions.map((s) => ({
          userId: user.id,
          sessionCode: s.sessionCode || undefined,
          startedAt: new Date(s.startedAt),
          completedAt: s.completedAt ? new Date(s.completedAt) : undefined,
          plannedDuration: s.plannedSeconds || 1500,
          actualDuration: s.actualSeconds || 0,
          deflectionsCount: s.deflectionsCount || 0,
          mode: (s.mode === "shortBreak" ? "SHORT_BREAK" : s.mode === "longBreak" ? "LONG_BREAK" : "FOCUS") as
            | "SHORT_BREAK"
            | "LONG_BREAK"
            | "FOCUS",
          status: (s.statusSuccess ? "COMPLETED" : "STOPPED") as "COMPLETED" | "STOPPED",
          protocol: s.protocol || "Deep Focus",
          target: s.target || "25:00 / 25:00",
          goal: s.goal || undefined,
          intent: s.intent || undefined,
          notes: s.notes || undefined,
        }));
        await prisma.focusSession.createMany({
          data: toCreate,
        }).catch(() => {});
      }
    }

    // Save initial deflection event logs if provided
    if (Array.isArray(initialPayload?.deflectionLogs) && initialPayload.deflectionLogs.length > 0) {
      try {
        const userBlockedWebsites = await prisma.blockedWebsite.findMany({
          where: { userId: user.id },
          select: { id: true, url: true },
        });
        const websiteMap = new Map(userBlockedWebsites.map((w) => [w.url.toLowerCase(), w.id]));

        const deflectionData = initialPayload.deflectionLogs
          .filter((log) => log.url || log.domain)
          .slice(0, 100)
          .map((log) => {
            const normalizedUrl = (log.url || log.domain).toLowerCase();
            return {
              userId: user.id,
              websiteId: websiteMap.get(normalizedUrl) || null,
              url: normalizedUrl,
              path: log.domain || null,
              attemptedAt: log.timestamp ? new Date(log.timestamp) : new Date(),
            };
          });

        if (deflectionData.length > 0) {
          await prisma.deflectionEvent.createMany({
            data: deflectionData,
          });
        }
      } catch (err) {
        console.warn("Could not save initial deflection logs:", err);
      }
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
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
      { status: 500 }
    );
  }
}
