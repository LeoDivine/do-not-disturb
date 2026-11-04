"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useTheme } from "../../context/theme-context";
import { useTimer } from "../../context/timer-context";
import {
  SpotifyStoredPreference,
  SpotifyPlaylistItem,
  CURATED_FOCUS_PLAYLISTS,
  getStoredSpotifyPreferences,
  saveStoredSpotifyPreferences,
  subscribeToSpotifyPreferences,
  parseSpotifyInputToUri,
  SPOTIFY_AUTH_UPDATED_EVENT,
} from "../../lib/spotify/spotify-store";
import { setCurrentPlayingTrack, getCurrentPlayingTrack } from "../../lib/sound/current-track-store";
import { subscribeToSpotifyCommands } from "../../lib/sound/audio-coordinator";

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (IFrameAPI: any) => void;
    SpotifyIframeApi?: any;
  }
}

interface SpotifyFocusPlayerProps {
  compact?: boolean;
}

export default function SpotifyFocusPlayer({ compact = false }: SpotifyFocusPlayerProps) {
  const { isDark } = useTheme();
  const { mode, isRunning, isMiniWindowActive, activeColor, activeBorder, colors } = useTimer();

  const [prefs, setPrefs] = useState<SpotifyStoredPreference>(() =>
    getStoredSpotifyPreferences()
  );
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
  const prevTimerStateRef = useRef<{ isRunning: boolean; mode: string }>({
    isRunning: false,
    mode: "focus",
  });

  // Subscribe to Spotify preference changes across tabs/pages
  useEffect(() => {
    setPrefs(getStoredSpotifyPreferences());
    return subscribeToSpotifyPreferences((updated) => {
      setPrefs(updated);
    });
  }, []);

  // Load connected status & user's Spotify playlists
  const fetchPlaylistsAndStatus = async () => {
    setIsLoadingPlaylists(true);
    try {
      const res = await fetch("/api/spotify/playlists");
      if (res.ok) {
        const data = await res.json();
        setConnected(Boolean(data.connected));
        setSpotifyUser(data.user || null);
        if (Array.isArray(data.playlists)) {
          setUserPlaylists(data.playlists);
        }
      }
    } catch {
      // Ignore network errors in local-only offline state
    } finally {
      setIsLoadingPlaylists(false);
    }
  };

  useEffect(() => {
    fetchPlaylistsAndStatus();

    const handleAuthUpdate = () => {
      fetchPlaylistsAndStatus();
    };
    window.addEventListener(SPOTIFY_AUTH_UPDATED_EVENT, handleAuthUpdate);

    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      try {
        bc = new BroadcastChannel("dnd-spotify-channel");
        bc.onmessage = (ev) => {
          if (ev.data?.type === "SPOTIFY_AUTH_SYNC") {
            fetchPlaylistsAndStatus();
          }
        };
      } catch {}
    }

    return () => {
      window.removeEventListener(SPOTIFY_AUTH_UPDATED_EVENT, handleAuthUpdate);
      bc?.close();
    };
  }, []);

  // Load Spotify Official IFrame API script and initialize EmbedController
  useEffect(() => {
    if (typeof window === "undefined") return;

    const initController = (IFrameAPI: any) => {
      window.SpotifyIframeApi = IFrameAPI;
      if (!embedContainerRef.current || controllerRef.current) return;

      const initialUri =
        prefs.selectedPlaylistUri || CURATED_FOCUS_PLAYLISTS[0].uri;

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

          const trackCache = new Map<string, { title: string; artist: string; artworkUrl?: string | null }>();

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
                title: prefs.selectedPlaylistName || "Deep Focus",
                artist: "Spotify Focus",
                source: "spotify",
                isPlaying: !isPaused,
                uri: prefs.selectedPlaylistUri,
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
              title: prefs.selectedPlaylistName || "Spotify Track",
              artist: "Spotify",
              uri: playingUri,
            };
            setCurrentPlayingTrack({
              title: prefs.selectedPlaylistName || "Spotify Track",
              artist: "Spotify",
              source: "spotify",
              isPlaying: !isPaused,
              uri: playingUri,
            });

            try {
              const res = await fetch(`/api/spotify/current-track?uri=${encodeURIComponent(playingUri)}`);
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
            if (prefs.audioSource === "spotify") {
              const current = getCurrentPlayingTrack();
              if (current.source === "spotify" && current.uri?.startsWith("spotify:track:")) {
                setCurrentPlayingTrack({
                  ...current,
                  isPlaying: false,
                });
              } else {
                setCurrentPlayingTrack({
                  title: prefs.selectedPlaylistName || "Deep Focus",
                  artist: "Spotify Focus",
                  source: "spotify",
                  isPlaying: false,
                  uri: prefs.selectedPlaylistUri,
                });
              }
            }
          });

          EmbedController.addListener("playback_update", (e: any) => {
            const isPaused = Boolean(e?.data?.isPaused);
            const playingUri = (e?.data?.playingURI as string) || "";
            isPlayerPausedRef.current = isPaused;
            if (!isPaused) {
              saveStoredSpotifyPreferences({ audioSource: "spotify" });
            }
            if (playingUri && playingUri.startsWith("spotify:track:")) {
              lastTrackUriRef.current = playingUri;
              saveStoredSpotifyPreferences({ lastPlayedTrackUri: playingUri });
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
  }, [compact, isDark, prefs.selectedPlaylistUri]);

  // Update embedded playlist or selected track URI
  const prevSelectedPlaylistUriRef = useRef<string>(prefs.selectedPlaylistUri);
  const prevLastPlayedTrackUriRef = useRef<string | null | undefined>(prefs.lastPlayedTrackUri);

  useEffect(() => {
    if (prevSelectedPlaylistUriRef.current !== prefs.selectedPlaylistUri) {
      prevSelectedPlaylistUriRef.current = prefs.selectedPlaylistUri;
      if (controllerRef.current && isEmbedReady && prefs.selectedPlaylistUri) {
        try {
          const targetUri = prefs.lastPlayedTrackUri || prefs.selectedPlaylistUri;
          controllerRef.current.loadUri(targetUri);
          currentLoadedUriRef.current = targetUri;
          lastTrackUriRef.current = null;
        } catch {}
      }
    }
  }, [prefs.selectedPlaylistUri, prefs.lastPlayedTrackUri, isEmbedReady]);

  // Synchronize when a specific track is selected (e.g. from mini pop view)
  useEffect(() => {
    if (prefs.lastPlayedTrackUri && prevLastPlayedTrackUriRef.current !== prefs.lastPlayedTrackUri) {
      prevLastPlayedTrackUriRef.current = prefs.lastPlayedTrackUri;
      if (controllerRef.current && isEmbedReady) {
        try {
          controllerRef.current.loadUri(prefs.lastPlayedTrackUri);
          currentLoadedUriRef.current = prefs.lastPlayedTrackUri;
        } catch {}
      }
    }
  }, [prefs.lastPlayedTrackUri, isEmbedReady]);

  const resumeOrPlayTrack = useCallback(() => {
    if (!controllerRef.current) return;
    try {
      // If a specific track was selected and not yet loaded into the embed controller, load it now
      const targetUri = prefs.lastPlayedTrackUri || prefs.selectedPlaylistUri;
      if (targetUri && currentLoadedUriRef.current !== targetUri && typeof controllerRef.current.loadUri === "function") {
        controllerRef.current.loadUri(targetUri);
        currentLoadedUriRef.current = targetUri;
      }

      if (typeof controllerRef.current.resume === "function") {
        controllerRef.current.resume();
      } else {
        controllerRef.current.play();
      }
      isPlayerPausedRef.current = false;
    } catch {
      try {
        controllerRef.current.play();
        isPlayerPausedRef.current = false;
      } catch {}
    }
  }, [prefs.lastPlayedTrackUri, prefs.selectedPlaylistUri]);

  // React directly when timer starts or pauses
  useEffect(() => {
    if (!controllerRef.current || !isEmbedReady) return;
    if (prefs.audioSource !== "spotify" && prefs.audioSource !== "both") return;

    // If mini pop view (Document PiP) is active, pause main window player to prevent overlapping audio
    if (isMiniWindowActive) {
      try {
        controllerRef.current.pause();
        isPlayerPausedRef.current = true;
      } catch {}
      return;
    }

    if (isRunning && mode === "focus" && prefs.autoPlayOnFocus) {
      resumeOrPlayTrack();
    } else if (!isRunning && prefs.pauseOnBreak) {
      try {
        controllerRef.current.pause();
        isPlayerPausedRef.current = true;
      } catch {}
    }
  }, [isRunning, isMiniWindowActive, mode, prefs.audioSource, prefs.autoPlayOnFocus, prefs.pauseOnBreak, isEmbedReady, resumeOrPlayTrack]);

  // Handle external playback commands (from timer start/pause, mini pop-up window, global shortcuts, etc.)
  useEffect(() => {
    return subscribeToSpotifyCommands((command) => {
      if (!controllerRef.current) return;
      // If Document PiP mini timer is active, PiP manages playback directly; ignore play/resume here to avoid double-playing
      if (isMiniWindowActive && (command === "play" || command === "resume")) {
        return;
      }
      try {
        if (command === "play" || command === "resume") {
          resumeOrPlayTrack();
        } else if (command === "pause") {
          controllerRef.current.pause();
          isPlayerPausedRef.current = true;
        } else if (command === "toggle") {
          controllerRef.current.togglePlay();
        } else if (command === "next") {
          controllerRef.current.next();
        } else if (command === "prev") {
          controllerRef.current.previous();
        }
      } catch (err) {
        console.warn("Spotify command execution failed", err);
      }
    });
  }, [isMiniWindowActive, resumeOrPlayTrack]);

  const handleSelectPlaylist = (item: SpotifyPlaylistItem) => {
    saveStoredSpotifyPreferences({
      selectedPlaylistUri: item.uri,
      selectedPlaylistName: item.name,
      selectedPlaylistImage: item.imageUrl,
      selectedPlaylistOwner: item.ownerName,
      audioSource: "spotify",
      lastPlayedTrackUri: null,
    });
    setIsPickerOpen(false);
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomUrlError("");
    const parsed = parseSpotifyInputToUri(customUrlInput);
    if (!parsed) {
      setCustomUrlError("Please paste a valid Spotify playlist link.");
      return;
    }
    saveStoredSpotifyPreferences({
      selectedPlaylistUri: parsed.uri,
      selectedPlaylistName: `Custom ${parsed.type.charAt(0).toUpperCase() + parsed.type.slice(1)}`,
      selectedPlaylistImage: null,
      selectedPlaylistOwner: "Custom Link",
      audioSource: "spotify",
      lastPlayedTrackUri: null,
    });
    setCustomUrlInput("");
    setIsPickerOpen(false);
  };

  const allPlaylists = [
    ...userPlaylists,
    ...CURATED_FOCUS_PLAYLISTS.filter(
      (c) => !userPlaylists.some((u) => u.uri === c.uri)
    ),
  ];

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
