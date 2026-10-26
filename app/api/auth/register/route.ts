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

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
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
