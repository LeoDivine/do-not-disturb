"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme } from "../context/theme-context";
import { useTimer } from "../context/timer-context";
import { useCloseOnEscape } from "../lib/overlays/use-close-on-escape";
import SyncButton from "./sync-button";
import UserNav from "./user-nav";
import NavbarLevelPill from "./gamification/navbar-level-pill";

export default function Navbar() {
  const pathname = usePathname();
  const { setTheme, isDark } = useTheme();
  const {
    mode,
    setMode,
    colors,
    activeColor,
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
    settings,
  } = useTimer();

  const [isIslandOpen, setIsIslandOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const islandRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  // Close island and mobile menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (islandRef.current && !islandRef.current.contains(e.target as Node)) {
        setIsIslandOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    if (isIslandOpen || isMobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isIslandOpen, isMobileMenuOpen]);

  // Escape closes the island and mobile menu
  useCloseOnEscape(isIslandOpen || isMobileMenuOpen, () => {
    setIsIslandOpen(false);
    setIsMobileMenuOpen(false);
  });

  // Close island and mobile menu on route change
  useEffect(() => {
    setIsIslandOpen(false);
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Hide the global navbar on the blocked redirect page for complete zen focus
  if (pathname === "/blocked") {
    return null;
  }

  const navItems = [
    { label: "Focus", href: "/" },
    { label: "Blocklist", href: "/blocklist" },
    { label: "Leaderboard", href: "/leaderboard" },
    { label: "Statistics", href: "/statistics" },
    { label: "Connected Apps", href: "/connected-apps" },
    { label: "Settings", href: "/settings" },
  ];

  const isLinkActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    if (href === "/leaderboard") {
      return pathname === "/leaderboard";
    }
    if (href === "/statistics") {
      return pathname === "/statistics";
    }
    return pathname.startsWith(href);
  };

  const progressPercent =
    totalSeconds > 0 ? Math.round(((totalSeconds - secondsLeft) / totalSeconds) * 100) : 0;

  return (
    <header className="px-4 sm:px-6 md:px-8 py-3 border-b sticky top-0 z-40 backdrop-blur-md transition-colors border-[#e2e8f0] dark:border-[#1b2432] bg-white/95 dark:bg-[#0c1017]/95 text-[#0f172a] dark:text-[#f1f5f9]">
      <div className="max-w-[1360px] mx-auto flex items-center justify-between gap-4 flex-nowrap">
        <div className="flex items-center gap-6 lg:gap-10 shrink-0 flex-nowrap">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center shrink-0 group focus-visible:ring-2 focus-visible:outline-none rounded p-0.5 transition-opacity hover:opacity-85"
            style={{ outlineColor: "var(--mode-accent)" }}
            aria-label="Do Not Disturb Home"
          >
            <Image
              src="/logo-dark.png"
              alt="Do Not Disturb"
              width={160}
              height={34}
              priority
              className={`${isDark ? "block" : "hidden"} dark:block w-[120px] sm:w-[140px] md:w-[155px] h-auto object-contain shrink-0`}
            />
            <Image
              src="/logo-light.png"
              alt="Do Not Disturb"
              width={160}
              height={34}
              priority
              className={`${!isDark ? "block" : "hidden"} dark:hidden w-[120px] sm:w-[140px] md:w-[155px] h-auto object-contain shrink-0`}
            />
          </Link>

          {/* Primary Navigation Links — plain typography without pills or badges */}
          <nav
            className="hidden lg:flex items-center gap-6 text-[13.5px] whitespace-nowrap shrink-0 flex-nowrap"
            aria-label="Primary Navigation"
          >
            {navItems.map((item) => {
              const active = isLinkActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`py-1 transition-colors whitespace-nowrap shrink-0 focus-visible:ring-2 focus-visible:outline-none rounded ${
                    active
                      ? "font-semibold"
                      : "font-medium text-[#64748b] hover:text-[#0f172a] dark:text-[#7e8c9f] dark:hover:text-white"
                  }`}
                  style={
                    active
                      ? {
                          color: "var(--mode-accent)",
                          outlineColor: "var(--mode-accent)",
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

        {/* Right side controls — minimal, borderless, unboxed */}
        <div className="flex items-center gap-4 sm:gap-5 shrink-0 flex-nowrap">
          {/* Minimal Timer Readout Trigger */}
          <div ref={islandRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsIslandOpen((prev) => !prev)}
              aria-expanded={isIslandOpen}
              aria-label="Toggle quick timer controls"
              className={`group flex items-center gap-1.5 py-1 text-xs transition-colors cursor-pointer select-none whitespace-nowrap shrink-0 focus-visible:ring-2 focus-visible:outline-none rounded ${
                isIslandOpen || isRunning
                  ? "text-[#0f172a] dark:text-white"
                  : "text-[#64748b] hover:text-[#0f172a] dark:text-[#7e8c9f] dark:hover:text-white"
              }`}
              style={{ outlineColor: activeColor }}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full transition-colors shrink-0 ${
                  isRunning ? "animate-pulse" : ""
                }`}
                style={{ backgroundColor: activeColor }}
              />
              <span
                className="font-mono font-medium transition-colors whitespace-nowrap text-xs tabular-nums"
                style={{ color: isRunning ? activeColor : undefined }}
                suppressHydrationWarning
              >
                {formatTime(secondsLeft)}
              </span>
            </button>

            {/* Streamlined Quick Timer Popover */}
            <div
              className={`absolute right-0 top-full mt-2.5 w-[calc(100vw-1.5rem)] sm:w-80 rounded-2xl border p-4 shadow-xl backdrop-blur-2xl transition-all duration-200 z-50 origin-top-right flex flex-col gap-3.5 ${
                isIslandOpen
                  ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 scale-95 -translate-y-1 pointer-events-none"
              } ${
                isDark
                  ? "bg-[#0c1017]/95 border-[#1d2634] text-[#f1f5f9]"
                  : "bg-white/95 border-[#e2e8f0] text-[#0f172a]"
              }`}
            >
              {/* Header: Plain text mode & cycle */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold" style={{ color: activeColor }}>
                  {colors.name}
                </span>
                <span className="text-[#64748b] dark:text-[#7e8c9f]">
                  Cycle {cycle} of {totalCycles}
                </span>
              </div>

              {/* Countdown & Action Controls */}
              <div className="flex items-center justify-between gap-3">
                <div
                  className="text-2xl font-bold font-mono tracking-tight tabular-nums"
                  suppressHydrationWarning
                >
                  {formatTime(secondsLeft)}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Play / Pause Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleTimer();
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-opacity hover:opacity-90 active:scale-95 cursor-pointer"
                    style={{
                      backgroundColor: activeColor,
                      color:
                        isDark && mode === "focus"
                          ? "#00201d"
                          : isDark && mode === "shortBreak"
                          ? "#082f49"
                          : isDark && mode === "longBreak"
                          ? "#431407"
                          : "#ffffff",
                    }}
                  >
                    {isRunning ? "Pause" : "Start"}
                  </button>

                  {/* Skip Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      skipTimer();
                    }}
                    className="p-1.5 rounded-lg text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/5 text-[#64748b] dark:text-[#7e8c9f] hover:text-[#0f172a] dark:hover:text-white cursor-pointer"
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
                    className="p-1.5 rounded-lg text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/5 text-[#64748b] dark:text-[#7e8c9f] hover:text-[#0f172a] dark:hover:text-white cursor-pointer"
                    style={isMiniWindowActive ? { color: activeColor } : undefined}
                    title={isMiniWindowActive ? "Close mini timer" : "Open mini timer"}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <rect x="12" y="9" width="8" height="6" rx="1" ry="1" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Progress Track */}
              <div className="w-full h-1 rounded-sm overflow-hidden bg-[#e2e8f0] dark:bg-[#1c2432]">
                <div
                  className="h-full rounded-sm transition-all duration-300"
                  style={{
                    width: `${progressPercent}%`,
                    backgroundColor: activeColor,
                  }}
                />
              </div>

              {/* Minimal Mode Switcher */}
              <div className="flex items-center justify-between pt-1 border-t border-[#e2e8f0] dark:border-[#1d2634] text-xs">
                {(
                  [
                    { id: "focus", label: `Focus ${settings?.deepFocusMinutes ?? 25}m` },
                    { id: "shortBreak", label: `Short ${settings?.shortBreakMinutes ?? 5}m` },
                    { id: "longBreak", label: `Long ${settings?.longBreakMinutes ?? 15}m` },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMode(item.id)}
                    className={`py-1 text-[11.5px] transition-colors cursor-pointer ${
                      mode === item.id
                        ? "font-semibold"
                        : "text-[#64748b] dark:text-[#7e8c9f] hover:text-[#0f172a] dark:hover:text-white"
                    }`}
                    style={mode === item.id ? { color: activeColor } : undefined}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Desktop Controls (Hidden on mobile & tablet) */}
          <div className="hidden lg:flex items-center gap-4 shrink-0">
            <NavbarLevelPill />

            <SyncButton />

            {/* Minimal Single-Button Theme Toggle */}
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className="p-1 text-[#64748b] hover:text-[#0f172a] dark:text-[#7e8c9f] dark:hover:text-white transition-colors cursor-pointer focus-visible:ring-2 focus-visible:outline-none rounded"
            >
              {isDark ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            <UserNav />
          </div>

          {/* Mobile & Tablet Hamburger Toggle (lg:hidden) */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-expanded={isMobileMenuOpen}
            aria-label="Toggle navigation menu"
            className="lg:hidden p-1.5 text-[#64748b] dark:text-[#7e8c9f] hover:text-[#0f172a] dark:hover:text-white transition-colors cursor-pointer select-none focus-visible:ring-2 focus-visible:outline-none rounded"
            style={{
              color: isMobileMenuOpen ? activeColor : undefined,
            }}
          >
            {isMobileMenuOpen ? (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          className="lg:hidden absolute top-full left-0 w-full border-b backdrop-blur-2xl transition-all duration-200 z-50 shadow-xl bg-white/98 dark:bg-[#0c1017]/98 border-[#e2e8f0] dark:border-[#1d2634] px-4 py-4 sm:px-6 flex flex-col gap-3"
        >
          {/* Main Navigation Links — plain list without pills */}
          <nav className="flex flex-col gap-1 text-sm" aria-label="Mobile Navigation">
            {navItems.map((item) => {
              const active = isLinkActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`py-2 transition-colors flex items-center justify-between ${
                    active
                      ? "font-semibold"
                      : "font-medium text-[#64748b] dark:text-[#7e8c9f] hover:text-[#0f172a] dark:hover:text-white"
                  }`}
                  style={active ? { color: "var(--mode-accent)" } : undefined}
                >
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Minimal Controls Row */}
          <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#e2e8f0] dark:border-[#1d2634]">
            <div className="flex items-center gap-4">
              <NavbarLevelPill />
              <SyncButton />
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                className="p-1 text-[#64748b] hover:text-[#0f172a] dark:text-[#7e8c9f] dark:hover:text-white transition-colors cursor-pointer"
              >
                {isDark ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </button>

              <UserNav />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
