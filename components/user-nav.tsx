"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSync } from "../context/sync-context";
import { useTimer } from "../context/timer-context";
import { useTheme } from "../context/theme-context";
import { useCloseOnEscape } from "../lib/overlays/use-close-on-escape";

export default function UserNav() {
  const { user, logout } = useSync();
  const { activeColor, colors } = useTimer();
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close the account menu on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [isOpen]);

  // Escape closes the menu and confirmation dialog
  useCloseOnEscape(isOpen, () => setIsOpen(false));
  useCloseOnEscape(showLogoutConfirm, () => setShowLogoutConfirm(false));

  // When no user is logged in, the Sync button in the navbar already serves as the sync/auth trigger
  if (!user) {
    return null;
  }

  const displayName = user.name || (user.email ? user.email.split("@")[0] : "User");
  const initial = (user.name || user.email || "U")[0].toUpperCase();

  const avatar = (size: string) =>
    user.avatarUrl ? (
      <img src={user.avatarUrl} alt={displayName} className={`${size} rounded-lg object-cover`} />
    ) : (
      <div
        className={`${size} rounded-lg flex items-center justify-center font-bold text-xs`}
        style={{ backgroundColor: activeColor, color: "#08101a" }}
      >
        {initial}
      </div>
    );

  const menuItemClass =
    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#18202d] transition-colors cursor-pointer";

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        onClick={() => setIsOpen((o) => !o)}
        type="button"
        title={`Signed in as ${user.email || displayName}`}
        aria-label={`Account menu for ${user.email || displayName}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex items-center gap-2 p-1 md:pr-2.5 rounded-xl border transition-all cursor-pointer shadow-xs hover:opacity-90 whitespace-nowrap shrink-0"
        style={{
          backgroundColor: isDark ? colors.containerDark : colors.container,
          borderColor: isDark ? colors.borderDark : colors.border,
          color: activeColor,
        }}
      >
        {avatar("w-6 h-6")}
        <span className="hidden md:inline text-xs font-semibold max-w-[120px] truncate whitespace-nowrap">
          {displayName}
        </span>
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 z-50 rounded-2xl border p-2 shadow-xl bg-white dark:bg-[#0e141e] border-slate-200 dark:border-[#1d2634] animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Profile header */}
          <div className="flex items-center gap-3 px-3 py-2.5">
            {avatar("w-9 h-9")}
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                {displayName}
              </div>
              {user.email && (
                <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
              )}
            </div>
          </div>

          <div className="my-1 border-t border-slate-100 dark:border-[#1a2332]" />

          <Link href="/settings" role="menuitem" className={menuItemClass} onClick={() => setIsOpen(false)}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Settings
          </Link>
          <Link href="/privacy" role="menuitem" className={menuItemClass} onClick={() => setIsOpen(false)}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Privacy &amp; data
          </Link>

          <div className="my-1 border-t border-slate-100 dark:border-[#1a2332]" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              setShowLogoutConfirm(true);
            }}
            className={`${menuItemClass} !text-rose-600 dark:!text-rose-400`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Sign out
          </button>
        </div>
      )}

      {/* Logout Confirmation & Public Computer Warning Modal - Rendered via Portal directly to body */}
      {showLogoutConfirm && mounted && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[480px] mx-auto rounded-3xl border p-6 sm:p-7 shadow-2xl relative bg-white dark:bg-[#0e141e] border-slate-200 dark:border-[#1d2634] text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-150 flex flex-col gap-4 my-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-rose-50 dark:bg-rose-950/40 text-rose-500 shrink-0">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 id="logout-title" className="text-base font-bold text-slate-900 dark:text-white whitespace-nowrap">
                    Sign Out
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate whitespace-nowrap">
                    {user.email || displayName}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1a2332] transition-colors cursor-pointer shrink-0"
                aria-label="Close dialog"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="6" />
                </svg>
              </button>
            </div>

            {/* Cloud Sync Status Confirmation - Normal Text */}
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Your focus history, custom presets, streaks, Flow XP, and achievements are safely backed up to your account.
            </p>

            {/* Shared / Public Computer Advisory - Normal Text */}
            <div className="flex flex-col gap-1 text-xs pt-1 border-t border-slate-100 dark:border-[#1a2332]">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Leaving a shared or public computer?
              </p>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Choose &ldquo;Clear this device&rdquo; so others on this computer cannot see your offline history.
              </p>
            </div>

            {/* Action Buttons - Stacked with whitespace-nowrap to prevent text wrapping */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={async () => {
                  setShowLogoutConfirm(false);
                  await logout(true);
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
              >
                Clear this device &amp; sign out
              </button>

              <button
                type="button"
                onClick={async () => {
                  setShowLogoutConfirm(false);
                  await logout(false);
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-[#18202d] transition-colors cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
              >
                Keep offline copy &amp; sign out
              </button>

              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full py-1.5 px-4 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors cursor-pointer text-center whitespace-nowrap mt-0.5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
