import { NextRequest, NextResponse } from "next/server";
import {
  getRequestOrigin,
  getSpotifyCredentials,
  normalizeSpotifyRedirectUri,
  resolveSpotifyRedirectUri,
  setSpotifySessionCookie,
  SPOTIFY_OAUTH_REDIRECT_COOKIE,
  SPOTIFY_OAUTH_STATE_COOKIE,
  StoredSpotifySession,
} from "@/lib/spotify/spotify-server";

type CodeExchangeResult = {
  ok: boolean;
  error?: string;
  message?: string;
  session?: StoredSpotifySession;
};

// Deduplicate concurrent/repeated exchanges of the same single-use authorization code
const recentCodeExchanges = new Map<string, Promise<CodeExchangeResult>>();

async function exchangeSpotifyCode(
  code: string,
  state: string | null,
  storedState: string | undefined,
  origin: string,
  customRedirectUri?: string
): Promise<CodeExchangeResult> {
  const existing = recentCodeExchanges.get(code);
  if (existing) {
    return existing;
  }

  const exchangePromise = performSpotifyCodeExchange(
    code,
    state,
    storedState,
    origin,
    customRedirectUri
  );
  recentCodeExchanges.set(code, exchangePromise);
  setTimeout(() => {
    recentCodeExchanges.delete(code);
  }, 60_000);

  return exchangePromise;
}

async function performSpotifyCodeExchange(
  code: string,
  state: string | null,
  storedState: string | undefined,
  origin: string,
  customRedirectUri?: string
): Promise<CodeExchangeResult> {
  const { clientId, clientSecret, redirectUri: configuredRedirectUri } = getSpotifyCredentials();
  const redirectUri = configuredRedirectUri
    ? normalizeSpotifyRedirectUri(configuredRedirectUri)
    : customRedirectUri
    ? normalizeSpotifyRedirectUri(customRedirectUri)
    : resolveSpotifyRedirectUri(origin);

  if (!clientId || !clientSecret) {
    return {
      ok: false,
      error: "missing_credentials",
      message: "Spotify Client ID or Client Secret is missing on the server.",
    };
  }

  // Strictly verify CSRF state
  if (!storedState || !state || storedState !== state) {
    return {
      ok: false,
      error: "csrf_state_mismatch",
      message: "Security state mismatch during Spotify authentication. Please try again.",
    };
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text().catch(() => "");
    console.error("Spotify token exchange failed:", errText);
    return {
      ok: false,
      error: "token_exchange_failed",
      message: "Could not exchange authorization code with Spotify. Verify your Redirect URI matches Spotify Dashboard.",
    };
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token as string;
  const refreshToken = (tokenData.refresh_token as string) || "";
  const expiresIn = (tokenData.expires_in as number) || 3600;

  // Fetch Spotify user profile
  let userProfile: StoredSpotifySession["user"] = undefined;
  try {
    const meRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (meRes.ok) {
      const me = await meRes.json();
      userProfile = {
        id: me.id,
        displayName: me.display_name || me.id || "Spotify Listener",
        email: me.email || undefined,
        avatarUrl:
          Array.isArray(me.images) && me.images.length > 0
            ? me.images[0].url
            : null,
        product: me.product || "free",
        profileUrl: me.external_urls?.spotify || undefined,
      };
    }
  } catch (err) {
    console.warn("Could not fetch Spotify profile:", err);
  }

  const session: StoredSpotifySession = {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + expiresIn * 1000,
    user: userProfile,
  };

  return { ok: true, session };
}

/**
 * GET /api/spotify/callback
 * Handles direct OAuth redirect if SPOTIFY_REDIRECT_URI is set to /api/spotify/callback,
 * then redirects the user to /callback with status=success or status=error.
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const error = searchParams.get("error");
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const storedState = req.cookies.get(SPOTIFY_OAUTH_STATE_COOKIE)?.value;
  const storedRedirectUri = req.cookies.get(SPOTIFY_OAUTH_REDIRECT_COOKIE)?.value;
  const origin = getRequestOrigin(req);

  if (error) {
    const res = NextResponse.redirect(
      new URL(
        `/callback?status=error&provider=spotify&error=${encodeURIComponent(
          error
        )}&message=${encodeURIComponent(
          error === "access_denied"
            ? "You cancelled the Spotify connection request."
            : `Spotify returned an error: ${error}`
        )}`,
        origin
      )
    );
    res.cookies.delete(SPOTIFY_OAUTH_STATE_COOKIE);
    res.cookies.delete(SPOTIFY_OAUTH_REDIRECT_COOKIE);
    return res;
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(
        `/callback?status=error&provider=spotify&error=missing_code&message=${encodeURIComponent(
          "No authorization code was received from Spotify."
        )}`,
        origin
      )
    );
  }

  const result = await exchangeSpotifyCode(
    code,
    state,
    storedState,
    origin,
    storedRedirectUri
  );
  if (!result.ok || !result.session) {
    const res = NextResponse.redirect(
      new URL(
        `/callback?status=error&provider=spotify&error=${encodeURIComponent(
          result.error || "auth_failed"
        )}&message=${encodeURIComponent(
          result.message || "Failed to authenticate with Spotify."
        )}`,
        origin
      )
    );
    res.cookies.delete(SPOTIFY_OAUTH_STATE_COOKIE);
    res.cookies.delete(SPOTIFY_OAUTH_REDIRECT_COOKIE);
    return res;
  }

  await setSpotifySessionCookie(result.session);

  const accountName = result.session.user?.displayName || "Spotify Account";
  const successRes = NextResponse.redirect(
    new URL(
      `/callback?status=success&provider=spotify&account=${encodeURIComponent(
        accountName
      )}`,
      origin
    )
  );
  successRes.cookies.delete(SPOTIFY_OAUTH_STATE_COOKIE);
  successRes.cookies.delete(SPOTIFY_OAUTH_REDIRECT_COOKIE);
  return successRes;
}

/**
 * POST /api/spotify/callback
 * Allows the /callback page to exchange a `code` directly if SPOTIFY_REDIRECT_URI
 * points directly to `/callback` (e.g. http://127.0.0.1:3000/callback or http://localhost:3000/callback).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { code, state, redirectUri } = body as {
      code?: string;
      state?: string;
      redirectUri?: string;
    };

    if (!code) {
      return NextResponse.json(
        { ok: false, error: "missing_code", message: "Authorization code is required." },
        { status: 400 }
      );
    }

    const storedState = req.cookies.get(SPOTIFY_OAUTH_STATE_COOKIE)?.value;
    const storedRedirectUri = req.cookies.get(SPOTIFY_OAUTH_REDIRECT_COOKIE)?.value;
    const origin = getRequestOrigin(req);

    const result = await exchangeSpotifyCode(
      code,
      state || null,
      storedState,
      origin,
      storedRedirectUri || redirectUri
    );

    if (!result.ok || !result.session) {
      const errRes = NextResponse.json(
        {
          ok: false,
          error: result.error || "exchange_failed",
          message: result.message || "Failed to complete Spotify authentication.",
        },
        { status: 400 }
      );
      errRes.cookies.delete(SPOTIFY_OAUTH_STATE_COOKIE);
      errRes.cookies.delete(SPOTIFY_OAUTH_REDIRECT_COOKIE);
      return errRes;
    }

    await setSpotifySessionCookie(result.session);

    const res = NextResponse.json({
      ok: true,
      user: result.session.user || {
        id: "spotify_user",
        displayName: "Spotify Listener",
      },
    });
    res.cookies.delete(SPOTIFY_OAUTH_STATE_COOKIE);
    res.cookies.delete(SPOTIFY_OAUTH_REDIRECT_COOKIE);
    return res;
  } catch (err) {
    console.error("Spotify callback POST exception:", err);
    return NextResponse.json(
      { ok: false, error: "server_error", message: "Unexpected error during Spotify authentication." },
      { status: 500 }
    );
  }
}
