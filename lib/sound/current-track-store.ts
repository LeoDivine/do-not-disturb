export interface ActiveTrackInfo {
  title: string;
  artist: string;
  source: "spotify" | "ambient" | "none";
  isPlaying: boolean;
  uri?: string | null;
  artworkUrl?: string | null;
  deviceName?: string | null;
  spotifyConnectActive?: boolean;
}

export interface SpotifyConnectState {
  sdkReady: boolean;
  sdkDeviceId: string | null;
  activeDeviceId: string | null;
  activeDeviceName: string | null;
  activeDeviceType: string | null;
  needsScopeUpgrade: boolean;
  premiumRequired: boolean;
  devModeRestricted: boolean;
  dndOwnsPlayback: boolean;
}

export const SPOTIFY_CONNECT_STATE_EVENT = "dnd-spotify-connect-state-updated";

const TRACK_ORIGIN_ID =
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

let currentConnectState: SpotifyConnectState = {
  sdkReady: false,
  sdkDeviceId: null,
  activeDeviceId: null,
  activeDeviceName: null,
  activeDeviceType: null,
  needsScopeUpgrade: false,
  premiumRequired: false,
  devModeRestricted: false,
  dndOwnsPlayback: false,
};

export function getSpotifyConnectState(): SpotifyConnectState {
  return currentConnectState;
}

export function setSpotifyConnectState(partial: Partial<SpotifyConnectState>): SpotifyConnectState {
  currentConnectState = { ...currentConnectState, ...partial };
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(
        new CustomEvent(SPOTIFY_CONNECT_STATE_EVENT, { detail: currentConnectState })
      );
    } catch {}
  }
  return currentConnectState;
}

export function subscribeToSpotifyConnectState(
  callback: (state: SpotifyConnectState) => void
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<SpotifyConnectState>).detail;
    callback(detail || currentConnectState);
  };
  window.addEventListener(SPOTIFY_CONNECT_STATE_EVENT, handler);
  return () => window.removeEventListener(SPOTIFY_CONNECT_STATE_EVENT, handler);
}

export const CURRENT_TRACK_STORAGE_KEY = "dnd_current_playing_track";
export const CURRENT_TRACK_UPDATED_EVENT = "dnd-current-track-updated";

export const DEFAULT_TRACK_INFO: ActiveTrackInfo = {
  title: "Gentle Rain",
  artist: "Ambient Soundscape",
  source: "ambient",
  isPlaying: false,
};

export function getCurrentPlayingTrack(): ActiveTrackInfo {
  if (typeof window === "undefined") {
    return DEFAULT_TRACK_INFO;
  }
  try {
    const raw = localStorage.getItem(CURRENT_TRACK_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.title === "string") {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_TRACK_INFO;
}

export function setCurrentPlayingTrack(track: ActiveTrackInfo): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CURRENT_TRACK_STORAGE_KEY, JSON.stringify(track));
    window.dispatchEvent(
      new CustomEvent(CURRENT_TRACK_UPDATED_EVENT, { detail: track })
    );
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel("dnd-current-track-channel");
      bc.postMessage({
        type: "CURRENT_TRACK_SYNC",
        track,
        originId: TRACK_ORIGIN_ID,
      });
      bc.close();
    }
  } catch (e) {
    console.error("Failed to save current playing track", e);
  }
}

export function subscribeToCurrentPlayingTrack(
  callback: (track: ActiveTrackInfo) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const handleCustom = (e: Event) => {
    const detail = (e as CustomEvent<ActiveTrackInfo>).detail;
    callback(detail || getCurrentPlayingTrack());
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === CURRENT_TRACK_STORAGE_KEY) {
      callback(getCurrentPlayingTrack());
    }
  };

  let bc: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== "undefined") {
    try {
      bc = new BroadcastChannel("dnd-current-track-channel");
      bc.onmessage = (ev) => {
        if (
          ev.data?.type === "CURRENT_TRACK_SYNC" &&
          ev.data.track &&
          ev.data.originId !== TRACK_ORIGIN_ID
        ) {
          callback(ev.data.track);
        }
      };
    } catch {}
  }

  window.addEventListener(CURRENT_TRACK_UPDATED_EVENT, handleCustom);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(CURRENT_TRACK_UPDATED_EVENT, handleCustom);
    window.removeEventListener("storage", handleStorage);
    bc?.close();
  };
}
