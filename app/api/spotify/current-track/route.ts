import { NextRequest, NextResponse } from "next/server";
import { getValidSpotifySession } from "@/lib/spotify/spotify-server";

export async function GET(req: NextRequest) {
  const uri = req.nextUrl.searchParams.get("uri");
  const trackIdParam = req.nextUrl.searchParams.get("id");

  let trackId = trackIdParam;
  if (!trackId && uri && uri.startsWith("spotify:track:")) {
    trackId = uri.replace("spotify:track:", "").split("?")[0];
  }

  const { session } = await getValidSpotifySession();

  // 1. If a specific track ID is requested
  if (trackId) {
    // Try authenticated Spotify API first
    if (session?.accessToken) {
      try {
        const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json({
            success: true,
            title: data.name,
            artist: data.artists?.map((a: { name: string }) => a.name).join(", ") || "",
            album: data.album?.name || "",
            artworkUrl: data.album?.images?.[0]?.url || null,
            uri: data.uri,
            isPlaying: true,
          });
        }
      } catch {
        // Fall back to oembed
      }
    }

    // Fallback: Spotify public oEmbed endpoint (no auth required)
    try {
      const oembedRes = await fetch(
        `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`,
        { next: { revalidate: 3600 } }
      );
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        return NextResponse.json({
          success: true,
          title: oembedData.title || "Spotify Track",
          artist: oembedData.author_name || "Spotify",
          artworkUrl: oembedData.thumbnail_url || null,
          uri: `spotify:track:${trackId}`,
          isPlaying: true,
        });
      }
    } catch {
      // Return basic fallback
    }

    return NextResponse.json({
      success: true,
      title: "Spotify Track",
      artist: "Spotify",
      artworkUrl: null,
      uri: `spotify:track:${trackId}`,
      isPlaying: true,
    });
  }

  // 2. No specific track requested: check if user is playing Spotify on any active device
  if (session?.accessToken) {
    try {
      const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });

      if (res.status === 204 || res.status === 404) {
        return NextResponse.json({
          success: true,
          isPlaying: false,
          title: "",
          artist: "",
        });
      }

      if (res.ok) {
        const data = await res.json();
        if (data && data.item) {
          return NextResponse.json({
            success: true,
            title: data.item.name,
            artist: data.item.artists?.map((a: { name: string }) => a.name).join(", ") || "",
            album: data.item.album?.name || "",
            artworkUrl: data.item.album?.images?.[0]?.url || null,
            uri: data.item.uri,
            isPlaying: Boolean(data.is_playing),
          });
        }
      }
    } catch {
      // Quietly ignore network failures
    }
  }

  return NextResponse.json({
    success: true,
    isPlaying: false,
    title: "",
    artist: "",
  });
}
