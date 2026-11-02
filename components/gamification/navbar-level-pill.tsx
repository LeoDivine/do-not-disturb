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
      {/* Minimal text trigger — no pill, border, progress bar, or badge */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="View level and habit status"
        aria-expanded={isOpen}
        className={`flex items-center gap-1.5 py-1 text-xs font-medium transition-colors cursor-pointer select-none whitespace-nowrap shrink-0 focus-visible:ring-2 focus-visible:outline-none rounded ${
          isOpen
            ? "text-[#0f172a] dark:text-white"
            : "text-[#64748b] hover:text-[#0f172a] dark:text-[#7e8c9f] dark:hover:text-white"
        }`}
        style={{
          color: isOpen ? activeColor : undefined,
          outlineColor: activeColor,
        }}
      >
        <span>Lv. {state.level}</span>
      </button>

      {/* Popover Dropdown Card */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-72 rounded-2xl border bg-white dark:bg-[#0f172a] p-4 shadow-xl z-50 text-[#0f172a] dark:text-[#f8fafc] space-y-3.5 animate-pop-in border-[#e2e8f0] dark:border-[#1d2634]"
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
            {streak > 0 && (
              <span className="text-xs font-medium text-amber-500 dark:text-amber-400">
                {streak}d streak
              </span>
            )}
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

          {/* Stats Row */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="text-slate-500 dark:text-slate-400">
              Rest days saved: <span className="font-semibold text-slate-900 dark:text-white">{state.streakTokens}</span>
            </div>
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

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <Link
              href="/statistics#achievements"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between text-xs font-medium transition-colors py-0.5 hover:opacity-80"
              style={{ color: activeColor }}
            >
              <span>View focus milestones</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
