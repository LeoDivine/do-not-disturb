"use client";

import React from "react";
import { useTheme } from "../../context/theme-context";
import { useTimer } from "../../context/timer-context";
import { LeaderboardEntry, LeaderboardMetric } from "../../lib/leaderboard/types";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUser: LeaderboardEntry | null;
  metric: LeaderboardMetric;
  totalParticipants: number;
}

export default function LeaderboardTable({
  entries,
  currentUser,
  metric,
  totalParticipants,
}: LeaderboardTableProps) {
  const { isDark } = useTheme();
  const { activeColor } = useTimer();

  const renderRank = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="flex items-center gap-1 font-mono font-bold text-amber-500">
          <svg
            className="w-3.5 h-3.5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.45 1-1 1H7" />
            <path d="M14 14.66V17c0 .55.45 1 1 1h2" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
          </svg>
          <span>1</span>
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="flex items-center gap-1 font-mono font-bold text-slate-400">
          <svg
            className="w-3.5 h-3.5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="8" r="6" />
            <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
          </svg>
          <span>2</span>
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="flex items-center gap-1 font-mono font-bold text-amber-600 dark:text-amber-500">
          <svg
            className="w-3.5 h-3.5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="8" r="6" />
            <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
          </svg>
          <span>3</span>
        </span>
      );
    }

    return (
      <span
        className={`font-mono text-xs ${
          isDark ? "text-[#7e8c9f]" : "text-[#64748b]"
        }`}
      >
        {rank}
      </span>
    );
  };

  const renderAvatar = (entry: LeaderboardEntry) => {
    const initial = (entry.name || "U")[0].toUpperCase();

    if (entry.avatarUrl) {
      return (
        <img
          src={entry.avatarUrl}
          alt={entry.name}
          className="w-7 h-7 rounded-full object-cover shrink-0"
        />
      );
    }

    return (
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center font-medium text-[11px] shrink-0 select-none ${
          isDark ? "bg-[#161f2e] text-[#94a3b8]" : "bg-[#f1f5f9] text-[#64748b]"
        }`}
        style={
          entry.isCurrentUser
            ? {
                color: activeColor,
                border: `1px solid ${activeColor}`,
              }
            : undefined
        }
      >
        {initial}
      </div>
    );
  };

  const getMetricHeader = () => {
    if (metric === "hours") return "Focus Time";
    if (metric === "streak") return "Daily Streak";
    return "Focus XP";
  };

  return (
    <div
      className={`rounded-xl border transition-colors overflow-hidden ${
        isDark
          ? "bg-[#101620] border-[#1d2634] text-[#f1f5f9]"
          : "bg-white border-[#e2e8f0] text-[#0f172a]"
      }`}
    >
      {/* Table Header */}
      <div className="p-4 sm:p-5 border-b border-[#e2e8f0] dark:border-[#1d2634] flex items-center justify-between">
        <h2
          className={`text-sm font-semibold tracking-tight ${
            isDark ? "text-white" : "text-[#0f172a]"
          }`}
        >
          Community Rankings
        </h2>

        <span
          className={`text-xs font-mono ${
            isDark ? "text-[#7e8c9f]" : "text-[#64748b]"
          }`}
        >
          {totalParticipants <= 25
            ? `All ${totalParticipants} focusers`
            : `Top 25 Focusers (of ${totalParticipants} total)`}
        </span>
      </div>

      {/* Standings Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr
              className={`border-b text-[10px] uppercase font-bold tracking-wider ${
                isDark
                  ? "border-[#1d2634] text-[#7e8c9f] bg-[#0c1017]/40"
                  : "border-[#e2e8f0] text-[#64748b] bg-[#f8fafc]"
              }`}
            >
              <th className="py-2.5 px-4 sm:px-6 w-14 font-mono">Rank</th>
              <th className="py-2.5 px-4 sm:px-6">Focuser</th>
              <th className="py-2.5 px-4 sm:px-6 text-right font-semibold">
                {getMetricHeader()}
              </th>
              <th className="py-2.5 px-4 sm:px-6 text-right hidden sm:table-cell">
                <span className="flex items-center justify-end gap-1">
                  <svg
                    className="w-3 h-3 text-slate-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>Focus Time</span>
                </span>
              </th>
              <th className="py-2.5 px-4 sm:px-6 text-right hidden md:table-cell">
                <span className="flex items-center justify-end gap-1">
                  <svg
                    className="w-3 h-3 text-slate-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                  </svg>
                  <span>Daily Streak</span>
                </span>
              </th>
              <th className="py-2.5 px-4 sm:px-6 text-right hidden lg:table-cell">
                <span className="flex items-center justify-end gap-1">
                  <svg
                    className="w-3 h-3 text-slate-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span>Distractions Blocked</span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e8f0] dark:divide-[#1d2634]">
            {entries.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-12 text-center text-xs text-[#7e8c9f]"
                >
                  No focus sessions logged yet. Complete your first focus session to join the leaderboard!
                </td>
              </tr>
            ) : (
              entries.map((entry, index) => {
                const isUser = entry.isCurrentUser;
                const isGapBeforeRow =
                  index > 0 && entry.rank > entries[index - 1].rank + 1;

                return (
                  <React.Fragment key={entry.id}>
                    {isGapBeforeRow && (
                      <tr className="border-b border-[#e2e8f0] dark:border-[#1d2634]">
                        <td
                          colSpan={6}
                          className={`py-2 px-6 text-center font-mono text-[11px] ${
                            isDark ? "text-[#7e8c9f] bg-[#0b0f17]" : "text-[#94a3b8] bg-[#f8fafc]"
                          }`}
                        >
                          ... Ranks #{entries[index - 1].rank + 1} to #{entry.rank - 1} ...
                        </td>
                      </tr>
                    )}
                    <tr
                      id={isUser ? "current-user-row" : undefined}
                      className={`transition-colors ${
                        isUser
                          ? isDark
                            ? "bg-[#142032] font-semibold"
                            : "bg-[#f0fdfa] font-semibold"
                          : isDark
                          ? "hover:bg-[#131b27]"
                          : "hover:bg-[#f8fafc]"
                      }`}
                      style={
                        isUser
                          ? {
                              borderLeft: `3px solid ${activeColor}`,
                            }
                          : undefined
                      }
                    >
                      {/* Rank */}
                      <td className="py-3 px-4 sm:px-6 whitespace-nowrap">
                        {renderRank(entry.rank)}
                      </td>

                      {/* Participant */}
                      <td className="py-3 px-4 sm:px-6">
                        <div className="flex items-center gap-2.5">
                          {renderAvatar(entry)}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`truncate font-medium ${
                                  isUser
                                    ? ""
                                    : isDark
                                    ? "text-white"
                                    : "text-[#0f172a]"
                                }`}
                                style={isUser ? { color: activeColor } : undefined}
                              >
                                {entry.name}
                              </span>
                              {isUser && (
                                <span
                                  className="text-[10px] font-mono uppercase font-bold"
                                  style={{ color: activeColor }}
                                >
                                  (You)
                                </span>
                              )}
                            </div>
                            <div
                              className={`text-[10px] truncate ${
                                isDark ? "text-[#7e8c9f]" : "text-[#64748b]"
                              }`}
                            >
                              Level {entry.level} • {entry.levelTitle}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Score */}
                      <td className="py-3 px-4 sm:px-6 text-right whitespace-nowrap font-mono tabular-nums">
                        <span
                          className={`font-semibold ${
                            entry.rank === 1
                              ? "text-amber-500 font-bold"
                              : isUser
                              ? ""
                              : ""
                          }`}
                          style={isUser && entry.rank !== 1 ? { color: activeColor } : undefined}
                        >
                          {entry.scoreDisplay}
                        </span>
                      </td>

                      {/* Hours */}
                      <td
                        className={`py-3 px-4 sm:px-6 text-right whitespace-nowrap hidden sm:table-cell font-mono tabular-nums ${
                          isDark ? "text-[#7e8c9f]" : "text-[#64748b]"
                        }`}
                      >
                        {entry.focusHours.toFixed(1)}h
                      </td>

                      {/* Streak */}
                      <td
                        className={`py-3 px-4 sm:px-6 text-right whitespace-nowrap hidden md:table-cell font-mono tabular-nums ${
                          isDark ? "text-[#7e8c9f]" : "text-[#64748b]"
                        }`}
                      >
                        {entry.streak > 0 ? `${entry.streak}d` : "—"}
                      </td>

                      {/* Shields */}
                      <td
                        className={`py-3 px-4 sm:px-6 text-right whitespace-nowrap hidden lg:table-cell font-mono tabular-nums ${
                          isDark ? "text-[#7e8c9f]" : "text-[#64748b]"
                        }`}
                      >
                        {entry.shieldsRepelled > 0 ? entry.shieldsRepelled : "—"}
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer: Always confirm user's position */}
      {currentUser && (
        <div
          className={`p-3.5 border-t flex items-center justify-between text-xs font-mono ${
            isDark
              ? "bg-[#0c1017] border-[#1d2634] text-[#7e8c9f]"
              : "bg-[#f8fafc] border-[#e2e8f0] text-[#64748b]"
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className="font-bold"
              style={{ color: activeColor }}
            >
              Your Position:
            </span>
            <span className="font-semibold text-slate-900 dark:text-white">
              Rank #{currentUser.rank} of {totalParticipants}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span>Your Focus XP:</span>
            <span
              className="font-bold text-slate-900 dark:text-white"
            >
              {currentUser.scoreDisplay}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
