"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useTheme } from "../../context/theme-context";
import { useTimer } from "../../context/timer-context";
import { useSync } from "../../context/sync-context";
import { useTour } from "../../context/tour-context";
import { useExtensionStatus } from "../../lib/blocking/use-extension-status";
import { getStoredBlocklist } from "../../lib/blocking/blocklist-store";
import { getSoundSynth, AcousticPreset, ACOUSTIC_PRESETS, isPresetUnlocked } from "../../lib/sound/sound-synth";
import { getStoredGamification } from "../../lib/gamification/gamification-store";
import {
  getStoredSettings,
  saveStoredSettings,
  subscribeToSettings,
  DEFAULT_SETTINGS,
} from "../../lib/settings/settings-store";
import {
  SpotifyStoredPreference,
  SpotifyPlaylistItem,
  CURATED_FOCUS_PLAYLISTS,
  DEFAULT_SPOTIFY_PREFS,
  getStoredSpotifyPreferences,
  saveStoredSpotifyPreferences,
  subscribeToSpotifyPreferences,
  fetchSpotifyPlaylistsShared,
  subscribeToSpotifyAuthUpdates,
} from "../../lib/spotify/spotify-store";
import { switchAudioSource } from "../../lib/sound/audio-coordinator";
import { useCloseOnEscape } from "../../lib/overlays/use-close-on-escape";

export default function SettingsPage() {
  const { isDark } = useTheme();
  const { mode, isRunning, colors, allModeColors, activeColor, activeBorder } = useTimer();
  const { storageMode, user, openSyncModal } = useSync();
  const { startTour, resetTourStatus, hasSeenTour } = useTour();
  const [tourResetNotice, setTourResetNotice] = useState<string | null>(null);

  // Settings states initialized with defaults to prevent SSR hydration mismatch
  const [deepFocusMins, setDeepFocusMins] = useState<number>(DEFAULT_SETTINGS.deepFocusMinutes);
  const [shortBreakMins, setShortBreakMins] = useState<number>(DEFAULT_SETTINGS.shortBreakMinutes);
  const [longBreakMins, setLongBreakMins] = useState<number>(DEFAULT_SETTINGS.longBreakMinutes);
  const [longBreakCadence, setLongBreakCadence] = useState<number>(DEFAULT_SETTINGS.longBreakCadence);
  const [autoStartBreaks, setAutoStartBreaks] = useState<boolean>(DEFAULT_SETTINGS.autoStartBreaks);
  const [autoStartFocus, setAutoStartFocus] = useState<boolean>(DEFAULT_SETTINGS.autoStartFocus);
  const [strictBlocking, setStrictBlocking] = useState<"suspend" | "strict">(
    DEFAULT_SETTINGS.strictBlocking === "SUSPEND" ? "suspend" : "strict"
  );
  const [acousticPreset, setAcousticPreset] = useState<AcousticPreset>(DEFAULT_SETTINGS.acousticPreset as AcousticPreset);
  const [bgAmbience, setBgAmbience] = useState<number>(DEFAULT_SETTINGS.bgAmbienceVolume);
  const [completionChime, setCompletionChime] = useState<boolean>(DEFAULT_SETTINGS.completionChime);
  const [autoPlayAudio, setAutoPlayAudio] = useState<boolean>(DEFAULT_SETTINGS.autoPlayAudio);
  const [isRecompiling, setIsRecompiling] = useState<boolean>(false);
  const [isPreviewingAudio, setIsPreviewingAudio] = useState<boolean>(false);
  const [isPlayingChime, setIsPlayingChime] = useState<boolean>(false);
  const [blockedCount, setBlockedCount] = useState<number>(0);
  const [localDataKb, setLocalDataKb] = useState<string>("0.0 KB");
  const [userLevel, setUserLevel] = useState<number>(1);
  const [spotifyPrefs, setSpotifyPrefs] = useState<SpotifyStoredPreference>(DEFAULT_SPOTIFY_PREFS);
  const [userPlaylists, setUserPlaylists] = useState<SpotifyPlaylistItem[]>([]);
  const [isSpotifyConnected, setIsSpotifyConnected] = useState<boolean>(false);
  const [isLoadingUserPlaylists, setIsLoadingUserPlaylists] = useState<boolean>(false);
  const [isPlaylistsModalOpen, setIsPlaylistsModalOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isLoadedRef = useRef<boolean>(false);

  useCloseOnEscape(isPlaylistsModalOpen, () => setIsPlaylistsModalOpen(false));

  const loadSpotifyData = async (forceRefresh = false) => {
    setIsLoadingUserPlaylists(true);
    try {
      const data = await fetchSpotifyPlaylistsShared(forceRefresh);
      setIsSpotifyConnected(Boolean(data.connected));
      setUserPlaylists(data.playlists);
    } catch {
      // Quietly ignore in offline mode
    } finally {
      setIsLoadingUserPlaylists(false);
    }
  };

  useEffect(() => {
    setSpotifyPrefs(getStoredSpotifyPreferences());
    const unsub = subscribeToSpotifyPreferences((updated) => {
      setSpotifyPrefs(updated);
    });

    loadSpotifyData(false);

    const unsubAuth = subscribeToSpotifyAuthUpdates(() => {
      loadSpotifyData(true);
    });

    return () => {
      unsub();
      unsubAuth();
    };
  }, []);

  const handleSelectPlaylist = (pl: SpotifyPlaylistItem) => {
    if (isPreviewingAudio) {
      getSoundSynth().stop();
      setIsPreviewingAudio(false);
    } else {
      try {
        getSoundSynth().stop();
      } catch {}
    }
    saveStoredSpotifyPreferences({
      selectedPlaylistUri: pl.uri,
      selectedPlaylistName: pl.name,
      selectedPlaylistImage: pl.imageUrl,
      selectedPlaylistOwner: pl.ownerName,
      audioSource: "spotify",
      lastPlayedTrackUri: null,
    });
  };

  // Hydrate settings and gamification from storage on client mount & subscribe to updates
  useEffect(() => {
    const initial = getStoredSettings();
    setDeepFocusMins(initial.deepFocusMinutes);
    setShortBreakMins(initial.shortBreakMinutes);
    setLongBreakMins(initial.longBreakMinutes);
    setLongBreakCadence(initial.longBreakCadence);
    setAutoStartBreaks(initial.autoStartBreaks);
    setAutoStartFocus(initial.autoStartFocus);
    setStrictBlocking(initial.strictBlocking === "SUSPEND" ? "suspend" : "strict");
    setAcousticPreset(initial.acousticPreset as AcousticPreset);
    setBgAmbience(initial.bgAmbienceVolume);
    setCompletionChime(initial.completionChime);
    setAutoPlayAudio(initial.autoPlayAudio);

    setUserLevel(getStoredGamification().level);

    // Defer enabling saving until after the initial stored values are committed to state
    const timer = setTimeout(() => {
      isLoadedRef.current = true;
    }, 0);

    const unsubscribe = subscribeToSettings((newSettings) => {
      setDeepFocusMins((prev) => (prev !== newSettings.deepFocusMinutes ? newSettings.deepFocusMinutes : prev));
      setShortBreakMins((prev) => (prev !== newSettings.shortBreakMinutes ? newSettings.shortBreakMinutes : prev));
      setLongBreakMins((prev) => (prev !== newSettings.longBreakMinutes ? newSettings.longBreakMinutes : prev));
      setLongBreakCadence((prev) => (prev !== newSettings.longBreakCadence ? newSettings.longBreakCadence : prev));
      setAutoStartBreaks((prev) => (prev !== newSettings.autoStartBreaks ? newSettings.autoStartBreaks : prev));
      setAutoStartFocus((prev) => (prev !== newSettings.autoStartFocus ? newSettings.autoStartFocus : prev));
      const nextStrict = newSettings.strictBlocking === "SUSPEND" ? "suspend" : "strict";
      setStrictBlocking((prev) => (prev !== nextStrict ? nextStrict : prev));
      setAcousticPreset((prev) => (prev !== newSettings.acousticPreset ? (newSettings.acousticPreset as AcousticPreset) : prev));
      setBgAmbience((prev) => (prev !== newSettings.bgAmbienceVolume ? newSettings.bgAmbienceVolume : prev));
      setCompletionChime((prev) => (prev !== newSettings.completionChime ? newSettings.completionChime : prev));
      setAutoPlayAudio((prev) => (prev !== newSettings.autoPlayAudio ? newSettings.autoPlayAudio : prev));
    });

    const handleGamification = () => {
      setUserLevel(getStoredGamification().level);
    };
    window.addEventListener("dnd-gamification-updated" as any, handleGamification);

    return () => {
      clearTimeout(timer);
      unsubscribe();
      window.removeEventListener("dnd-gamification-updated" as any, handleGamification);
    };
  }, []);

  // Save settings whenever user modifies any field
  useEffect(() => {
    if (!isLoadedRef.current || typeof window === "undefined") return;
    saveStoredSettings({
      deepFocusMinutes: deepFocusMins,
      shortBreakMinutes: shortBreakMins,
      longBreakMinutes: longBreakMins,
      longBreakCadence,
      autoStartBreaks,
      autoStartFocus,
      strictBlocking: (strictBlocking === "strict" ? "STRICT" : "SUSPEND") as "STRICT" | "SUSPEND",
      acousticPreset,
      bgAmbienceVolume: bgAmbience,
      completionChime,
      autoPlayAudio,
    });
  }, [
    deepFocusMins,
    shortBreakMins,
    longBreakMins,
    longBreakCadence,
    autoStartBreaks,
    autoStartFocus,
    strictBlocking,
    acousticPreset,
    bgAmbience,
    completionChime,
    autoPlayAudio,
  ]);

  const isRunningRef = useRef(isRunning);
  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  // Clean up audio playback when navigating away (only if timer is not actively running)
  useEffect(() => {
    return () => {
      if (!isRunningRef.current) {
        const synth = getSoundSynth();
        synth.stop();
      }
    };
  }, []);

  const handleTogglePreviewAudio = () => {
    const synth = getSoundSynth();
    if (isPreviewingAudio) {
      synth.stop();
      setIsPreviewingAudio(false);
    } else {
      const ok = synth.playPreset(acousticPreset, bgAmbience);
      if (ok) {
        setIsPreviewingAudio(true);
      }
    }
  };

  const handleSelectPreset = (preset: AcousticPreset) => {
    setAcousticPreset(preset);
    // Explicitly set audioSource to "ambient" and pause Spotify if playing
    switchAudioSource("ambient");
    setSpotifyPrefs(getStoredSpotifyPreferences());
    if (isPreviewingAudio) {
      const synth = getSoundSynth();
      synth.playPreset(preset, bgAmbience);
    }
  };

  const handleToggleAutoPlayAudio = () => {
    const nextVal = !autoPlayAudio;
    setAutoPlayAudio(nextVal);
    saveStoredSettings({
      autoPlayAudio: nextVal,
    });
    const updated = saveStoredSpotifyPreferences({
      autoPlayOnFocus: nextVal,
    });
    setSpotifyPrefs(updated);
  };

  const handleVolumeChange = (newVolume: number) => {
    setBgAmbience(newVolume);
    if (isPreviewingAudio) {
      const synth = getSoundSynth();
      synth.setVolume(newVolume);
    }
  };

  const handlePreviewChime = () => {
    const synth = getSoundSynth();
    synth.playChime(bgAmbience);
    setIsPlayingChime(true);
    setTimeout(() => {
      setIsPlayingChime(false);
    }, 2800);
  };

  const { isInstalled, isBlockingActive, ruleCount, refresh: refreshExtension } = useExtensionStatus();

  useEffect(() => {
    const refreshData = () => {
      setBlockedCount(getStoredBlocklist().filter((e) => e.active).length);

      if (typeof window !== "undefined") {
        let totalBytes = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key) continue;
          const val = localStorage.getItem(key) || "";
          totalBytes += new Blob([key, val]).size;
        }
        setLocalDataKb(`${(totalBytes / 1024).toFixed(1)} KB`);
      }
    };

    refreshData();
    window.addEventListener("dnd-blocklist-updated" as any, refreshData);
    return () => {
      window.removeEventListener("dnd-blocklist-updated" as any, refreshData);
    };
  }, []);

  const handleExportJSON = () => {
    const config = {
      version: "2.4.1",
      currentSessionMode: mode,
      deepFocusMins,
      shortBreakMins,
      longBreakMins,
      longBreakCadence,
      autoStartBreaks,
      autoStartFocus,
      strictBlocking,
      acousticPreset,
      bgAmbience,
      completionChime,
      autoPlayAudio,
      spotifyPrefs: getStoredSpotifyPreferences(),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dnd-settings-export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetDefaults = () => {
    if (confirm("Reset all settings and active local cache back to factory defaults?")) {
      saveStoredSettings(DEFAULT_SETTINGS);
      saveStoredSpotifyPreferences(DEFAULT_SPOTIFY_PREFS);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        saveStoredSettings({
          deepFocusMinutes: typeof parsed.deepFocusMinutes === "number" ? parsed.deepFocusMinutes : (typeof parsed.deepFocusMins === "number" ? parsed.deepFocusMins : undefined),
          shortBreakMinutes: typeof parsed.shortBreakMinutes === "number" ? parsed.shortBreakMinutes : (typeof parsed.shortBreakMins === "number" ? parsed.shortBreakMins : undefined),
          longBreakMinutes: typeof parsed.longBreakMinutes === "number" ? parsed.longBreakMinutes : (typeof parsed.longBreakMins === "number" ? parsed.longBreakMins : undefined),
          longBreakCadence: typeof parsed.longBreakCadence === "number" ? parsed.longBreakCadence : undefined,
          autoStartBreaks: typeof parsed.autoStartBreaks === "boolean" ? parsed.autoStartBreaks : undefined,
          autoStartFocus: typeof parsed.autoStartFocus === "boolean" ? parsed.autoStartFocus : undefined,
          strictBlocking: parsed.strictBlocking ? (parsed.strictBlocking.toLowerCase() === "strict" ? "STRICT" : "SUSPEND") : undefined,
          acousticPreset: parsed.acousticPreset,
          bgAmbienceVolume: typeof parsed.bgAmbienceVolume === "number" ? parsed.bgAmbienceVolume : (typeof parsed.bgAmbience === "number" ? parsed.bgAmbience : undefined),
          completionChime: typeof parsed.completionChime === "boolean" ? parsed.completionChime : undefined,
          autoPlayAudio: typeof parsed.autoPlayAudio === "boolean" ? parsed.autoPlayAudio : (typeof parsed.autoPlayOnFocus === "boolean" ? parsed.autoPlayOnFocus : undefined),
        });
        if (parsed.spotifyPrefs && typeof parsed.spotifyPrefs === "object") {
          saveStoredSpotifyPreferences(parsed.spotifyPrefs);
        }
      } catch (err) {
        alert("Failed to parse settings JSON file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <main className="max-w-[1360px] w-full mx-auto px-4 py-5 sm:p-6 md:p-8 flex flex-col gap-5 sm:gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0f172a] dark:text-white">
            Preferences &amp; Settings
          </h1>
          <p className="text-xs mt-1 text-[#64748b] dark:text-[#7e8c9f]">
            Customize your timer length, website blocking rules, and sound preferences.
          </p>
        </div>

        {/* Sync Button */}
        <button
          onClick={openSyncModal}
          type="button"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs w-max transition-all cursor-pointer bg-[#f8fafc] dark:bg-[#0b0f17] border-[#e2e8f0] dark:border-[#1d2634] text-[#64748b] dark:text-[#7e8c9f]"
          style={{
            borderColor: storageMode === "cloud" ? activeBorder : undefined,
          }}
        >
          <svg
            className="w-3.5 h-3.5"
            style={{ color: activeColor }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
          </svg>
          <span>
            {storageMode === "cloud"
              ? `Synced (${user?.email})`
              : "Saved locally"}
          </span>
          <span className="text-[10px] font-medium underline ml-1" style={{ color: activeColor }}>
            {storageMode === "cloud" ? "Manage" : "Sync →"}
          </span>
        </button>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* LEFT COLUMN: Cadence, Rules & Acoustics */}
        <div className="lg:col-span-8 flex flex-col gap-5 sm:gap-6">
          {/* 1. Timer Durations Card with Distinct Colors for Each Mode */}
          <div className="p-4 sm:p-6 md:p-7 rounded-2xl border transition-colors bg-white dark:bg-[#101620] border-[#e2e8f0] dark:border-[#1d2634] text-[#0f172a] dark:text-[#f1f5f9] shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: isDark ? colors.containerDark : colors.container,
                    color: activeColor,
                  }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-bold tracking-tight text-[#0f172a] dark:text-white">
                    Timer Durations
                  </h2>
                  <p className="text-xs text-[#64748b] dark:text-[#7e8c9f]">
                    Choose how long you want to focus and rest
                  </p>
                </div>
              </div>
            </div>

            {/* 2x2 Grid of Timer Durations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Deep Focus Duration (Teal Mode Palette) */}
              <div className="p-4 rounded-xl border transition-colors bg-[#f8fafc] dark:bg-[#0b0f17] border-[#e2e8f0] dark:border-[#1d2634]">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-[#0f766e] dark:text-[#64ffda]">
                    Deep Focus
                  </span>
                  <span className="font-bold text-[#0f766e] dark:text-[#64ffda] text-sm font-mono">
                    {deepFocusMins} min
                  </span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="90"
                  step="5"
                  aria-label="Deep Focus duration"
                  value={deepFocusMins}
                  onChange={(e) => setDeepFocusMins(parseInt(e.target.value))}
                  className="w-full h-1.5 rounded-lg cursor-pointer mb-1.5 bg-[#e2e8f0] dark:bg-[#1c2432]"
                  style={{ accentColor: isDark ? allModeColors.focus.primaryDark : allModeColors.focus.primary }}
                />
                <div className="flex justify-between text-[10px] text-[#64748b] dark:text-[#7e8c9f]">
                  <span>15m</span>
                  <span>45m</span>
                  <span>90m</span>
                </div>
              </div>

              {/* Short Break Duration (Sky Cyan Mode Palette) */}
              <div className="p-4 rounded-xl border transition-colors bg-[#f8fafc] dark:bg-[#0b0f17] border-[#e2e8f0] dark:border-[#1d2634]">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-sky-600 dark:text-[#38bdf8]">
                    Short Break
                  </span>
                  <span className="font-bold text-sky-600 dark:text-[#38bdf8] text-sm font-mono">
                    {shortBreakMins} min
                  </span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="15"
                  step="1"
                  aria-label="Short break duration"
                  value={shortBreakMins}
                  onChange={(e) => setShortBreakMins(parseInt(e.target.value))}
                  className="w-full h-1.5 rounded-lg cursor-pointer mb-1.5 bg-[#e2e8f0] dark:bg-[#1c2432]"
                  style={{ accentColor: isDark ? allModeColors.shortBreak.primaryDark : allModeColors.shortBreak.primary }}
                />
                <div className="flex justify-between text-[10px] text-[#64748b] dark:text-[#7e8c9f]">
                  <span>3m</span>
                  <span>10m</span>
                  <span>15m</span>
                </div>
              </div>

              {/* Long Break Duration (Terracotta Coral Mode Palette) */}
              <div className="p-4 rounded-xl border transition-colors bg-[#f8fafc] dark:bg-[#0b0f17] border-[#e2e8f0] dark:border-[#1d2634]">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-orange-600 dark:text-[#fb923c]">
                    Long Break
                  </span>
                  <span className="font-bold text-orange-600 dark:text-[#fb923c] text-sm font-mono">
                    {longBreakMins} min
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="45"
                  step="5"
                  aria-label="Long break duration"
                  value={longBreakMins}
                  onChange={(e) => setLongBreakMins(parseInt(e.target.value))}
                  className="w-full h-1.5 rounded-lg cursor-pointer mb-1.5 bg-[#e2e8f0] dark:bg-[#1c2432]"
                  style={{ accentColor: isDark ? allModeColors.longBreak.primaryDark : allModeColors.longBreak.primary }}
                />
                <div className="flex justify-between text-[10px] text-[#64748b] dark:text-[#7e8c9f]">
                  <span>10m</span>
                  <span>25m</span>
                  <span>45m</span>
                </div>
              </div>

              {/* Long Break Cadence */}
              <div className="p-4 rounded-xl border flex flex-col justify-between transition-colors bg-[#f8fafc] dark:bg-[#0b0f17] border-[#e2e8f0] dark:border-[#1d2634]">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-medium text-[#64748b] dark:text-[#7e8c9f]">
                    Long Break Frequency
                  </span>
                  <span className="text-[11px] text-[#64748b] dark:text-[#7e8c9f]">
                    sessions
                  </span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded-lg border bg-white dark:bg-[#141b24] border-[#cbd5e1] dark:border-[#1d2634]">
                  <button
                    onClick={() => setLongBreakCadence((c) => Math.max(2, c - 1))}
                    aria-label="Decrease long break cadence"
                    className="w-7 h-7 rounded flex items-center justify-center font-bold text-sm transition-all duration-150 hover:scale-110 active:scale-90 cursor-pointer focus-visible:ring-2 focus-visible:outline-none bg-[#f1f5f9] dark:bg-[#1c2432] text-[#0f172a] dark:text-white hover:bg-[#e2e8f0] dark:hover:bg-[#283548] border border-[#cbd5e1] dark:border-transparent"
                    style={{ outlineColor: activeColor }}
                  >
                    −
                  </button>
                  <span className="text-xs font-semibold text-[#0f172a] dark:text-white">
                    Every <span style={{ color: activeColor }}>{longBreakCadence}</span> focus sessions
                  </span>
                  <button
                    onClick={() => setLongBreakCadence((c) => Math.min(8, c + 1))}
                    aria-label="Increase long break cadence"
                    className="w-7 h-7 rounded flex items-center justify-center font-bold text-sm transition-all duration-150 hover:scale-110 active:scale-90 cursor-pointer focus-visible:ring-2 focus-visible:outline-none bg-[#f1f5f9] dark:bg-[#1c2432] text-[#0f172a] dark:text-white hover:bg-[#e2e8f0] dark:hover:bg-[#283548] border border-[#cbd5e1] dark:border-transparent"
                    style={{ outlineColor: activeColor }}
                  >
                    +
                  </button>
                </div>
                <span className="text-[10px] mt-1.5 text-center text-[#64748b] dark:text-[#7e8c9f]">
                  Recommended: Take a longer break after 4 focus sessions
                </span>
              </div>
            </div>
          </div>

          {/* 2. Blocking & Transitions Card */}
          <div className="p-4 sm:p-6 md:p-7 rounded-2xl border transition-colors bg-white dark:bg-[#101620] border-[#e2e8f0] dark:border-[#1d2634] text-[#0f172a] dark:text-[#f1f5f9] shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{
                  backgroundColor: isDark ? colors.containerDark : colors.container,
                  color: activeColor,
                }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="5" width="22" height="14" rx="7" ry="7" />
                  <circle cx="16" cy="12" r="3" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-tight text-[#0f172a] dark:text-white">
                  Blocking &amp; Transitions
                </h2>
                <p className="text-xs text-[#64748b] dark:text-[#7e8c9f]">
                  How the timer and blocker behave between sessions
                </p>
              </div>
            </div>

            <div className="flex flex-col divide-y divide-[#e2e8f0] dark:divide-[#1d2634] gap-4">
              {/* Item 1: Auto-start Breaks */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <h3 className="text-xs font-semibold text-[#0f172a] dark:text-white">
                    Auto-start Breaks
                  </h3>
                  <p className="text-[11px] mt-0.5 text-[#64748b] dark:text-[#7e8c9f]">
                    Start break timer automatically when your focus session ends
                  </p>
                </div>
                <button
                  onClick={() => setAutoStartBreaks(!autoStartBreaks)}
                  aria-label="Toggle auto-start breaks"
                  className="w-11 h-6 rounded-xl transition-all duration-200 relative flex items-center p-0.5 focus-visible:ring-2 focus-visible:outline-none cursor-pointer active:scale-95 bg-[#cbd5e1] dark:bg-[#1c2432]"
                  style={{
                    backgroundColor: autoStartBreaks ? activeColor : undefined,
                    outlineColor: activeColor,
                  }}
                >
                  <span
                    className={`w-5 h-5 rounded-lg transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                      autoStartBreaks
                        ? isDark
                          ? "translate-x-5 bg-[#0c1017]"
                          : "translate-x-5 bg-white shadow-sm"
                        : "translate-x-0 bg-[#7e8c9f] dark:bg-[#7e8c9f]"
                    }`}
                  />
                </button>
              </div>

              {/* Item 2: Auto-start Next Focus Session */}
              <div className="flex items-center justify-between pt-4">
                <div>
                  <h3 className="text-xs font-semibold text-[#0f172a] dark:text-white">
                    Auto-start Next Focus Session
                  </h3>
                  <p className="text-[11px] mt-0.5 text-[#64748b] dark:text-[#7e8c9f]">
                    Jump straight into the next focus session once your break is over
                  </p>
                </div>
                <button
                  onClick={() => setAutoStartFocus(!autoStartFocus)}
                  aria-label="Toggle auto-start next focus session"
                  className="w-11 h-6 rounded-xl transition-all duration-200 relative flex items-center p-0.5 focus-visible:ring-2 focus-visible:outline-none cursor-pointer active:scale-95 bg-[#cbd5e1] dark:bg-[#1c2432]"
                  style={{
                    backgroundColor: autoStartFocus ? activeColor : undefined,
                    outlineColor: activeColor,
                  }}
                >
                  <span
                    className={`w-5 h-5 rounded-lg transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                      autoStartFocus
                        ? isDark
                          ? "translate-x-5 bg-[#0c1017]"
                          : "translate-x-5 bg-white shadow-sm"
                        : "translate-x-0 bg-[#7e8c9f] dark:bg-[#7e8c9f]"
                    }`}
                  />
                </button>
              </div>

              {/* Item 3: Strict Blocking During Pause */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4">
                <div>
                  <div>
                    <h3 className="text-xs font-semibold text-[#0f172a] dark:text-white">
                      Strict Blocking During Pause
                    </h3>
                  </div>
                  <p className="text-[11px] mt-0.5 text-[#64748b] dark:text-[#7e8c9f]">
                    Should blocked websites stay blocked even if you pause the timer?
                  </p>
                </div>
                <div className="flex items-center p-1 rounded-xl border bg-[#f1f5f9] dark:bg-[#0b0f17] border-[#cbd5e1] dark:border-[#1d2634]">
                  <button
                    onClick={() => setStrictBlocking("suspend")}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all focus-visible:ring-2 focus-visible:outline-none ${
                      strictBlocking === "suspend"
                        ? "bg-white text-[#0f172a] shadow-sm dark:bg-[#1c2432] dark:text-white"
                        : "text-[#64748b] hover:text-[#0f172a] dark:text-[#7e8c9f] dark:hover:text-white"
                    }`}
                    style={{ outlineColor: activeColor }}
                  >
                    Allow browsing
                  </button>
                  <button
                    onClick={() => setStrictBlocking("strict")}
                    className="px-3 py-1 rounded-lg text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:outline-none"
                    style={
                      strictBlocking === "strict"
                        ? {
                            backgroundColor: isDark ? colors.containerDark : colors.container,
                            color: activeColor,
                          }
                        : isDark
                        ? { color: "#7e8c9f" }
                        : { color: "#64748b" }
                    }
                  >
                    Keep blocking
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Sounds & Ambience Card */}
          <div
            id="sounds"
            className="p-4 sm:p-6 md:p-7 rounded-2xl border transition-colors bg-white dark:bg-[#101620] border-[#e2e8f0] dark:border-[#1d2634] text-[#0f172a] dark:text-[#f1f5f9] shadow-sm flex flex-col gap-5"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0"
                  style={{
                    backgroundColor: isDark ? colors.containerDark : colors.container,
                    color: activeColor,
                  }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-bold tracking-tight text-[#0f172a] dark:text-white">
                    Sounds &amp; Ambience
                  </h2>
                  <p className="text-xs text-[#64748b] dark:text-[#7e8c9f]">
                    Keep your space quiet, or play a single gentle sound while you work
                  </p>
                </div>
              </div>
              <button
                onClick={handleTogglePreviewAudio}
                type="button"
                className="text-xs font-medium transition-opacity hover:opacity-80 cursor-pointer shrink-0"
                style={{ color: activeColor }}
              >
                {isPreviewingAudio ? "Stop preview" : "Preview sound"}
              </button>
            </div>

            {/* Ambient Soundscapes Carousel */}
            <div className="overflow-x-auto pb-1 -mx-1 px-1 flex gap-3 no-scrollbar scroll-smooth">
              {[
                {
                  id: "rain" as AcousticPreset,
                  name: "Gentle Rain",
                  desc: "Soft rainfall",
                  img: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=600&q=80",
                },
                {
                  id: "binaural" as AcousticPreset,
                  name: "Focus Beats",
                  desc: "Steady, calm rhythm",
                  img: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
                },
                {
                  id: "space" as AcousticPreset,
                  name: "Deep Space",
                  desc: "Blocks out room noise",
                  img: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=600&q=80",
                },
                {
                  id: "campfire" as AcousticPreset,
                  name: "Warm Fire",
                  desc: "Quiet fireplace crackle",
                  img: "https://images.unsplash.com/photo-1475483768296-6163e08872a1?auto=format&fit=crop&w=600&q=80",
                },
                {
                  id: "cafe" as AcousticPreset,
                  name: "Quiet Café",
                  desc: "Soft background hum",
                  img: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80",
                },
                {
                  id: "waves" as AcousticPreset,
                  name: "Ocean Waves",
                  desc: "Slow coastal tide",
                  img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
                },
                {
                  id: "whitenoise" as AcousticPreset,
                  name: "Soft Static",
                  desc: "Warm background hush",
                  img: "https://images.unsplash.com/photo-1432821596592-e2c18b78144f?auto=format&fit=crop&w=600&q=80",
                },
                {
                  id: "forest" as AcousticPreset,
                  name: "Forest Breeze",
                  desc: "Wind through the trees",
                  img: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80",
                },
                {
                  id: "singingbowl" as AcousticPreset,
                  name: "Singing Bowl",
                  desc: "Calm, resonant tone",
                  img: "https://images.unsplash.com/photo-1512438248247-f0f2a5a8b7f0?auto=format&fit=crop&w=600&q=80",
                },
                {
                  id: "cybergrid" as AcousticPreset,
                  name: "Night Synth",
                  desc: "Warm electronic flow",
                  img: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=600&q=80",
                },
              ].map((item) => {
                const unlocked = isPresetUnlocked(item.id, userLevel);
                const isSelected = acousticPreset === item.id;
                const info = ACOUSTIC_PRESETS[item.id];

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (!unlocked) {
                        alert(`Unlocks at Level ${info?.unlockLevel}. Keep focusing to unlock this sound.`);
                        return;
                      }
                      handleSelectPreset(item.id);
                    }}
                    className={`min-w-[160px] max-w-[180px] shrink-0 rounded-xl border transition-all relative overflow-hidden group flex flex-col ${
                      isSelected
                        ? "border-current"
                        : unlocked
                        ? "bg-[#f8fafc] dark:bg-[#0b0f17] border-[#e2e8f0] dark:border-[#1d2634] hover:border-[#cbd5e1] dark:hover:border-[#283548] cursor-pointer"
                        : "bg-[#f1f5f9]/60 dark:bg-[#0b0f17]/40 border-[#e2e8f0] dark:border-[#1d2634] opacity-65 cursor-not-allowed"
                    }`}
                    style={
                      isSelected
                        ? {
                            backgroundColor: isDark ? colors.containerDark : colors.container,
                            borderColor: activeBorder,
                          }
                        : undefined
                    }
                  >
                    <div className="h-16 w-full relative overflow-hidden">
                      <img
                        src={item.img}
                        alt={item.name}
                        className={`w-full h-full object-cover transition-transform duration-500 ${
                          unlocked ? "group-hover:scale-105" : "grayscale"
                        }`}
                      />
                      <div
                        className={`absolute inset-0 ${
                          isDark ? "bg-black/35" : "bg-black/20"
                        }`}
                      />

                      {!unlocked && (
                        <div className="absolute inset-0 bg-black/45 flex items-center justify-center text-white text-[11px] font-medium">
                          Level {info?.unlockLevel}
                        </div>
                      )}
                    </div>

                    <div className="p-2.5">
                      <h3 className="text-xs font-semibold text-[#0f172a] dark:text-white truncate">
                        {item.name}
                      </h3>
                      <p className="text-[11px] text-[#64748b] dark:text-[#7e8c9f] truncate mt-0.5">
                        {isPreviewingAudio && isSelected && unlocked ? "Playing now" : item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Focus Playlist Selection Row */}
            <div className="pt-4 border-t border-[#e2e8f0] dark:border-[#1d2634] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={
                    spotifyPrefs.selectedPlaylistImage ||
                    CURATED_FOCUS_PLAYLISTS[0].imageUrl ||
                    ""
                  }
                  alt={spotifyPrefs.selectedPlaylistName || CURATED_FOCUS_PLAYLISTS[0].name}
                  className="w-10 h-10 rounded-lg object-cover shrink-0 bg-[#1c2432]"
                />
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h3 className="text-xs font-semibold text-[#0f172a] dark:text-white truncate">
                      {spotifyPrefs.selectedPlaylistName || CURATED_FOCUS_PLAYLISTS[0].name}
                    </h3>
                    <span className="text-[11px] text-[#64748b] dark:text-[#7e8c9f]">
                      {CURATED_FOCUS_PLAYLISTS.some(
                        (c) => c.uri === spotifyPrefs.selectedPlaylistUri
                      )
                        ? "Starter playlist"
                        : "Your Spotify playlist"}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748b] dark:text-[#7e8c9f] truncate mt-0.5">
                    {isSpotifyConnected ? (
                      userPlaylists.length > 0
                        ? `${userPlaylists.length} personal ${userPlaylists.length === 1 ? "playlist" : "playlists"} available`
                        : "Spotify connected"
                    ) : (
                      <>
                        Calm instrumental music ready for focus ·{" "}
                        <Link
                          href="/connected-apps"
                          className="underline hover:opacity-80"
                          style={{ color: activeColor }}
                        >
                          Connect Spotify
                        </Link>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPlaylistsModalOpen(true)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                    isDark
                      ? "bg-[#141b24] border-[#222d3d] text-[#f1f5f9] hover:bg-[#1c2432]"
                      : "bg-[#f8fafc] border-[#cbd5e1] text-[#0f172a] hover:bg-[#f1f5f9]"
                  }`}
                >
                  Browse Playlists
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const nextSource =
                      spotifyPrefs.audioSource === "spotify" ? "ambient" : "spotify";
                    if (nextSource === "spotify" && isPreviewingAudio) {
                      getSoundSynth().stop();
                      setIsPreviewingAudio(false);
                    }
                    switchAudioSource(nextSource);
                  }}
                  className="text-xs font-medium transition-opacity hover:opacity-80 cursor-pointer"
                  style={{
                    color:
                      spotifyPrefs.audioSource === "spotify"
                        ? activeColor
                        : undefined,
                  }}
                >
                  {spotifyPrefs.audioSource === "spotify"
                    ? "Using playlist"
                    : "Use on timer"}
                </button>
              </div>
            </div>

            {/* Volume Slider & Session Ending Chime */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-[#e2e8f0] dark:border-[#1d2634]">
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-medium text-[#64748b] dark:text-[#7e8c9f]">
                    Sound volume
                  </span>
                  <span className="font-mono text-xs text-[#64748b] dark:text-[#7e8c9f]">
                    {bgAmbience}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  aria-label="Background Sound Volume"
                  value={bgAmbience}
                  onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                  className="w-full h-1.5 rounded-lg cursor-pointer bg-[#e2e8f0] dark:bg-[#1c2432]"
                  style={{ accentColor: activeColor }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-[#0f172a] dark:text-white">
                    Ending Bell
                  </h3>
                  <p className="text-[11px] text-[#64748b] dark:text-[#7e8c9f]">
                    Gentle chime when your timer finishes ·{" "}
                    <button
                      onClick={handlePreviewChime}
                      type="button"
                      className="underline hover:opacity-80 cursor-pointer"
                      style={{ color: activeColor }}
                    >
                      {isPlayingChime ? "Ringing..." : "Test sound"}
                    </button>
                  </p>
                </div>
                <button
                  onClick={() => setCompletionChime(!completionChime)}
                  aria-label="Toggle completion chime"
                  className="w-11 h-6 rounded-xl transition-colors relative flex items-center p-0.5 focus-visible:ring-2 focus-visible:outline-none bg-[#cbd5e1] dark:bg-[#1c2432] shrink-0 cursor-pointer"
                  style={{
                    backgroundColor: completionChime ? activeColor : undefined,
                    outlineColor: activeColor,
                  }}
                >
                  <span
                    className={`w-5 h-5 rounded-lg transition-transform ${
                      completionChime
                        ? isDark
                          ? "translate-x-5 bg-[#0c1017]"
                          : "translate-x-5 bg-white shadow-sm"
                        : "translate-x-0 bg-[#7e8c9f] dark:bg-[#7e8c9f]"
                    }`}
                  />
                </button>
              </div>

              {/* Play audio on timer start toggle */}
              <div className="flex items-center justify-between pt-4 border-t border-[#e2e8f0] dark:border-[#1d2634]">
                <div>
                  <h3 className="text-xs font-semibold text-[#0f172a] dark:text-white">
                    Play audio when timer starts
                  </h3>
                  <p className="text-[11px] text-[#64748b] dark:text-[#7e8c9f]">
                    Automatically play your ambient sound or Spotify playlist when you begin a focus session
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleAutoPlayAudio}
                  aria-label="Toggle auto-play audio on timer start"
                  className="w-11 h-6 rounded-xl transition-colors relative flex items-center p-0.5 focus-visible:ring-2 focus-visible:outline-none bg-[#cbd5e1] dark:bg-[#1c2432] shrink-0 cursor-pointer"
                  style={{
                    backgroundColor: autoPlayAudio ? activeColor : undefined,
                    outlineColor: activeColor,
                  }}
                >
                  <span
                    className={`w-5 h-5 rounded-lg transition-transform ${
                      autoPlayAudio
                        ? isDark
                          ? "translate-x-5 bg-[#0c1017]"
                          : "translate-x-5 bg-white shadow-sm"
                        : "translate-x-0 bg-[#7e8c9f] dark:bg-[#7e8c9f]"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Extension Pipeline & Local Storage */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* 1. Website Blocker Card */}
          <div className="rounded-2xl border overflow-hidden transition-colors bg-white dark:bg-[#101620] border-[#e2e8f0] dark:border-[#1d2634] text-[#0f172a] dark:text-[#f1f5f9] shadow-sm">
            <div className="h-28 w-full relative p-4 flex flex-col justify-end overflow-hidden group">
              <img
                src="https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?auto=format&fit=crop&w=800&q=80"
                alt="Tranquil still lake reflecting peaceful focus"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div
                className={`absolute inset-0 transition-opacity ${
                  isDark
                    ? "bg-gradient-to-t from-[#101620] via-[#101620]/75 to-black/30"
                    : "bg-gradient-to-t from-white via-white/80 to-black/20"
                }`}
              />
            </div>

            <div className="p-4 sm:p-6 pt-4">
              {/* Declarative Net Box */}
            <div className="p-4 rounded-xl border mb-4 flex items-center gap-3 transition-colors bg-[#f8fafc] dark:bg-[#0b0f17] border-[#e2e8f0] dark:border-[#1d2634]">
              <div
                className="w-9 h-9 rounded-lg border flex items-center justify-center transition-colors"
                style={{
                  backgroundColor: isDark ? colors.containerDark : colors.container,
                  borderColor: activeBorder,
                  color: activeColor,
                }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="8" />
                  <circle cx="12" cy="12" r="2.5" fill="currentColor" />
                </svg>
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#0f172a] dark:text-white">Website Blocker</h3>
                <p className="text-[11px] text-[#64748b] dark:text-[#7e8c9f]">
                  Working quietly • {blockedCount} {blockedCount === 1 ? "site" : "sites"} on your blocklist
                </p>
              </div>
            </div>

            {/* Extension & Blocker Telemetry */}
            <div className="p-4 rounded-xl border mb-4 transition-colors bg-[#f8fafc] dark:bg-[#0b0f17] border-[#e2e8f0] dark:border-[#1d2634]">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-[#64748b] dark:text-[#7e8c9f]">Blocker Pipeline Status</span>
                <span
                  className="font-semibold transition-colors"
                  style={{ color: activeColor }}
                >
                  {isInstalled ? "Extension Connected" : "Local Standby"}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] mb-2 text-[#64748b] dark:text-[#7e8c9f]">
                <span>Active Rules</span>
                <span className="font-mono font-medium text-[#0f172a] dark:text-white">
                  {isInstalled ? `${ruleCount} synced rules` : `${blockedCount} local domains`}
                </span>
              </div>

              <div className={`flex justify-between text-[10px] pt-2 border-t border-[#e2e8f0] dark:border-[#1d2634] ${
                isDark ? "text-[#7e8c9f]" : "text-[#64748b]"
              }`}>
                <span>{isBlockingActive ? "Shield currently active" : "Activates automatically during focus"}</span>
                <span>Instant redirect</span>
              </div>
            </div>

            {/* Force Re-compilation Button */}
            <button
              onClick={() => {
                setIsRecompiling(true);
                refreshExtension();
                setTimeout(() => setIsRecompiling(false), 800);
              }}
              className={`w-full py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                isRecompiling
                  ? "border-current font-bold"
                  : "border-[#cbd5e1] dark:border-[#222d3d] bg-white dark:bg-[#141b24] hover:bg-[#f1f5f9] dark:hover:bg-[#1a2330] text-[#0f172a] dark:text-[#f1f5f9] shadow-xs"
              }`}
              style={
                isRecompiling
                  ? {
                      backgroundColor: isDark ? colors.containerDark : colors.container,
                      color: activeColor,
                    }
                  : { outlineColor: activeColor }
              }
            >
              <svg className={`w-3.5 h-3.5 ${isRecompiling ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              <span>{isRecompiling ? "Refreshing rules..." : "Refresh Blocker Rules"}</span>
            </button>
            </div>
          </div>

          {/* 2. Keyboard Shortcuts Redirect Card */}
          <div className="p-4 sm:p-6 rounded-2xl border transition-colors bg-white dark:bg-[#101620] border-[#e2e8f0] dark:border-[#1d2634] text-[#0f172a] dark:text-[#f1f5f9] shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: isDark ? colors.containerDark : colors.container,
                    color: activeColor,
                  }}
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path
                      d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="font-bold text-sm text-[#0f172a] dark:text-white">
                    Keyboard Shortcuts
                  </h2>
                  <p className="text-xs text-[#64748b] dark:text-[#7e8c9f]">
                    Hands-free focus &amp; session controls
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-[#64748b] dark:text-[#7e8c9f] leading-relaxed">
              Control your timers, jump between pages, and manage distraction blocking with quick hotkeys without touching your mouse.
            </p>

            {/* Quick hotkeys preview list */}
            <div className="flex flex-col gap-2 rounded-xl p-3 border bg-[#f8fafc] dark:bg-[#0b0f17] border-[#e2e8f0] dark:border-[#1d2634] text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#64748b] dark:text-[#7e8c9f]">Start or pause timer</span>
                <kbd className="px-2 py-0.5 rounded font-mono text-[11px] font-semibold border shadow-xs bg-white dark:bg-[#141b24] border-slate-200 dark:border-[#2a3649] text-[#0f172a] dark:text-white">
                  Space
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748b] dark:text-[#7e8c9f]">Switch session modes</span>
                <div className="flex items-center gap-1 font-mono text-[11px]">
                  <kbd className="px-1.5 py-0.5 rounded border shadow-xs bg-white dark:bg-[#141b24] border-slate-200 dark:border-[#2a3649] text-[#0f172a] dark:text-white font-semibold">1</kbd>
                  <span className="text-slate-400">/</span>
                  <kbd className="px-1.5 py-0.5 rounded border shadow-xs bg-white dark:bg-[#141b24] border-slate-200 dark:border-[#2a3649] text-[#0f172a] dark:text-white font-semibold">2</kbd>
                  <span className="text-slate-400">/</span>
                  <kbd className="px-1.5 py-0.5 rounded border shadow-xs bg-white dark:bg-[#141b24] border-slate-200 dark:border-[#2a3649] text-[#0f172a] dark:text-white font-semibold">3</kbd>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748b] dark:text-[#7e8c9f]">Open hotkeys cheatsheet</span>
                <kbd className="px-2 py-0.5 rounded font-mono text-[11px] font-semibold border shadow-xs bg-white dark:bg-[#141b24] border-slate-200 dark:border-[#2a3649] text-[#0f172a] dark:text-white">
                  ?
                </kbd>
              </div>
            </div>

            {/* Redirect Action Button */}
            <Link
              href="/shortcuts"
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer hover:opacity-90 active:scale-[0.99] focus-visible:ring-2 focus-visible:outline-none"
              style={{
                backgroundColor: activeColor,
                color: isDark ? "#0c1017" : "#ffffff",
                outlineColor: activeColor,
              }}
            >
              <span>View &amp; Customize All Shortcuts</span>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          </div>

          {/* 3. Platform Tour & Guidance Card (Minimalist, no pills or badges) */}
          <div className="p-4 sm:p-6 rounded-2xl border transition-colors bg-white dark:bg-[#101620] border-[#e2e8f0] dark:border-[#1d2634] text-[#0f172a] dark:text-[#f1f5f9] shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: isDark ? colors.containerDark : colors.container,
                    color: activeColor,
                  }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polygon points="10 8 16 12 10 16 10 8" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-bold text-sm text-[#0f172a] dark:text-white">
                    Platform Tour
                  </h2>
                  <p className="text-xs text-[#64748b] dark:text-[#7e8c9f]">
                    Guided introduction for first timers
                  </p>
                </div>
              </div>

              <span className="text-xs text-[#64748b] dark:text-[#7e8c9f]">
                {hasSeenTour ? "Seen" : "Pending"}
              </span>
            </div>

            <p className="text-xs text-[#64748b] dark:text-[#7e8c9f] leading-relaxed">
              Walk through the core focus rhythm, acoustic soundscapes, website deflection shields, and serene Zen garden features at your own pace.
            </p>

            {tourResetNotice && (
              <div
                className="text-xs p-2.5 rounded-lg border transition-all animate-in fade-in"
                style={{
                  borderColor: activeBorder,
                  backgroundColor: isDark ? colors.containerDark : colors.container,
                  color: activeColor,
                }}
              >
                {tourResetNotice}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setTourResetNotice(null);
                  startTour(0);
                }}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer hover:opacity-90 active:scale-[0.99] focus-visible:ring-2 focus-visible:outline-none"
                style={{
                  backgroundColor: activeColor,
                  color: isDark ? "#0c1017" : "#ffffff",
                  outlineColor: activeColor,
                }}
              >
                <span>Take Platform Tour</span>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => {
                  resetTourStatus();
                  setTourResetNotice("Tour status reset. The walkthrough will greet you again on your next reload.");
                  setTimeout(() => setTourResetNotice(null), 5000);
                }}
                className="w-full sm:w-auto py-2.5 px-3.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none border-[#cbd5e1] dark:border-[#222d3d] bg-white dark:bg-[#141b24] hover:bg-[#f1f5f9] dark:hover:bg-[#1a2330] text-[#64748b] dark:text-[#7e8c9f] hover:text-[#0f172a] dark:hover:text-white shadow-xs cursor-pointer"
                style={{ outlineColor: activeColor }}
              >
                <span>Reset Status</span>
              </button>
            </div>
          </div>

          {/* 4. Privacy & Data Card */}
          <div className="p-4 sm:p-6 rounded-2xl border transition-colors bg-white dark:bg-[#101620] border-[#e2e8f0] dark:border-[#1d2634] text-[#0f172a] dark:text-[#f1f5f9] shadow-sm">
            <div className="flex items-center gap-2.5 mb-2">
              <svg
                className="w-4 h-4 transition-colors"
                style={{ color: activeColor }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
              </svg>
              <h2 className="font-bold text-sm text-[#0f172a] dark:text-white">
                Privacy &amp; Data
              </h2>
            </div>
            <p className="text-xs mb-4 text-[#64748b] dark:text-[#7e8c9f]">
              100% private to you
            </p>

            <div className="flex flex-col gap-2.5 text-xs mb-5">
              <div className="flex items-center justify-between">
                <span className="text-[#64748b] dark:text-[#7e8c9f]">Data stored on this device</span>
                <span className="font-mono font-medium">{localDataKb}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748b] dark:text-[#7e8c9f]">Where it's saved</span>
                <span className="font-medium">Locally in your browser</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748b] dark:text-[#7e8c9f]">Activity tracking</span>
                <span
                  className="font-bold transition-colors"
                  style={{ color: activeColor }}
                >
                  None (Off)
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleExportJSON}
                className="w-full py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors focus-visible:ring-2 focus-visible:outline-none border-[#cbd5e1] dark:border-[#222d3d] bg-white dark:bg-[#141b24] hover:bg-[#f1f5f9] dark:hover:bg-[#1a2330] text-[#0f172a] dark:text-[#f1f5f9] shadow-xs"
                style={{ outlineColor: activeColor }}
              >
                <svg className="w-3.5 h-3.5 text-[#64748b] dark:text-[#7e8c9f]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Export your settings (.json)</span>
              </button>

              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors focus-visible:ring-2 focus-visible:outline-none border-[#cbd5e1] dark:border-[#222d3d] bg-white dark:bg-[#141b24] hover:bg-[#f1f5f9] dark:hover:bg-[#1a2330] text-[#0f172a] dark:text-[#f1f5f9] shadow-xs cursor-pointer"
                style={{ outlineColor: activeColor }}
              >
                <svg className="w-3.5 h-3.5 text-[#64748b] dark:text-[#7e8c9f]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>Import saved settings</span>
              </button>

              <button
                onClick={handleResetDefaults}
                className="w-full py-2.5 px-3 rounded-xl border border-red-500/30 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center justify-center gap-2 transition-colors mt-1 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                <span>Reset all settings to default</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Spotify Playlists Selection Modal (Sound & Ambience) */}
      {isPlaylistsModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsPlaylistsModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-playlists-modal-title"
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-2xl max-h-[85vh] rounded-2xl border p-5 sm:p-6 flex flex-col gap-4 shadow-xl overflow-hidden transition-colors ${
              isDark
                ? "bg-[#101620] border-[#1d2634] text-[#f1f5f9]"
                : "bg-white border-[#e2e8f0] text-[#0f172a]"
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#e2e8f0] dark:border-[#1d2634]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1DB954]/15 text-[#1DB954] flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                  </svg>
                </div>
                <div>
                  <h2
                    id="settings-playlists-modal-title"
                    className="text-base sm:text-lg font-bold"
                  >
                    Select Focus Playlist
                  </h2>
                  <p className="text-xs text-[#64748b] dark:text-[#7e8c9f]">
                    Choose one of your own Spotify playlists or a starter focus pick.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadSpotifyData(true)}
                  className="p-1.5 rounded-lg border text-xs text-[#64748b] dark:text-[#7e8c9f] hover:text-[#0f172a] dark:hover:text-white border-[#e2e8f0] dark:border-[#1d2634] transition-colors cursor-pointer"
                  title="Refresh playlists"
                  aria-label="Refresh playlists"
                >
                  <svg
                    className={`w-4 h-4 ${isLoadingUserPlaylists ? "animate-spin" : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPlaylistsModalOpen(false)}
                  className="p-1.5 rounded-lg border text-xs text-[#64748b] dark:text-[#7e8c9f] hover:text-[#0f172a] dark:hover:text-white border-[#e2e8f0] dark:border-[#1d2634] transition-colors cursor-pointer"
                  title="Close modal"
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto pr-1">
              {isLoadingUserPlaylists ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div
                      key={n}
                      className={`h-16 rounded-xl border animate-pulse ${
                        isDark
                          ? "bg-[#0b0f17] border-[#1d2634]"
                          : "bg-[#f8fafc] border-[#e2e8f0]"
                      }`}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-4 py-1">
                  {userPlaylists.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b] dark:text-[#7e8c9f]">
                        Your Spotify Playlists ({userPlaylists.length})
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {userPlaylists.map((pl) => {
                          const isSelected = spotifyPrefs.selectedPlaylistUri === pl.uri;
                          return (
                            <button
                              key={pl.uri}
                              type="button"
                              onClick={() => {
                                handleSelectPlaylist(pl);
                              }}
                              className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                                isSelected
                                  ? "border-current shadow-xs"
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
                              <div className="w-11 h-11 rounded-lg overflow-hidden bg-[#1c2432] shrink-0">
                                {pl.imageUrl ? (
                                  <img
                                    src={pl.imageUrl}
                                    alt={pl.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[#1DB954] text-sm font-bold">
                                    ♪
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-xs font-bold truncate">
                                    {pl.name}
                                  </span>
                                  {isSelected && (
                                    <span
                                      className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                                      style={{
                                        backgroundColor: activeColor,
                                        color: isDark ? "#00201d" : "#ffffff",
                                      }}
                                    >
                                      Active
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-[#64748b] dark:text-[#7e8c9f] truncate mt-0.5">
                                  {isSelected
                                    ? "Selected for focus"
                                    : pl.tracksTotal > 0
                                    ? `${pl.tracksTotal} ${pl.tracksTotal === 1 ? "track" : "tracks"}`
                                    : "Playlist"}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b] dark:text-[#7e8c9f]">
                      Starter Focus Playlists
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {CURATED_FOCUS_PLAYLISTS.map((pl) => {
                        const isSelected = spotifyPrefs.selectedPlaylistUri === pl.uri;
                        return (
                          <button
                            key={pl.uri}
                            type="button"
                            onClick={() => {
                              handleSelectPlaylist(pl);
                            }}
                            className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                              isSelected
                                ? "border-current shadow-xs"
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
                            <div className="w-11 h-11 rounded-lg overflow-hidden bg-[#1c2432] shrink-0">
                              {pl.imageUrl ? (
                                <img
                                  src={pl.imageUrl}
                                  alt={pl.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[#1DB954] text-sm font-bold">
                                  ♪
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-bold truncate">
                                  {pl.name}
                                </span>
                                {isSelected && (
                                  <span
                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                                    style={{
                                      backgroundColor: activeColor,
                                      color: isDark ? "#00201d" : "#ffffff",
                                    }}
                                  >
                                    Active
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#64748b] dark:text-[#7e8c9f] truncate mt-0.5">
                                {isSelected ? "Selected for focus" : "Focus pick"}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#e2e8f0] dark:border-[#1d2634]">
              <div className="text-xs truncate text-[#64748b] dark:text-[#7e8c9f]">
                {spotifyPrefs.selectedPlaylistName ? (
                  <span>
                    Selected:{" "}
                    <strong className="text-[#0f172a] dark:text-white">
                      {spotifyPrefs.selectedPlaylistName}
                    </strong>
                  </span>
                ) : (
                  <span>Choose any playlist to use on your focus timer.</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsPlaylistsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition-opacity hover:opacity-90 shrink-0"
                style={{
                  backgroundColor: activeColor,
                  color: isDark ? "#00201d" : "#ffffff",
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
