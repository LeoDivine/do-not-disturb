import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createToken, setSessionCookie } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const error = searchParams.get("error");
  const code = searchParams.get("code");

  if (error) {
    return NextResponse.redirect(
      new URL(`/?auth_error=${encodeURIComponent(error)}`, req.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/?auth_error=missing_code", req.url));
  }

  // Verify OAuth CSRF state parameter
  const incomingState = searchParams.get("state");
  const storedState = req.cookies.get("dnd_oauth_state")?.value;

  if (!incomingState || !storedState || incomingState !== storedState) {
    const errorRes = NextResponse.redirect(
      new URL("/?auth_error=csrf_state_mismatch", req.url)
    );
    errorRes.cookies.delete("dnd_oauth_state");
    return errorRes;
  }

  const clientId =
    process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientSecret || !clientId) {
    // If client secret is not available for backend code exchange, redirect with error
    return NextResponse.redirect(
      new URL("/?auth_error=secret_required", req.url)
    );
  }

  try {
    const redirectUri = `${new URL(req.url).origin}/api/auth/google/callback`;

    // Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("Google token exchange error:", errBody);
      return NextResponse.redirect(
        new URL("/?auth_error=token_exchange_failed", req.url)
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Fetch user profile from Google
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileRes.ok) {
      return NextResponse.redirect(
        new URL("/?auth_error=profile_fetch_failed", req.url)
      );
    }

    const profile = await profileRes.json();
    const email = profile.email?.toLowerCase().trim();
    const name = profile.name || profile.given_name || "Google User";
    const avatarUrl = profile.picture || null;

    if (!email) {
      return NextResponse.redirect(
        new URL("/?auth_error=missing_email", req.url)
      );
    }

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
      const updates: { name?: string; avatarUrl?: string } = {};
      if (name && (!user.name || user.name === "Google User")) updates.name = name;
      if (avatarUrl && (!user.avatarUrl || user.avatarUrl.includes("default-user"))) {
        updates.avatarUrl = avatarUrl;
      }
      if (Object.keys(updates).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updates,
        });
      }
    }

    const token = createToken(user.id);
    await setSessionCookie(token);

    const successRes = NextResponse.redirect(new URL("/?auth=success", req.url));
    successRes.cookies.delete("dnd_oauth_state");
    return successRes;
  } catch (err) {
    console.error("Google callback exception:", err);
    return NextResponse.redirect(new URL("/?auth_error=server_error", req.url));
  }
}
