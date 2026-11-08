"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "../../context/theme-context";
import { useTimer } from "../../context/timer-context";
import { useSync } from "../../context/sync-context";
import { useExtensionStatus } from "../../lib/blocking/use-extension-status";
import {
  CURATED_FOCUS_PLAYLISTS,
  DEFAULT_SPOTIFY_PREFS,
  getStoredSpotifyPreferences,
  notifySpotifyAuthChanged,
  saveStoredSpotifyPreferences,
  SpotifyProfile,
  subscribeToSpotifyAuthUpdates,
} from "../../lib/spotify/spotify-store";

interface UpcomingApp {
  id: string;
  name: string;
  category: string;
  description: string;
  highlightText: string;
  iconBg: string;
  icon: React.ReactNode;
}

const UPCOMING_APPS: UpcomingApp[] = [
  {
    id: "google-calendar",
    name: "Google Calendar",
    category: "Schedule & busy status",
    description:
      "Automatically block out focus intervals on your calendar and set your status to busy so colleagues know you are in deep work.",
    highlightText: "In development",
    iconBg: "bg-[#4285F4]/10 text-[#4285F4]",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
        <rect
          x="3"
          y="4"
          width="18"
          height="18"
          rx="3"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M3 9h18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M8 2v4M16 2v4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="8" cy="14" r="1.2" fill="currentColor" />
        <circle cx="12" cy="14" r="1.2" fill="currentColor" />
        <circle cx="16" cy="14" r="1.2" fill="currentColor" />
        <circle cx="8" cy="18" r="1.2" fill="currentColor" />
        <circle cx="12" cy="18" r="1.2" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "slack",
    name: "Slack",
    category: "DND & status automation",
    description:
      "Update your Slack status to 'In Focus' and pause incoming notifications while your timer is running to eliminate interruptions.",
    highlightText: "In development",
    iconBg: "bg-[#4A154B]/10 dark:bg-white/10",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
        <path
          d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"
          fill="#E01E5A"
        />
        <path
          d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"
          fill="#36C5F0"
        />
        <path
          d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"
          fill="#2EB67D"
        />
        <path
          d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"
          fill="#ECB22E"
        />
      </svg>
    ),
  },
  {
    id: "notion",
    name: "Notion",
    category: "Session logs & workspace sync",
    description:
      "Automatically log completed focus sessions to your Notion workspace and attach notes to keep track of your daily deep work goals.",
    highlightText: "In development",
    iconBg: "bg-neutral-500/10 text-neutral-800 dark:text-neutral-200",
    icon: (
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.093-.373L18.42 2.296c-.42-.327-.98-.7-2.193-.606L3.712 2.763c-.373.047-.466.327-.327.513zm.886 4.385v12.457c0 .606.327.84 1.026.793l14.288-.84c.7-.046.886-.466.886-.98V5.887c0-.513-.373-.746-.886-.7l-14.428.84c-.653.047-.886.28-.886.746zm12.368.56c.093.373 0 .746-.373.793l-.84.14v8.305c0 .7-.373.98-.98 1.026l-3.313.187c-.28 0-.42-.14-.56-.374l-4.154-6.44v5.88c.42.094.793.28.793.654 0 .373-.373.56-.84.56l-3.173.187c-.373 0-.606-.28-.606-.653 0-.374.327-.56.746-.607l.84-.093V9.754c-.373-.046-.746-.14-.746-.513 0-.373.327-.56.746-.56l3.687-.233c.466 0 .653.187.84.466l4.246 6.533V9.894l-.7-.093c-.373-.047-.56-.28-.56-.607 0-.373.327-.56.746-.56l3.593-.233c.42 0 .607.28.607.607z" />
      </svg>
    ),
  },
  {
    id: "todoist",
    name: "Todoist",
    category: "Task lists & Pomodoro sync",
    description:
      "Pull your pending tasks straight into your focus sessions, run dedicated Pomodoros on specific tasks, and mark them complete.",
    highlightText: "In development",
    iconBg: "bg-[#E44332]/10 text-[#E44332]",
    icon: (
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M21.36 0H2.64C1.18 0 0 1.18 0 2.64v18.72C0 22.82 1.18 24 2.64 24h18.72c1.46 0 2.64-1.18 2.64-2.64V2.64C24 1.18 22.82 0 21.36 0zm-3.07 18.06l-8.6 4.96-5.05-2.91 8.6-4.96 5.05 2.91zm0-5.18l-8.6 4.96-5.05-2.91 8.6-4.96 5.05 2.91zm0-5.18l-8.6 4.96-5.05-2.91 8.6-4.96 5.05 2.91z" />
      </svg>
    ),
  },
  {
    id: "apple-health",
    name: "Apple Health",
    category: "Mindful Minutes tracker",
    description:
      "Sync completed focus intervals and mindful break periods directly to Apple Health as Mindful Minutes to track your daily wellness.",
    highlightText: "In development",
    iconBg: "bg-[#FF2D55]/10 text-[#FF2D55]",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    id: "discord",
    name: "Discord",
    category: "Rich Presence & status",
    description:
      "Broadcast your active focus session in Discord Rich Presence and mute server pings automatically while you are in the zone.",
    highlightText: "In development",
    iconBg: "bg-[#5865F2]/10 text-[#5865F2]",
    icon: (
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
      </svg>
    ),
  },
];

export default function ConnectedAppsPage() {
  const { isDark } = useTheme();
  const { colors, activeColor } = useTimer();
  const { user, storageMode, openSyncModal } = useSync();
  const { isInstalled: isExtensionInstalled, isBlockingActive } = useExtensionStatus();

  const [spotifyConnected, setSpotifyConnected] = useState<boolean>(false);
  const [spotifyUser, setSpotifyUser] = useState<SpotifyProfile | null>(null);
  const [isLoadingSpotify, setIsLoadingSpotify] = useState<boolean>(true);

  const loadSpotifyState = async () => {
    setIsLoadingSpotify(true);
    try {
      const statusRes = await fetch("/api/spotify/status");
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setSpotifyConnected(Boolean(statusData.connected));
        setSpotifyUser(statusData.user || null);
      }
    } catch {
      // Quietly ignore network errors in offline mode
    } finally {
      setIsLoadingSpotify(false);
    }
  };

  useEffect(() => {
    loadSpotifyState();

    const unsubAuth = subscribeToSpotifyAuthUpdates(() => {
      loadSpotifyState();
    });
    const handleWindowMessage = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data?.type === "DND_OAUTH_CALLBACK") {
        loadSpotifyState();
      }
    };

    window.addEventListener("message", handleWindowMessage);

    return () => {
      unsubAuth();
      window.removeEventListener("message", handleWindowMessage);
    };
  }, []);

  const handleConnectSpotify = () => {
    window.location.href = "/api/spotify/auth";
  };

  const handleDisconnectSpotify = async () => {
    try {
      await fetch("/api/spotify/status", { method: "DELETE" });
      setSpotifyConnected(false);
      setSpotifyUser(null);

      // If the user's selected playlist was a personal playlist, reset to default curated playlist
      const currentPrefs = getStoredSpotifyPreferences();
      const isCurated = CURATED_FOCUS_PLAYLISTS.some(
        (c) => c.uri === currentPrefs.selectedPlaylistUri
      );
      if (!isCurated) {
        saveStoredSpotifyPreferences({
          selectedPlaylistUri: DEFAULT_SPOTIFY_PREFS.selectedPlaylistUri,
          selectedPlaylistName: DEFAULT_SPOTIFY_PREFS.selectedPlaylistName,
          selectedPlaylistImage: DEFAULT_SPOTIFY_PREFS.selectedPlaylistImage,
          selectedPlaylistOwner: DEFAULT_SPOTIFY_PREFS.selectedPlaylistOwner,
          lastPlayedTrackUri: null,
        });
      }

      notifySpotifyAuthChanged(false);
    } catch (e) {
      console.error("Failed to disconnect Spotify", e);
    }
  };

  return (
    <main className="max-w-[1360px] w-full mx-auto px-4 py-5 sm:p-6 md:p-8 flex flex-col gap-5 sm:gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0f172a] dark:text-white">
            Connected Apps
          </h1>
          <p className="text-xs mt-1 text-[#64748b] dark:text-[#7e8c9f]">
            Everything you need to focus is already built in. Keep your setup light and connect only what genuinely helps you stay in flow.
          </p>
        </div>

        <Link
          href="/"
          className="text-xs font-medium text-[#64748b] dark:text-[#7e8c9f] hover:text-[#0f172a] dark:hover:text-white transition-colors shrink-0"
        >
          ← Back to timer
        </Link>
      </div>

      {/* Minimalism Philosophy Note */}
      <div
        className={`p-4 rounded-xl border text-xs leading-relaxed ${
          isDark
            ? "bg-[#0b0f17] border-[#1d2634] text-[#94a3b8]"
            : "bg-[#f8fafc] border-[#e2e8f0] text-[#475569]"
        }`}
      >
        <span className="font-semibold text-[#0f172a] dark:text-white">
          A simpler way to work:
        </span>{" "}
        You don&apos;t need to sign in or install anything to begin. Calming background sounds, a starter focus playlist, and private browser storage are ready right out of the box.
      </div>

      {/* App Connections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* 1. Spotify */}
        <section
          className={`rounded-2xl p-5 sm:p-6 border flex flex-col justify-between gap-5 transition-colors ${
            isDark
              ? "bg-[#101620] border-[#1d2634] text-[#f1f5f9]"
              : "bg-white border-[#e2e8f0] text-[#0f172a] shadow-sm"
          }`}
        >
            <div className="flex flex-col gap-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1DB954]/10 flex items-center justify-center text-[#1DB954] shrink-0">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold">Spotify</h3>
                  <p className="text-xs text-[#64748b] dark:text-[#7e8c9f]">
                    {isLoadingSpotify
                      ? "Checking connection..."
                      : spotifyConnected
                      ? `Signed in as ${spotifyUser?.displayName || "Spotify User"}`
                      : "Optional · Starter playlists included"}
                  </p>
                </div>
              </div>

              <p className="text-xs text-[#64748b] dark:text-[#7e8c9f] leading-relaxed">
                {spotifyConnected ? (
                  <>
                    Your Spotify account is connected. You can select your personal playlists from the{" "}
                    <Link
                      href="/settings#sounds"
                      className="underline hover:opacity-80 font-medium"
                      style={{ color: activeColor }}
                    >
                      Sound and Ambience
                    </Link>{" "}
                    settings.
                  </>
                ) : (
                  <>
                    Starter focus music is already waiting in{" "}
                    <Link
                      href="/settings#sounds"
                      className="underline hover:opacity-80"
                      style={{ color: activeColor }}
                    >
                      Sound Settings
                    </Link>
                    . Connect your Spotify account to listen to your personal playlists during focus sessions.
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#e2e8f0] dark:border-[#1d2634]">
              <Link
                href="/settings#sounds"
                className="text-xs font-medium hover:underline transition-colors"
                style={{ color: spotifyConnected ? activeColor : undefined }}
              >
                {spotifyConnected ? "Select playlist in Sounds →" : "Sound settings →"}
              </Link>

              <div className="flex items-center gap-2.5">
                {spotifyConnected ? (
                  <>
                    <button
                      type="button"
                      onClick={loadSpotifyState}
                      className="text-xs font-medium text-[#64748b] dark:text-[#7e8c9f] hover:text-[#0f172a] dark:hover:text-white transition-colors cursor-pointer"
                    >
                      Refresh
                    </button>
                    <button
                      type="button"
                      onClick={handleDisconnectSpotify}
                      className="px-3 py-1.5 rounded-lg border text-xs font-medium text-red-500 border-red-500/25 hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectSpotify}
                    className="px-4 py-2 rounded-xl bg-[#1DB954] hover:brightness-105 text-black font-semibold text-xs transition-all cursor-pointer"
                  >
                    Connect Spotify
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* 2. Website Blocker Extension */}
          <section
            className={`rounded-2xl p-5 sm:p-6 border flex flex-col justify-between gap-5 transition-colors ${
              isDark
                ? "bg-[#101620] border-[#1d2634] text-[#f1f5f9]"
                : "bg-white border-[#e2e8f0] text-[#0f172a] shadow-sm"
            }`}
          >
            <div className="flex flex-col gap-3.5">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: isDark ? colors.containerDark : colors.container,
                    color: activeColor,
                  }}
                >
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold">
                    Website Blocker
                  </h3>
                  <p className="text-xs text-[#64748b] dark:text-[#7e8c9f]">
                    {isExtensionInstalled
                      ? isBlockingActive
                        ? "Pausing distractions now"
                        : "Installed and ready"
                      : "Optional browser helper"}
                  </p>
                </div>
              </div>

              <p className="text-xs text-[#64748b] dark:text-[#7e8c9f] leading-relaxed">
                Gently pauses distracting websites while your timer is running so autopilot habits don&apos;t pull you away from your work.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#e2e8f0] dark:border-[#1d2634]">
              <Link
                href="/blocklist"
                className="text-xs font-medium text-[#64748b] dark:text-[#7e8c9f] hover:text-[#0f172a] dark:hover:text-white transition-colors"
              >
                Manage blocklist →
              </Link>

              <a
                href="/do-not-disturb-extension.zip"
                download
                className={`px-4 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                  isDark
                    ? "bg-[#141b24] border-[#222d3d] text-[#f1f5f9] hover:bg-[#1c2432]"
                    : "bg-[#f8fafc] border-[#cbd5e1] text-[#0f172a] hover:bg-[#f1f5f9]"
                }`}
              >
                {isExtensionInstalled ? "Download Again" : "Get Extension"}
              </a>
            </div>
          </section>

          {/* 3. Cloud Backup */}
          <section
            className={`rounded-2xl p-5 sm:p-6 border flex flex-col justify-between gap-5 transition-colors ${
              isDark
                ? "bg-[#101620] border-[#1d2634] text-[#f1f5f9]"
                : "bg-white border-[#e2e8f0] text-[#0f172a] shadow-sm"
            }`}
          >
            <div className="flex flex-col gap-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold">
                    Cloud Backup
                  </h3>
                  <p className="text-xs text-[#64748b] dark:text-[#7e8c9f]">
                    {storageMode === "cloud"
                      ? `Signed in as ${user?.email}`
                      : "Saved on this device"}
                  </p>
                </div>
              </div>

              <p className="text-xs text-[#64748b] dark:text-[#7e8c9f] leading-relaxed">
                Your sessions, blocklist, and preferences are saved privately in your browser by default. Sign in only if you want to carry your setup across computers.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#e2e8f0] dark:border-[#1d2634]">
              <Link
                href="/privacy"
                className="text-xs font-medium text-[#64748b] dark:text-[#7e8c9f] hover:text-[#0f172a] dark:hover:text-white transition-colors"
              >
                Privacy details →
              </Link>

              <button
                type="button"
                onClick={openSyncModal}
                className={`px-4 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                  isDark
                    ? "bg-[#141b24] border-[#222d3d] text-[#f1f5f9] hover:bg-[#1c2432]"
                    : "bg-[#f8fafc] border-[#cbd5e1] text-[#0f172a] hover:bg-[#f1f5f9]"
                }`}
              >
                {storageMode === "cloud" ? "Manage Account" : "Sign In"}
              </button>
            </div>
          </section>

          {/* Coming Soon Apps */}
          {UPCOMING_APPS.map((app) => (
            <section
              key={app.id}
              aria-disabled="true"
              className={`rounded-2xl p-5 sm:p-6 border flex flex-col justify-between gap-5 opacity-75 dark:opacity-70 cursor-not-allowed select-none transition-colors ${
                isDark
                  ? "bg-[#101620]/60 border-[#1d2634] text-[#f1f5f9]"
                  : "bg-white/80 border-[#e2e8f0] text-[#0f172a] shadow-sm"
              }`}
            >
              <div className="flex flex-col gap-3.5">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${app.iconBg}`}
                  >
                    {app.icon}
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-[#0f172a] dark:text-white">
                      {app.name}
                    </h3>
                    <p className="text-xs text-[#64748b] dark:text-[#7e8c9f]">
                      {app.category}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-[#64748b] dark:text-[#7e8c9f] leading-relaxed">
                  {app.description}
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#e2e8f0] dark:border-[#1d2634]">
                <span className="text-xs text-[#94a3b8] dark:text-[#64748b]">
                  {app.highlightText}
                </span>

                <button
                  type="button"
                  disabled
                  className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold text-[#94a3b8] dark:text-[#64748b] border-[#e2e8f0] dark:border-[#222d3d] bg-[#f8fafc]/50 dark:bg-[#121926]/50 cursor-not-allowed"
                >
                  Coming Soon
                </button>
              </div>
            </section>
          ))}
        </div>
      </main>
    );
  }
