"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useTheme } from "../../context/theme-context";
import { useTimer } from "../../context/timer-context";
import {
  SpotifyStoredPreference,
  SpotifyPlaylistItem,
  CURATED_FOCUS_PLAYLISTS,
  CURATED_FOCUS_TRACKS,
  getStoredSpotifyPreferences,
  saveStoredSpotifyPreferences,
  subscribeToSpotifyPreferences,
  parseSpotifyInputToUri,
  importSpotifyPlaylistOrTrack,
  fetchSpotifyPlaylistsShared,
  subscribeToSpotifyAuthUpdates,
} from "../../lib/spotify/spotify-store";
import {
  setCurrentPlayingTrack,
  getCurrentPlayingTrack,
  setSpotifyConnectState,
} from "../../lib/sound/current-track-store";
import { subscribeToSpotifyCommands, sendSpotifyCommand } from "../../lib/sound/audio-coordinator";

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (IFrameAPI: any) => void;
    SpotifyIframeApi?: any;
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify?: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => any;
    };
  }
}

interface SpotifyFocusPlayerProps {
  compact?: boolean;
  embedOnly?: boolean;
}

export default function SpotifyFocusPlayer({
  compact = false,
  embedOnly = false,
}: SpotifyFocusPlayerProps) {
  const { isDark } = useTheme();
  const { activeColor, activeBorder, colors } = useTimer();

  const [prefs, setPrefs] = useState<SpotifyStoredPreference>(() =>
    getStoredSpotifyPreferences()
  );
  const prefsRef = useRef<SpotifyStoredPreference>(prefs);
  prefsRef.current = prefs;

  const [connected, setConnected] = useState<boolean>(false);
  const [userPlaylists, setUserPlaylists] = useState<SpotifyPlaylistItem[]>([]);
  const [spotifyUser, setSpotifyUser] = useState<{
    displayName: string;
    avatarUrl?: string | null;
  } | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
  const [customUrlInput, setCustomUrlInput] = useState<string>("");
  const [customUrlError, setCustomUrlError] = useState<string>("");
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState<boolean>(false);
  const [isEmbedReady, setIsEmbedReady] = useState<boolean>(false);

  const embedContainerRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<any>(null);
  const currentLoadedUriRef = useRef<string>("");
  const isPlayerPausedRef = useRef<boolean>(true);
  const lastTrackUriRef = useRef<string | null>(null);

  // Spotify Connect & Web Playback SDK refs for two-way sync with the user's Spotify app
  const isAuthConnectedRef = useRef<boolean>(false);
  const sdkPlayerRef = useRef<any>(null);
  const sdkDeviceIdRef = useRef<string | null>(null);
  const activeRemoteDeviceIdRef = useRef<string | null>(null);
  const activeRemoteDeviceNameRef = useRef<string | null>(null);
  const needsScopeUpgradeRef = useRef<boolean>(false);
  const premiumRequiredRef = useRef<boolean>(false);
  const devModeRestrictedRef = useRef<boolean>(false);
  const dndOwnsPlaybackRef = useRef<boolean>(false);
  const currentConnectTrackUriRef = useRef<string | null>(null);
  const pollBackoffUntilRef = useRef<number>(0);

  // Subscribe to Spotify preference changes across tabs/pages
  useEffect(() => {
    const initial = getStoredSpotifyPreferences();
    setPrefs(initial);
    prefsRef.current = initial;
    return subscribeToSpotifyPreferences((updated) => {
      setPrefs(updated);
      prefsRef.current = updated;
    });
  }, []);

  // Load connected status & user's Spotify playlists
  const fetchPlaylistsAndStatus = useCallback(async (forceRefresh = false) => {
    if (!embedOnly) {
      setIsLoadingPlaylists(true);
    }
    try {
      const data = await fetchSpotifyPlaylistsShared(forceRefresh);
      const isConn = Boolean(data.connected);
      isAuthConnectedRef.current = isConn;
      setConnected(isConn);
      if (!embedOnly) {
        setSpotifyUser(data.user || null);
        setUserPlaylists(data.playlists);
      }
      if (!isConn) {
        if (sdkPlayerRef.current) {
          try {
            sdkPlayerRef.current.disconnect();
          } catch {}
          sdkPlayerRef.current = null;
        }
        sdkDeviceIdRef.current = null;
        activeRemoteDeviceIdRef.current = null;
        activeRemoteDeviceNameRef.current = null;
        needsScopeUpgradeRef.current = false;
        premiumRequiredRef.current = false;
        devModeRestrictedRef.current = false;
        dndOwnsPlaybackRef.current = false;
        currentConnectTrackUriRef.current = null;
        setSpotifyConnectState({
          sdkReady: false,
          sdkDeviceId: null,
          activeDeviceId: null,
          activeDeviceName: null,
          activeDeviceType: null,
          needsScopeUpgrade: false,
          premiumRequired: false,
          devModeRestricted: false,
          dndOwnsPlayback: false,
        });
      }
    } catch {
      // Ignore network errors in local-only offline state
    } finally {
      if (!embedOnly) {
        setIsLoadingPlaylists(false);
      }
    }
  }, [embedOnly]);

  useEffect(() => {
    const isActiveOAuthCallback =
      typeof window !== "undefined" &&
      window.location.pathname === "/callback" &&
      window.location.search.includes("code=");
    if (!isActiveOAuthCallback) {
      fetchPlaylistsAndStatus(false);
    }

    return subscribeToSpotifyAuthUpdates(() => {
      needsScopeUpgradeRef.current = false;
      devModeRestrictedRef.current = false;
      fetchPlaylistsAndStatus(true);
    });
  }, [fetchPlaylistsAndStatus]);

  // Sync current playback state from Spotify Connect (/api/spotify/player)
  const syncRemoteSpotifyState = useCallback(async () => {
    if (!isAuthConnectedRef.current) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return;
    }
    if (Date.now() < pollBackoffUntilRef.current) {
      return;
    }
    // Do not poll or hijack unrelated Spotify sessions when the user is in ambient-only mode
    // unless DND initiated playback or the DND Web Playback SDK device is active.
    if (
      prefsRef.current.audioSource === "ambient" &&
      !dndOwnsPlaybackRef.current &&
      !sdkDeviceIdRef.current
    ) {
      return;
    }

    try {
      const res = await fetch("/api/spotify/player", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();

      if (!data.connected) {
        isAuthConnectedRef.current = false;
        return;
      }

      if (data.rateLimited) {
        pollBackoffUntilRef.current =
          Date.now() + (typeof data.retryAfterMs === "number" ? data.retryAfterMs : 15_000);
        return;
      }

      if (data.errorCode === "insufficient_scope" || data.hasPlaybackControlScope === false) {
        needsScopeUpgradeRef.current = true;
        setSpotifyConnectState({
          needsScopeUpgrade: true,
          devModeRestricted: false,
        });
        return;
      }

      if (data.errorCode === "spotify_dev_mode_restricted") {
        devModeRestrictedRef.current = true;
        setSpotifyConnectState({
          devModeRestricted: true,
          needsScopeUpgrade: false,
        });
        return;
      }

      if (data.errorCode === "premium_required") {
        premiumRequiredRef.current = true;
        setSpotifyConnectState({ premiumRequired: true });
        return;
      }

      if (data.device?.id) {
        activeRemoteDeviceIdRef.current = data.device.id;
        activeRemoteDeviceNameRef.current = data.device.name || "Spotify App";
        if (sdkDeviceIdRef.current && data.device.id === sdkDeviceIdRef.current) {
          dndOwnsPlaybackRef.current = true;
        }
        setSpotifyConnectState({
          activeDeviceId: data.device.id,
          activeDeviceName: data.device.name || "Spotify App",
          activeDeviceType: data.device.type || null,
          needsScopeUpgrade: false,
          devModeRestricted: false,
          dndOwnsPlayback: dndOwnsPlaybackRef.current,
        });
      } else {
        activeRemoteDeviceIdRef.current = null;
        activeRemoteDeviceNameRef.current = null;
        setSpotifyConnectState({
          activeDeviceId: null,
          activeDeviceName: null,
          activeDeviceType: null,
        });
        const existingTrack = getCurrentPlayingTrack();
        if (existingTrack.spotifyConnectActive && existingTrack.isPlaying) {
          isPlayerPausedRef.current = true;
          setCurrentPlayingTrack({
            ...existingTrack,
            isPlaying: false,
            spotifyConnectActive: false,
          });
        }
      }

      if (data.track?.uri) {
        currentConnectTrackUriRef.current = data.track.uri;
        const isPlayingRemote = Boolean(data.isPlaying);
        const livePrefs = prefsRef.current;
        const shouldSyncIntoDnd =
          dndOwnsPlaybackRef.current ||
          livePrefs.audioSource === "spotify" ||
          livePrefs.audioSource === "both";

        // Sync remote playback into DND UI & preferences when Spotify is the active DND audio source
        // or when DND initiated the playback session.
        if (shouldSyncIntoDnd && (isPlayingRemote || data.device?.isActive)) {
          isPlayerPausedRef.current = !isPlayingRemote;

          // Ensure fallback IFrame embed is paused if Spotify Connect is actively playing
          if (
            isPlayingRemote &&
            controllerRef.current &&
            typeof controllerRef.current.pause === "function"
          ) {
            try {
              controllerRef.current.pause();
            } catch {}
          }

          if (
            data.track.uri.startsWith("spotify:track:") &&
            livePrefs.lastPlayedTrackUri !== data.track.uri
          ) {
            lastTrackUriRef.current = data.track.uri;
            prevLastPlayedTrackUriRef.current = data.track.uri;
            saveStoredSpotifyPreferences({
              lastPlayedTrackUri: data.track.uri,
            });
          }

          setCurrentPlayingTrack({
            title: data.track.title || "Spotify Track",
            artist: data.track.artist || "Spotify",
            artworkUrl: data.track.artworkUrl || livePrefs.selectedPlaylistImage,
            source: "spotify",
            isPlaying: isPlayingRemote,
            uri: data.track.uri,
            deviceName:
              data.device?.name ||
              activeRemoteDeviceNameRef.current ||
              "Spotify App",
            spotifyConnectActive: true,
          });
        }
      }
    } catch {
      // Ignore transient network errors
    }
  }, []);

  // Initialize Spotify Web Playback SDK (`window.Spotify.Player`) when connected
  // so this website registers as a real Spotify Connect device ("Do Not Disturb Focus")
  // visible inside the user's Spotify mobile/desktop app.
  useEffect(() => {
    if (typeof window === "undefined" || !connected) return;

    let cancelled = false;

    const setupWebPlaybackSdk = async () => {
      try {
        const tokenRes = await fetch("/api/spotify/player?token=1", {
          cache: "no-store",
        });
        if (!tokenRes.ok || cancelled) return;
        const tokenData = await tokenRes.json();
        if (!tokenData.connected || cancelled) return;

        if (
          tokenData.errorCode === "premium_required" ||
          tokenData.product === "free" ||
          tokenData.product === "open"
        ) {
          premiumRequiredRef.current = true;
          setSpotifyConnectState({ premiumRequired: true });
          return;
        }

        if (
          tokenData.errorCode === "insufficient_scope" ||
          tokenData.hasPlaybackControlScope === false ||
          tokenData.canStream === false ||
          !tokenData.accessToken
        ) {
          needsScopeUpgradeRef.current = true;
          setSpotifyConnectState({ needsScopeUpgrade: true });
          return;
        }

        const createSdkPlayer = () => {
          if (cancelled || sdkPlayerRef.current || !window.Spotify?.Player) return;

          const player = new window.Spotify.Player({
            name: "Do Not Disturb Focus",
            getOAuthToken: async (cb: (token: string) => void) => {
              try {
                const r = await fetch("/api/spotify/player?token=1", {
                  cache: "no-store",
                });
                if (r.ok) {
                  const d = await r.json();
                  if (d.accessToken) {
                    cb(d.accessToken);
                  }
                }
              } catch {}
            },
            volume: 0.85,
          });

          player.addListener("ready", ({ device_id }: { device_id: string }) => {
            if (cancelled) return;
            sdkDeviceIdRef.current = device_id;
            setSpotifyConnectState({
              sdkReady: true,
              sdkDeviceId: device_id,
              needsScopeUpgrade: false,
              premiumRequired: false,
            });
            void syncRemoteSpotifyState();
          });

          player.addListener("not_ready", () => {
            sdkDeviceIdRef.current = null;
            setSpotifyConnectState({
              sdkReady: false,
              sdkDeviceId: null,
            });
          });

          player.addListener("initialization_error", () => {
            sdkDeviceIdRef.current = null;
            setSpotifyConnectState({
              sdkReady: false,
              sdkDeviceId: null,
            });
          });

          player.addListener("authentication_error", () => {
            needsScopeUpgradeRef.current = true;
            setSpotifyConnectState({ needsScopeUpgrade: true });
          });

          player.addListener("account_error", () => {
            premiumRequiredRef.current = true;
            sdkDeviceIdRef.current = null;
            setSpotifyConnectState({
              sdkReady: false,
              sdkDeviceId: null,
              premiumRequired: true,
            });
          });

          player.addListener("player_state_changed", (state: any) => {
            if (!state) return;
            const currentTrack = state.track_window?.current_track;
            if (!currentTrack) return;

            const isPaused = Boolean(state.paused);
            const playingUri = currentTrack.uri as string;
            const title = currentTrack.name || "Spotify Track";
            const artist = Array.isArray(currentTrack.artists)
              ? currentTrack.artists
                  .map((a: any) => a?.name)
                  .filter(Boolean)
                  .join(", ")
              : "Spotify";
            const artworkUrl =
              currentTrack.album?.images?.[0]?.url ||
              prefsRef.current.selectedPlaylistImage ||
              null;

            isPlayerPausedRef.current = isPaused;
            dndOwnsPlaybackRef.current = true;
            if (playingUri) {
              currentConnectTrackUriRef.current = playingUri;
            }

            if (sdkDeviceIdRef.current) {
              activeRemoteDeviceIdRef.current = sdkDeviceIdRef.current;
              activeRemoteDeviceNameRef.current = "Do Not Disturb Focus";
              setSpotifyConnectState({
                activeDeviceId: sdkDeviceIdRef.current,
                activeDeviceName: "Do Not Disturb Focus",
                activeDeviceType: "Computer",
                dndOwnsPlayback: true,
              });
            }

            // Pause fallback IFrame embed if Web Playback SDK is actively playing
            if (
              !isPaused &&
              controllerRef.current &&
              typeof controllerRef.current.pause === "function"
            ) {
              try {
                controllerRef.current.pause();
              } catch {}
            }

            if (
              playingUri &&
              playingUri.startsWith("spotify:track:") &&
              prefsRef.current.lastPlayedTrackUri !== playingUri
            ) {
              lastTrackUriRef.current = playingUri;
              prevLastPlayedTrackUriRef.current = playingUri;
              saveStoredSpotifyPreferences({
                lastPlayedTrackUri: playingUri,
                ...(!isPaused && prefsRef.current.audioSource === "ambient"
                  ? { audioSource: "spotify" }
                  : {}),
              });
            }

            setCurrentPlayingTrack({
              title,
              artist,
              artworkUrl,
              source: "spotify",
              isPlaying: !isPaused,
              uri: playingUri,
              deviceName: "Do Not Disturb Focus",
              spotifyConnectActive: true,
            });
          });

          player.connect();
          sdkPlayerRef.current = player;
        };

        if (window.Spotify?.Player) {
          createSdkPlayer();
        } else {
          const prevReady = window.onSpotifyWebPlaybackSDKReady;
          window.onSpotifyWebPlaybackSDKReady = () => {
            if (prevReady) prevReady();
            createSdkPlayer();
          };
          if (!document.getElementById("spotify-web-playback-sdk-script")) {
            const script = document.createElement("script");
            script.id = "spotify-web-playback-sdk-script";
            script.src = "https://sdk.scdn.co/spotify-player.js";
            script.async = true;
            document.body.appendChild(script);
          }
        }
      } catch {
        // Fallback to IFrame embed if Web Playback SDK cannot be initialized
      }
    };

    void setupWebPlaybackSdk();
    void syncRemoteSpotifyState();

    const pollInterval = window.setInterval(() => {
      void syncRemoteSpotifyState();
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(pollInterval);
      if (sdkPlayerRef.current) {
        try {
          sdkPlayerRef.current.disconnect();
        } catch {}
        sdkPlayerRef.current = null;
      }
    };
  }, [connected, syncRemoteSpotifyState]);

  // Load Spotify Official IFrame API script and initialize EmbedController
  useEffect(() => {
    if (typeof window === "undefined") return;

    const initController = (IFrameAPI: any) => {
      window.SpotifyIframeApi = IFrameAPI;
      if (!embedContainerRef.current || controllerRef.current) return;

      const currentPrefs = getStoredSpotifyPreferences();
      const initialUri =
        currentPrefs.lastPlayedTrackUri ||
        currentPrefs.selectedPlaylistUri ||
        CURATED_FOCUS_PLAYLISTS[0].uri;

      const mountTarget = document.createElement("div");
      embedContainerRef.current.innerHTML = "";
      embedContainerRef.current.appendChild(mountTarget);

      const options = {
        uri: initialUri,
        width: "100%",
        height: compact ? 80 : 152,
        theme: isDark ? "dark" : "0",
      };

      IFrameAPI.createController(
        mountTarget,
        options,
        (EmbedController: any) => {
          controllerRef.current = EmbedController;
          currentLoadedUriRef.current = initialUri;
          setIsEmbedReady(true);

          const trackCache = new Map<
            string,
            { title: string; artist: string; artworkUrl?: string | null }
          >();
          for (const curatedTrack of CURATED_FOCUS_TRACKS) {
            trackCache.set(curatedTrack.uri, {
              title: curatedTrack.title,
              artist: curatedTrack.artist,
              artworkUrl: curatedTrack.imageUrl,
            });
          }

          // Keep track of the currently loaded song so stopping/pausing the timer never resets to track 1
          const existing = getCurrentPlayingTrack();
          let lastKnownTrack: {
            title: string;
            artist: string;
            artworkUrl?: string | null;
            uri: string;
          } | null =
            existing.source === "spotify" && existing.uri?.startsWith("spotify:track:")
              ? {
                  title: existing.title,
                  artist: existing.artist,
                  artworkUrl: existing.artworkUrl,
                  uri: existing.uri,
                }
              : null;

          const updateTrackInfo = async (playingUri: string, isPaused: boolean) => {
            const livePrefs = prefsRef.current;

            if (!playingUri || !playingUri.startsWith("spotify:track:")) {
              // When paused or stopped, preserve the current track so restarting continues the same song
              if (lastKnownTrack) {
                setCurrentPlayingTrack({
                  title: lastKnownTrack.title,
                  artist: lastKnownTrack.artist,
                  artworkUrl: lastKnownTrack.artworkUrl,
                  source: "spotify",
                  isPlaying: !isPaused,
                  uri: lastKnownTrack.uri,
                });
                return;
              }

              setCurrentPlayingTrack({
                title: livePrefs.selectedPlaylistName || "Deep Focus",
                artist: livePrefs.selectedPlaylistOwner || "Spotify Focus",
                artworkUrl: livePrefs.selectedPlaylistImage,
                source: "spotify",
                isPlaying: !isPaused,
                uri: livePrefs.selectedPlaylistUri,
              });
              return;
            }

            if (trackCache.has(playingUri)) {
              const cached = trackCache.get(playingUri)!;
              lastKnownTrack = {
                title: cached.title,
                artist: cached.artist,
                artworkUrl: cached.artworkUrl,
                uri: playingUri,
              };
              setCurrentPlayingTrack({
                title: cached.title,
                artist: cached.artist,
                artworkUrl: cached.artworkUrl,
                source: "spotify",
                isPlaying: !isPaused,
                uri: playingUri,
              });
              return;
            }

            // Immediately display a clean fallback while resolving
            lastKnownTrack = {
              title: livePrefs.selectedPlaylistName || "Spotify Track",
              artist: livePrefs.selectedPlaylistOwner || "Spotify",
              artworkUrl: livePrefs.selectedPlaylistImage,
              uri: playingUri,
            };
            setCurrentPlayingTrack({
              title: livePrefs.selectedPlaylistName || "Spotify Track",
              artist: livePrefs.selectedPlaylistOwner || "Spotify",
              artworkUrl: livePrefs.selectedPlaylistImage,
              source: "spotify",
              isPlaying: !isPaused,
              uri: playingUri,
            });

            try {
              const res = await fetch(
                `/api/spotify/current-track?uri=${encodeURIComponent(playingUri)}`
              );
              if (res.ok) {
                const data = await res.json();
                if (data.title) {
                  trackCache.set(playingUri, {
                    title: data.title,
                    artist: data.artist || "Spotify",
                    artworkUrl: data.artworkUrl,
                  });
                  lastKnownTrack = {
                    title: data.title,
                    artist: data.artist || "Spotify",
                    artworkUrl: data.artworkUrl,
                    uri: playingUri,
                  };
                  setCurrentPlayingTrack({
                    title: data.title,
                    artist: data.artist || "Spotify",
                    artworkUrl: data.artworkUrl,
                    source: "spotify",
                    isPlaying: !isPaused,
                    uri: playingUri,
                  });
                }
              }
            } catch {}
          };

          EmbedController.addListener("ready", () => {
            setIsEmbedReady(true);
            const livePrefs = prefsRef.current;
            if (livePrefs.audioSource === "spotify" || livePrefs.audioSource === "both") {
              const current = getCurrentPlayingTrack();
              if (current.source === "spotify" && current.uri?.startsWith("spotify:track:")) {
                setCurrentPlayingTrack({
                  ...current,
                  isPlaying: !isPlayerPausedRef.current,
                });
              } else if (livePrefs.lastPlayedTrackUri && trackCache.has(livePrefs.lastPlayedTrackUri)) {
                const cached = trackCache.get(livePrefs.lastPlayedTrackUri)!;
                setCurrentPlayingTrack({
                  title: cached.title,
                  artist: cached.artist,
                  artworkUrl: cached.artworkUrl,
                  source: "spotify",
                  isPlaying: !isPlayerPausedRef.current,
                  uri: livePrefs.lastPlayedTrackUri,
                });
              } else {
                setCurrentPlayingTrack({
                  title: livePrefs.selectedPlaylistName || "Deep Focus",
                  artist: livePrefs.selectedPlaylistOwner || "Spotify Focus",
                  artworkUrl: livePrefs.selectedPlaylistImage,
                  source: "spotify",
                  isPlaying: !isPlayerPausedRef.current,
                  uri: livePrefs.selectedPlaylistUri,
                });
              }
            }
          });

          EmbedController.addListener("playback_update", (e: any) => {
            const isPaused = Boolean(e?.data?.isPaused);
            const playingUri = (e?.data?.playingURI as string) || "";

            // When Spotify Connect is actively playing, calling controllerRef.current.pause()
            // triggers an IFrame `playback_update` with `isPaused: true` and the IFrame's old URI.
            // Ignore that synthetic pause update so it never overwrites Spotify Connect's active song!
            const currentGlobalTrack = getCurrentPlayingTrack();
            if (
              isPaused &&
              currentGlobalTrack.spotifyConnectActive &&
              currentGlobalTrack.isPlaying &&
              (sdkDeviceIdRef.current || activeRemoteDeviceIdRef.current)
            ) {
              return;
            }

            // If the user explicitly pressed Play inside the IFrame Embed, pause Web Playback SDK
            // so the two audio engines never play simultaneously.
            if (!isPaused && sdkPlayerRef.current && typeof sdkPlayerRef.current.pause === "function") {
              try {
                sdkPlayerRef.current.pause();
              } catch {}
            }

            isPlayerPausedRef.current = isPaused;

            const livePrefs = prefsRef.current;
            const prefUpdates: Partial<SpotifyStoredPreference> = {};
            if (!isPaused && livePrefs.audioSource === "ambient") {
              prefUpdates.audioSource = "spotify";
            }
            if (
              playingUri &&
              playingUri.startsWith("spotify:track:") &&
              livePrefs.lastPlayedTrackUri !== playingUri
            ) {
              lastTrackUriRef.current = playingUri;
              prevLastPlayedTrackUriRef.current = playingUri;
              prefUpdates.lastPlayedTrackUri = playingUri;
            }
            if (Object.keys(prefUpdates).length > 0) {
              saveStoredSpotifyPreferences(prefUpdates);
            }

            updateTrackInfo(playingUri, isPaused);
          });
        }
      );
    };

    if (window.SpotifyIframeApi) {
      initController(window.SpotifyIframeApi);
      return;
    }

    const existingScript = document.getElementById("spotify-iframe-api-script");
    const prevCallback = window.onSpotifyIframeApiReady;
    window.onSpotifyIframeApiReady = (IFrameAPI: any) => {
      if (prevCallback) prevCallback(IFrameAPI);
      initController(IFrameAPI);
    };

    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "spotify-iframe-api-script";
      script.src = "https://open.spotify.com/embed/iframe-api/v1";
      script.async = true;
      document.body.appendChild(script);
    }
  }, [compact, isDark]);

  // Update embedded playlist or selected track URI when preferences change (only when Spotify Connect is not active)
  const prevSelectedPlaylistUriRef = useRef<string>(prefs.selectedPlaylistUri);
  const prevLastPlayedTrackUriRef = useRef<string | null | undefined>(prefs.lastPlayedTrackUri);

  useEffect(() => {
    if (prevSelectedPlaylistUriRef.current !== prefs.selectedPlaylistUri) {
      prevSelectedPlaylistUriRef.current = prefs.selectedPlaylistUri;
      const isConnectActive = Boolean(
        sdkDeviceIdRef.current || activeRemoteDeviceIdRef.current
      );
      if (
        !isConnectActive &&
        controllerRef.current &&
        isEmbedReady &&
        prefs.selectedPlaylistUri
      ) {
        try {
          const targetUri = prefs.lastPlayedTrackUri || prefs.selectedPlaylistUri;
          if (currentLoadedUriRef.current !== targetUri) {
            controllerRef.current.loadUri(targetUri);
            currentLoadedUriRef.current = targetUri;
          }
          lastTrackUriRef.current = null;
        } catch {}
      }
    }
  }, [prefs.selectedPlaylistUri, prefs.lastPlayedTrackUri, isEmbedReady]);

  // Synchronize when a specific track is selected (only when Spotify Connect is not active)
  useEffect(() => {
    if (
      prefs.lastPlayedTrackUri &&
      prevLastPlayedTrackUriRef.current !== prefs.lastPlayedTrackUri
    ) {
      prevLastPlayedTrackUriRef.current = prefs.lastPlayedTrackUri;
      const isConnectActive = Boolean(
        sdkDeviceIdRef.current || activeRemoteDeviceIdRef.current
      );
      if (!isConnectActive && controllerRef.current && isEmbedReady) {
        try {
          if (currentLoadedUriRef.current !== prefs.lastPlayedTrackUri) {
            controllerRef.current.loadUri(prefs.lastPlayedTrackUri);
            currentLoadedUriRef.current = prefs.lastPlayedTrackUri;
          }
        } catch {}
      }
    }
  }, [prefs.lastPlayedTrackUri, isEmbedReady]);

  const resumeOrPlayEmbedFallback = useCallback((explicitUri?: string) => {
    if (sdkPlayerRef.current && typeof sdkPlayerRef.current.pause === "function") {
      try {
        sdkPlayerRef.current.pause();
      } catch {}
    }
    if (!controllerRef.current) return;
    try {
      const freshPrefs = getStoredSpotifyPreferences();
      const targetUri =
        explicitUri || freshPrefs.lastPlayedTrackUri || freshPrefs.selectedPlaylistUri;
      let loadedNewUri = false;

      if (
        targetUri &&
        currentLoadedUriRef.current !== targetUri &&
        typeof controllerRef.current.loadUri === "function"
      ) {
        controllerRef.current.loadUri(targetUri);
        currentLoadedUriRef.current = targetUri;
        prevLastPlayedTrackUriRef.current = freshPrefs.lastPlayedTrackUri;
        prevSelectedPlaylistUriRef.current = freshPrefs.selectedPlaylistUri;
        loadedNewUri = true;
      }

      // If an explicit URI was requested or new URI loaded, ALWAYS play it directly
      if (explicitUri || loadedNewUri || typeof controllerRef.current.resume !== "function") {
        controllerRef.current.play();
      } else {
        controllerRef.current.resume();
      }
      isPlayerPausedRef.current = false;

      // Secondary attempt after a short delay in case the iframe was reloading its content
      if (loadedNewUri) {
        setTimeout(() => {
          try {
            if (!isPlayerPausedRef.current && controllerRef.current) {
              controllerRef.current.play();
            }
          } catch {}
        }, 300);
      }
    } catch {
      try {
        controllerRef.current.play();
        isPlayerPausedRef.current = false;
      } catch {}
    }
  }, []);

  // Handle external playback commands (from widget, timer start/pause, mini pop-up window, etc.)
  // Routes through Spotify Connect (/api/spotify/player) first when connected so the user's
  // Spotify desktop/mobile app stays synchronized in real time, and falls back to the IFrame Embed.
  useEffect(() => {
    return subscribeToSpotifyCommands(
      async (command, uri, contextUri) => {
        const freshPrefs = getStoredSpotifyPreferences();
        const targetUri =
          uri || freshPrefs.lastPlayedTrackUri || freshPrefs.selectedPlaylistUri;

        // Unlock Web Playback SDK audio context on user interaction
        if (command !== "pause" && sdkPlayerRef.current) {
          try {
            if (typeof sdkPlayerRef.current.activateElement === "function") {
              sdkPlayerRef.current.activateElement();
            }
          } catch {}
        }

        // Never pause the user's remote Spotify app if DND did not initiate or own playback
        if (
          command === "pause" &&
          !dndOwnsPlaybackRef.current &&
          (!sdkDeviceIdRef.current ||
            activeRemoteDeviceIdRef.current !== sdkDeviceIdRef.current)
        ) {
          if (
            controllerRef.current &&
            typeof controllerRef.current.pause === "function"
          ) {
            try {
              controllerRef.current.pause();
              isPlayerPausedRef.current = true;
            } catch {}
          }
          return;
        }

        if (command !== "pause") {
          dndOwnsPlaybackRef.current = true;
          setSpotifyConnectState({ dndOwnsPlayback: true });
        }

        const hasActiveConnectDevice = Boolean(
          activeRemoteDeviceIdRef.current || sdkDeviceIdRef.current
        );

        // Only call remote Connect API if authenticated, unrestricted, AND an active connect device is present.
        // This avoids waiting for a guaranteed 404 from Spotify, which would destroy the browser's user activation context.
        if (
          isAuthConnectedRef.current &&
          !needsScopeUpgradeRef.current &&
          !premiumRequiredRef.current &&
          !devModeRestrictedRef.current &&
          hasActiveConnectDevice
        ) {
          try {
            // If the Web Playback SDK in this tab is active, trigger commands directly for 0ms latency
            if (
              sdkPlayerRef.current &&
              sdkDeviceIdRef.current &&
              activeRemoteDeviceIdRef.current === sdkDeviceIdRef.current
            ) {
              if (command === "pause") {
                await sdkPlayerRef.current.pause();
                isPlayerPausedRef.current = true;
                return;
              } else if (command === "next") {
                await sdkPlayerRef.current.nextTrack();
                return;
              } else if (command === "prev") {
                await sdkPlayerRef.current.previousTrack();
                return;
              }
            }

            const isResumingSameConnectTrack =
              command === "play" &&
              isPlayerPausedRef.current &&
              Boolean(
                currentConnectTrackUriRef.current &&
                  targetUri === currentConnectTrackUriRef.current
              );

            const resolvedAction =
              command === "toggle"
                ? isPlayerPausedRef.current
                  ? "resume"
                  : "pause"
                : isResumingSameConnectTrack
                ? "resume"
                : command;

            const targetDeviceId =
              activeRemoteDeviceIdRef.current || sdkDeviceIdRef.current || undefined;

            const res = await fetch("/api/spotify/player", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: resolvedAction,
                uri: targetUri,
                contextUri:
                  (resolvedAction === "play" || resolvedAction === "resume") && contextUri
                    ? contextUri
                    : undefined,
                deviceId: targetDeviceId,
              }),
            });

            if (res.ok) {
              const data = await res.json();
              if (data.rateLimited) {
                pollBackoffUntilRef.current =
                  Date.now() +
                  (typeof data.retryAfterMs === "number" ? data.retryAfterMs : 15_000);
              } else if (data.errorCode === "insufficient_scope") {
                needsScopeUpgradeRef.current = true;
                setSpotifyConnectState({
                  needsScopeUpgrade: true,
                  devModeRestricted: false,
                });
              } else if (data.errorCode === "spotify_dev_mode_restricted") {
                devModeRestrictedRef.current = true;
                setSpotifyConnectState({
                  devModeRestricted: true,
                  needsScopeUpgrade: false,
                });
              } else if (data.errorCode === "premium_required") {
                premiumRequiredRef.current = true;
                setSpotifyConnectState({ premiumRequired: true });
              } else if (data.ok) {
                if (resolvedAction === "pause") {
                  isPlayerPausedRef.current = true;
                } else if (resolvedAction === "play" || resolvedAction === "resume") {
                  isPlayerPausedRef.current = false;
                  if (targetUri && targetUri.startsWith("spotify:track:")) {
                    currentConnectTrackUriRef.current = targetUri;
                  }
                }
                if (
                  controllerRef.current &&
                  typeof controllerRef.current.pause === "function"
                ) {
                  try {
                    controllerRef.current.pause();
                  } catch {}
                }
                window.setTimeout(() => {
                  void syncRemoteSpotifyState();
                }, 550);
                return;
              }
            }
          } catch {
            // Fall back to IFrame controller below
          }
        }

        // Spotify Connect is not active, user is on Free tier, or remote API call had no active device.
        // Execute fallback through Spotify EmbedController synchronously within user gesture.
        if (!controllerRef.current) return;
        try {
          if (command === "play" || command === "resume") {
            resumeOrPlayEmbedFallback(uri);
          } else if (command === "pause") {
            controllerRef.current.pause();
            isPlayerPausedRef.current = true;
          } else if (command === "toggle") {
            if (isPlayerPausedRef.current) {
              resumeOrPlayEmbedFallback(uri);
            } else {
              controllerRef.current.pause();
              isPlayerPausedRef.current = true;
            }
          } else if (command === "next") {
            controllerRef.current.next();
          } else if (command === "prev") {
            controllerRef.current.previous();
          }
        } catch (err) {
          console.warn("Spotify command execution failed", err);
        }
      },
      { acceptRemote: true }
    );
  }, [resumeOrPlayEmbedFallback, syncRemoteSpotifyState]);

  const handleSelectPlaylist = (item: SpotifyPlaylistItem) => {
    saveStoredSpotifyPreferences({
      selectedPlaylistUri: item.uri,
      selectedPlaylistName: item.name,
      selectedPlaylistImage: item.imageUrl,
      selectedPlaylistOwner: item.ownerName,
      audioSource: prefsRef.current.audioSource === "both" ? "both" : "spotify",
      lastPlayedTrackUri: null,
    });
    sendSpotifyCommand("play", item.uri);
    setIsPickerOpen(false);
  };

  const handleApplyCustomUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomUrlError("");
    const parsed = parseSpotifyInputToUri(customUrlInput);
    if (!parsed) {
      setCustomUrlError("Please paste a valid Spotify playlist or track link.");
      return;
    }
    const raw = customUrlInput;
    setCustomUrlInput("");
    const imported = await importSpotifyPlaylistOrTrack(raw);
    if (!imported) return;
    if (imported.playlist) {
      const pl = imported.playlist;
      setUserPlaylists((prev) => [
        pl,
        ...prev.filter((item) => item.uri !== pl.uri && item.id !== pl.id),
      ]);
      sendSpotifyCommand("play", pl.uri);
    } else {
      sendSpotifyCommand("play", imported.uri);
    }
    setIsPickerOpen(false);
  };

  const allPlaylists = [
    ...userPlaylists,
    ...CURATED_FOCUS_PLAYLISTS.filter(
      (c) => !userPlaylists.some((u) => u.uri === c.uri)
    ),
  ];

  if (embedOnly) {
    return (
      <div className="w-full rounded-xl overflow-hidden min-h-[80px]">
        <div ref={embedContainerRef} />
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border p-3.5 transition-colors flex flex-col gap-3 ${
        isDark
          ? "bg-[#0b0f17] border-[#1d2634] text-[#f1f5f9]"
          : "bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a]"
      }`}
    >
      {/* Top Bar: Selected Playlist & Playlist Picker Toggle (plain typography, no pills) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#1DB954]/15 flex items-center justify-center text-[#1DB954] shrink-0">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold truncate">
                {prefs.selectedPlaylistName || CURATED_FOCUS_PLAYLISTS[0].name}
              </span>
              <span className="text-[11px] text-[#64748b] dark:text-[#7e8c9f]">
                ·
              </span>
              {connected && spotifyUser ? (
                <span className="text-[11px] text-[#64748b] dark:text-[#7e8c9f] truncate">
                  {spotifyUser.displayName}
                </span>
              ) : (
                <Link
                  href="/connected-apps"
                  className="text-[11px] text-[#64748b] dark:text-[#7e8c9f] hover:underline shrink-0"
                >
                  Starter playlist
                </Link>
              )}
            </div>
            <p className="text-[10.5px] text-[#64748b] dark:text-[#7e8c9f] truncate">
              {prefs.autoPlayOnFocus
                ? "Plays automatically when your focus session starts"
                : "Ready to play whenever you like"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsPickerOpen((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              isPickerOpen
                ? "border-current"
                : isDark
                ? "bg-[#141b24] border-[#222d3d] text-[#f1f5f9] hover:bg-[#1c2432]"
                : "bg-white border-[#cbd5e1] text-[#0f172a] hover:bg-[#f1f5f9]"
            }`}
            style={
              isPickerOpen
                ? {
                    backgroundColor: isDark ? colors.containerDark : colors.container,
                    borderColor: activeBorder,
                    color: activeColor,
                  }
                : undefined
            }
          >
            <span>Playlists</span>
            <svg
              className={`w-3 h-3 transition-transform ${
                isPickerOpen ? "rotate-180" : ""
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expandable Playlist Selector Drawer */}
      {isPickerOpen && (
        <div
          className={`p-3 rounded-xl border flex flex-col gap-3 ${
            isDark
              ? "bg-[#101620] border-[#1d2634]"
              : "bg-white border-[#e2e8f0]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#64748b] dark:text-[#7e8c9f]">
              {connected && userPlaylists.length > 0
                ? "Your playlists & starter picks"
                : "Starter focus playlists"}
            </span>
            {!connected && (
              <Link
                href="/connected-apps"
                className="text-[11px] font-medium hover:underline flex items-center gap-1"
                style={{ color: activeColor }}
              >
                <span>Use your own Spotify</span>
                <span>→</span>
              </Link>
            )}
          </div>

          {isLoadingPlaylists ? (
            <div className="py-4 text-center text-xs text-[#64748b] dark:text-[#7e8c9f]">
              Loading playlists...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
              {allPlaylists.map((pl) => {
                const isSelected = prefs.selectedPlaylistUri === pl.uri;
                return (
                  <button
                    key={pl.uri}
                    type="button"
                    onClick={() => handleSelectPlaylist(pl)}
                    className={`p-2 rounded-lg border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? "border-current"
                        : isDark
                        ? "bg-[#0b0f17] border-[#1c2432] hover:border-[#2a3649]"
                        : "bg-[#f8fafc] border-[#e2e8f0] hover:border-[#cbd5e1]"
                    }`}
                    style={
                      isSelected
                        ? {
                            backgroundColor: isDark
                              ? colors.containerDark
                              : colors.container,
                            borderColor: activeBorder,
                          }
                        : undefined
                    }
                  >
                    <div className="w-9 h-9 rounded-md overflow-hidden bg-[#1c2432] shrink-0">
                      {pl.imageUrl ? (
                        <img
                          src={pl.imageUrl}
                          alt={pl.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#1DB954] text-xs font-bold">
                          ♪
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold truncate">
                        {pl.name}
                      </div>
                      <div className="text-[10px] text-[#64748b] dark:text-[#7e8c9f] truncate">
                        {pl.isCurated ? "Focus pick" : pl.ownerName}
                        {pl.tracksTotal > 0
                          ? ` · ${pl.tracksTotal} ${pl.tracksTotal === 1 ? "track" : "tracks"}`
                          : ""}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Custom Playlist Link Input */}
          <form onSubmit={handleApplyCustomUrl} className="flex flex-col gap-1.5 pt-2 border-t border-[#e2e8f0] dark:border-[#1d2634]">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Or paste any Spotify playlist link..."
                value={customUrlInput}
                onChange={(e) => setCustomUrlInput(e.target.value)}
                className={`flex-1 px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
                  isDark
                    ? "bg-[#0b0f17] border-[#1c2432] text-white"
                    : "bg-[#f8fafc] border-[#cbd5e1] text-[#0f172a]"
                }`}
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shrink-0"
                style={{
                  backgroundColor: activeColor,
                  color: isDark ? "#00201d" : "#ffffff",
                }}
              >
                Use Link
              </button>
            </div>
            {customUrlError && (
              <span className="text-[10.5px] text-red-500">{customUrlError}</span>
            )}
          </form>
        </div>
      )}

      {/* Official Spotify iFrame Player Container */}
      <div className="w-full rounded-xl overflow-hidden bg-black/10 dark:bg-black/20 min-h-[80px]">
        <div ref={embedContainerRef} />
      </div>
    </div>
  );
}
