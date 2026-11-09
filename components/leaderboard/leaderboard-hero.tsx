"use client";

import React from "react";
import { useTheme } from "../../context/theme-context";
import { useTimer } from "../../context/timer-context";
import { LeaderboardEntry, LeaderboardResponse } from "../../lib/leaderboard/types";

interface LeaderboardHeroProps {
  data: LeaderboardResponse;
  onScrollToUser: () => void;
}

export default function LeaderboardHero({
  data,
  onScrollToUser,
}: LeaderboardHeroProps) {
  const { isDark } = useTheme();
  const { activeColor } = useTimer();

  const { firstPlace, currentUser, userAbove, totalParticipants } = data;
  const isUserFirst = currentUser?.rank === 1;

  const renderAvatar = (entry: LeaderboardEntry | null, size = "w-10 h-10") => {
    if (!entry) return null;
    const initial = (entry.name || "U")[0].toUpperCase();

    if (entry.avatarUrl) {
      return (
        <img
          src={entry.avatarUrl}
          alt={entry.name}
          className={`${size} rounded-full object-cover shrink-0`}
        />
      );
    }

    return (
      <div
        className={`${size} rounded-full flex items-center justify-center font-medium text-xs select-none shrink-0 ${
          isDark
            ? "bg-[#161f2e] text-[#94a3b8]"
            : "bg-[#f1f5f9] text-[#64748b]"
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 1. FIRST PLACE */}
      <div
        className={`p-5 rounded-xl border transition-colors flex flex-col justify-between ${
          isDark
            ? "bg-[#101620] border-[#1d2634] text-[#f1f5f9]"
            : "bg-white border-[#e2e8f0] text-[#0f172a]"
        }`}
      >
        <div>
          <div className="flex items-center justify-between mb-3 text-[11px] uppercase tracking-wider font-semibold">
            <span className="flex items-center gap-1.5 text-amber-500">
              <svg
                className="w-3.5 h-3.5"
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
              <span>First Place</span>
            </span>

            <span className="font-mono text-amber-500">
              Rank #1
            </span>
          </div>

          {firstPlace ? (
            <div className="flex items-start gap-3 my-2">
              {renderAvatar(firstPlace)}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm truncate">
                    {firstPlace.name}
                  </h3>
                  {firstPlace.isCurrentUser && (
                    <span
                      className="text-[10px] font-mono uppercase tracking-wider font-bold"
                      style={{ color: activeColor }}
                    >
                      (You)
                    </span>
                  )}
                </div>
                <p
                  className={`text-xs truncate ${
                    isDark ? "text-[#7e8c9f]" : "text-[#64748b]"
                  }`}
                >
                  Level {firstPlace.level} • {firstPlace.levelTitle}
                </p>
                <div className="mt-2 text-xl font-bold font-mono tracking-tight tabular-nums text-amber-500">
                  {firstPlace.scoreDisplay}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-[#7e8c9f]">
              No focus sessions completed yet. Start a session to claim #1!
            </div>
          )}
        </div>

        <div
          className={`pt-3 border-t text-[11px] flex items-center justify-between ${
            isDark
              ? "border-[#1d2634] text-[#7e8c9f]"
              : "border-[#e2e8f0] text-[#64748b]"
          }`}
        >
          <span>Pace Leader</span>
          <span className="font-medium text-amber-500">
            {isUserFirst ? "You're leading the community!" : "Current Leader"}
          </span>
        </div>
      </div>

      {/* 2. YOUR POSITION */}
      <div
        className={`p-5 rounded-xl border transition-colors flex flex-col justify-between ${
          isDark
            ? "bg-[#101620] border-[#1d2634] text-[#f1f5f9]"
            : "bg-white border-[#e2e8f0] text-[#0f172a]"
        }`}
        style={
          currentUser
            ? {
                borderColor: `${activeColor}40`,
              }
            : undefined
        }
      >
        <div>
          <div className="flex items-center justify-between mb-3 text-[11px] uppercase tracking-wider font-semibold">
            <span
              className="flex items-center gap-1.5"
              style={{ color: activeColor }}
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>Your Position</span>
            </span>

            {currentUser && (
              <span
                className="font-mono"
                style={{ color: activeColor }}
              >
                Rank #{currentUser.rank}
              </span>
            )}
          </div>

          {currentUser ? (
            <div className="flex items-start gap-3 my-2">
              {renderAvatar(currentUser)}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-2xl font-bold font-mono tracking-tight"
                    style={{ color: activeColor }}
                  >
                    #{currentUser.rank}
                  </span>
                  <span
                    className={`text-xs ${
                      isDark ? "text-[#7e8c9f]" : "text-[#64748b]"
                    }`}
                  >
                    of {totalParticipants} {totalParticipants === 1 ? "focuser" : "focusers"}
                  </span>
                </div>
                <p
                  className={`text-xs truncate mt-0.5 ${
                    isDark ? "text-[#7e8c9f]" : "text-[#64748b]"
                  }`}
                >
                  {currentUser.name} • Level {currentUser.level} ({currentUser.levelTitle})
                </p>
                <div className="mt-2 text-xl font-bold font-mono tracking-tight tabular-nums">
                  {currentUser.scoreDisplay}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-[#7e8c9f]">
              Start your first focus timer to earn your rank!
            </div>
          )}
        </div>

        <div
          className={`pt-3 border-t text-[11px] flex items-center justify-between ${
            isDark
              ? "border-[#1d2634] text-[#7e8c9f]"
              : "border-[#e2e8f0] text-[#64748b]"
          }`}
        >
          <span>
            {currentUser?.streak ? `${currentUser.streak} day focus streak` : "Every session counts"}
          </span>
          <button
            type="button"
            onClick={onScrollToUser}
            className="hover:underline font-medium cursor-pointer focus-visible:outline-none flex items-center gap-1"
            style={{ color: activeColor }}
          >
            <span>Jump to your row</span>
            <span>↓</span>
          </button>
        </div>
      </div>

      {/* 3. WHO IS ABOVE YOU */}
      <div
        className={`p-5 rounded-xl border transition-colors flex flex-col justify-between ${
          isDark
            ? "bg-[#101620] border-[#1d2634] text-[#f1f5f9]"
            : "bg-white border-[#e2e8f0] text-[#0f172a]"
        }`}
      >
        <div>
          <div className="flex items-center justify-between mb-3 text-[11px] uppercase tracking-wider font-semibold">
            <span
              className={`flex items-center gap-1.5 ${
                isDark ? "text-[#7e8c9f]" : "text-[#64748b]"
              }`}
            >
              <svg
                className="w-3.5 h-3.5 text-emerald-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
              <span>Who's Ahead of You</span>
            </span>

            {userAbove && (
              <span className="font-mono text-emerald-500">
                Rank #{userAbove.entry.rank}
              </span>
            )}
          </div>

          {isUserFirst ? (
            <div className="py-4 text-center">
              <div className="text-xs font-semibold text-emerald-500 mb-1">
                You're in 1st place!
              </div>
              <p
                className={`text-xs ${
                  isDark ? "text-[#7e8c9f]" : "text-[#64748b]"
                }`}
              >
                No one is ahead of you right now. Keep your focus rhythm going to protect the lead.
              </p>
            </div>
          ) : userAbove ? (
            <div className="flex items-start gap-3 my-2">
              {renderAvatar(userAbove.entry)}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm truncate">
                    {userAbove.entry.name}
                  </h3>
                  <span
                    className={`text-[11px] font-mono ${
                      isDark ? "text-[#7e8c9f]" : "text-[#64748b]"
                    }`}
                  >
                    #{userAbove.entry.rank}
                  </span>
                </div>
                <p
                  className={`text-xs truncate ${
                    isDark ? "text-[#7e8c9f]" : "text-[#64748b]"
                  }`}
                >
                  Level {userAbove.entry.level} • {userAbove.entry.levelTitle}
                </p>
                <div className="mt-2 text-xl font-bold font-mono tracking-tight tabular-nums">
                  {userAbove.entry.scoreDisplay}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-[#7e8c9f]">
              Complete a focus session to set the pace!
            </div>
          )}
        </div>

        <div
          className={`pt-3 border-t text-[11px] flex items-center justify-between ${
            isDark
              ? "border-[#1d2634] text-[#7e8c9f]"
              : "border-[#e2e8f0] text-[#64748b]"
          }`}
        >
          <span>{isUserFirst ? "Status" : "To pass them"}</span>
          <span className="font-mono font-medium text-emerald-500">
            {isUserFirst
              ? "Leading the pack"
              : userAbove
              ? userAbove.diffDisplay
              : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
