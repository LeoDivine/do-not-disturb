"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useTheme } from "../../context/theme-context";
import { sendSpotifyCommand } from "../../lib/sound/audio-coordinator";
import { getSoundSynth } from "../../lib/sound/sound-synth";
import {
  getCurrentPlayingTrack,
  subscribeToCurrentPlayingTrack,
  setCurrentPlayingTrack,
  ActiveTrackInfo,
} from "../../lib/sound/current-track-store";
import {
  getStoredSpotifyPreferences,
  saveStoredSpotifyPreferences,
  subscribeToSpotifyPreferences,
  SpotifyStoredPreference,
  CURATED_FOCUS_TRACKS,
  CURATED_FOCUS_PLAYLISTS,
  SpotifyTrackItem,
  SpotifyPlaylistItem,
  parseSpotifyInputToUri,
  fetchSpotifyPlaylistsShared,
  subscribeToSpotifyAuthUpdates,
} from "../../lib/spotify/spotify-store";
import SpotifyFocusPlayer from "./spotify-focus-player";

export const OPEN_SPOTIFY_WIDGET_EVENT = "dnd-open-spotify-widget";

export default function DraggableSpotifyWidget() {
  const { isDark } = useTheme();

  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showNativeEmbed, setShowNativeEmbed] = useState(false);
  const [viewMode, setViewMode] = useState<"tracks" | "playlists">("tracks");
  const [searchQuery, setSearchQuery] = useState("");
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Connected state & user playlists
  const [connected, setConnected] = useState<boolean>(false);
  const [spotifyUser, setSpotifyUser] = useState<{
    displayName: string;
    avatarUrl?: string | null;
  } | null>(null);
  const [userPlaylists, setUserPlaylists] = useState<SpotifyPlaylistItem[]>([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState<boolean>(false);

  // Active playlist drill-down for selecting individual tracks from a playlist
  const [selectedPlaylistInfo, setSelectedPlaylistInfo] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<SpotifyTrackItem[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState<boolean>(false);
  const tracksCacheRef = useRef<Map<string, SpotifyTrackItem[]>>(new Map());
  const activeTrackFetchIdRef = useRef<string | null>(null);
  const lastSyncedPlaylistUriRef = useRef<string>("");

  const [currentTrack, setCurrentTrack] = useState<ActiveTrackInfo>(() =>
    getCurrentPlayingTrack()
  );
  const [prefs, setPrefs] = useState<SpotifyStoredPreference>(() =>
    getStoredSpotifyPreferences()
  );

  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    posX: number;
    posY: number;
  }>({ pointerX: 0, pointerY: 0, posX: 0, posY: 0 });
  const hasMovedRef = useRef(false);
  const isPointerDownRef = useRef(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Fetch connected status & user's personal playlists (shared cache across components)
  const fetchPlaylists = useCallback(async (forceRefresh = false) => {
    setIsLoadingPlaylists(true);
    try {
      const data = await fetchSpotifyPlaylistsShared(forceRefresh);
      setConnected(Boolean(data.connected));
      setSpotifyUser(data.user || null);
      setUserPlaylists(data.playlists);
    } catch {
      // offline / local fallback
    } finally {
      setIsLoadingPlaylists(false);
    }
  }, []);

  // Initialize position, listeners, and load user playlists
  useEffect(() => {
    setIsMounted(true);

    const savedPos = localStorage.getItem("dnd_spotify_widget_pos");
    let initX = window.innerWidth - 64;
    let initY = window.innerHeight - 90;

    if (savedPos) {
      try {
        const parsed = JSON.parse(savedPos);
        if (
          typeof parsed.x === "number" &&
          typeof parsed.y === "number" &&
          parsed.x > 0 &&
          parsed.x < window.innerWidth &&
          parsed.y > 0 &&
          parsed.y < window.innerHeight
        ) {
          initX = Math.max(10, Math.min(parsed.x, window.innerWidth - 54));
          initY = Math.max(10, Math.min(parsed.y, window.innerHeight - 54));
        }
      } catch {}
    }

    setPos({ x: initX, y: initY });

    const unsubTrack = subscribeToCurrentPlayingTrack((t) => setCurrentTrack(t));
    const unsubPrefs = subscribeToSpotifyPreferences((p) => setPrefs(p));

    const handleOpenRequest = () => setIsOpen(true);
    window.addEventListener(OPEN_SPOTIFY_WIDGET_EVENT, handleOpenRequest);

    const handleResize = () => {
      setPos((prev) => ({
        x: Math.max(10, Math.min(prev.x, window.innerWidth - 54)),
        y: Math.max(10, Math.min(prev.y, window.innerHeight - 54)),
      }));
    };
    window.addEventListener("resize", handleResize);

    // Initial playlist fetch
    fetchPlaylists(false);

    const unsubAuth = subscribeToSpotifyAuthUpdates(() => {
      fetchPlaylists(true);
    });

    return () => {
      unsubTrack();
      unsubPrefs();
      unsubAuth();
      window.removeEventListener(OPEN_SPOTIFY_WIDGET_EVENT, handleOpenRequest);
      window.removeEventListener("resize", handleResize);
    };
  }, [fetchPlaylists]);

  // Pointer dragging handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    isPointerDownRef.current = true;
    hasMovedRef.current = false;
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      posX: pos.x,
      posY: pos.y,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isPointerDownRef.current) return;

    const dx = e.clientX - dragStartRef.current.pointerX;
    const dy = e.clientY - dragStartRef.current.pointerY;

    if (Math.hypot(dx, dy) > 5) {
      hasMovedRef.current = true;
      setIsDragging(true);

      const nextX = Math.max(
        10,
        Math.min(dragStartRef.current.posX + dx, window.innerWidth - 54)
      );
      const nextY = Math.max(
        10,
        Math.min(dragStartRef.current.posY + dy, window.innerHeight - 54)
      );
      setPos({ x: nextX, y: nextY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    setIsDragging(false);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (hasMovedRef.current) {
      localStorage.setItem("dnd_spotify_widget_pos", JSON.stringify(pos));
    } else {
      setIsOpen((prev) => !prev);
    }
  };

  // Close when tapping outside popover on mobile
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest("#dnd-spotify-draggable-btn")
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  // Select an individual track without overwriting stored playlist metadata
  const handleSelectTrack = useCallback((track: SpotifyTrackItem) => {
    const currentPrefs = getStoredSpotifyPreferences();
    const nextAudioSource = currentPrefs.audioSource === "both" ? "both" : "spotify";
    if (nextAudioSource === "spotify") {
      try {
        getSoundSynth().stop();
      } catch {}
    }
    saveStoredSpotifyPreferences({
      lastPlayedTrackUri: track.uri,
      audioSource: nextAudioSource,
    });
    sendSpotifyCommand("play", track.uri);
    setCurrentPlayingTrack({
      title: track.title,
      artist: track.artist,
      source: "spotify",
      isPlaying: true,
      uri: track.uri,
      artworkUrl: track.imageUrl || currentPrefs.selectedPlaylistImage,
    });
  }, []);

  // Load tracks for a playlist by ID (with in-memory caching for instant tab switching)
  const loadTracksForPlaylist = useCallback(
    async (
      playlistId: string,
      playlistName: string,
      isCurated?: boolean,
      switchToTracksView = false
    ) => {
      if (!playlistId) return;
      activeTrackFetchIdRef.current = playlistId;
      setSelectedPlaylistInfo({ id: playlistId, name: playlistName });
      if (switchToTracksView) {
        setViewMode("tracks");
      }

      const cached = tracksCacheRef.current.get(playlistId);
      if (cached && cached.length > 0) {
        setPlaylistTracks(cached);
        setIsLoadingTracks(false);
        return;
      }

      setPlaylistTracks([]);
      setIsLoadingTracks(true);
      try {
        const res = await fetch(
          `/api/spotify/playlists?playlistId=${encodeURIComponent(playlistId)}`
        );
        if (activeTrackFetchIdRef.current !== playlistId) return;
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.tracks) && data.tracks.length > 0) {
            tracksCacheRef.current.set(playlistId, data.tracks);
            setPlaylistTracks(data.tracks);
            return;
          }
        }
        if (isCurated || CURATED_FOCUS_PLAYLISTS.some((c) => c.id === playlistId)) {
          setPlaylistTracks(CURATED_FOCUS_TRACKS);
        }
      } catch {
        if (activeTrackFetchIdRef.current !== playlistId) return;
        if (isCurated || CURATED_FOCUS_PLAYLISTS.some((c) => c.id === playlistId)) {
          setPlaylistTracks(CURATED_FOCUS_TRACKS);
        }
      } finally {
        if (activeTrackFetchIdRef.current === playlistId) {
          setIsLoadingTracks(false);
        }
      }
    },
    []
  );

  // Drill down into a playlist to select specific tracks from it
  const handleViewPlaylistTracks = useCallback(
    async (pl: SpotifyPlaylistItem) => {
      await loadTracksForPlaylist(pl.id, pl.name, pl.isCurated, true);
    },
    [loadTracksForPlaylist]
  );

  // Select a playlist directly and display its tracks
  const handleSelectPlaylist = useCallback(
    (playlist: SpotifyPlaylistItem) => {
      const currentPrefs = getStoredSpotifyPreferences();
      const nextAudioSource =
        currentPrefs.audioSource === "both" ? "both" : "spotify";
      if (nextAudioSource === "spotify") {
        try {
          getSoundSynth().stop();
        } catch {}
      }
      lastSyncedPlaylistUriRef.current = playlist.uri;
      saveStoredSpotifyPreferences({
        selectedPlaylistUri: playlist.uri,
        selectedPlaylistName: playlist.name,
        selectedPlaylistImage: playlist.imageUrl,
        selectedPlaylistOwner: playlist.ownerName,
        audioSource: nextAudioSource,
        lastPlayedTrackUri: null,
      });
      sendSpotifyCommand("play", playlist.uri);
      setCurrentPlayingTrack({
        title: playlist.name,
        artist: playlist.ownerName,
        source: "spotify",
        isPlaying: true,
        uri: playlist.uri,
        artworkUrl: playlist.imageUrl,
      });
      void loadTracksForPlaylist(
        playlist.id,
        playlist.name,
        playlist.isCurated,
        true
      );
    },
    [loadTracksForPlaylist]
  );

  // Automatically sync tracks list when a user's playlist is selected (from Settings, Focus Player, or initial prefs)
  useEffect(() => {
    const uri = prefs.selectedPlaylistUri;
    if (!uri || uri === lastSyncedPlaylistUriRef.current) return;
    lastSyncedPlaylistUriRef.current = uri;

    const parsed = parseSpotifyInputToUri(uri);
    if (parsed && parsed.type === "playlist") {
      const isDefaultCurated = uri === CURATED_FOCUS_PLAYLISTS[0].uri;
      // Always load tracks if the user selected a non-default / personal playlist, or if already viewing a playlist
      if (!isDefaultCurated || selectedPlaylistInfo) {
        const isCurated = CURATED_FOCUS_PLAYLISTS.some((c) => c.id === parsed.id);
        void loadTracksForPlaylist(
          parsed.id,
          prefs.selectedPlaylistName || "Selected Playlist",
          isCurated,
          false
        );
      }
    }
  }, [
    prefs.selectedPlaylistUri,
    prefs.selectedPlaylistName,
    selectedPlaylistInfo,
    loadTracksForPlaylist,
  ]);

  // Handle custom search / link input
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const parsed = parseSpotifyInputToUri(searchQuery);
    if (parsed) {
      const currentPrefs = getStoredSpotifyPreferences();
      const nextAudioSource = currentPrefs.audioSource === "both" ? "both" : "spotify";
      if (nextAudioSource === "spotify") {
        try {
          getSoundSynth().stop();
        } catch {}
      }
      if (parsed.type === "track") {
        saveStoredSpotifyPreferences({
          lastPlayedTrackUri: parsed.uri,
          audioSource: nextAudioSource,
        });
      } else {
        saveStoredSpotifyPreferences({
          selectedPlaylistUri: parsed.uri,
          selectedPlaylistName: `Custom ${parsed.type}`,
          audioSource: nextAudioSource,
          lastPlayedTrackUri: null,
        });
      }
      sendSpotifyCommand("play", parsed.uri);
      setSearchQuery("");
      return;
    }
  };

  // Base list of tracks to filter (either from selected playlist or curated focus tracks)
  const baseTracks = useMemo(() => {
    if (selectedPlaylistInfo) {
      return playlistTracks;
    }
    return CURATED_FOCUS_TRACKS;
  }, [selectedPlaylistInfo, playlistTracks]);

  // Filtered tracks based on search query
  const filteredTracks = useMemo(() => {
    if (!searchQuery.trim()) return baseTracks;
    const q = searchQuery.toLowerCase();
    return baseTracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q)
    );
  }, [baseTracks, searchQuery]);

  const filteredUserPlaylists = useMemo(() => {
    if (!searchQuery.trim()) return userPlaylists;
    const q = searchQuery.toLowerCase();
    return userPlaylists.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.ownerName.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }, [userPlaylists, searchQuery]);

  const filteredCuratedPlaylists = useMemo(() => {
    if (!searchQuery.trim()) return CURATED_FOCUS_PLAYLISTS;
    const q = searchQuery.toLowerCase();
    return CURATED_FOCUS_PLAYLISTS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  if (!isMounted) return null;

  const isPlayingSpotify =
    Boolean(currentTrack.isPlaying) && currentTrack.source === "spotify";

  // Position popover cleanly within viewport
  const popoverWidth = 290;
  const popoverHeight = 440;
  const isRightSide = pos.x > window.innerWidth / 2;
  const isBottomSide = pos.y > window.innerHeight / 2;

  const popoverLeft = isRightSide
    ? Math.max(10, pos.x - popoverWidth + 44)
    : Math.min(pos.x, window.innerWidth - popoverWidth - 10);

  const popoverTop = isBottomSide
    ? Math.max(10, pos.y - popoverHeight - 8)
    : Math.min(pos.y + 52, window.innerHeight - popoverHeight - 10);

  return (
    <>
      {/* Sticky Draggable Floating Spotify Icon (Sleek 44px) */}
      <div
        style={{
          position: "fixed",
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          zIndex: 49,
          touchAction: "none",
        }}
        className="select-none"
      >
        <button
          id="dnd-spotify-draggable-btn"
          type="button"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          aria-label="Focus Music player"
          title="Focus Music (Click to pick music, or drag to move)"
          className={`relative group w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-grab active:cursor-grabbing focus:outline-none ${
            isDragging
              ? "scale-105 shadow-xl opacity-90"
              : "hover:scale-105 active:scale-95 shadow-md"
          }`}
          style={{
            backgroundColor: "#1DB954",
            boxShadow: isPlayingSpotify
              ? "0 0 0 3px rgba(29, 185, 84, 0.35), 0 4px 16px rgba(29, 185, 84, 0.45)"
              : "0 2px 10px rgba(0, 0, 0, 0.35)",
          }}
        >
          {/* Subtle playing pulse */}
          {isPlayingSpotify && (
            <span
              className="absolute inset-0 rounded-full animate-ping opacity-25 pointer-events-none"
              style={{ backgroundColor: "#1DB954" }}
            />
          )}

          {/* Spotify Wave Icon */}
          <svg
            className="w-5 h-5 text-black fill-current pointer-events-none drop-shadow-sm transition-transform group-hover:scale-105"
            viewBox="0 0 24 24"
          >
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>

          {/* Mini Playing Equalizer Dot */}
          {isPlayingSpotify && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-black rounded-full flex items-center justify-center border border-[#1DB954]/50 pointer-events-none">
              <span className="w-1.5 h-1.5 bg-[#1DB954] rounded-full animate-pulse" />
            </span>
          )}
        </button>
      </div>

      {/* Minimalist Popover Controller (290px Compact Footprint) */}
      <div
        ref={popoverRef}
        style={{
          position: "fixed",
          left: `${popoverLeft}px`,
          top: `${popoverTop}px`,
          width: `${popoverWidth}px`,
          maxHeight: `${popoverHeight}px`,
          zIndex: 50,
          visibility: isOpen ? "visible" : "hidden",
        }}
        className={`flex flex-col rounded-2xl border shadow-xl transition-all duration-200 backdrop-blur-md overflow-hidden ${
          isOpen
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
        } ${
          isDark
            ? "bg-[#0c1017]/95 border-[#1e2736] text-[#f1f5f9]"
            : "bg-white/95 border-[#e2e8f0] text-[#0f172a]"
        }`}
      >
        {/* Minimalist Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-inherit">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`w-2 h-2 rounded-full ${
                isPlayingSpotify ? "bg-[#1DB954] animate-pulse" : "bg-[#64748b]"
              }`}
            />
            <span className="text-[11px] font-bold tracking-tight">Focus Music</span>
            <span className="text-[10px] text-[#64748b] dark:text-[#7e8c9f] truncate">
              · {isPlayingSpotify ? "Playing now" : "Ready to play"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-5 h-5 rounded flex items-center justify-center text-[11px] text-[#64748b] hover:text-[#0f172a] dark:text-[#7e8c9f] dark:hover:text-[#f1f5f9] transition-colors cursor-pointer"
            aria-label="Close music player"
          >
            ✕
          </button>
        </div>

        {/* Compact Now-Playing & Playback Controls Bar */}
        <div className="p-2.5 border-b border-inherit bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#1c2432] shrink-0 border border-white/10 flex items-center justify-center">
              {currentTrack.artworkUrl || prefs.selectedPlaylistImage ? (
                <img
                  src={currentTrack.artworkUrl || prefs.selectedPlaylistImage || ""}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[#1DB954] text-xs font-bold">♪</span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[11.5px] font-semibold truncate leading-tight">
                {currentTrack.title || prefs.selectedPlaylistName || "Deep Focus"}
              </div>
              <div className="text-[10px] text-[#64748b] dark:text-[#7e8c9f] truncate leading-tight mt-0.5">
                {currentTrack.artist || "Spotify"}
              </div>
            </div>
          </div>

          {/* Inline Controls */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => sendSpotifyCommand("prev")}
              className="w-6 h-6 rounded flex items-center justify-center text-[#64748b] dark:text-[#7e8c9f] hover:text-current transition-colors cursor-pointer"
              title="Previous song"
            >
              <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => sendSpotifyCommand("toggle")}
              className="w-7 h-7 rounded-full flex items-center justify-center text-black font-bold transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
              style={{ backgroundColor: "#1DB954" }}
              title={isPlayingSpotify ? "Pause music" : "Play music"}
            >
              {isPlayingSpotify ? (
                <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-3 h-3 fill-current translate-x-0.5" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button
              type="button"
              onClick={() => sendSpotifyCommand("next")}
              className="w-6 h-6 rounded flex items-center justify-center text-[#64748b] dark:text-[#7e8c9f] hover:text-current transition-colors cursor-pointer"
              title="Next song"
            >
              <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                <path d="m6 18 8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Minimalist Search & Mode Pill */}
        <div className="p-2 border-b border-inherit flex items-center gap-1.5">
          <form onSubmit={handleSearchSubmit} className="flex-1">
            <input
              type="text"
              placeholder={
                viewMode === "tracks"
                  ? "Find a song or paste a link..."
                  : "Find a playlist or paste a link..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full px-2 py-1 text-[11px] rounded-lg border focus:outline-none transition-colors ${
                isDark
                  ? "bg-[#101620] border-[#1d2634] text-white placeholder-[#64748b] focus:border-[#1DB954]"
                  : "bg-[#f8fafc] border-[#cbd5e1] text-[#0f172a] placeholder-[#94a3b8] focus:border-[#1DB954]"
              }`}
            />
          </form>

          <div className="flex rounded-lg border border-inherit p-0.5 shrink-0 bg-black/5 dark:bg-white/5">
            <button
              type="button"
              onClick={() => {
                setViewMode("tracks");
              }}
              className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors cursor-pointer ${
                viewMode === "tracks"
                  ? "bg-[#1DB954] text-black font-semibold"
                  : "text-[#64748b] dark:text-[#7e8c9f] hover:text-current"
              }`}
            >
              Songs
            </button>
            <button
              type="button"
              onClick={() => setViewMode("playlists")}
              className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors cursor-pointer ${
                viewMode === "playlists"
                  ? "bg-[#1DB954] text-black font-semibold"
                  : "text-[#64748b] dark:text-[#7e8c9f] hover:text-current"
              }`}
            >
              Playlists
            </button>
          </div>
        </div>

        {/* Sub-header when viewing a specific playlist's songs */}
        {viewMode === "tracks" && selectedPlaylistInfo && (
          <div className="px-2.5 py-1.5 bg-[#1DB954]/10 border-b border-inherit flex items-center justify-between gap-2 text-[10px]">
            <div className="flex items-center gap-1.5 min-w-0">
              <button
                type="button"
                onClick={() => setViewMode("playlists")}
                className="text-[#64748b] dark:text-[#7e8c9f] hover:text-current cursor-pointer shrink-0 font-medium"
                title="Go back to all playlists"
              >
                ← Playlists
              </button>
              <span className="text-[#64748b] dark:text-[#7e8c9f]">·</span>
              <span className="font-semibold truncate text-[#1DB954]">
                {selectedPlaylistInfo.name}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                activeTrackFetchIdRef.current = null;
                setSelectedPlaylistInfo(null);
                setPlaylistTracks([]);
              }}
              className="text-[#64748b] dark:text-[#7e8c9f] hover:text-current cursor-pointer shrink-0"
              title="Switch back to built-in focus songs"
            >
              Focus picks
            </button>
          </div>
        )}

        {/* Scrollable Track / Playlist Selector */}
        <div className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-1 min-h-[170px] max-h-[240px]">
          {viewMode === "tracks" ? (
            isLoadingTracks ? (
              <div className="py-8 text-center text-[11px] text-[#64748b] dark:text-[#7e8c9f]">
                Loading songs from this playlist...
              </div>
            ) : filteredTracks.length === 0 ? (
              <div className="py-8 px-3 text-center text-[11px] text-[#64748b] dark:text-[#7e8c9f]">
                {searchQuery.trim()
                  ? "No songs match your search. Paste a Spotify link and press Enter to play it."
                  : "This playlist doesn't have any songs yet."}
              </div>
            ) : (
              filteredTracks.map((t) => {
                const isSelected =
                  currentTrack.uri === t.uri || prefs.lastPlayedTrackUri === t.uri;
                return (
                  <button
                    key={t.id || t.uri}
                    type="button"
                    onClick={() => handleSelectTrack(t)}
                    className={`w-full px-2 py-1.5 rounded-lg text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#1DB954]/15 border border-[#1DB954]/40"
                        : isDark
                        ? "hover:bg-white/5 border border-transparent"
                        : "hover:bg-black/5 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Play Indicator / Equalizer */}
                      <span className="w-3 text-center shrink-0">
                        {isSelected && isPlayingSpotify ? (
                          <span className="flex items-center justify-center gap-0.5">
                            <span className="w-0.5 h-2 bg-[#1DB954] rounded-full animate-eq-1" />
                            <span className="w-0.5 h-2.5 bg-[#1DB954] rounded-full animate-eq-2" />
                            <span className="w-0.5 h-1.5 bg-[#1DB954] rounded-full animate-eq-3" />
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#64748b] dark:text-[#7e8c9f]">
                            {isSelected ? "▶" : "♪"}
                          </span>
                        )}
                      </span>

                      <div className="min-w-0">
                        <div
                          className={`text-[11px] truncate leading-tight ${
                            isSelected
                              ? "font-bold text-[#1DB954]"
                              : "font-medium"
                          }`}
                        >
                          {t.title}
                        </div>
                        <div className="text-[9.5px] text-[#64748b] dark:text-[#7e8c9f] truncate leading-tight">
                          {t.artist}
                          {t.category ? ` · ${t.category}` : ""}
                        </div>
                      </div>
                    </div>

                    <span className="text-[9.5px] text-[#64748b] dark:text-[#7e8c9f] shrink-0 font-mono">
                      {t.duration || ""}
                    </span>
                  </button>
                );
              })
            )
          ) : (
            // PLAYLISTS VIEW: User Playlists + Curated Focus Playlists
            <div className="flex flex-col gap-2">
              {/* User Connected Playlists Section */}
              {connected && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between px-1 pt-1 pb-0.5">
                    <span className="text-[10px] font-bold text-[#64748b] dark:text-[#7e8c9f] uppercase tracking-wider">
                      Your Playlists {spotifyUser ? `(${spotifyUser.displayName})` : ""}
                    </span>
                    <span className="text-[9px] text-[#64748b] dark:text-[#7e8c9f]">
                      {userPlaylists.length} {userPlaylists.length === 1 ? "playlist" : "playlists"}
                    </span>
                  </div>

                  {isLoadingPlaylists ? (
                    <div className="py-3 text-center text-[10.5px] text-[#64748b] dark:text-[#7e8c9f]">
                      Loading your playlists...
                    </div>
                  ) : filteredUserPlaylists.length === 0 ? (
                    <div className="py-2 text-center text-[10.5px] text-[#64748b] dark:text-[#7e8c9f]">
                      No playlists match your search.
                    </div>
                  ) : (
                    filteredUserPlaylists.map((pl) => {
                      const isSelected =
                        prefs.selectedPlaylistUri === pl.uri &&
                        !prefs.lastPlayedTrackUri;
                      return (
                        <div
                          key={pl.id}
                          className={`w-full px-2 py-1.5 rounded-lg flex items-center justify-between gap-1.5 transition-all ${
                            isSelected
                              ? "bg-[#1DB954]/15 border border-[#1DB954]/40"
                              : isDark
                              ? "hover:bg-white/5 border border-transparent"
                              : "hover:bg-black/5 border border-transparent"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleSelectPlaylist(pl)}
                            className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                          >
                            <div className="w-6 h-6 rounded bg-[#1c2432] shrink-0 overflow-hidden flex items-center justify-center">
                              {pl.imageUrl ? (
                                <img
                                  src={pl.imageUrl}
                                  alt={pl.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-[10px] text-[#1DB954]">♫</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div
                                className={`text-[11px] truncate leading-tight ${
                                  isSelected
                                    ? "font-bold text-[#1DB954]"
                                    : "font-medium"
                                }`}
                              >
                                {pl.name}
                              </div>
                              <div className="text-[9.5px] text-[#64748b] dark:text-[#7e8c9f] truncate leading-tight">
                                {pl.tracksTotal > 0
                                  ? `${pl.tracksTotal} ${pl.tracksTotal === 1 ? "song" : "songs"}`
                                  : "Open playlist"}
                              </div>
                            </div>
                          </button>

                          {/* Quick button to view individual songs inside this playlist */}
                          <button
                            type="button"
                            onClick={() => handleViewPlaylistTracks(pl)}
                            className="px-1.5 py-0.5 rounded text-[9.5px] text-[#64748b] dark:text-[#7e8c9f] hover:text-[#1DB954] hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                            title="Browse songs in this playlist"
                          >
                            Songs ❯
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Not Connected prompt */}
              {!connected && (
                <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-inherit text-center flex flex-col gap-1">
                  <span className="text-[10px] text-[#64748b] dark:text-[#7e8c9f]">
                    Want to listen to your own playlists?
                  </span>
                  <Link
                    href="/connected-apps"
                    className="text-[10.5px] font-semibold text-[#1DB954] hover:underline"
                  >
                    Connect your Spotify →
                  </Link>
                </div>
              )}

              {/* Curated Focus Playlists Section */}
              <div className="flex flex-col gap-1 pt-1 border-t border-inherit">
                <span className="text-[10px] font-bold text-[#64748b] dark:text-[#7e8c9f] uppercase tracking-wider px-1">
                  Starter Focus Playlists
                </span>
                {filteredCuratedPlaylists.map((pl) => {
                  const isSelected =
                    prefs.selectedPlaylistUri === pl.uri &&
                    !prefs.lastPlayedTrackUri;
                  return (
                    <div
                      key={pl.id}
                      className={`w-full px-2 py-1.5 rounded-lg flex items-center justify-between gap-1.5 transition-all ${
                        isSelected
                          ? "bg-[#1DB954]/15 border border-[#1DB954]/40"
                          : isDark
                          ? "hover:bg-white/5 border border-transparent"
                          : "hover:bg-black/5 border border-transparent"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectPlaylist(pl)}
                        className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <span className="w-3 text-center shrink-0 text-[10px] text-[#64748b] dark:text-[#7e8c9f]">
                          {isSelected ? "▶" : "♫"}
                        </span>
                        <div className="min-w-0">
                          <div
                            className={`text-[11px] truncate leading-tight ${
                              isSelected
                                ? "font-bold text-[#1DB954]"
                                : "font-medium"
                            }`}
                          >
                            {pl.name}
                          </div>
                          <div className="text-[9.5px] text-[#64748b] dark:text-[#7e8c9f] truncate leading-tight">
                            {pl.description}
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleViewPlaylistTracks(pl)}
                        className="px-1.5 py-0.5 rounded text-[9.5px] text-[#64748b] dark:text-[#7e8c9f] hover:text-[#1DB954] hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                        title="Browse songs in this playlist"
                      >
                        Songs ❯
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Toggleable Official Spotify Player Drawer (stays mounted in DOM for continuous background playback) */}
        <div className="border-t border-inherit px-2.5 py-1.5 flex items-center justify-between text-[10px]">
          <button
            type="button"
            onClick={() => setShowNativeEmbed((prev) => !prev)}
            className="text-[#64748b] dark:text-[#7e8c9f] hover:text-[#1DB954] transition-colors cursor-pointer font-medium"
          >
            {showNativeEmbed ? "Hide full player ▲" : "Show full player ▼"}
          </button>
          <span className="text-[9.5px] text-[#64748b] dark:text-[#7e8c9f] truncate max-w-[130px]">
            {prefs.selectedPlaylistName || "Deep Focus"}
          </span>
        </div>

        <div
          className={
            showNativeEmbed
              ? "px-2 pb-2"
              : "h-0 overflow-hidden opacity-0 pointer-events-none"
          }
        >
          <SpotifyFocusPlayer compact embedOnly />
        </div>
      </div>
    </>
  );
}
