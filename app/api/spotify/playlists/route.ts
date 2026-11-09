import { NextResponse } from "next/server";
import {
  getValidSpotifySession,
  refreshSpotifySession,
  setSpotifySessionCookie,
} from "@/lib/spotify/spotify-server";
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
    return { total: item.tracks.total, resolved: true };
  }

  // 2. New Spotify API schema replacing 'tracks' with 'items'
  if (typeof item.items?.total === "number" && item.items.total >= 0) {
    return { total: item.items.total, resolved: true };
  }

  // 3. Directly on total_tracks or totalTracks
  if (typeof item.total_tracks === "number" && item.total_tracks >= 0) {
    return { total: item.total_tracks, resolved: true };
  }
  if (typeof item.totalTracks === "number" && item.totalTracks >= 0) {
    return { total: item.totalTracks, resolved: true };
  }

  // 4. Directly on total
  if (typeof item.total === "number" && item.total >= 0) {
    return { total: item.total, resolved: true };
  }

  // 5. tracks as a direct number
  if (typeof item.tracks === "number" && item.tracks >= 0) {
    return { total: item.tracks, resolved: true };
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

async function fetchPlaylistFromSpotifyEmbed(
  playlistId: string
): Promise<{
  playlist: SpotifyPlaylistItem | null;
  tracks: SpotifyTrackItem[];
}> {
  let playlistMeta: SpotifyPlaylistItem | null = null;
  let tracks: SpotifyTrackItem[] = [];

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
    if (res.ok) {
      const html = await res.text();
      const match = html.match(
        /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i
      );
      if (match && match[1]) {
        const nextData = JSON.parse(match[1]);
        const stateData = nextData?.props?.pageProps?.state?.data;
        const entity = stateData?.entity || stateData;
        if (entity) {
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

          tracks = parseTracksFromList(rawList, coverImage);

          const name =
            (typeof entity.name === "string" && entity.name.trim()) ||
            (typeof entity.title === "string" && entity.title.trim()) ||
            "";
          const ownerName =
            (typeof entity.subtitle === "string" && entity.subtitle.trim()) ||
            (typeof entity.ownerV2?.data?.name === "string" &&
              entity.ownerV2.data.name.trim()) ||
            "Spotify";

          if (name) {
            playlistMeta = {
              id: playlistId,
              uri: `spotify:playlist:${playlistId}`,
              name,
              description: "",
              imageUrl: coverImage,
              tracksTotal: tracks.length,
              ownerName,
              externalUrl: `https://open.spotify.com/playlist/${playlistId}`,
              isCurated: false,
            };
          }
        }
      }
    }
  } catch {}

  if (!playlistMeta) {
    try {
      const oembedRes = await fetch(
        `https://open.spotify.com/oembed?url=${encodeURIComponent(
          `https://open.spotify.com/playlist/${playlistId}`
        )}`,
        { cache: "no-store" }
      );
      if (oembedRes.ok) {
        const oembed = await oembedRes.json();
        playlistMeta = {
          id: playlistId,
          uri: `spotify:playlist:${playlistId}`,
          name: oembed.title || "Spotify Playlist",
          description: "",
          imageUrl: oembed.thumbnail_url || null,
          tracksTotal: tracks.length,
          ownerName: oembed.author_name || "Spotify",
          externalUrl: `https://open.spotify.com/playlist/${playlistId}`,
          isCurated: false,
        };
      }
    } catch {}
  }

  return { playlist: playlistMeta, tracks };
}

function normalizePlaylistItem(
  rawEntry: any,
  unresolvedIds: Set<string>
): SpotifyPlaylistItem | null {
  const item = rawEntry?.playlist || rawEntry?.item || rawEntry;
  if (!item || typeof item !== "object") return null;

  let id: string | null = typeof item.id === "string" ? item.id.trim() : null;
  let uri: string | null = typeof item.uri === "string" ? item.uri.trim() : null;

  if (!id && uri && uri.startsWith("spotify:playlist:")) {
    id = uri.split(":")[2] || null;
  }
  if (!id && typeof item.href === "string") {
    const hrefMatch = item.href.match(/\/playlists\/([a-zA-Z0-9]+)/);
    if (hrefMatch) id = hrefMatch[1];
  }
  if (!uri && id) {
    uri = `spotify:playlist:${id}`;
  }

  if (!id || !uri || !uri.startsWith("spotify:playlist:")) {
    return null;
  }

  const { total, resolved } = extractTracksTotal(item);
  if (!resolved) {
    unresolvedIds.add(id);
  }

  const imageUrl =
    (Array.isArray(item.images) && item.images.length > 0 && item.images[0]?.url) ||
    item.coverArt?.sources?.[0]?.url ||
    item.visualIdentity?.image?.[0]?.url ||
    null;

  return {
    id,
    uri,
    name:
      (typeof item.name === "string" && item.name.trim()) ||
      "Untitled Playlist",
    description:
      typeof item.description === "string"
        ? item.description.replace(/<[^>]*>/g, "")
        : "",
    imageUrl: typeof imageUrl === "string" ? imageUrl : null,
    tracksTotal: total,
    ownerName:
      item.owner?.display_name ||
      item.owner?.id ||
      item.ownerV2?.data?.name ||
      "Spotify",
    externalUrl:
      item.external_urls?.spotify ||
      `https://open.spotify.com/playlist/${id}`,
    isCurated: false,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const playlistId = searchParams.get("playlistId");

  const { session: initialSession } = await getValidSpotifySession();
  let session = initialSession;

  // If a specific playlist's tracks & metadata are requested
  if (playlistId) {
    let resolvedPlaylist: SpotifyPlaylistItem | null =
      CURATED_FOCUS_PLAYLISTS.find((p) => p.id === playlistId) || null;

    if (session) {
      const authHeaders = {
        Authorization: `Bearer ${session.accessToken}`,
      };

      // 1. Fetch full playlist detail first to capture both metadata and tracks if possible
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
          const dummySet = new Set<string>();
          const normalizedMeta = normalizePlaylistItem(detailData, dummySet);
          if (normalizedMeta) {
            resolvedPlaylist = normalizedMeta;
          }
          const playlistCover =
            normalizedMeta?.imageUrl ||
            (Array.isArray(detailData.images) && detailData.images.length > 0
              ? detailData.images[0].url
              : null);
          const rawItems = Array.isArray(detailData.items?.items)
            ? detailData.items.items
            : Array.isArray(detailData.tracks?.items)
            ? detailData.tracks.items
            : Array.isArray(detailData.items)
            ? detailData.items
            : [];
          const tracks = parseTracksFromList(rawItems, playlistCover);
          if (tracks.length > 0) {
            if (resolvedPlaylist && resolvedPlaylist.tracksTotal === 0) {
              resolvedPlaylist.tracksTotal = tracks.length;
            }
            return NextResponse.json({
              connected: true,
              playlistId,
              playlist: resolvedPlaylist,
              tracks,
            });
          }
        }
      } catch (err) {
        console.warn("Failed to fetch full playlist detail:", err);
      }

      // 2. Try Spotify's current `/items` endpoint and classic `/tracks` endpoint
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
            const tracks = parseTracksFromList(
              rawItems,
              resolvedPlaylist?.imageUrl || null
            );
            if (tracks.length > 0) {
              if (!resolvedPlaylist) {
                const embedResult = await fetchPlaylistFromSpotifyEmbed(playlistId);
                resolvedPlaylist = embedResult.playlist;
              }
              return NextResponse.json({
                connected: true,
                playlistId,
                playlist: resolvedPlaylist,
                tracks,
              });
            }
          }
        } catch (err) {
          console.warn("Failed to fetch playlist items from endpoint:", endpoint, err);
        }
      }
    }

    // 3. Fallback: extract playlist metadata & tracklist from Spotify's SSR Embed page / oEmbed
    const embedData = await fetchPlaylistFromSpotifyEmbed(playlistId);
    if (!resolvedPlaylist && embedData.playlist) {
      resolvedPlaylist = embedData.playlist;
    }
    if (embedData.tracks.length > 0) {
      return NextResponse.json({
        connected: Boolean(session),
        playlistId,
        playlist: resolvedPlaylist,
        tracks: embedData.tracks,
      });
    }

    // 4. Final fallback to curated focus tracks when browsing a curated editorial playlist offline
    const fallbackTracks = getCuratedFallbackTracks(playlistId);
    return NextResponse.json({
      connected: Boolean(session),
      playlistId,
      playlist: resolvedPlaylist,
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
    let res = await fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
      cache: "no-store",
    });

    // If token was invalidated early, force refresh once and retry
    if (res.status === 401 && session.refreshToken) {
      const refreshed = await refreshSpotifySession(session);
      if (refreshed) {
        session = refreshed;
        res = await fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
          cache: "no-store",
        });
      }
    }

    // Heal missing user profile on session if needed
    if (!session.user) {
      try {
        const meRes = await fetch("https://api.spotify.com/v1/me", {
          headers: { Authorization: `Bearer ${session.accessToken}` },
          cache: "no-store",
        });
        if (meRes.ok) {
          const me = await meRes.json();
          session = {
            ...session,
            user: {
              id: me.id,
              displayName: me.display_name || me.id || "Spotify Listener",
              email: me.email || undefined,
              avatarUrl:
                Array.isArray(me.images) && me.images.length > 0
                  ? me.images[0].url
                  : null,
              product: me.product || "free",
              profileUrl: me.external_urls?.spotify || undefined,
            },
          };
          try {
            await setSpotifySessionCookie(session);
          } catch {}
        }
      } catch {}
    }

    if (!res.ok) {
      const status = res.status;
      const isForbidden = status === 403;
      return NextResponse.json({
        connected: true,
        user: session.user || {
          id: "spotify_user",
          displayName: "Spotify Listener",
        },
        playlists: [],
        curated: CURATED_FOCUS_PLAYLISTS,
        errorCode: isForbidden
          ? "spotify_dev_mode_restricted"
          : "spotify_api_error",
        error: isForbidden
          ? "Spotify restricted automatic library listing for this account (Spotify Developer Mode allowlist). Paste any of your Spotify playlist links below to add them immediately."
          : "Could not load your playlists from Spotify right now. You can refresh or paste a playlist link directly.",
      });
    }

    const data = await res.json();
    const rawItems: any[] = Array.isArray(data.items) ? [...data.items] : [];

    // Fetch second page if user has more than 50 playlists (up to 100 total)
    if (typeof data.next === "string" && rawItems.length > 0 && rawItems.length <= 50) {
      try {
        const nextRes = await fetch(data.next, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
          cache: "no-store",
        });
        if (nextRes.ok) {
          const nextData = await nextRes.json();
          if (Array.isArray(nextData.items)) {
            rawItems.push(...nextData.items);
          }
        }
      } catch {}
    }

    // Fallback: if /v1/me/playlists returned 0 items and we have the user's Spotify ID, also query /v1/users/{id}/playlists
    if (rawItems.length === 0 && session.user?.id && session.user.id !== "spotify_user") {
      try {
        const userPlRes = await fetch(
          `https://api.spotify.com/v1/users/${encodeURIComponent(
            session.user.id
          )}/playlists?limit=50`,
          {
            headers: { Authorization: `Bearer ${session.accessToken}` },
            cache: "no-store",
          }
        );
        if (userPlRes.ok) {
          const userPlData = await userPlRes.json();
          if (Array.isArray(userPlData.items)) {
            rawItems.push(...userPlData.items);
          }
        }
      } catch {}
    }

    const unresolvedIds = new Set<string>();
    const seenUris = new Set<string>();
    const playlists: SpotifyPlaylistItem[] = [];

    for (const rawEntry of rawItems) {
      const normalized = normalizePlaylistItem(rawEntry, unresolvedIds);
      if (normalized && !seenUris.has(normalized.uri)) {
        seenUris.add(normalized.uri);
        playlists.push(normalized);
      }
    }

    // Only query missing track totals when total was not provided as a number at all (capped at 5 with fast timeout)
    const unresolvedPlaylists = playlists.filter((p) => unresolvedIds.has(p.id));
    if (unresolvedPlaylists.length > 0) {
      await Promise.allSettled(
        unresolvedPlaylists.slice(0, 5).map(async (p) => {
          try {
            const trackRes = await fetch(
              `https://api.spotify.com/v1/playlists/${encodeURIComponent(
                p.id
              )}?fields=tracks.total,items.total`,
              {
                headers: { Authorization: `Bearer ${session!.accessToken}` },
                cache: "no-store",
                signal: AbortSignal.timeout(1500),
              }
            );
            if (trackRes.ok) {
              const trackData = await trackRes.json();
              const count =
                trackData.tracks?.total ?? trackData.items?.total ?? 0;
              if (typeof count === "number" && count >= 0) {
                p.tracksTotal = count;
              }
            }
          } catch {}
        })
      );
    }

    return NextResponse.json({
      connected: true,
      user: session.user || {
        id: "spotify_user",
        displayName: "Spotify Listener",
      },
      playlists,
      curated: CURATED_FOCUS_PLAYLISTS,
    });
  } catch (err) {
    console.error("Error fetching Spotify playlists:", err);
    return NextResponse.json({
      connected: true,
      user: session.user || {
        id: "spotify_user",
        displayName: "Spotify Listener",
      },
      playlists: [],
      curated: CURATED_FOCUS_PLAYLISTS,
      errorCode: "spotify_network_error",
      error: "Could not reach Spotify right now. Please try refreshing.",
    });
  }
}
