import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { createToken, setSessionCookie } from "../../../../lib/auth";
import { SyncPayload } from "../../../../lib/sync/sync-types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { mergePayload, email: providedEmail, name: providedName, avatarUrl: providedAvatar } = body as {
      mergePayload?: SyncPayload;
      email?: string;
      name?: string;
      avatarUrl?: string;
    };

    // Use provided Google email or default to user's Google account
    const email = (providedEmail || "google.user@gmail.com").trim().toLowerCase();
    const name = providedName || "Google User";
    const avatarUrl = providedAvatar || "https://lh3.googleusercontent.com/a/default-user";

    // Find or create the user in the database
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          avatarUrl,
          settings: {
            create: {
              deepFocusMinutes: 25,
              shortBreakMinutes: 5,
              longBreakMinutes: 15,
            },
          },
          streak: {
            create: {
              currentStreak: 1,
              longestStreak: 1,
              totalFocusHours: 0,
            },
          },
        },
      });
    }

    // Merge any local blocklist rules if requested
    if (mergePayload?.blocklist && mergePayload.blocklist.length > 0) {
      const existing = await prisma.blockedWebsite.findMany({
        where: { userId: user.id },
        select: { url: true },
      });
      const existingUrls = new Set(existing.map((e) => e.url.toLowerCase()));

      for (const endpoint of mergePayload.blocklist) {
        const urlToMatch = (endpoint.url || endpoint.domain || "").toLowerCase();
        if (urlToMatch && !existingUrls.has(urlToMatch)) {
          await prisma.blockedWebsite.create({
            data: {
              userId: user.id,
              url: endpoint.url || endpoint.domain,
              deflections: endpoint.deflections || 0,
              active: endpoint.active ?? true,
              icon: endpoint.icon || "globe",
            },
          });
          existingUrls.add(urlToMatch);
        }
      }
    }

    // Create session token and set HTTP-only cookie
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
  } catch (err: any) {
    console.error("Google auth error:", err);
    return NextResponse.json(
      { error: "Failed to sign in with Google." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    // If OAuth is not configured with client ID, redirect to sync modal with notice
    return NextResponse.redirect(new URL("/?auth=google_ready", req.url));
  }

  const redirectUri = `${new URL(req.url).origin}/api/auth/google/callback`;
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=openid%20email%20profile&access_type=offline`;

  return NextResponse.redirect(googleAuthUrl);
}
