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
