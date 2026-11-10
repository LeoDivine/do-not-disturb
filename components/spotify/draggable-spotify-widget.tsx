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
  getSpotifyConnectState,
  subscribeToSpotifyConnectState,
  SpotifyConnectState,
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
  importSpotifyPlaylistOrTrack,
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
  const [playlistError, setPlaylistError] = useState<string | null>(null);
  const [playlistErrorCode, setPlaylistErrorCode] = useState<string | null>(null);
  const fetchSeqRef = useRef<number>(0);
  const hasAutoSwitchedToPlaylistsRef = useRef<boolean>(false);

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
  const [connectState, setConnectState] = useState<SpotifyConnectState>(() =>
    getSpotifyConnectState()
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
    const seq = ++fetchSeqRef.current;
    setIsLoadingPlaylists(true);
    try {
      const data = await fetchSpotifyPlaylistsShared(forceRefresh);
      if (seq !== fetchSeqRef.current) return;
      setConnected(Boolean(data.connected));
      setSpotifyUser(data.user || null);
      setUserPlaylists(data.playlists);
      setPlaylistError(data.error || null);
      setPlaylistErrorCode(data.errorCode || null);

      if (
        (data.connected || data.playlists.length > 0) &&
        !hasAutoSwitchedToPlaylistsRef.current
      ) {
        hasAutoSwitchedToPlaylistsRef.current = true;
        setViewMode("playlists");
      }
    } catch {
      // offline / local fallback
    } finally {
      if (seq === fetchSeqRef.current) {
        setIsLoadingPlaylists(false);
      }
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
    const unsubConnect = subscribeToSpotifyConnectState((s) => setConnectState(s));
    const unsubPrefs = subscribeToSpotifyPreferences((p) => setPrefs(p));

    const handleOpenRequest = (e: Event) => {
      const detail = (e as CustomEvent<{ viewMode?: "tracks" | "playlists" }>).detail;
      if (detail?.viewMode) {
        setViewMode(detail.viewMode);
      }
      setIsOpen(true);
    };
    window.addEventListener(OPEN_SPOTIFY_WIDGET_EVENT, handleOpenRequest);

    const handleResize = () => {
      setPos((prev) => ({
        x: Math.max(10, Math.min(prev.x, window.innerWidth - 54)),
        y: Math.max(10, Math.min(prev.y, window.innerHeight - 54)),
      }));
    };
    window.addEventListener("resize", handleResize);

    // Avoid firing an unauthenticated request during the active OAuth callback code exchange
    const isActiveOAuthCallback =
      window.location.pathname === "/callback" &&
      window.location.search.includes("code=");
    if (!isActiveOAuthCallback) {
      fetchPlaylists(false);
    }

    const unsubAuth = subscribeToSpotifyAuthUpdates((payload) => {
      if (payload.connected) {
        setViewMode("playlists");
      }
      fetchPlaylists(true);
    });

    return () => {
      unsubTrack();
      unsubConnect();
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
  const handleSelectTrack = useCallback(
    (track: SpotifyTrackItem) => {
      const currentPrefs = getStoredSpotifyPreferences();
      const nextAudioSource =
        currentPrefs.audioSource === "both" ? "both" : "spotify";
      if (nextAudioSource === "spotify") {
        try {
          getSoundSynth().stop();
        } catch {}
      }
      saveStoredSpotifyPreferences({
        lastPlayedTrackUri: track.uri,
        audioSource: nextAudioSource,
      });
      // Only attach a playlist contextUri when the track was selected from an open playlist's track list
      const playlistContextUri = selectedPlaylistInfo?.id
        ? `spotify:playlist:${selectedPlaylistInfo.id}`
        : null;
      sendSpotifyCommand("play", track.uri, { contextUri: playlistContextUri });
      setCurrentPlayingTrack({
        title: track.title,
        artist: track.artist,
        source: "spotify",
        isPlaying: true,
        uri: track.uri,
        artworkUrl: track.imageUrl || currentPrefs.selectedPlaylistImage,
      });
    },
    [selectedPlaylistInfo]
  );

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
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawQuery = searchQuery.trim();
    if (!rawQuery) return;

    const parsed = parseSpotifyInputToUri(rawQuery);
    if (parsed) {
      setSearchQuery("");
      const currentPrefs = getStoredSpotifyPreferences();
      const nextAudioSource = currentPrefs.audioSource === "both" ? "both" : "spotify";
      if (nextAudioSource === "spotify") {
        try {
          getSoundSynth().stop();
        } catch {}
      }

      const imported = await importSpotifyPlaylistOrTrack(rawQuery);
      if (!imported) return;

      if (imported.type === "track") {
        sendSpotifyCommand("play", imported.uri);
        return;
      }

      if (imported.playlist) {
        const pl = imported.playlist;
        lastSyncedPlaylistUriRef.current = pl.uri;
        setUserPlaylists((prev) => [
          pl,
          ...prev.filter((item) => item.uri !== pl.uri && item.id !== pl.id),
        ]);
        if (imported.tracks.length > 0) {
          tracksCacheRef.current.set(pl.id, imported.tracks);
          setSelectedPlaylistInfo({ id: pl.id, name: pl.name });
          setPlaylistTracks(imported.tracks);
        }
        sendSpotifyCommand("play", pl.uri);
        setCurrentPlayingTrack({
          title: pl.name,
          artist: pl.ownerName,
          source: "spotify",
          isPlaying: true,
          uri: pl.uri,
          artworkUrl: pl.imageUrl,
        });
      }
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

  const isPlayingSpotify =
    Boolean(currentTrack.isPlaying) && currentTrack.source === "spotify";

  const handleTogglePlay = useCallback(() => {
    if (isPlayingSpotify) {
      sendSpotifyCommand("pause");
      setCurrentPlayingTrack({
        ...currentTrack,
        isPlaying: false,
      });
    } else {
      const targetUri =
        currentTrack.uri ||
        prefs.lastPlayedTrackUri ||
        prefs.selectedPlaylistUri ||
        CURATED_FOCUS_PLAYLISTS[0].uri;
      sendSpotifyCommand("play", targetUri);
      setCurrentPlayingTrack({
        ...currentTrack,
        title: currentTrack.title || prefs.selectedPlaylistName || "Deep Focus",
        artist: currentTrack.artist || prefs.selectedPlaylistOwner || "Spotify Focus",
        isPlaying: true,
        source: "spotify",
        uri: targetUri,
      });
    }
  }, [isPlayingSpotify, currentTrack, prefs]);

  const handleNextTrack = useCallback(() => {
    const list = baseTracks;
    if (list && list.length > 0) {
      const currentUri = currentTrack.uri || prefs.lastPlayedTrackUri;
      const currentIndex = list.findIndex((t) => t.uri === currentUri);
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % list.length : 0;
      const nextTrack = list[nextIndex];
      if (nextTrack) {
        handleSelectTrack(nextTrack);
        return;
      }
    }
    sendSpotifyCommand("next");
  }, [baseTracks, currentTrack.uri, prefs.lastPlayedTrackUri, handleSelectTrack]);

  const handlePrevTrack = useCallback(() => {
    const list = baseTracks;
    if (list && list.length > 0) {
      const currentUri = currentTrack.uri || prefs.lastPlayedTrackUri;
      const currentIndex = list.findIndex((t) => t.uri === currentUri);
      const prevIndex =
        currentIndex > 0 ? currentIndex - 1 : list.length - 1;
      const prevTrack = list[prevIndex];
      if (prevTrack) {
        handleSelectTrack(prevTrack);
        return;
      }
    }
    sendSpotifyCommand("prev");
  }, [baseTracks, currentTrack.uri, prefs.lastPlayedTrackUri, handleSelectTrack]);

  if (!isMounted) return null;

  // Position popover cleanly within viewport with increased height and comfortable width
  const popoverWidth = Math.min(
    330,
    typeof window !== "undefined" ? window.innerWidth - 24 : 330
  );
  const popoverHeight = Math.min(
    540,
    typeof window !== "undefined" ? window.innerHeight - 32 : 540
  );
  const isRightSide =
    pos.x > (typeof window !== "undefined" ? window.innerWidth / 2 : 500);
  const isBottomSide =
    pos.y > (typeof window !== "undefined" ? window.innerHeight / 2 : 500);

  const popoverLeft = isRightSide
    ? Math.max(12, pos.x - popoverWidth + 44)
    : Math.min(
        pos.x,
        (typeof window !== "undefined" ? window.innerWidth : 1000) -
          popoverWidth -
          12
      );

  const popoverTop = isBottomSide
    ? Math.max(12, pos.y - popoverHeight - 8)
    : Math.min(
        pos.y + 52,
        (typeof window !== "undefined" ? window.innerHeight : 800) -
          popoverHeight -
          12
      );

  return (
    <>
      {/* Equalizer CSS animations */}
      <style>{`
        @keyframes dnd-eq-1 { 0%, 100% { height: 4px; } 50% { height: 11px; } }
        @keyframes dnd-eq-2 { 0%, 100% { height: 12px; } 50% { height: 5px; } }
        @keyframes dnd-eq-3 { 0%, 100% { height: 5px; } 50% { height: 13px; } }
        .animate-eq-1 { animation: dnd-eq-1 0.7s ease-in-out infinite alternate; }
        .animate-eq-2 { animation: dnd-eq-2 0.5s ease-in-out infinite alternate; }
        .animate-eq-3 { animation: dnd-eq-3 0.9s ease-in-out infinite alternate; }
      `}</style>

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
          title="Focus Music (Click to open music, drag to move)"
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

      {/* Minimalist Popover Controller */}
      <div
        ref={popoverRef}
        style={{
          position: "fixed",
          left: `${popoverLeft}px`,
          top: `${popoverTop}px`,
          width: `${popoverWidth}px`,
          maxHeight: `${popoverHeight}px`,
          height: `${popoverHeight}px`,
          zIndex: 50,
          visibility: isOpen ? "visible" : "hidden",
        }}
        className={`flex flex-col rounded-2xl border shadow-2xl transition-all duration-200 backdrop-blur-xl overflow-hidden ${
          isOpen
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
        } ${
          isDark
            ? "bg-[#0c1017]/95 border-[#1e2736] text-[#f1f5f9]"
            : "bg-white/95 border-[#e2e8f0] text-[#0f172a]"
        }`}
      >
        {/* Minimalist Top Bar */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-inherit shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded-full bg-[#1DB954] flex items-center justify-center shrink-0">
              <svg className="w-3 h-3 text-black fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-semibold tracking-tight">Focus Music</span>
              <span className="text-[11px] text-[#64748b] dark:text-[#7e8c9f]">·</span>
              <span className="text-[11px] text-[#64748b] dark:text-[#7e8c9f] truncate">
                {isPlayingSpotify ? "Playing" : "Ready"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-xs text-[#64748b] hover:text-[#0f172a] dark:text-[#7e8c9f] dark:hover:text-[#f1f5f9] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close music player"
          >
            ✕
          </button>
        </div>

        {/* Compact Now-Playing Card & Transport Controls */}
        <div className="p-3 border-b border-inherit bg-black/[0.02] dark:bg-white/[0.02] shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#1c2432] shrink-0 border border-black/10 dark:border-white/10 flex items-center justify-center shadow-xs">
                {currentTrack.artworkUrl || prefs.selectedPlaylistImage ? (
                  <img
                    src={currentTrack.artworkUrl || prefs.selectedPlaylistImage || ""}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[#1DB954] text-sm font-bold">♫</span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold truncate leading-tight">
                  {currentTrack.title || prefs.selectedPlaylistName || "Deep Focus"}
                </div>
                <div className="text-[11px] text-[#64748b] dark:text-[#7e8c9f] truncate leading-tight mt-0.5">
                  {currentTrack.artist || "Spotify"}
                </div>
              </div>
            </div>

            {/* Inline Transport Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handlePrevTrack}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#64748b] dark:text-[#7e8c9f] hover:text-current hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                title="Previous track"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
                </svg>
              </button>

              <button
                type="button"
                onClick={handleTogglePlay}
                className="w-8 h-8 rounded-full flex items-center justify-center text-black font-bold transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
                style={{ backgroundColor: "#1DB954" }}
                title={isPlayingSpotify ? "Pause music" : "Play music"}
              >
                {isPlayingSpotify ? (
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 fill-current translate-x-0.5" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              <button
                type="button"
                onClick={handleNextTrack}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#64748b] dark:text-[#7e8c9f] hover:text-current hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                title="Next track"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="m6 18 8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Device Sync & Handoff Bar */}
        {connected && (
          <div className="px-3 py-1.5 border-b border-inherit bg-[#1DB954]/[0.06] flex items-center justify-between gap-2 text-[10.5px] shrink-0">
            {connectState.needsScopeUpgrade ? (
              <div className="flex items-center justify-between w-full gap-2">
                <span className="text-[#64748b] dark:text-[#94a3b8] truncate">
                  Control from your Spotify app:
                </span>
                <a
                  href="/api/spotify/auth"
                  className="font-semibold text-[#1DB954] hover:underline shrink-0"
                >
                  Enable sync →
                </a>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      connectState.activeDeviceName || connectState.sdkReady
                        ? "bg-[#1DB954]"
                        : "bg-[#64748b]"
                    }`}
                  />
                  <span className="truncate text-[#64748b] dark:text-[#94a3b8]">
                    {connectState.activeDeviceName
                      ? `Listening on ${connectState.activeDeviceName}`
                      : connectState.sdkReady
                      ? "Synced with Spotify app"
                      : connectState.premiumRequired
                      ? "Web player active (Spotify Free)"
                      : "Connected to Spotify"}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {connectState.sdkDeviceId &&
                    connectState.activeDeviceId &&
                    connectState.activeDeviceId !== connectState.sdkDeviceId && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!connectState.sdkDeviceId) return;
                          await fetch("/api/spotify/player", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              action: "transfer",
                              deviceId: connectState.sdkDeviceId,
                              play: true,
                            }),
                          });
                        }}
                        className="text-[#1DB954] font-semibold hover:underline cursor-pointer"
                        title="Play on this browser tab"
                      >
                        Play here
                      </button>
                    )}

                  <a
                    href={
                      currentTrack.uri?.startsWith("spotify:")
                        ? currentTrack.uri
                        : prefs.selectedPlaylistUri || "spotify:"
                    }
                    className="text-[#1DB954] font-semibold hover:underline"
                    title="Open in your Spotify app"
                  >
                    Open Spotify ↗
                  </a>
                </div>
              </>
            )}
          </div>
        )}

        {/* Minimalist Search & Mode Switcher */}
        <div className="p-2.5 border-b border-inherit flex items-center gap-2 shrink-0">
          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-0">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder={
                  viewMode === "tracks"
                    ? "Search songs or paste Spotify link..."
                    : "Search playlists or paste link..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-2.5 pr-6 py-1.5 text-xs rounded-lg border focus:outline-none transition-colors ${
                  isDark
                    ? "bg-[#101620] border-[#1d2634] text-white placeholder-[#64748b] focus:border-[#1DB954]"
                    : "bg-[#f8fafc] border-[#cbd5e1] text-[#0f172a] placeholder-[#94a3b8] focus:border-[#1DB954]"
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 text-xs text-[#64748b] hover:text-current cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </form>

          {/* Segmented Control */}
          <div className="flex rounded-lg border border-inherit p-0.5 shrink-0 bg-black/5 dark:bg-white/5">
            <button
              type="button"
              onClick={() => setViewMode("tracks")}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
                viewMode === "tracks"
                  ? "bg-[#1DB954] text-black font-semibold shadow-xs"
                  : "text-[#64748b] dark:text-[#7e8c9f] hover:text-current"
              }`}
            >
              Songs
            </button>
            <button
              type="button"
              onClick={() => setViewMode("playlists")}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
                viewMode === "playlists"
                  ? "bg-[#1DB954] text-black font-semibold shadow-xs"
                  : "text-[#64748b] dark:text-[#7e8c9f] hover:text-current"
              }`}
            >
              Playlists
            </button>
          </div>
        </div>

        {/* Sub-header when viewing a specific playlist's songs */}
        {viewMode === "tracks" && selectedPlaylistInfo && (
          <div className="px-3 py-1.5 bg-[#1DB954]/10 border-b border-inherit flex items-center justify-between gap-2 text-[10.5px] shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <button
                type="button"
                onClick={() => setViewMode("playlists")}
                className="text-[#64748b] dark:text-[#7e8c9f] hover:text-current cursor-pointer font-medium"
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
              title="Switch back to focus picks"
            >
              Focus picks
            </button>
          </div>
        )}

        {/* Scrollable Track / Playlist Selector: Takes all available remaining height smoothly */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-1">
          {viewMode === "tracks" ? (
            isLoadingTracks ? (
              <div className="py-12 text-center text-xs text-[#64748b] dark:text-[#7e8c9f]">
                Loading songs...
              </div>
            ) : filteredTracks.length === 0 ? (
              <div className="py-12 px-4 text-center text-xs text-[#64748b] dark:text-[#7e8c9f]">
                {searchQuery.trim()
                  ? "No songs match your search. Paste a Spotify link above to play it."
                  : "No songs available in this playlist yet."}
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
                    className={`w-full px-2.5 py-2 rounded-lg text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#1DB954]/15 border border-[#1DB954]/40"
                        : isDark
                        ? "hover:bg-white/5 border border-transparent"
                        : "hover:bg-black/5 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Equalizer or Note Icon */}
                      <span className="w-4 text-center shrink-0">
                        {isSelected && isPlayingSpotify ? (
                          <span className="flex items-center justify-center gap-0.5 h-3">
                            <span className="w-0.5 bg-[#1DB954] rounded-full animate-eq-1" />
                            <span className="w-0.5 bg-[#1DB954] rounded-full animate-eq-2" />
                            <span className="w-0.5 bg-[#1DB954] rounded-full animate-eq-3" />
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#64748b] dark:text-[#7e8c9f]">
                            {isSelected ? "▶" : "♪"}
                          </span>
                        )}
                      </span>

                      <div className="min-w-0">
                        <div
                          className={`text-xs truncate leading-tight ${
                            isSelected
                              ? "font-bold text-[#1DB954]"
                              : "font-medium"
                          }`}
                        >
                          {t.title}
                        </div>
                        <div className="text-[10.5px] text-[#64748b] dark:text-[#7e8c9f] truncate leading-tight mt-0.5">
                          {t.artist}
                          {t.category ? ` · ${t.category}` : ""}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] text-[#64748b] dark:text-[#7e8c9f] shrink-0 font-mono">
                      {t.duration || ""}
                    </span>
                  </button>
                );
              })
            )
          ) : (
            // PLAYLISTS VIEW: User Playlists + Curated Focus Playlists
            <div className="flex flex-col gap-3">
              {/* User Connected Playlists Section */}
              {(connected || userPlaylists.length > 0) && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between px-1 pt-1 pb-0.5 gap-1">
                    <span className="text-[10.5px] font-bold text-[#64748b] dark:text-[#7e8c9f] uppercase tracking-wider truncate">
                      Your Library {spotifyUser ? `· ${spotifyUser.displayName}` : ""}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-[#64748b] dark:text-[#7e8c9f]">
                        {userPlaylists.length} {userPlaylists.length === 1 ? "playlist" : "playlists"}
                      </span>
                      <button
                        type="button"
                        onClick={() => fetchPlaylists(true)}
                        disabled={isLoadingPlaylists}
                        title="Refresh playlists"
                        className="text-xs text-[#64748b] dark:text-[#7e8c9f] hover:text-[#1DB954] transition-colors cursor-pointer disabled:opacity-40"
                      >
                        {isLoadingPlaylists ? "…" : "↻"}
                      </button>
                    </div>
                  </div>

                  {isLoadingPlaylists && userPlaylists.length === 0 ? (
                    <div className="py-4 text-center text-xs text-[#64748b] dark:text-[#7e8c9f]">
                      Loading your playlists...
                    </div>
                  ) : filteredUserPlaylists.length === 0 ? (
                    <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-inherit text-center text-xs text-[#64748b] dark:text-[#7e8c9f] flex flex-col gap-1.5">
                      <span>
                        No playlists found. Paste any Spotify playlist link in the search bar above to add it.
                      </span>
                      <button
                        type="button"
                        onClick={() => fetchPlaylists(true)}
                        className="text-[#1DB954] font-semibold hover:underline cursor-pointer"
                      >
                        Refresh playlists ↻
                      </button>
                    </div>
                  ) : (
                    filteredUserPlaylists.map((pl) => {
                      const isSelected =
                        prefs.selectedPlaylistUri === pl.uri &&
                        !prefs.lastPlayedTrackUri;
                      return (
                        <div
                          key={pl.id}
                          className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between gap-2 transition-all ${
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
                            className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                          >
                            <div className="w-8 h-8 rounded-lg bg-[#1c2432] shrink-0 overflow-hidden flex items-center justify-center">
                              {pl.imageUrl ? (
                                <img
                                  src={pl.imageUrl}
                                  alt={pl.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-xs text-[#1DB954]">♫</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div
                                className={`text-xs truncate leading-tight ${
                                  isSelected
                                    ? "font-bold text-[#1DB954]"
                                    : "font-semibold"
                                }`}
                              >
                                {pl.name}
                              </div>
                              <div className="text-[10px] text-[#64748b] dark:text-[#7e8c9f] truncate leading-tight mt-0.5">
                                {pl.tracksTotal > 0
                                  ? `${pl.tracksTotal} ${pl.tracksTotal === 1 ? "track" : "tracks"}`
                                  : "Play playlist"}
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleViewPlaylistTracks(pl)}
                            className="px-2 py-1 rounded-md text-[10px] font-medium text-[#64748b] dark:text-[#7e8c9f] hover:text-[#1DB954] hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
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
                <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-inherit text-center flex flex-col gap-1.5">
                  <span className="text-xs text-[#64748b] dark:text-[#7e8c9f]">
                    Listen to your personal Spotify library
                  </span>
                  <Link
                    href="/connected-apps"
                    className="text-xs font-semibold text-[#1DB954] hover:underline"
                  >
                    Connect Spotify account →
                  </Link>
                </div>
              )}

              {/* Curated Focus Playlists Section */}
              <div className="flex flex-col gap-1.5 pt-1 border-t border-inherit">
                <span className="text-[10.5px] font-bold text-[#64748b] dark:text-[#7e8c9f] uppercase tracking-wider px-1">
                  Focus Soundtracks
                </span>
                {filteredCuratedPlaylists.map((pl) => {
                  const isSelected =
                    prefs.selectedPlaylistUri === pl.uri &&
                    !prefs.lastPlayedTrackUri;
                  return (
                    <div
                      key={pl.id}
                      className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between gap-2 transition-all ${
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
                        className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#1c2432] shrink-0 overflow-hidden flex items-center justify-center">
                          {pl.imageUrl ? (
                            <img
                              src={pl.imageUrl}
                              alt={pl.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs text-[#1DB954]">♫</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div
                            className={`text-xs truncate leading-tight ${
                              isSelected
                                ? "font-bold text-[#1DB954]"
                                : "font-semibold"
                            }`}
                          >
                            {pl.name}
                          </div>
                          <div className="text-[10px] text-[#64748b] dark:text-[#7e8c9f] truncate leading-tight mt-0.5">
                            {pl.description}
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleViewPlaylistTracks(pl)}
                        className="px-2 py-1 rounded-md text-[10px] font-medium text-[#64748b] dark:text-[#7e8c9f] hover:text-[#1DB954] hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
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

        {/* Toggleable Web Player Drawer */}
        <div className="border-t border-inherit px-3 py-2 flex items-center justify-between text-[11px] shrink-0 bg-black/[0.02] dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={() => setShowNativeEmbed((prev) => !prev)}
            className="text-[#64748b] dark:text-[#7e8c9f] hover:text-[#1DB954] transition-colors cursor-pointer font-medium flex items-center gap-1"
          >
            <span>{showNativeEmbed ? "Hide web player" : "Show web player"}</span>
            <span className="text-[10px]">{showNativeEmbed ? "▲" : "▼"}</span>
          </button>
          <span className="text-[10px] text-[#64748b] dark:text-[#7e8c9f] truncate max-w-[150px]">
            {prefs.selectedPlaylistName || "Deep Focus"}
          </span>
        </div>

        {/* Web Player Container: Always mounted so audio engine, Web Playback SDK, Connect sync, and Embed controller remain active */}
        <div
          className={
            showNativeEmbed
              ? "px-2.5 pb-2.5 shrink-0"
              : "w-0 h-0 opacity-0 overflow-hidden absolute pointer-events-none -z-10"
          }
          aria-hidden={!showNativeEmbed}
        >
          <SpotifyFocusPlayer compact embedOnly />
        </div>
      </div>
    </>
  );
}
