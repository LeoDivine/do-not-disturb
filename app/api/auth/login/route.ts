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

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
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
      for (const s of mergePayload.shortcuts) {
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
        });
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
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Failed to sign in. Please try again." },
      { status: 500 }
    );
  }
}
