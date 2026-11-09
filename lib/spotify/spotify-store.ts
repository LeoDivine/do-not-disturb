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
export const SPOTIFY_CUSTOM_PLAYLISTS_STORAGE_KEY = "dnd_spotify_custom_playlists";
export const SPOTIFY_PREFS_UPDATED_EVENT = "dnd-spotify-prefs-updated";
export const SPOTIFY_AUTH_UPDATED_EVENT = "dnd-spotify-auth-updated";

const STORE_ORIGIN_ID =
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `dnd-store-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

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
        bc.postMessage({
          type: "SPOTIFY_PREFS_SYNC",
          prefs: merged,
          originId: STORE_ORIGIN_ID,
        });
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
        if (
          ev.data?.type === "SPOTIFY_PREFS_SYNC" &&
          ev.data.prefs &&
          ev.data.originId !== STORE_ORIGIN_ID
        ) {
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

export function getSavedCustomPlaylists(): SpotifyPlaylistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SPOTIFY_CUSTOM_PLAYLISTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SpotifyPlaylistItem =>
        Boolean(
          item &&
            typeof item.uri === "string" &&
            item.uri.startsWith("spotify:playlist:") &&
            typeof item.name === "string"
        )
    );
  } catch {
    return [];
  }
}

export function saveCustomPlaylist(playlist: SpotifyPlaylistItem): SpotifyPlaylistItem[] {
  if (typeof window === "undefined") return [playlist];
  if (!playlist.uri.startsWith("spotify:playlist:")) {
    return getSavedCustomPlaylists();
  }
  try {
    const existing = getSavedCustomPlaylists();
    const deduped = [
      { ...playlist, isCurated: false },
      ...existing.filter((p) => p.uri !== playlist.uri && p.id !== playlist.id),
    ].slice(0, 50);
    localStorage.setItem(SPOTIFY_CUSTOM_PLAYLISTS_STORAGE_KEY, JSON.stringify(deduped));
    return deduped;
  } catch {
    return [playlist];
  }
}

export function removeCustomPlaylist(uri: string): SpotifyPlaylistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const existing = getSavedCustomPlaylists();
    const next = existing.filter((p) => p.uri !== uri);
    localStorage.setItem(SPOTIFY_CUSTOM_PLAYLISTS_STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}

export function clearCustomPlaylists(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SPOTIFY_CUSTOM_PLAYLISTS_STORAGE_KEY);
  } catch {}
}

function mergePlaylistsWithCustom(
  apiPlaylists: SpotifyPlaylistItem[],
  includeCustom = true
): SpotifyPlaylistItem[] {
  const custom = includeCustom ? getSavedCustomPlaylists() : [];
  const curatedUris = new Set(CURATED_FOCUS_PLAYLISTS.map((c) => c.uri));
  const seenUris = new Set<string>();
  const merged: SpotifyPlaylistItem[] = [];

  for (const pl of apiPlaylists) {
    if (!pl?.uri || seenUris.has(pl.uri)) continue;
    seenUris.add(pl.uri);
    merged.push(pl);
  }

  for (const pl of custom) {
    if (!pl?.uri || seenUris.has(pl.uri) || curatedUris.has(pl.uri)) continue;
    seenUris.add(pl.uri);
    merged.push(pl);
  }

  // Also ensure the currently selected playlist (if custom/user-selected and not curated) is included when connected/custom enabled
  if (includeCustom && typeof window !== "undefined") {
    const prefs = getStoredSpotifyPreferences();
    if (
      prefs.selectedPlaylistUri?.startsWith("spotify:playlist:") &&
      !seenUris.has(prefs.selectedPlaylistUri) &&
      !curatedUris.has(prefs.selectedPlaylistUri)
    ) {
      const id = prefs.selectedPlaylistUri.split(":")[2] || prefs.selectedPlaylistUri;
      seenUris.add(prefs.selectedPlaylistUri);
      merged.push({
        id,
        uri: prefs.selectedPlaylistUri,
        name: prefs.selectedPlaylistName || "Custom Spotify Playlist",
        description: "Saved Spotify playlist",
        imageUrl: prefs.selectedPlaylistImage || null,
        tracksTotal: 0,
        ownerName: prefs.selectedPlaylistOwner || "Spotify",
        externalUrl: `https://open.spotify.com/playlist/${id}`,
        isCurated: false,
      });
    }
  }

  return merged;
}

/**
 * Resolves a pasted Spotify playlist/album/track URL or URI, enriches playlist metadata
 * via `/api/spotify/playlists?playlistId=...`, persists custom playlists to localStorage,
 * and updates active Spotify preferences.
 */
export async function importSpotifyPlaylistOrTrack(input: string): Promise<{
  type: "playlist" | "album" | "track";
  uri: string;
  id: string;
  playlist: SpotifyPlaylistItem | null;
  tracks: SpotifyTrackItem[];
} | null> {
  const parsed = parseSpotifyInputToUri(input);
  if (!parsed) return null;

  const currentPrefs = getStoredSpotifyPreferences();
  const nextAudioSource: AudioSourceMode =
    currentPrefs.audioSource === "both" ? "both" : "spotify";

  if (parsed.type === "track") {
    saveStoredSpotifyPreferences({
      lastPlayedTrackUri: parsed.uri,
      audioSource: nextAudioSource,
    });
    return {
      type: "track",
      uri: parsed.uri,
      id: parsed.id,
      playlist: null,
      tracks: [],
    };
  }

  let resolvedPlaylist: SpotifyPlaylistItem = {
    id: parsed.id,
    uri: parsed.uri,
    name: parsed.type === "album" ? "Spotify Album" : "Spotify Playlist",
    description: "Imported via Spotify link",
    imageUrl: null,
    tracksTotal: 0,
    ownerName: "Spotify",
    externalUrl: `https://open.spotify.com/${parsed.type}/${parsed.id}`,
    isCurated: false,
  };
  let resolvedTracks: SpotifyTrackItem[] = [];

  if (parsed.type === "playlist") {
    try {
      const res = await fetch(
        `/api/spotify/playlists?playlistId=${encodeURIComponent(parsed.id)}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tracks)) {
          resolvedTracks = data.tracks;
        }
        if (data.playlist && typeof data.playlist.name === "string") {
          resolvedPlaylist = {
            id: data.playlist.id || parsed.id,
            uri: data.playlist.uri || parsed.uri,
            name: data.playlist.name,
            description: data.playlist.description || "Imported via Spotify link",
            imageUrl: data.playlist.imageUrl || null,
            tracksTotal:
              typeof data.playlist.tracksTotal === "number" && data.playlist.tracksTotal > 0
                ? data.playlist.tracksTotal
                : resolvedTracks.length,
            ownerName: data.playlist.ownerName || "Spotify",
            externalUrl:
              data.playlist.externalUrl || `https://open.spotify.com/playlist/${parsed.id}`,
            isCurated: false,
          };
        } else if (resolvedTracks.length > 0) {
          resolvedPlaylist.tracksTotal = resolvedTracks.length;
        }
      }
    } catch {
      // Fallback to basic resolvedPlaylist if network call fails
    }
  }

  if (parsed.type === "playlist") {
    saveCustomPlaylist(resolvedPlaylist);
  }
  saveStoredSpotifyPreferences({
    selectedPlaylistUri: resolvedPlaylist.uri,
    selectedPlaylistName: resolvedPlaylist.name,
    selectedPlaylistImage: resolvedPlaylist.imageUrl,
    selectedPlaylistOwner: resolvedPlaylist.ownerName,
    audioSource: nextAudioSource,
    lastPlayedTrackUri: null,
  });

  if (cachedPlaylistsData && parsed.type === "playlist") {
    cachedPlaylistsData = {
      ...cachedPlaylistsData,
      playlists: mergePlaylistsWithCustom(cachedPlaylistsData.playlists, true),
    };
  }

  return {
    type: parsed.type,
    uri: resolvedPlaylist.uri,
    id: resolvedPlaylist.id,
    playlist: resolvedPlaylist,
    tracks: resolvedTracks,
  };
}

export interface SpotifyPlaylistsApiResponse {
  connected: boolean;
  user: SpotifyProfile | null;
  playlists: SpotifyPlaylistItem[];
  curated: SpotifyPlaylistItem[];
  error?: string | null;
  errorCode?: string | null;
}

let cachedPlaylistsData: SpotifyPlaylistsApiResponse | null = null;
let cachedPlaylistsTimestamp = 0;
let inFlightPlaylistsPromise: Promise<SpotifyPlaylistsApiResponse> | null = null;
let inFlightPlaylistsStartedAt = 0;
let playlistsCacheVersion = 0;
const PLAYLISTS_CACHE_TTL_MS = 45_000;
const DISCONNECTED_CACHE_TTL_MS = 10_000;

export function invalidateSpotifyPlaylistsCache(): void {
  playlistsCacheVersion += 1;
  cachedPlaylistsData = null;
  cachedPlaylistsTimestamp = 0;
  inFlightPlaylistsPromise = null;
  inFlightPlaylistsStartedAt = 0;
}

/**
 * Shared client-side fetcher for `/api/spotify/playlists` that deduplicates concurrent
 * requests across components (Widget, Player, Settings) and caches results briefly.
 */
export async function fetchSpotifyPlaylistsShared(
  forceRefresh = false
): Promise<SpotifyPlaylistsApiResponse> {
  const now = Date.now();

  if (forceRefresh) {
    // If another subscriber just started a fresh fetch within the last 1000ms (e.g., on SPOTIFY_AUTH_UPDATED_EVENT),
    // share that in-flight request instead of cancelling it and firing 5 duplicate requests.
    if (inFlightPlaylistsPromise && now - inFlightPlaylistsStartedAt < 1000) {
      return inFlightPlaylistsPromise;
    }
    invalidateSpotifyPlaylistsCache();
  }

  if (!forceRefresh && cachedPlaylistsData) {
    const ttl = cachedPlaylistsData.connected
      ? PLAYLISTS_CACHE_TTL_MS
      : DISCONNECTED_CACHE_TTL_MS;
    if (now - cachedPlaylistsTimestamp < ttl) {
      const includeCustom =
        cachedPlaylistsData.connected || getSavedCustomPlaylists().length > 0;
      return {
        ...cachedPlaylistsData,
        playlists: mergePlaylistsWithCustom(
          cachedPlaylistsData.playlists,
          includeCustom
        ),
      };
    }
  }

  if (inFlightPlaylistsPromise) {
    return inFlightPlaylistsPromise;
  }

  const requestVersion = playlistsCacheVersion;
  inFlightPlaylistsStartedAt = now;

  const promise = (async (): Promise<SpotifyPlaylistsApiResponse> => {
    try {
      const res = await fetch("/api/spotify/playlists", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!res.ok) {
        return {
          connected: false,
          user: null,
          playlists: mergePlaylistsWithCustom([], false),
          curated: CURATED_FOCUS_PLAYLISTS,
        };
      }
      const data = await res.json();
      const isConnected = Boolean(data.connected);
      const apiPlaylists = Array.isArray(data.playlists) ? data.playlists : [];
      const includeCustom = isConnected || getSavedCustomPlaylists().length > 0;
      const normalized: SpotifyPlaylistsApiResponse = {
        connected: isConnected,
        user: data.user || null,
        playlists: mergePlaylistsWithCustom(apiPlaylists, includeCustom),
        curated: Array.isArray(data.curated)
          ? data.curated
          : CURATED_FOCUS_PLAYLISTS,
        error: typeof data.error === "string" ? data.error : null,
        errorCode: typeof data.errorCode === "string" ? data.errorCode : null,
      };
      // Cache if cache wasn't invalidated while this request was in flight and there was no API error
      if (requestVersion === playlistsCacheVersion && !normalized.errorCode) {
        cachedPlaylistsData = normalized;
        cachedPlaylistsTimestamp = Date.now();
      }
      return normalized;
    } catch {
      return {
        connected: false,
        user: null,
        playlists: mergePlaylistsWithCustom([], false),
        curated: CURATED_FOCUS_PLAYLISTS,
      };
    } finally {
      if (requestVersion === playlistsCacheVersion) {
        inFlightPlaylistsPromise = null;
        inFlightPlaylistsStartedAt = 0;
      }
    }
  })();

  inFlightPlaylistsPromise = promise;
  return promise;
}

/**
 * Broadcasts and dispatches a Spotify authentication state change across the current tab and other tabs.
 */
export function notifySpotifyAuthChanged(connected: boolean, accountName?: string): void {
  if (!connected) {
    clearCustomPlaylists();
  }
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
        originId: STORE_ORIGIN_ID,
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
    const detail = (e as CustomEvent<{ connected?: boolean; accountName?: string }>).detail;
    callback(detail || {});
  };

  let bc: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== "undefined") {
    try {
      bc = new BroadcastChannel("dnd-spotify-channel");
      bc.onmessage = (ev) => {
        if (
          ev.data?.type === "SPOTIFY_AUTH_SYNC" &&
          ev.data.originId !== STORE_ORIGIN_ID
        ) {
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
