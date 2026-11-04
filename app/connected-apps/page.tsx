"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "../../context/theme-context";
import { useTimer } from "../../context/timer-context";
import { useSync } from "../../context/sync-context";
import { useExtensionStatus } from "../../lib/blocking/use-extension-status";
import {
  SpotifyProfile,
  SPOTIFY_AUTH_UPDATED_EVENT,
} from "../../lib/spotify/spotify-store";

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

    const handleAuthChange = () => {
      loadSpotifyState();
    };
    const handleWindowMessage = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data?.type === "DND_OAUTH_CALLBACK") {
        loadSpotifyState();
      }
    };

    window.addEventListener(SPOTIFY_AUTH_UPDATED_EVENT, handleAuthChange);
    window.addEventListener("message", handleWindowMessage);

    return () => {
      window.removeEventListener(SPOTIFY_AUTH_UPDATED_EVENT, handleAuthChange);
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
      window.dispatchEvent(
        new CustomEvent(SPOTIFY_AUTH_UPDATED_EVENT, {
          detail: { connected: false, provider: "spotify" },
        })
      );
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
                <h2 className="text-sm sm:text-base font-bold">Spotify</h2>
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
                <h2 className="text-sm sm:text-base font-bold">
                  Website Blocker
                </h2>
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
                <h2 className="text-sm sm:text-base font-bold">
                  Cloud Backup
                </h2>
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
      </div>
    </main>
  );
}
