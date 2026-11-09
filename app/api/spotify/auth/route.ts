import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  getRequestOrigin,
  getSpotifyCredentials,
  resolveSpotifyRedirectUri,
  SPOTIFY_OAUTH_REDIRECT_COOKIE,
  SPOTIFY_OAUTH_STATE_COOKIE,
} from "@/lib/spotify/spotify-server";

export async function GET(req: NextRequest) {
  const { clientId } = getSpotifyCredentials();
  const origin = getRequestOrigin(req);
  const redirectUri = resolveSpotifyRedirectUri(origin);

  const wantsJson =
    req.nextUrl.searchParams.get("format") === "json" ||
    req.headers.get("accept")?.includes("application/json");

  if (wantsJson) {
    return NextResponse.json({
      configured: Boolean(clientId),
      redirectUri,
    });
  }

  if (!clientId) {
    return NextResponse.redirect(
      new URL(
        `/callback?status=error&provider=spotify&error=${encodeURIComponent(
          "missing_client_id"
        )}&message=${encodeURIComponent(
          "SPOTIFY_CLIENT_ID is not configured in environment variables."
        )}`,
        origin
      )
    );
  }

  const state = crypto.randomBytes(24).toString("hex");
  const scopes = [
    "user-read-email",
    "user-read-private",
    "playlist-read-private",
    "playlist-read-collaborative",
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-read-currently-playing",
    "streaming",
  ].join(" ");

  const authorizeUrl = new URL("https://accounts.spotify.com/authorize");
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("scope", scopes);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("show_dialog", "true");

  const response = NextResponse.redirect(authorizeUrl.toString());
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600, // 10 minutes
  };
  response.cookies.set(SPOTIFY_OAUTH_STATE_COOKIE, state, cookieOpts);
  response.cookies.set(SPOTIFY_OAUTH_REDIRECT_COOKIE, redirectUri, cookieOpts);

  return response;
}
