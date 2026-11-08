import { NextResponse } from "next/server";
import { getValidSpotifySession } from "@/lib/spotify/spotify-server";
import {
  CURATED_FOCUS_PLAYLISTS,
  CURATED_FOCUS_TRACKS,
  SpotifyPlaylistItem,
  SpotifyTrackItem,
} from "@/lib/spotify/spotify-store";

function getCuratedFallbackTracks(playlistId: string): SpotifyTrackItem[] {
  const curated = CURATED_FOCUS_PLAYLISTS.find((p) => p.id === playlistId);
  if (!curated) return [];
  return CURATED_FOCUS_TRACKS.map((t) => ({
    ...t,
    imageUrl: t.imageUrl || curated.imageUrl,
  }));
}

function extractTracksTotal(item: any): { total: number; resolved: boolean } {
  if (!item) return { total: 0, resolved: false };

  // 1. Standard tracks object total (Simplified Playlist Object)
  if (typeof item.tracks?.total === "number" && item.tracks.total >= 0) {
    return { total: item.tracks.total, resolved: item.tracks.total > 0 };
  }

  // 2. New Spotify API schema replacing 'tracks' with 'items'
  if (typeof item.items?.total === "number" && item.items.total >= 0) {
    return { total: item.items.total, resolved: item.items.total > 0 };
  }

  // 3. Directly on total_tracks or totalTracks
  if (typeof item.total_tracks === "number" && item.total_tracks >= 0) {
    return { total: item.total_tracks, resolved: item.total_tracks > 0 };
  }
  if (typeof item.totalTracks === "number" && item.totalTracks >= 0) {
    return { total: item.totalTracks, resolved: item.totalTracks > 0 };
  }

  // 4. Directly on total
  if (typeof item.total === "number" && item.total >= 0) {
    return { total: item.total, resolved: item.total > 0 };
  }

  // 5. tracks as a direct number
  if (typeof item.tracks === "number" && item.tracks >= 0) {
    return { total: item.tracks, resolved: item.tracks > 0 };
  }

  // 6. Direct array length if tracks or items are embedded
  if (Array.isArray(item.tracks?.items)) {
    return { total: item.tracks.items.length, resolved: true };
  }
  if (Array.isArray(item.items?.items)) {
    return { total: item.items.items.length, resolved: true };
  }

  return { total: 0, resolved: false };
}

function formatTrackDuration(ms?: number): string {
  if (!ms || typeof ms !== "number" || ms <= 0) return "";
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function extractTrackFromEntry(
  entry: any,
  fallbackImage: string | null = null
): SpotifyTrackItem | null {
  if (!entry) return null;

  // Support Spotify's new Feb 2026 `/items` schema (`entry.item`),
  // classic `/tracks` schema (`entry.track`), or direct track objects (`entry`)
  const raw =
    entry.item ||
    entry.track ||
    (entry.uri || entry.id || entry.name || entry.title ? entry : null);

  if (!raw || raw.is_local) return null;

  let uri: string | null = typeof raw.uri === "string" ? raw.uri : null;
  let id: string | null = typeof raw.id === "string" ? raw.id : null;

  if (!id && uri && uri.startsWith("spotify:track:")) {
    id = uri.split(":")[2] || null;
  }
  if (!uri && id) {
    uri = `spotify:track:${id}`;
  }

  // Skip non-track items (e.g. episodes or null slots) unless they have a valid track URI
  if (!uri || !uri.startsWith("spotify:track:") || !id) {
    return null;
  }

  const title =
    (typeof raw.name === "string" && raw.name.trim()) ||
    (typeof raw.title === "string" && raw.title.trim()) ||
    "Untitled Track";

  let artist = "Spotify";
  if (Array.isArray(raw.artists) && raw.artists.length > 0) {
    const names = raw.artists
      .map((a: any) => (typeof a === "string" ? a : a?.name))
      .filter(Boolean);
    if (names.length > 0) {
      artist = names.join(", ");
    }
  } else if (typeof raw.subtitle === "string" && raw.subtitle.trim()) {
    artist = raw.subtitle.replace(/\u00a0/g, " ").trim();
  } else if (typeof raw.artist === "string" && raw.artist.trim()) {
    artist = raw.artist.trim();
  }

  const durationMs =
    typeof raw.duration_ms === "number"
      ? raw.duration_ms
      : typeof raw.duration === "number"
      ? raw.duration
      : undefined;

  const imageUrl =
    raw.album?.images?.[0]?.url ||
    raw.images?.[0]?.url ||
    raw.visualIdentity?.image?.[0]?.url ||
    (typeof raw.imageUrl === "string" ? raw.imageUrl : null) ||
    fallbackImage;

  return {
    id,
    uri,
    title,
    artist,
    duration: formatTrackDuration(durationMs),
    imageUrl: imageUrl || null,
  };
}

function parseTracksFromList(
  rawItems: any[],
  fallbackImage: string | null = null
): SpotifyTrackItem[] {
  if (!Array.isArray(rawItems)) return [];
  const seen = new Set<string>();
  const result: SpotifyTrackItem[] = [];
  for (const item of rawItems) {
    const parsed = extractTrackFromEntry(item, fallbackImage);
    if (parsed && !seen.has(parsed.uri)) {
      seen.add(parsed.uri);
      result.push(parsed);
    }
  }
  return result;
}

async function fetchTracksFromSpotifyEmbed(
  playlistId: string
): Promise<SpotifyTrackItem[]> {
  try {
    const res = await fetch(
      `https://open.spotify.com/embed/playlist/${encodeURIComponent(playlistId)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
        },
        cache: "no-store",
      }
    );
    if (!res.ok) return [];

    const html = await res.text();
    const match = html.match(
      /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i
    );
    if (!match || !match[1]) return [];

    const nextData = JSON.parse(match[1]);
    const stateData = nextData?.props?.pageProps?.state?.data;
    const entity = stateData?.entity || stateData;
    if (!entity) return [];

    const coverImage =
      entity?.visualIdentity?.image?.[0]?.url ||
      entity?.coverArt?.sources?.[0]?.url ||
      entity?.images?.[0]?.url ||
      null;

    const rawList =
      (Array.isArray(entity?.trackList) && entity.trackList) ||
      (Array.isArray(entity?.tracks?.items) && entity.tracks.items) ||
      (Array.isArray(entity?.items?.items) && entity.items.items) ||
      (Array.isArray(stateData?.tracks?.items) && stateData.tracks.items) ||
      [];

    return parseTracksFromList(rawList, coverImage);
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const playlistId = searchParams.get("playlistId");

  const { session } = await getValidSpotifySession();

  // If a specific playlist's tracks are requested
  if (playlistId) {
    if (session) {
      const authHeaders = {
        Authorization: `Bearer ${session.accessToken}`,
      };

      // 1. Try Spotify's current `/items` endpoint and classic `/tracks` endpoint (without restrictive field filters)
      const trackEndpoints = [
        `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/items?limit=50`,
        `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/tracks?limit=50`,
      ];

      for (const endpoint of trackEndpoints) {
        try {
          const res = await fetch(endpoint, {
            headers: authHeaders,
            cache: "no-store",
          });
          if (res.ok) {
            const data = await res.json();
            const rawItems = Array.isArray(data.items)
              ? data.items
              : Array.isArray(data.tracks?.items)
              ? data.tracks.items
              : [];
            const tracks = parseTracksFromList(rawItems);
            if (tracks.length > 0) {
              return NextResponse.json({
                connected: true,
                playlistId,
                tracks,
              });
            }
          }
        } catch (err) {
          console.warn("Failed to fetch playlist items from endpoint:", endpoint, err);
        }
      }

      // 2. Fallback: fetch the full playlist object and inspect embedded `items` or `tracks`
      try {
        const detailRes = await fetch(
          `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}`,
          {
            headers: authHeaders,
            cache: "no-store",
          }
        );
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          const playlistCover =
            Array.isArray(detailData.images) && detailData.images.length > 0
              ? detailData.images[0].url
              : null;
          const rawItems = Array.isArray(detailData.items?.items)
            ? detailData.items.items
            : Array.isArray(detailData.tracks?.items)
            ? detailData.tracks.items
            : Array.isArray(detailData.items)
            ? detailData.items
            : [];
          const tracks = parseTracksFromList(rawItems, playlistCover);
          if (tracks.length > 0) {
            return NextResponse.json({
              connected: true,
              playlistId,
              tracks,
            });
          }
        }
      } catch (err) {
        console.warn("Failed to fetch full playlist detail:", err);
      }
    }

    // 3. Fallback: extract tracklist from Spotify's SSR Embed page (works for followed, public, and editorial playlists)
    const embedTracks = await fetchTracksFromSpotifyEmbed(playlistId);
    if (embedTracks.length > 0) {
      return NextResponse.json({
        connected: Boolean(session),
        playlistId,
        tracks: embedTracks,
      });
    }

    // 4. Final fallback to curated focus tracks when browsing a curated editorial playlist offline
    const fallbackTracks = getCuratedFallbackTracks(playlistId);
    return NextResponse.json({
      connected: Boolean(session),
      playlistId,
      tracks: fallbackTracks,
      isCuratedFallback: fallbackTracks.length > 0,
    });
  }

  if (!session) {
    return NextResponse.json({
      connected: false,
      user: null,
      playlists: [],
      curated: CURATED_FOCUS_PLAYLISTS,
      tracks: [],
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

    const unresolvedIds = new Set<string>();
    const playlists: SpotifyPlaylistItem[] = rawItems
      .filter((item: any) => item && item.id && item.uri)
      .map((item: any) => {
        const { total, resolved } = extractTracksTotal(item);
        if (!resolved) {
          unresolvedIds.add(item.id);
        }
        return {
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
          tracksTotal: total,
          ownerName: item.owner?.display_name || item.owner?.id || "Spotify",
          externalUrl:
            item.external_urls?.spotify ||
            `https://open.spotify.com/playlist/${item.id}`,
          isCurated: false,
        };
      });

    // If any playlist reported an unresolved 0 track count (common with Spotify's simplified playlist cache),
    // resolve the actual track count with a single lightweight request per playlist (capped at 15)
    const zeroTrackPlaylists = playlists.filter((p) => unresolvedIds.has(p.id));
    if (zeroTrackPlaylists.length > 0) {
      await Promise.allSettled(
        zeroTrackPlaylists.slice(0, 15).map(async (p) => {
          for (const subPath of ["items", "tracks"]) {
            try {
              const trackRes = await fetch(
                `https://api.spotify.com/v1/playlists/${encodeURIComponent(p.id)}/${subPath}?limit=1&fields=total`,
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
          }
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
