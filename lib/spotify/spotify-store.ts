export interface SpotifyPlaylistItem {
  id: string;
  uri: string;
  name: string;
  description: string;
  imageUrl: string | null;
  tracksTotal: number;
  ownerName: string;
  externalUrl: string;
  isCurated?: boolean;
}

export interface SpotifyProfile {
  id: string;
  displayName: string;
  email?: string;
  avatarUrl?: string | null;
  product?: string; // "premium", "free", "open"
  profileUrl?: string;
}

export type AudioSourceMode = "ambient" | "spotify" | "both";

export interface SpotifyStoredPreference {
  selectedPlaylistUri: string;
  selectedPlaylistName: string;
  selectedPlaylistImage: string | null;
  selectedPlaylistOwner: string;
  audioSource: AudioSourceMode;
  autoPlayOnFocus: boolean;
  pauseOnBreak: boolean;
  lastPlayedTrackUri?: string | null;
}

export const SPOTIFY_PREFS_STORAGE_KEY = "dnd_spotify_preferences";
export const SPOTIFY_PREFS_UPDATED_EVENT = "dnd-spotify-prefs-updated";
export const SPOTIFY_AUTH_UPDATED_EVENT = "dnd-spotify-auth-updated";

export const CURATED_FOCUS_PLAYLISTS: SpotifyPlaylistItem[] = [
  {
    id: "37i9dQZF1DWZeKCadgRdKQ",
    uri: "spotify:playlist:37i9dQZF1DWZeKCadgRdKQ",
    name: "Deep Focus",
    description: "Keep calm and focus with ambient and post-rock textures.",
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=360&q=80",
    tracksTotal: 185,
    ownerName: "Spotify Focus",
    externalUrl: "https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ",
    isCurated: true,
  },
  {
    id: "37i9dQZF1DWWQRwui0ExPn",
    uri: "spotify:playlist:37i9dQZF1DWWQRwui0ExPn",
    name: "Lo-Fi Beats",
    description: "Chill beats to relax, study, and stay in your flow state.",
    imageUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=360&q=80",
    tracksTotal: 450,
    ownerName: "Spotify Chill",
    externalUrl: "https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn",
    isCurated: true,
  },
  {
    id: "37i9dQZF1DX4sWSpwq3LiO",
    uri: "spotify:playlist:37i9dQZF1DX4sWSpwq3LiO",
    name: "Peaceful Piano",
    description: "Peaceful piano melodies to help you slow down and breathe.",
    imageUrl: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&w=360&q=80",
    tracksTotal: 310,
    ownerName: "Spotify Classical",
    externalUrl: "https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO",
    isCurated: true,
  },
  {
    id: "37i9dQZF1DX8Uebhn9wzrS",
    uri: "spotify:playlist:37i9dQZF1DX8Uebhn9wzrS",
    name: "Chill Lofi Study Beats",
    description: " The perfect study beats. Find your focus and crush your goals.",
    imageUrl: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=360&q=80",
    tracksTotal: 260,
    ownerName: "Spotify Study",
    externalUrl: "https://open.spotify.com/playlist/37i9dQZF1DX8Uebhn9wzrS",
    isCurated: true,
  },
  {
    id: "37i9dQZF1DX5trt9i14X7j",
    uri: "spotify:playlist:37i9dQZF1DX5trt9i14X7j",
    name: "Coding Mode",
    description: "Dedicated to all the programmers out there. Electronic flow.",
    imageUrl: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=360&q=80",
    tracksTotal: 140,
    ownerName: "Spotify Electronic",
    externalUrl: "https://open.spotify.com/playlist/37i9dQZF1DX5trt9i14X7j",
    isCurated: true,
  },
];

export interface SpotifyTrackItem {
  id: string;
  uri: string;
  title: string;
  artist: string;
  duration?: string;
  category?: string;
  imageUrl?: string | null;
}

export const CURATED_FOCUS_TRACKS: SpotifyTrackItem[] = [
  {
    id: "6kkwzB6hXLIONkEk9JciA6",
    uri: "spotify:track:6kkwzB6hXLIONkEk9JciA6",
    title: "Weightless",
    artist: "Marconi Union",
    duration: "8:00",
    category: "Ambient",
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=360&q=80",
  },
  {
    id: "6N7gZr3Vs1j4LYx1Ewh9Pf",
    uri: "spotify:track:6N7gZr3Vs1j4LYx1Ewh9Pf",
    title: "Clair de Lune",
    artist: "Claude Debussy",
    duration: "5:03",
    category: "Piano",
    imageUrl: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&w=360&q=80",
  },
  {
    id: "5NGtFXV1UvPnUnunbs4iW8",
    uri: "spotify:track:5NGtFXV1UvPnUnunbs4iW8",
    title: "Gymnopédie No. 1",
    artist: "Erik Satie",
    duration: "3:32",
    category: "Piano",
    imageUrl: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=360&q=80",
  },
  {
    id: "2agBDIr9MYmvyqCe6fZy4P",
    uri: "spotify:track:2agBDIr9MYmvyqCe6fZy4P",
    title: "River Flows in You",
    artist: "Yiruma",
    duration: "3:08",
    category: "Piano",
    imageUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=360&q=80",
  },
  {
    id: "3weNRklVDQB4RrUbICQqS5",
    uri: "spotify:track:3weNRklVDQB4RrUbICQqS5",
    title: "Nuvole Bianche",
    artist: "Ludovico Einaudi",
    duration: "5:57",
    category: "Piano",
    imageUrl: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&w=360&q=80",
  },
  {
    id: "1cvySRw27V5Awh0lGfB87h",
    uri: "spotify:track:1cvySRw27V5Awh0lGfB87h",
    title: "Experience",
    artist: "Ludovico Einaudi",
    duration: "5:15",
    category: "Cinematic",
    imageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=360&q=80",
  },
  {
    id: "6pWgRkpqVfxnj3WuIcJ7ZZ",
    uri: "spotify:track:6pWgRkpqVfxnj3WuIcJ7ZZ",
    title: "Cornfield Chase",
    artist: "Hans Zimmer",
    duration: "2:06",
    category: "Cinematic",
    imageUrl: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=360&q=80",
  },
  {
    id: "6ZFbIcPtQ91dcFY1UMg31v",
    uri: "spotify:track:6ZFbIcPtQ91dcFY1UMg31v",
    title: "Time",
    artist: "Hans Zimmer",
    duration: "4:35",
    category: "Cinematic",
    imageUrl: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=360&q=80",
  },
  {
    id: "2MZSXhq4XDJWuCi0Tne209",
    uri: "spotify:track:2MZSXhq4XDJWuCi0Tne209",
    title: "Avril 14th",
    artist: "Aphex Twin",
    duration: "2:05",
    category: "Chill",
    imageUrl: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=360&q=80",
  },
  {
    id: "1Tu2kUcvm0rP2Xm7jWb2Fk",
    uri: "spotify:track:1Tu2kUcvm0rP2Xm7jWb2Fk",
    title: "Resonance",
    artist: "HOME",
    duration: "3:32",
    category: "Chill",
    imageUrl: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=360&q=80",
  },
];

export const DEFAULT_SPOTIFY_PREFS: SpotifyStoredPreference = {
  selectedPlaylistUri: CURATED_FOCUS_PLAYLISTS[0].uri,
  selectedPlaylistName: CURATED_FOCUS_PLAYLISTS[0].name,
  selectedPlaylistImage: CURATED_FOCUS_PLAYLISTS[0].imageUrl,
  selectedPlaylistOwner: CURATED_FOCUS_PLAYLISTS[0].ownerName,
  audioSource: "ambient",
  autoPlayOnFocus: true,
  pauseOnBreak: true,
  lastPlayedTrackUri: null,
};

/**
 * Extracts a normalized `spotify:playlist:<id>` or `spotify:album:<id>` or `spotify:track:<id>` URI
 * from a Spotify URL or URI string.
 */
export function parseSpotifyInputToUri(input: string): { uri: string; id: string; type: "playlist" | "album" | "track" } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Match spotify:playlist:37i9dQZF1DWZeKCadgRdKQ
  const uriMatch = trimmed.match(/^spotify:(playlist|album|track):([a-zA-Z0-9]+)$/);
  if (uriMatch) {
    return {
      type: uriMatch[1] as "playlist" | "album" | "track",
      id: uriMatch[2],
      uri: `spotify:${uriMatch[1]}:${uriMatch[2]}`,
    };
  }

  // Match https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ?si=...
  try {
    const url = new URL(trimmed);
    if (url.hostname.includes("spotify.com")) {
      const parts = url.pathname.split("/").filter(Boolean);
      // Handle optional locale segment like /intl-en/playlist/...
      const typeIdx = parts.findIndex((p) => p === "playlist" || p === "album" || p === "track");
      if (typeIdx !== -1 && parts[typeIdx + 1]) {
        const type = parts[typeIdx] as "playlist" | "album" | "track";
        const id = parts[typeIdx + 1].split("?")[0];
        if (/^[a-zA-Z0-9]+$/.test(id)) {
          return {
            type,
            id,
            uri: `spotify:${type}:${id}`,
          };
        }
      }
    }
  } catch {
    // If just a raw 22-char alphanumeric ID was pasted, assume playlist
    if (/^[a-zA-Z0-9]{22}$/.test(trimmed)) {
      return {
        type: "playlist",
        id: trimmed,
        uri: `spotify:playlist:${trimmed}`,
      };
    }
  }

  return null;
}

export function getSpotifyEmbedUrl(
  uriOrUrl?: string | null,
  theme: "dark" | "0" = "0"
): string {
  if (!uriOrUrl) {
    return `https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKCadgRdKQ?utm_source=generator&theme=${theme}`;
  }
  const parsed = parseSpotifyInputToUri(uriOrUrl);
  if (parsed) {
    return `https://open.spotify.com/embed/${parsed.type}/${parsed.id}?utm_source=generator&theme=${theme}`;
  }
  if (uriOrUrl.includes("open.spotify.com")) {
    if (uriOrUrl.includes("/embed/")) {
      return uriOrUrl;
    }
    return uriOrUrl.replace("open.spotify.com/", "open.spotify.com/embed/");
  }
  return `https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKCadgRdKQ?utm_source=generator&theme=${theme}`;
}

export function getStoredSpotifyPreferences(): SpotifyStoredPreference {
  if (typeof window === "undefined") {
    return { ...DEFAULT_SPOTIFY_PREFS };
  }
  try {
    const raw = localStorage.getItem(SPOTIFY_PREFS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SPOTIFY_PREFS };
    const parsed = JSON.parse(raw);
    return {
      selectedPlaylistUri:
        typeof parsed.selectedPlaylistUri === "string" && parsed.selectedPlaylistUri.startsWith("spotify:")
          ? parsed.selectedPlaylistUri
          : DEFAULT_SPOTIFY_PREFS.selectedPlaylistUri,
      selectedPlaylistName:
        typeof parsed.selectedPlaylistName === "string" && parsed.selectedPlaylistName
          ? parsed.selectedPlaylistName
          : DEFAULT_SPOTIFY_PREFS.selectedPlaylistName,
      selectedPlaylistImage:
        typeof parsed.selectedPlaylistImage === "string"
          ? parsed.selectedPlaylistImage
          : DEFAULT_SPOTIFY_PREFS.selectedPlaylistImage,
      selectedPlaylistOwner:
        typeof parsed.selectedPlaylistOwner === "string" && parsed.selectedPlaylistOwner
          ? parsed.selectedPlaylistOwner
          : DEFAULT_SPOTIFY_PREFS.selectedPlaylistOwner,
      audioSource:
        parsed.audioSource === "spotify" || parsed.audioSource === "both" || parsed.audioSource === "ambient"
          ? parsed.audioSource
          : DEFAULT_SPOTIFY_PREFS.audioSource,
      autoPlayOnFocus:
        typeof parsed.autoPlayOnFocus === "boolean"
          ? parsed.autoPlayOnFocus
          : DEFAULT_SPOTIFY_PREFS.autoPlayOnFocus,
      pauseOnBreak:
        typeof parsed.pauseOnBreak === "boolean"
          ? parsed.pauseOnBreak
          : DEFAULT_SPOTIFY_PREFS.pauseOnBreak,
      lastPlayedTrackUri:
        typeof parsed.lastPlayedTrackUri === "string" && parsed.lastPlayedTrackUri.startsWith("spotify:track:")
          ? parsed.lastPlayedTrackUri
          : null,
    };
  } catch {
    return { ...DEFAULT_SPOTIFY_PREFS };
  }
}

export function saveStoredSpotifyPreferences(
  partial: Partial<SpotifyStoredPreference>
): SpotifyStoredPreference {
  const current = getStoredSpotifyPreferences();
  
  // If changing selected playlist, reset lastPlayedTrackUri so old tracks from the previous playlist are not retained
  let resetLastTrack = false;
  if (
    partial.selectedPlaylistUri &&
    partial.selectedPlaylistUri !== current.selectedPlaylistUri &&
    partial.lastPlayedTrackUri === undefined
  ) {
    resetLastTrack = true;
  }

  const merged: SpotifyStoredPreference = {
    ...current,
    ...partial,
    ...(resetLastTrack ? { lastPlayedTrackUri: null } : {}),
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SPOTIFY_PREFS_STORAGE_KEY, JSON.stringify(merged));
      window.dispatchEvent(
        new CustomEvent(SPOTIFY_PREFS_UPDATED_EVENT, { detail: merged })
      );
      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel("dnd-spotify-channel");
        bc.postMessage({ type: "SPOTIFY_PREFS_SYNC", prefs: merged });
        bc.close();
      }
    } catch (e) {
      console.error("Failed to save Spotify preferences", e);
    }
  }

  return merged;
}

export function subscribeToSpotifyPreferences(
  callback: (prefs: SpotifyStoredPreference) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const handleCustom = (e: Event) => {
    const detail = (e as CustomEvent<SpotifyStoredPreference>).detail;
    callback(detail || getStoredSpotifyPreferences());
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === SPOTIFY_PREFS_STORAGE_KEY) {
      callback(getStoredSpotifyPreferences());
    }
  };

  let bc: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== "undefined") {
    try {
      bc = new BroadcastChannel("dnd-spotify-channel");
      bc.onmessage = (ev) => {
        if (ev.data?.type === "SPOTIFY_PREFS_SYNC" && ev.data.prefs) {
          callback(ev.data.prefs);
        }
      };
    } catch {}
  }

  window.addEventListener(SPOTIFY_PREFS_UPDATED_EVENT, handleCustom);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(SPOTIFY_PREFS_UPDATED_EVENT, handleCustom);
    window.removeEventListener("storage", handleStorage);
    bc?.close();
  };
}

export interface SpotifyPlaylistsApiResponse {
  connected: boolean;
  user: SpotifyProfile | null;
  playlists: SpotifyPlaylistItem[];
  curated: SpotifyPlaylistItem[];
}

let cachedPlaylistsData: SpotifyPlaylistsApiResponse | null = null;
let cachedPlaylistsTimestamp = 0;
let inFlightPlaylistsPromise: Promise<SpotifyPlaylistsApiResponse> | null = null;
const PLAYLISTS_CACHE_TTL_MS = 45_000;

export function invalidateSpotifyPlaylistsCache(): void {
  cachedPlaylistsData = null;
  cachedPlaylistsTimestamp = 0;
  inFlightPlaylistsPromise = null;
}

/**
 * Shared client-side fetcher for `/api/spotify/playlists` that deduplicates concurrent
 * requests across components (Widget, Player, Settings) and caches results briefly.
 */
export async function fetchSpotifyPlaylistsShared(
  forceRefresh = false
): Promise<SpotifyPlaylistsApiResponse> {
  if (forceRefresh) {
    invalidateSpotifyPlaylistsCache();
  }

  const now = Date.now();
  if (
    !forceRefresh &&
    cachedPlaylistsData &&
    now - cachedPlaylistsTimestamp < PLAYLISTS_CACHE_TTL_MS
  ) {
    return cachedPlaylistsData;
  }

  if (inFlightPlaylistsPromise) {
    return inFlightPlaylistsPromise;
  }

  inFlightPlaylistsPromise = (async () => {
    try {
      const res = await fetch("/api/spotify/playlists", { cache: "no-store" });
      if (!res.ok) {
        return {
          connected: false,
          user: null,
          playlists: [],
          curated: CURATED_FOCUS_PLAYLISTS,
        };
      }
      const data = await res.json();
      const normalized: SpotifyPlaylistsApiResponse = {
        connected: Boolean(data.connected),
        user: data.user || null,
        playlists: Array.isArray(data.playlists) ? data.playlists : [],
        curated: Array.isArray(data.curated)
          ? data.curated
          : CURATED_FOCUS_PLAYLISTS,
      };
      cachedPlaylistsData = normalized;
      cachedPlaylistsTimestamp = Date.now();
      return normalized;
    } catch {
      return {
        connected: false,
        user: null,
        playlists: [],
        curated: CURATED_FOCUS_PLAYLISTS,
      };
    } finally {
      inFlightPlaylistsPromise = null;
    }
  })();

  return inFlightPlaylistsPromise;
}

/**
 * Broadcasts and dispatches a Spotify authentication state change across the current tab and other tabs.
 */
export function notifySpotifyAuthChanged(connected: boolean, accountName?: string): void {
  invalidateSpotifyPlaylistsCache();
  if (typeof window === "undefined") return;

  try {
    window.dispatchEvent(
      new CustomEvent(SPOTIFY_AUTH_UPDATED_EVENT, {
        detail: { connected, accountName },
      })
    );
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel("dnd-spotify-channel");
      bc.postMessage({
        type: "SPOTIFY_AUTH_SYNC",
        provider: "spotify",
        connected,
        accountName,
      });
      bc.close();
    }
  } catch {}
}

/**
 * Subscribes to Spotify auth changes in the same window or across tabs via BroadcastChannel.
 */
export function subscribeToSpotifyAuthUpdates(
  callback: (payload: { connected?: boolean; accountName?: string }) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const handleAuthEvent = (e: Event) => {
    invalidateSpotifyPlaylistsCache();
    const detail = (e as CustomEvent<{ connected?: boolean; accountName?: string }>).detail;
    callback(detail || {});
  };

  let bc: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== "undefined") {
    try {
      bc = new BroadcastChannel("dnd-spotify-channel");
      bc.onmessage = (ev) => {
        if (ev.data?.type === "SPOTIFY_AUTH_SYNC") {
          invalidateSpotifyPlaylistsCache();
          callback({
            connected: ev.data.connected,
            accountName: ev.data.accountName,
          });
        }
      };
    } catch {}
  }

  window.addEventListener(SPOTIFY_AUTH_UPDATED_EVENT, handleAuthEvent);

  return () => {
    window.removeEventListener(SPOTIFY_AUTH_UPDATED_EVENT, handleAuthEvent);
    bc?.close();
  };
}
