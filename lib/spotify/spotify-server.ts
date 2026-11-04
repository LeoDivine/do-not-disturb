import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import crypto from "crypto";

export const SPOTIFY_TOKEN_COOKIE = "dnd_spotify_session";
export const SPOTIFY_OAUTH_STATE_COOKIE = "dnd_spotify_oauth_state";
export const SPOTIFY_OAUTH_REDIRECT_COOKIE = "dnd_spotify_oauth_redirect";

export function getRequestOrigin(req: NextRequest): string {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost || req.headers.get("host");
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (host?.startsWith("localhost") || host?.startsWith("127.0.0.1")
      ? "http"
      : "https");
  if (host) {
    return `${proto}://${host}`;
  }
  return new URL(req.url).origin;
}

export function normalizeSpotifyRedirectUri(uri: string): string {
  const trimmed = uri.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" && parsed.hostname === "localhost") {
      parsed.hostname = "127.0.0.1";
    }
    return parsed.toString();
  } catch {
    return trimmed;
  }
}

export interface StoredSpotifySession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // timestamp in ms
  user?: {
    id: string;
    displayName: string;
    email?: string;
    avatarUrl?: string | null;
    product?: string;
    profileUrl?: string;
  };
}

function getSecretKey(): Buffer {
  const raw =
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.BETTER_AUTH_SECRET ||
    "dnd-secret-key-development-only-change-in-prod";
  return crypto.createHash("sha256").update(raw).digest();
}

export function getSpotifyCredentials() {
  const clientId =
    process.env.SPOTIFY_CLIENT_ID ||
    process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID ||
    "";
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || "";
  const redirectUri =
    process.env.SPOTIFY_REDIRECT_URI ||
    process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI ||
    "";
  return {
    clientId: clientId.trim(),
    clientSecret: clientSecret.trim(),
    redirectUri: redirectUri.trim(),
  };
}

export function resolveSpotifyRedirectUri(origin: string): string {
  const { redirectUri } = getSpotifyCredentials();
  if (redirectUri) {
    return redirectUri;
  }
  return `${origin}/callback`;
}

/**
 * Encrypts & signs the Spotify session payload using AES-256-GCM so tokens are never exposed in plaintext.
 */
export function sealSpotifySession(session: StoredSpotifySession): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getSecretKey(), iv);
  const json = JSON.stringify(session);
  const encrypted = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function unsealSpotifySession(token: string): StoredSpotifySession | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [ivB64, tagB64, encB64] = parts;
    const iv = Buffer.from(ivB64, "base64url");
    const tag = Buffer.from(tagB64, "base64url");
    const encrypted = Buffer.from(encB64, "base64url");

    const decipher = crypto.createDecipheriv("aes-256-gcm", getSecretKey(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    const parsed = JSON.parse(decrypted) as StoredSpotifySession;
    if (!parsed || !parsed.accessToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function setSpotifySessionCookie(session: StoredSpotifySession) {
  const cookieStore = await cookies();
  const sealed = sealSpotifySession(session);
  cookieStore.set(SPOTIFY_TOKEN_COOKIE, sealed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 60, // 60 days
  });
}

export async function clearSpotifySessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SPOTIFY_TOKEN_COOKIE);
}

/**
 * Reads the current Spotify session from the encrypted cookie and automatically refreshes
 * the access token if it is expired or expiring within 60 seconds.
 */
export async function getValidSpotifySession(): Promise<{
  session: StoredSpotifySession | null;
  refreshed: boolean;
}> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SPOTIFY_TOKEN_COOKIE)?.value;
  if (!raw) return { session: null, refreshed: false };

  const session = unsealSpotifySession(raw);
  if (!session) return { session: null, refreshed: false };

  // Check if access token is still valid (with 60s buffer)
  if (Date.now() + 60_000 < session.expiresAt) {
    return { session, refreshed: false };
  }

  // Need to refresh using refreshToken
  if (!session.refreshToken) {
    return { session: null, refreshed: false };
  }

  const { clientId, clientSecret } = getSpotifyCredentials();
  if (!clientId || !clientSecret) {
    return { session: null, refreshed: false };
  }

  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: session.refreshToken,
      }),
    });

    if (!res.ok) {
      return { session: null, refreshed: false };
    }

    const data = await res.json();
    const updatedSession: StoredSpotifySession = {
      ...session,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || session.refreshToken,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    };

    try {
      await setSpotifySessionCookie(updatedSession);
    } catch {
      // Cookie write may be ignored in certain read-only contexts, still return valid token
    }

    return { session: updatedSession, refreshed: true };
  } catch {
    return { session: null, refreshed: false };
  }
}
