import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  getSpotifyCredentials,
  resolveSpotifyRedirectUri,
  SPOTIFY_OAUTH_STATE_COOKIE,
} from "@/lib/spotify/spotify-server";

export async function GET(req: NextRequest) {
  const { clientId } = getSpotifyCredentials();
  const origin = new URL(req.url).origin;
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
        req.url
      )
    );
  }

  const state = crypto.randomBytes(24).toString("hex");
  const scopes = [
    "user-read-email",
    "user-read-private",
    "playlist-read-private",
    "playlist-read-collaborative",
    "streaming",
    "user-modify-playback-state",
    "user-read-playback-state",
  ].join(" ");

  const authorizeUrl = new URL("https://accounts.spotify.com/authorize");
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("scope", scopes);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("show_dialog", "true");

  const response = NextResponse.redirect(authorizeUrl.toString());
  response.cookies.set(SPOTIFY_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });

  return response;
}
