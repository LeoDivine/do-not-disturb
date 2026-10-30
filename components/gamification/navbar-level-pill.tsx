"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useTheme } from "../../context/theme-context";
import { useTimer } from "../../context/timer-context";
import { useCloseOnEscape } from "../../lib/overlays/use-close-on-escape";
import {
  getStoredGamification,
  GAMIFICATION_UPDATED_EVENT,
  useCompassionateRestToken,
} from "../../lib/gamification/gamification-store";
import { UserGamificationState } from "../../lib/gamification/types";
import {
  getSessionStats,
  SESSIONS_UPDATED_EVENT,
} from "../../lib/sessions/session-store";

export default function NavbarLevelPill() {
  const { isDark } = useTheme();
  const { activeColor, activeBorder } = useTimer();
  const [state, setState] = useState<UserGamificationState | null>(null);
  const [streak, setStreak] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setState(getStoredGamification());
    setStreak(getSessionStats().currentStreak);

    const handleGamificationUpdate = (e: CustomEvent<UserGamificationState>) => {
      if (e.detail) {
        setState(e.detail);
      } else {
        setState(getStoredGamification());
      }
    };

    const handleSessionsUpdate = () => {
      setStreak(getSessionStats().currentStreak);
    };

    window.addEventListener(
      GAMIFICATION_UPDATED_EVENT as any,
      handleGamificationUpdate
    );
    window.addEventListener(
      SESSIONS_UPDATED_EVENT as any,
      handleSessionsUpdate
    );

    return () => {
      window.removeEventListener(
        GAMIFICATION_UPDATED_EVENT as any,
        handleGamificationUpdate
      );
      window.removeEventListener(
        SESSIONS_UPDATED_EVENT as any,
        handleSessionsUpdate
      );
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Escape closes the dropdown (global close-all-overlays event)
  useCloseOnEscape(isOpen, () => setIsOpen(false));

  if (!state) return null;

  const handleUseRestToken = () => {
    const success = useCompassionateRestToken();
    if (success) {
      setState(getStoredGamification());
    }
  };

  return (
    <div ref={dropdownRef} className="relative select-none shrink-0">
      {/* Navbar Trigger Button: Clean, cohesive, with dynamic focus type colors */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="View level and habit status"
        aria-expanded={isOpen}
        className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-all duration-300 cursor-pointer select-none whitespace-nowrap shrink-0 focus-visible:ring-2 focus-visible:outline-none ${
          isOpen
            ? "shadow-md scale-[1.01]"
            : "hover:scale-[1.01] hover:shadow-xs active:scale-[0.98]"
        } ${
          isDark
            ? "bg-[#0b0f17] border-[#1d2634] text-[#7e8c9f] hover:text-white hover:border-[#2a3649]"
            : "bg-[#f8fafc] border-[#e2e8f0] text-[#64748b] hover:text-[#0f172a] hover:border-[#cbd5e1]"
        }`}
        style={{
          borderColor: isOpen ? activeBorder : undefined,
          boxShadow: isOpen
            ? `0 0 0 1px ${activeBorder}, 0 6px 20px -4px ${activeColor}25`
            : undefined,
          outlineColor: activeColor,
        }}
      >
        <span
          className="font-semibold transition-colors whitespace-nowrap"
          style={{ color: isOpen ? activeColor : undefined }}
        >
          Level {state.level}
        </span>

        <span className="text-[#94a3b8] hidden sm:inline">•</span>

        <span className="hidden lg:inline text-slate-500 dark:text-slate-400 max-w-[110px] truncate whitespace-nowrap">
          {state.title}
        </span>

        {/* Subtle mini progress bar */}
        <div className="w-10 h-1 rounded bg-[#e2e8f0] dark:bg-[#334155] overflow-hidden hidden sm:block shrink-0">
          <div
            className="h-full rounded transition-all duration-500"
            style={{
              width: `${state.levelProgressPercent}%`,
              backgroundColor: activeColor,
            }}
          />
        </div>

        {/* Streak indicator */}
        <div className="flex items-center gap-1 text-amber-500 dark:text-amber-400 font-medium pl-0.5 whitespace-nowrap shrink-0">
          <svg className="w-3.5 h-3.5 fill-current transition-transform duration-200 group-hover:scale-125" viewBox="0 0 24 24">
            <path d="M12 2c-.3 0-.6.1-.8.4C9.5 4.6 7 8.2 7 12c0 3.9 3.1 7 7 7s7-3.1 7-7c0-2.4-1.2-4.6-2.5-6.2-.3-.4-.9-.5-1.3-.2-.4.3-.5.9-.2 1.3C18 8.3 19 10 19 12c0 2.8-2.2 5-5 5s-5-2.2-5-5c0-2.6 1.7-5.3 3.5-7.3.3-.4.3-.9 0-1.3-.3-.3-.7-.4-1-.4z" />
          </svg>
          <span>{streak}d</span>
        </div>
      </button>

      {/* Popover Dropdown Card */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 rounded-2xl border bg-white dark:bg-[#0f172a] p-4 shadow-xl z-50 text-[#0f172a] dark:text-[#f8fafc] space-y-3.5 animate-pop-in"
          style={{
            borderColor: isDark ? `${activeBorder}60` : activeBorder,
            boxShadow: `0 16px 36px -10px ${activeColor}20, 0 0 0 1px ${activeBorder}30`,
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-sm text-[#0f172a] dark:text-white">
                Level {state.level} — {state.title}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {state.currentXp} of {state.nextLevelXp} XP to Level {state.level + 1}
              </p>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="space-y-1">
            <div className="w-full h-1.5 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded transition-all duration-500"
                style={{
                  width: `${state.levelProgressPercent}%`,
                  backgroundColor: activeColor,
                }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span style={{ color: activeColor }} className="font-medium">
                {state.levelProgressPercent}% progress
              </span>
              <span>{state.totalXp} total XP</span>
            </div>
          </div>

          {/* Stats Grid - clean rounded cards without uppercase pill tags */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                Distractions deflected
              </p>
              <p className="font-semibold text-sm text-slate-900 dark:text-white mt-1">
                {state.totalShieldsRepelled}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                Rest days saved
              </p>
              <div className="flex items-center justify-between mt-1">
                <span className="font-semibold text-sm text-slate-900 dark:text-white">
                  {state.streakTokens}
                </span>
                {state.streakTokens > 0 && (
                  <button
                    type="button"
                    onClick={handleUseRestToken}
                    className="text-xs hover:underline font-medium cursor-pointer transition-colors"
                    style={{ color: activeColor }}
                  >
                    Use today
                  </button>
                )}
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
            Rest days automatically safeguard your streak when you take an intentional break.
          </p>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <Link
              href="/statistics#achievements"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between text-xs font-medium transition-colors py-0.5 hover:opacity-80"
              style={{ color: activeColor }}
            >
              <span>View all focus milestones</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
