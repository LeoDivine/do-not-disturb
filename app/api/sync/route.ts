import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getCurrentUser } from "../../../lib/auth";
import { SyncPayload } from "../../../lib/sync/sync-types";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Create an account or sign in to sync." },
        { status: 401 }
      );
    }

    const [dbUser, blocklist, shortcuts, presets, streak, focusSessions] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        include: { settings: true },
      }),
      prisma.blockedWebsite.findMany({
        where: { userId: user.id },
        orderBy: { deflections: "desc" },
      }),
      prisma.userShortcut.findMany({
        where: { userId: user.id },
      }),
      prisma.timerPreset.findMany({
        where: { userId: user.id },
      }),
      prisma.userStreak.findUnique({
        where: { userId: user.id },
      }),
      prisma.focusSession.findMany({
        where: { userId: user.id },
        orderBy: { startedAt: "desc" },
        take: 50,
      }),
    ]);

    const payload: SyncPayload = {
      blocklist: blocklist.map((b) => ({
        id: b.id,
        url: b.url,
        domain: b.url,
        active: b.active,
        deflections: b.deflections,
        icon: b.icon,
      })),
      shortcuts: shortcuts.map((s) => ({
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
      })),
      exportedAt: new Date().toISOString(),
      version: "1.0.0",
    };

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

    const body = (await req.json()) as SyncPayload;

    // 1. Sync Blocklist
    if (Array.isArray(body.blocklist)) {
      for (const item of body.blocklist) {
        const url = (item.url || item.domain || "").toLowerCase();
        if (!url) continue;

        const existing = await prisma.blockedWebsite.findFirst({
          where: {
            userId: user.id,
            url,
          },
        });

        if (existing) {
          await prisma.blockedWebsite.update({
            where: { id: existing.id },
            data: {
              active: item.active !== false,
              deflections: Math.max(existing.deflections, item.deflections || 0),
              icon: item.icon || existing.icon,
            },
          });
        } else {
          await prisma.blockedWebsite.create({
            data: {
              userId: user.id,
              url,
              active: item.active !== false,
              deflections: item.deflections || 0,
              icon: item.icon || "link",
            },
          });
        }
      }
    }

    // 2. Sync Shortcuts
    if (Array.isArray(body.shortcuts)) {
      for (const shortcut of body.shortcuts) {
        if (!shortcut.actionType || !Array.isArray(shortcut.keys)) continue;

        await prisma.userShortcut.upsert({
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
        });
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

    // 4. Presets
    if (Array.isArray(body.presets)) {
      for (const preset of body.presets) {
        if (!preset.name) continue;
        const existingPreset = await prisma.timerPreset.findFirst({
          where: { userId: user.id, name: preset.name },
        });

        if (existingPreset) {
          await prisma.timerPreset.update({
            where: { id: existingPreset.id },
            data: {
              focusMinutes: preset.focusMinutes,
              shortBreak: preset.shortBreak,
              longBreak: preset.longBreak,
              cycles: preset.cycles,
            },
          });
        } else {
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
          });
        }
      }
    }

    // 5. Sync Focus Sessions
    if (Array.isArray(body.sessions)) {
      for (const s of body.sessions) {
        if (!s.startedAt) continue;
        const startedDate = new Date(s.startedAt);
        const existingSession = await prisma.focusSession.findFirst({
          where: {
            userId: user.id,
            startedAt: startedDate,
          },
        });

        if (!existingSession) {
          await prisma.focusSession.create({
            data: {
              userId: user.id,
              sessionCode: s.sessionCode,
              startedAt: startedDate,
              completedAt: s.completedAt ? new Date(s.completedAt) : undefined,
              plannedDuration: s.plannedSeconds || 1500,
              actualDuration: s.actualSeconds || 0,
              deflectionsCount: s.deflectionsCount || 0,
              mode: s.mode === "shortBreak" ? "SHORT_BREAK" : s.mode === "longBreak" ? "LONG_BREAK" : "FOCUS",
              status: s.statusSuccess ? "COMPLETED" : "STOPPED",
              protocol: s.protocol,
              target: s.target,
              goal: s.goal,
              intent: s.intent,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
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
