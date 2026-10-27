"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme } from "../context/theme-context";
import { useTimer } from "../context/timer-context";
import { useExtensionStatus } from "../lib/blocking/use-extension-status";
import { getStoredBlocklist } from "../lib/blocking/blocklist-store";
import {
  getSessionStats,
  SESSIONS_UPDATED_EVENT,
  SessionStats,
  EMPTY_SESSION_STATS,
} from "../lib/sessions/session-store";
import SyncButton from "./SyncButton";
import UserNav from "./UserNav";

export default function Navbar() {
  const pathname = usePathname();
  const { theme, setTheme, isDark } = useTheme();
  const {
    mode,
    setMode,
    colors,
    activeColor,
    activeContainer,
    activeBorder,
    isRunning,
    secondsLeft,
    totalSeconds,
    cycle,
    totalCycles,
    toggleTimer,
    skipTimer,
    formatTime,
    toggleMiniWindow,
    isMiniWindowActive,
    allModeColors,
    settings,
  } = useTimer();

  const [isIslandOpen, setIsIslandOpen] = useState(false);
  const islandRef = useRef<HTMLDivElement | null>(null);
  const { isInstalled, isBlockingActive } = useExtensionStatus();
  const [blockedSitesCount, setBlockedSitesCount] = useState(0);
  const [stats, setStats] = useState<SessionStats>(EMPTY_SESSION_STATS);

  useEffect(() => {
    setBlockedSitesCount(getStoredBlocklist().filter((e) => e.active).length);
    setStats(getSessionStats());

    const handleBlocklistUpdate = () => {
      setBlockedSitesCount(getStoredBlocklist().filter((e) => e.active).length);
    };

    const handleSessionsUpdate = () => {
      setStats(getSessionStats());
    };

    window.addEventListener("dnd-blocklist-updated" as any, handleBlocklistUpdate);
    window.addEventListener(SESSIONS_UPDATED_EVENT as any, handleSessionsUpdate);
    return () => {
      window.removeEventListener("dnd-blocklist-updated" as any, handleBlocklistUpdate);
      window.removeEventListener(SESSIONS_UPDATED_EVENT as any, handleSessionsUpdate);
    };
  }, []);

  // Close island on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (islandRef.current && !islandRef.current.contains(e.target as Node)) {
        setIsIslandOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsIslandOpen(false);
      }
    };

    if (isIslandOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isIslandOpen]);

  // Close island on route change
  useEffect(() => {
    setIsIslandOpen(false);
  }, [pathname]);

  // Hide the global navbar on the blocked redirect page for complete zen focus
  if (pathname === "/blocked") {
    return null;
  }

  const navItems = [
    { label: "Focus", href: "/" },
    { label: "Blocklist", href: "/blocklist" },
    { label: "Statistics", href: "/statistics" },
    { label: "Settings", href: "/settings" },
  ];

  const isLinkActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    if (href === "/statistics") {
      return pathname === "/statistics" || pathname === "/analytics";
    }
    return pathname.startsWith(href);
  };

  const progressPercent = totalSeconds > 0 ? Math.round(((totalSeconds - secondsLeft) / totalSeconds) * 100) : 0;

  return (
    <header className="px-6 md:px-8 py-3.5 border-b sticky top-0 z-40 backdrop-blur-md transition-colors border-[#e2e8f0] dark:border-[#1b2432] bg-white/95 dark:bg-[#0c1017]/95 text-[#0f172a] dark:text-[#f1f5f9]">
      <div className="max-w-[1360px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-8 lg:gap-10">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center group focus-visible:ring-2 focus-visible:outline-none rounded-lg p-0.5 transition-opacity hover:opacity-90"
            style={{ outlineColor: "var(--mode-accent)" }}
            aria-label="Do Not Disturb Home"
          >
            {/* Dark mode logo (white artwork) shown on dark theme */}
            <Image
              src="/logo-dark.png"
              alt="Do Not Disturb"
              width={140}
              height={33}
              priority
              className={`${isDark ? "block" : "hidden"} dark:block h-7 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]`}
            />
            {/* Light mode logo (black artwork) shown on light theme */}
            <Image
              src="/logo-light.png"
              alt="Do Not Disturb"
              width={140}
              height={33}
              priority
              className={`${!isDark ? "block" : "hidden"} dark:hidden h-7 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]`}
            />
          </Link>

          {/* Actual Page Navigation Links */}
          <nav className="flex items-center gap-1.5 text-[13.5px]" aria-label="Primary Navigation">
            {navItems.map((item) => {
              const active = isLinkActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3.5 py-1.5 rounded-lg transition-all font-medium focus-visible:ring-2 focus-visible:outline-none ${
                    active
                      ? "shadow-sm font-semibold border"
                      : "text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] dark:text-[#7e8c9f] dark:hover:text-white dark:hover:bg-[#141b24]"
                  }`}
                  style={
                    active
                      ? {
                          backgroundColor: "var(--mode-container)",
                          borderColor: "var(--mode-border)",
                          color: "var(--mode-accent)",
                        }
                      : undefined
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side controls: Dynamic Island Badge, Theme Switcher & User Profile */}
        <div className="flex items-center gap-3">
          {/* Dynamic Island Status Badge */}
          <div ref={islandRef} className="relative">
            {/* Collapsed Badge Trigger */}
            <button
              type="button"
              onClick={() => setIsIslandOpen((prev) => !prev)}
              aria-expanded={isIslandOpen}
              aria-label="Toggle live session dynamic island"
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-all duration-300 cursor-pointer select-none focus-visible:ring-2 focus-visible:outline-none ${
                isIslandOpen
                  ? "shadow-md scale-[1.02]"
                  : "hover:scale-[1.01] hover:shadow-xs active:scale-[0.98]"
              } ${
                isDark
                  ? "bg-[#0b0f17] border-[#1d2634] text-[#7e8c9f] hover:text-white hover:border-[#2a3649]"
                  : "bg-[#f8fafc] border-[#e2e8f0] text-[#64748b] hover:text-[#0f172a] hover:border-[#cbd5e1]"
              }`}
              style={{
                borderColor: isIslandOpen ? activeBorder : undefined,
                boxShadow: isIslandOpen
                  ? `0 0 0 1px ${activeBorder}, 0 6px 20px -4px ${activeColor}25`
                  : undefined,
              }}
            >
              {/* Live Status Indicator Dot */}
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full transition-colors ${
                    isRunning ? "animate-pulse" : ""
                  }`}
                  style={{ backgroundColor: activeColor }}
                />
                <span
                  className="font-mono font-medium transition-colors"
                  style={{ color: isRunning ? activeColor : undefined }}
                  suppressHydrationWarning
                >
                  {isRunning ? formatTime(secondsLeft) : colors.name}
                </span>
              </span>

              <span className="hidden sm:inline opacity-40">•</span>
              <span className="hidden sm:inline">{blockedSitesCount} sites</span>

              <span className="hidden md:inline opacity-40">•</span>
              <span className="hidden md:inline">{stats.todayFocusFormatted}</span>

              <span className="hidden lg:inline opacity-40">•</span>
              <span className="hidden lg:flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                  <path d="M12 23c-4.97 0-9-4.03-9-9 0-3.3 1.83-6.23 4.54-7.79.46-.26 1.05.02 1.13.55.22 1.45.92 2.76 1.95 3.73.18.17.47.14.61-.07.72-1.09 1.16-2.4 1.16-3.8 0-1.74-.69-3.31-1.81-4.47-.38-.4-.14-1.06.39-1.12 3.84-.44 7.6 1.81 8.89 5.48C20.47 9.07 21 11.47 21 14c0 4.97-4.03 9-9 9z" />
                </svg>
                <span>{stats.currentStreak}d</span>
              </span>

              {/* Dynamic Island Expand Cue */}
              <svg
                className={`w-3 h-3 transition-transform duration-300 ml-0.5 opacity-60 group-hover:opacity-100 ${
                  isIslandOpen ? "rotate-180" : "rotate-0"
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Expanded Dynamic Island Card */}
            <div
              className={`absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border p-4.5 shadow-2xl backdrop-blur-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] z-50 origin-top-right flex flex-col gap-3.5 ${
                isIslandOpen
                  ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
              } ${
                isDark
                  ? "bg-[#0c1017]/95 border-[#1d2634] text-[#f1f5f9]"
                  : "bg-white/95 border-[#e2e8f0] text-[#0f172a]"
              }`}
              style={{
                borderColor: isIslandOpen ? activeBorder : undefined,
                boxShadow: isDark
                  ? `0 24px 50px -12px rgba(0,0,0,0.8), 0 0 0 1px ${activeBorder}`
                  : `0 20px 40px -12px rgba(0,0,0,0.15), 0 0 0 1px ${activeBorder}`,
              }}
            >
              {/* 1. Header: Mode Badge & Cycle Step Tracker */}
              <div className="flex items-center justify-between">
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors"
                  style={{
                    backgroundColor: isDark ? colors.containerDark : colors.container,
                    borderColor: activeBorder,
                    color: activeColor,
                  }}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${isRunning ? "animate-pulse" : ""}`}
                    style={{ backgroundColor: activeColor }}
                  />
                  <span>{colors.badgeLabel}</span>
                  <span className="opacity-60 font-normal">
                    • {isRunning ? "Running" : "Paused"}
                  </span>
                </div>

                {/* Cycle Visual Indicator */}
                <div className="flex items-center gap-1.5 text-xs text-[#64748b] dark:text-[#7e8c9f]">
                  <span>Cycle {cycle} of {totalCycles}</span>
                  <div className="flex items-center gap-1 ml-1" aria-hidden="true">
                    {Array.from({ length: totalCycles }).map((_, i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full transition-colors"
                        style={{
                          backgroundColor:
                            i + 1 <= cycle
                              ? activeColor
                              : isDark
                              ? "#1c2432"
                              : "#e2e8f0",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Hero Countdown & Action Controls */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <div>
                  <div
                    className="text-3xl font-bold font-mono tracking-tight tabular-nums"
                    suppressHydrationWarning
                  >
                    {formatTime(secondsLeft)}
                  </div>
                  <div className="text-[11px] text-[#64748b] dark:text-[#7e8c9f] mt-0.5">
                    {mode === "focus"
                      ? "Focusing without distractions"
                      : "Time to rest and recharge"}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Play / Pause Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleTimer();
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
                    style={{
                      backgroundColor: activeColor,
                      color: isDark && mode === "focus" ? "#00201d" : isDark && mode === "shortBreak" ? "#082f49" : isDark && mode === "longBreak" ? "#431407" : "#ffffff",
                    }}
                  >
                    {isRunning ? (
                      <>
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <rect x="6" y="4" width="4" height="16" rx="1" />
                          <rect x="14" y="4" width="4" height="16" rx="1" />
                        </svg>
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                        <span>Start</span>
                      </>
                    )}
                  </button>

                  {/* Skip Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      skipTimer();
                    }}
                    className="p-2 rounded-xl border text-xs font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5 border-[#cbd5e1] dark:border-[#222d3d] text-[#64748b] dark:text-[#7e8c9f] hover:text-[#0f172a] dark:hover:text-white cursor-pointer active:scale-95"
                    title="Skip to next session"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 4 15 12 5 20 5 4" />
                      <line x1="19" y1="5" x2="19" y2="19" strokeWidth="2" stroke="currentColor" />
                    </svg>
                  </button>

                  {/* Browser Mini Pop-up Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleMiniWindow();
                    }}
                    className={`p-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer active:scale-95 ${
                      isMiniWindowActive
                        ? "border-current"
                        : "hover:bg-black/5 dark:hover:bg-white/5 border-[#cbd5e1] dark:border-[#222d3d] text-[#64748b] dark:text-[#7e8c9f] hover:text-[#0f172a] dark:hover:text-white"
                    }`}
                    style={
                      isMiniWindowActive
                        ? {
                            backgroundColor: isDark ? colors.containerDark : colors.container,
                            borderColor: activeBorder,
                            color: activeColor,
                          }
                        : undefined
                    }
                    title={isMiniWindowActive ? "Close browser mini pop-up" : "Open browser mini pop-up"}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <rect x="12" y="9" width="8" height="6" rx="1" ry="1" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 3. Progress Track */}
              <div className="w-full h-1.5 rounded-sm overflow-hidden bg-[#e2e8f0] dark:bg-[#1c2432]">
                <div
                  className="h-full rounded-sm transition-all duration-300"
                  style={{
                    width: `${progressPercent}%`,
                    backgroundColor: activeColor,
                  }}
                />
              </div>

              {/* 4. Quick Mode Switcher Segmented Control */}
              <div
                className={`grid grid-cols-3 p-1 rounded-xl border text-xs ${
                  isDark ? "bg-[#080c12] border-[#1c2432]" : "bg-[#f1f5f9] border-[#cbd5e1]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setMode("focus")}
                  className={`py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    mode === "focus"
                      ? isDark
                        ? "bg-[#004d40] text-[#64ffda] shadow-sm border border-[#00bfa5]/40"
                        : "bg-white text-[#0f766e] shadow-sm border border-teal-300"
                      : "text-[#64748b] dark:text-[#7e8c9f] hover:text-[#0f172a] dark:hover:text-white"
                  }`}
                >
                  Focus {settings?.deepFocusMinutes ?? 25}m
                </button>
                <button
                  type="button"
                  onClick={() => setMode("shortBreak")}
                  className={`py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    mode === "shortBreak"
                      ? isDark
                        ? "bg-[#0c4a6e] text-[#38bdf8] shadow-sm border border-[#0284c7]/40"
                        : "bg-white text-[#0284c7] shadow-sm border border-sky-200"
                      : "text-[#64748b] dark:text-[#7e8c9f] hover:text-[#0f172a] dark:hover:text-white"
                  }`}
                >
                  Short {settings?.shortBreakMinutes ?? 5}m
                </button>
                <button
                  type="button"
                  onClick={() => setMode("longBreak")}
                  className={`py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    mode === "longBreak"
                      ? isDark
                        ? "bg-[#7c2d12] text-[#fb923c] shadow-sm border border-[#ea580c]/40"
                        : "bg-white text-[#ea580c] shadow-sm border border-orange-200"
                      : "text-[#64748b] dark:text-[#7e8c9f] hover:text-[#0f172a] dark:hover:text-white"
                  }`}
                >
                  Long {settings?.longBreakMinutes ?? 15}m
                </button>
              </div>

              {/* 5. Live Platform State & Stats Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Blocked Sites */}
                <Link
                  href="/blocklist"
                  onClick={() => setIsIslandOpen(false)}
                  className={`p-2.5 rounded-xl border transition-colors flex items-center justify-between group ${
                    isDark
                      ? "bg-[#0b0f17] border-[#1d2634] hover:border-[#2a3649]"
                      : "bg-[#f8fafc] border-[#e2e8f0] hover:border-[#cbd5e1]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full transition-colors shrink-0"
                      style={{ backgroundColor: activeColor }}
                    />
                    <div>
                      <div className="font-semibold text-[11px]">{blockedSitesCount} Sites</div>
                      <div className="text-[10px] text-[#64748b] dark:text-[#7e8c9f]">
                        {isBlockingActive ? "Blocking on" : isInstalled ? "Ready" : "Blocked list"}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">→</span>
                </Link>

                {/* Focus Time Today */}
                <Link
                  href="/statistics"
                  onClick={() => setIsIslandOpen(false)}
                  className={`p-2.5 rounded-xl border transition-colors flex items-center justify-between group ${
                    isDark
                      ? "bg-[#0b0f17] border-[#1d2634] hover:border-[#2a3649]"
                      : "bg-[#f8fafc] border-[#e2e8f0] hover:border-[#cbd5e1]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-3.5 h-3.5 transition-colors"
                      style={{ color: activeColor }}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <div>
                      <div className="font-semibold text-[11px]">{stats.todayFocusFormatted}</div>
                      <div className="text-[10px] text-[#64748b] dark:text-[#7e8c9f]">Focused Today</div>
                    </div>
                  </div>
                  <span className="text-[11px] opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">→</span>
                </Link>
              </div>

              {/* 6. Footer: Streak & Quick Status */}
              <div className={`flex items-center justify-between pt-2 border-t text-[11px] ${
                isDark ? "border-[#1d2634] text-[#7e8c9f]" : "border-[#e2e8f0] text-[#64748b]"
              }`}>
                <div className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 23c-4.97 0-9-4.03-9-9 0-3.3 1.83-6.23 4.54-7.79.46-.26 1.05.02 1.13.55.22 1.45.92 2.76 1.95 3.73.18.17.47.14.61-.07.72-1.09 1.16-2.4 1.16-3.8 0-1.74-.69-3.31-1.81-4.47-.38-.4-.14-1.06.39-1.12 3.84-.44 7.6 1.81 8.89 5.48C20.47 9.07 21 11.47 21 14c0 4.97-4.03 9-9 9z" />
                  </svg>
                  <span>{stats.currentStreak} Day Habit Streak</span>
                </div>
                <span className="text-[10px] opacity-60">Esc to close</span>
              </div>
            </div>
          </div>

          {/* Sync status / modal button */}
          <SyncButton />

          {/* Shortcuts button */}
          <Link
            href="/shortcuts"
            title="Keyboard Shortcuts (?)"
            aria-label="Keyboard Shortcuts"
            className="w-8 h-8 rounded-xl border flex items-center justify-center transition-colors hover:bg-[#f1f5f9] dark:hover:bg-[#141b24] text-[#64748b] dark:text-[#7e8c9f] hover:text-[#0f172a] dark:hover:text-white border-[#cbd5e1] dark:border-[#222d3d]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10" strokeLinecap="round" />
            </svg>
          </Link>

          {/* Theme switcher */}
          <div
            role="group"
            aria-label="Theme mode"
            className="flex items-center p-1 rounded-xl border transition-colors bg-[#f1f5f9] dark:bg-[#141b24] border-[#cbd5e1] dark:border-[#222d3d]"
          >
            <button
              onClick={() => setTheme("dark")}
              aria-label="Dark mode"
              className={`p-1.5 rounded-lg transition-all focus-visible:ring-2 focus-visible:outline-none ${
                theme === "dark"
                  ? "bg-[#1a2330] shadow-sm"
                  : "text-[#64748b] dark:text-[#7e8c9f] hover:text-[#0f172a] dark:hover:text-white"
              }`}
              style={theme === "dark" ? { color: "var(--mode-accent)" } : undefined}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            </button>
            <button
              onClick={() => setTheme("light")}
              aria-label="Light mode"
              className={`p-1.5 rounded-lg transition-all focus-visible:ring-2 focus-visible:outline-none ${
                theme === "light"
                  ? "bg-white shadow-sm"
                  : "text-[#64748b] dark:text-[#7e8c9f] hover:text-[#0f172a] dark:hover:text-white"
              }`}
              style={theme === "light" ? { color: "var(--mode-accent)" } : undefined}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            </button>
          </div>

          {/* User Profile / Guest Component */}
          <UserNav />
        </div>
      </div>
    </header>
  );
}
