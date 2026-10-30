import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { createToken, setSessionCookie } from "../../../../lib/auth";
import { SyncPayload } from "../../../../lib/sync/sync-types";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      credential,
      accessToken,
      mergePayload,
    } = body as {
      credential?: string;
      accessToken?: string;
      mergePayload?: SyncPayload;
    };

    const configuredClientId =
      process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    let email = "";
    let name = "";
    let avatarUrl = "";

    if (credential) {
      // Verify Google ID token (JWT) via Google tokeninfo endpoint
      const tokenInfoRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
      );
      if (!tokenInfoRes.ok) {
        return NextResponse.json(
          { error: "Invalid Google credential token." },
          { status: 401 }
        );
      }
      const tokenInfo = await tokenInfoRes.json();
      if (
        configuredClientId &&
        tokenInfo.aud !== configuredClientId &&
        tokenInfo.azp !== configuredClientId
      ) {
        return NextResponse.json(
          { error: "Google client ID mismatch." },
          { status: 401 }
        );
      }
      if (!tokenInfo.email) {
        return NextResponse.json(
          { error: "No email returned from Google account." },
          { status: 400 }
        );
      }
      email = tokenInfo.email.trim().toLowerCase();
      name = tokenInfo.name || tokenInfo.given_name || "Google User";
      avatarUrl = tokenInfo.picture || "https://lh3.googleusercontent.com/a/default-user";
    } else if (accessToken) {
      // Fetch verified user profile via Google OAuth2 userinfo endpoint
      const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!profileRes.ok) {
        return NextResponse.json(
          { error: "Failed to verify Google access token." },
          { status: 401 }
        );
      }
      const profile = await profileRes.json();
      if (!profile.email) {
        return NextResponse.json(
          { error: "No email associated with Google account." },
          { status: 400 }
        );
      }

      // Check audience when possible
      try {
        const tokenInfoRes = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
        );
        if (tokenInfoRes.ok) {
          const tokenInfo = await tokenInfoRes.json();
          if (
            configuredClientId &&
            tokenInfo.aud !== configuredClientId &&
            tokenInfo.azp !== configuredClientId
          ) {
            return NextResponse.json(
              { error: "Google client ID mismatch." },
              { status: 401 }
            );
          }
        }
      } catch (err) {
        console.warn("Could not check tokeninfo audience:", err);
      }

      email = profile.email.trim().toLowerCase();
      name = profile.name || profile.given_name || "Google User";
      avatarUrl = profile.picture || "https://lh3.googleusercontent.com/a/default-user";
    } else {
      // Cryptographic verification required: raw email cannot authenticate
      return NextResponse.json(
        { error: "Missing verified Google authentication credentials." },
        { status: 401 }
      );
    }

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
    } else {
      // Update avatar or name if they were empty or placeholders
      const updates: { name?: string; avatarUrl?: string } = {};
      if (name && (!user.name || user.name === "Google User")) updates.name = name;
      if (avatarUrl && (!user.avatarUrl || user.avatarUrl.includes("default-user"))) updates.avatarUrl = avatarUrl;
      if (Object.keys(updates).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updates,
        });
      }
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

    // Merge focus sessions if provided
    if (Array.isArray(mergePayload?.sessions) && mergePayload.sessions.length > 0) {
      for (const s of mergePayload.sessions) {
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
            },
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
        console.warn("Could not merge streak during Google auth:", err);
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
        console.warn("Could not merge gamification during Google auth:", err);
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
        console.warn("Could not merge deflection logs during Google auth:", err);
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
  const wantsJson =
    req.nextUrl.searchParams.get("format") === "json" ||
    req.headers.get("accept")?.includes("application/json");

  const clientId =
    process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (wantsJson) {
    return NextResponse.json({
      configured: Boolean(clientId),
      clientId: clientId || null,
    });
  }

  if (!clientId) {
    // If OAuth is not configured with client ID, redirect to sync modal with notice
    return NextResponse.redirect(new URL("/?auth=google_not_configured", req.url));
  }

  const state = crypto.randomBytes(32).toString("hex");
  const redirectUri = `${new URL(req.url).origin}/api/auth/google/callback`;
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=openid%20email%20profile&access_type=offline&prompt=select_account&state=${encodeURIComponent(
    state
  )}`;

  const response = NextResponse.redirect(googleAuthUrl);
  response.cookies.set("dnd_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });

  return response;
}
