"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "../../context/theme-context";
import { useTimer } from "../../context/timer-context";
import { useSync } from "../../context/sync-context";
import {
  getStoredGamification,
  GAMIFICATION_UPDATED_EVENT,
} from "../../lib/gamification/gamification-store";
import {
  getSessionStats,
  SESSIONS_UPDATED_EVENT,
} from "../../lib/sessions/session-store";
import { getTotalDeflections } from "../../lib/blocking/blocklist-store";
import {
  LeaderboardMetric,
  LeaderboardResponse,
  LeaderboardTimeframe,
} from "../../lib/leaderboard/types";
import LeaderboardHero from "../../components/leaderboard/leaderboard-hero";
import LeaderboardTable from "../../components/leaderboard/leaderboard-table";

export default function LeaderboardPage() {
  const { isDark } = useTheme();
  const { activeColor } = useTimer();
  const { user } = useSync();

  const metric: LeaderboardMetric = "xp";
  const timeframe: LeaderboardTimeframe = "all_time";
  const [loading, setLoading] = useState<boolean>(true);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardResponse | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      const gamification = getStoredGamification();
      const stats = getSessionStats();
      const shields = getTotalDeflections();

      const hours = parseFloat(stats.totalFocusHours) || 0;
      const streak = stats.currentStreak || 0;
      const name = user?.name || (user?.email ? user.email.split("@")[0] : "You");

      const queryParams = new URLSearchParams({
        metric,
        timeframe,
        guestXp: String(gamification.totalXp || 0),
        guestHours: String(hours),
        guestStreak: String(streak),
        guestShields: String(shields || gamification.totalShieldsRepelled || 0),
        guestLevel: String(gamification.level || 1),
        guestName: name,
      });

      const res = await fetch(`/api/leaderboard?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load leaderboard");
      }
      const json = await res.json();
      if (json.success && json.data) {
        setLeaderboardData(json.data);
      }
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
    } finally {
      setLoading(false);
    }
  }, [metric, timeframe, user]);

  useEffect(() => {
    fetchLeaderboard();

    const handleUpdate = () => {
      fetchLeaderboard();
    };

    window.addEventListener(GAMIFICATION_UPDATED_EVENT as any, handleUpdate);
    window.addEventListener(SESSIONS_UPDATED_EVENT as any, handleUpdate);

    return () => {
      window.removeEventListener(GAMIFICATION_UPDATED_EVENT as any, handleUpdate);
      window.removeEventListener(SESSIONS_UPDATED_EVENT as any, handleUpdate);
    };
  }, [fetchLeaderboard]);

  const handleScrollToUser = () => {
    const target = document.getElementById("current-user-row");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const currentUser = leaderboardData?.currentUser;
  const userAbove = leaderboardData?.userAbove;

  return (
    <main className="max-w-[1360px] w-full mx-auto px-4 py-5 sm:p-6 md:p-8 flex flex-col gap-6 pb-10">
      {/* Minimal Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1
            className={`text-xl sm:text-2xl font-bold tracking-tight ${
              isDark ? "text-white" : "text-[#0f172a]"
            }`}
          >
            Leaderboard
          </h1>
          <p
            className={`text-xs mt-1 max-w-xl leading-relaxed ${
              isDark ? "text-[#7e8c9f]" : "text-[#64748b]"
            }`}
          >
            See where you stand in the focus community, who is leading the way,
            and how close you are to reaching the next rank.
          </p>
        </div>

        {/* Refresh Control */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={fetchLeaderboard}
            disabled={loading}
            aria-label="Refresh leaderboard"
            title="Refresh leaderboard"
            className={`p-1.5 transition-colors cursor-pointer ${
              isDark
                ? "text-[#7e8c9f] hover:text-white"
                : "text-[#64748b] hover:text-[#0f172a]"
            } ${loading ? "animate-spin" : ""}`}
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Board Content */}
      {leaderboardData ? (
        <div className="flex flex-col gap-5">
          {/* Hero Row: First Place, Your Position, and Who Is Above You */}
          <LeaderboardHero
            data={leaderboardData}
            onScrollToUser={handleScrollToUser}
          />

          {/* Standings Table capped at 25 records */}
          <LeaderboardTable
            entries={leaderboardData.topEntries}
            currentUser={leaderboardData.currentUser}
            metric={leaderboardData.metric}
            totalParticipants={leaderboardData.totalParticipants}
          />
        </div>
      ) : (
        /* Minimal loading skeleton */
        <div className="py-20 flex flex-col items-center justify-center gap-2.5">
          <div
            className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: activeColor, borderTopColor: "transparent" }}
          />
          <span
            className={`text-xs font-mono ${
              isDark ? "text-[#7e8c9f]" : "text-[#64748b]"
            }`}
          >
            Querying database records...
          </span>
        </div>
      )}
    </main>
  );
}
