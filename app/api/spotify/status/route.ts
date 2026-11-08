import { NextRequest, NextResponse } from "next/server";
import {
  getRequestOrigin,
  getSpotifyCredentials,
  resolveSpotifyRedirectUri,
  getValidSpotifySession,
  clearSpotifySessionCookie,
} from "@/lib/spotify/spotify-server";

export async function GET(req: NextRequest) {
  const { clientId } = getSpotifyCredentials();
  const origin = getRequestOrigin(req);
  const redirectUri = resolveSpotifyRedirectUri(origin);

  const { session } = await getValidSpotifySession();

  if (!session) {
    return NextResponse.json({
      configured: Boolean(clientId),
      connected: false,
      redirectUri,
      user: null,
    });
  }

  return NextResponse.json({
    configured: Boolean(clientId),
    connected: true,
    redirectUri,
    user: session.user || {
      id: "spotify_user",
      displayName: "Spotify Listener",
    },
  });
}

export async function DELETE() {
  await clearSpotifySessionCookie();
  return NextResponse.json({ success: true, connected: false });
}
