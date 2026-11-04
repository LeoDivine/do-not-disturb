import { NextResponse } from "next/server";
import { getValidSpotifySession } from "@/lib/spotify/spotify-server";
import { CURATED_FOCUS_PLAYLISTS, SpotifyPlaylistItem } from "@/lib/spotify/spotify-store";

function extractTracksTotal(item: any): number {
  if (!item) return 0;

  // 1. Standard tracks object total (Simplified Playlist Object)
  if (typeof item.tracks?.total === "number" && item.tracks.total > 0) {
    return item.tracks.total;
  }

  // 2. New Spotify API schema replacing 'tracks' with 'items'
  if (typeof item.items?.total === "number" && item.items.total > 0) {
    return item.items.total;
  }

  // 3. Directly on total_tracks or totalTracks
  if (typeof item.total_tracks === "number" && item.total_tracks > 0) {
    return item.total_tracks;
  }
  if (typeof item.totalTracks === "number" && item.totalTracks > 0) {
    return item.totalTracks;
  }

  // 4. Directly on total
  if (typeof item.total === "number" && item.total > 0) {
    return item.total;
  }

  // 5. tracks as a direct number
  if (typeof item.tracks === "number" && item.tracks > 0) {
    return item.tracks;
  }

  // 6. Direct array length if tracks or items are embedded
  if (Array.isArray(item.tracks?.items) && item.tracks.items.length > 0) {
    return item.tracks.items.length;
  }
  if (Array.isArray(item.items?.items) && item.items.items.length > 0) {
    return item.items.items.length;
  }

  return 0;
}

export async function GET() {
  const { session } = await getValidSpotifySession();

  if (!session) {
    return NextResponse.json({
      connected: false,
      user: null,
      playlists: [],
      curated: CURATED_FOCUS_PLAYLISTS,
    });
  }

  try {
    const res = await fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({
        connected: true,
        user: session.user || null,
        playlists: [],
        curated: CURATED_FOCUS_PLAYLISTS,
        error: "Failed to fetch playlists from Spotify API.",
      });
    }

    const data = await res.json();
    const rawItems = Array.isArray(data.items) ? data.items : [];

    const playlists: SpotifyPlaylistItem[] = rawItems
      .filter((item: any) => item && item.id && item.uri)
      .map((item: any) => ({
        id: item.id,
        uri: item.uri,
        name: item.name || "Untitled Playlist",
        description:
          typeof item.description === "string"
            ? item.description.replace(/<[^>]*>/g, "")
            : "",
        imageUrl:
          Array.isArray(item.images) && item.images.length > 0
            ? item.images[0].url
            : null,
        tracksTotal: extractTracksTotal(item),
        ownerName: item.owner?.display_name || item.owner?.id || "Spotify",
        externalUrl:
          item.external_urls?.spotify ||
          `https://open.spotify.com/playlist/${item.id}`,
        isCurated: false,
      }));

    // If any playlist reported 0 tracks (common with Spotify's simplified playlist cache),
    // resolve the actual track count from the playlist tracks endpoint
    const zeroTrackPlaylists = playlists.filter((p) => p.tracksTotal === 0);
    if (zeroTrackPlaylists.length > 0) {
      await Promise.allSettled(
        zeroTrackPlaylists.slice(0, 25).map(async (p) => {
          try {
            const trackRes = await fetch(
              `https://api.spotify.com/v1/playlists/${p.id}/tracks?limit=1&fields=total`,
              {
                headers: { Authorization: `Bearer ${session.accessToken}` },
                cache: "no-store",
              }
            );
            if (trackRes.ok) {
              const trackData = await trackRes.json();
              if (typeof trackData.total === "number" && trackData.total > 0) {
                p.tracksTotal = trackData.total;
                return;
              }
            }
          } catch {}

          try {
            const detailRes = await fetch(
              `https://api.spotify.com/v1/playlists/${p.id}?fields=tracks.total,items.total`,
              {
                headers: { Authorization: `Bearer ${session.accessToken}` },
                cache: "no-store",
              }
            );
            if (detailRes.ok) {
              const detailData = await detailRes.json();
              const count = detailData.tracks?.total ?? detailData.items?.total ?? 0;
              if (typeof count === "number" && count > 0) {
                p.tracksTotal = count;
              }
            }
          } catch {}
        })
      );
    }

    return NextResponse.json({
      connected: true,
      user: session.user || null,
      playlists,
      curated: CURATED_FOCUS_PLAYLISTS,
    });
  } catch (err) {
    console.error("Error fetching Spotify playlists:", err);
    return NextResponse.json({
      connected: true,
      user: session.user || null,
      playlists: [],
      curated: CURATED_FOCUS_PLAYLISTS,
    });
  }
}
