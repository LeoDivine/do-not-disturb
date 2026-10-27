"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "../../context/theme-context";
import { useTimer } from "../../context/timer-context";
import {
  getStoredSessions,
  clearStoredSessions,
  getSessionStats,
  SESSIONS_UPDATED_EVENT,
  SessionHistoryRecord,
  SessionStats,
  EMPTY_SESSION_STATS,
} from "../../lib/sessions/session-store";
import {
  getTotalDeflections,
  DEFLECTIONS_UPDATED_EVENT,
} from "../../lib/blocking/blocklist-store";

export default function StatisticsPage() {
  const { isDark } = useTheme();
  const { mode, colors, activeColor, activeContainer, activeBorder } = useTimer();

  const [records, setRecords] = useState<SessionHistoryRecord[]>([]);
  const [stats, setStats] = useState<SessionStats>(EMPTY_SESSION_STATS);
  const [totalDeflections, setTotalDeflections] = useState<number>(0);

  useEffect(() => {
    const refresh = () => {
      setRecords(getStoredSessions());
      setStats(getSessionStats());
      setTotalDeflections(getTotalDeflections());
    };

    refresh();

    window.addEventListener(SESSIONS_UPDATED_EVENT as any, refresh);
    window.addEventListener(DEFLECTIONS_UPDATED_EVENT as any, refresh);
    window.addEventListener("dnd-blocklist-updated" as any, refresh);

    return () => {
      window.removeEventListener(SESSIONS_UPDATED_EVENT as any, refresh);
      window.removeEventListener(DEFLECTIONS_UPDATED_EVENT as any, refresh);
      window.removeEventListener("dnd-blocklist-updated" as any, refresh);
    };
  }, []);

  const handleClearHistory = () => {
    if (confirm("Are you sure you want to clear your local focus history?")) {
      clearStoredSessions();
      setRecords([]);
      setStats(getSessionStats());
    }
  };

  const weeklyHoursNum = parseFloat(stats.weeklyFocusHours) || 0;
  const targetWeeklyGoal = 28;
  const weeklyProgressPercent = Math.min(100, Math.round((weeklyHoursNum / targetWeeklyGoal) * 100));

  return (
    <main className="max-w-[1360px] w-full mx-auto p-6 md:p-8 flex flex-col gap-6">
      {/* Top 4 Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1: Net Focused Time */}
        <div className={`p-6 rounded-2xl border transition-colors ${
          isDark ? "bg-[#101620] border-[#1d2634] text-[#f1f5f9]" : "bg-white border-[#e2e8f0] text-[#0f172a] shadow-sm"
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
              TIME FOCUSED
            </span>
            <svg
              className="w-4 h-4 transition-colors"
              style={{ color: activeColor }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="flex items-baseline gap-1.5 mb-3">
            <span className={`text-4xl font-bold tracking-tight ${isDark ? "text-white" : "text-[#0f172a]"}`}>
              {stats.totalFocusHours}
            </span>
            <span className={`text-xs font-medium ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>hrs</span>
          </div>
          <div className={`flex items-center justify-between text-[11px] mb-1.5 ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
            <span>Target: {targetWeeklyGoal} hrs/wk</span>
            <span
              className="font-semibold"
              style={{ color: activeColor }}
            >
              {weeklyProgressPercent}%
            </span>
          </div>
          <div className={`w-full h-1.5 rounded-sm overflow-hidden ${isDark ? "bg-[#1c2432]" : "bg-[#e2e8f0]"}`}>
            <div
              className="h-full rounded-sm transition-all duration-500"
              style={{ width: `${weeklyProgressPercent}%`, backgroundColor: activeColor }}
            />
          </div>
        </div>

        {/* Metric 2: Sessions Finished */}
        <div className={`p-6 rounded-2xl border transition-colors ${
          isDark ? "bg-[#101620] border-[#1d2634] text-[#f1f5f9]" : "bg-white border-[#e2e8f0] text-[#0f172a] shadow-sm"
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
              SESSIONS FINISHED
            </span>
            <svg
              className="w-4 h-4 transition-colors"
              style={{ color: activeColor }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="flex items-baseline gap-1.5 mb-3">
            <span className={`text-4xl font-bold tracking-tight ${isDark ? "text-white" : "text-[#0f172a]"}`}>
              {stats.completedCount}
            </span>
            <span className={`text-xs font-medium ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
              / {stats.totalCount}
            </span>
          </div>
          <div className={`flex items-center justify-between text-[11px] mb-1.5 ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
            <span>Completion rate</span>
            <span
              className="font-semibold"
              style={{ color: activeColor }}
            >
              {stats.completionRate}
            </span>
          </div>
          <div className={`w-full h-1.5 rounded-sm overflow-hidden ${isDark ? "bg-[#1c2432]" : "bg-[#e2e8f0]"}`}>
            <div
              className="h-full rounded-sm transition-all duration-500"
              style={{ width: stats.completionRate, backgroundColor: activeColor }}
            />
          </div>
        </div>

        {/* Metric 3: Distractions Prevented */}
        <div className={`p-6 rounded-2xl border transition-colors ${
          isDark ? "bg-[#101620] border-[#1d2634] text-[#f1f5f9]" : "bg-white border-[#e2e8f0] text-[#0f172a] shadow-sm"
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
              DISTRACTIONS PREVENTED
            </span>
            <span className="w-2 h-2 rounded-full bg-orange-500" />
          </div>
          <div className="flex items-baseline gap-1.5 mb-3">
            <span className={`text-4xl font-bold tracking-tight ${isDark ? "text-white" : "text-[#0f172a]"}`}>
              {totalDeflections}
            </span>
            <span className={`text-xs font-medium ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>visits</span>
          </div>
          <div className={`flex items-center justify-between text-[11px] ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
            <span>Pure flow</span>
            <span className="text-emerald-500 dark:text-emerald-400 font-semibold">{stats.distractionFreeRate}</span>
          </div>
        </div>

        {/* Metric 4: Current Streak */}
        <div className={`p-6 rounded-2xl border transition-colors ${
          isDark ? "bg-[#101620] border-[#1d2634] text-[#f1f5f9]" : "bg-white border-[#e2e8f0] text-[#0f172a] shadow-sm"
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
              CURRENT STREAK
            </span>
            <svg
              className="w-4 h-4 transition-colors"
              style={{ color: activeColor }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <div className="flex items-baseline gap-1.5 mb-3">
            <span className={`text-4xl font-bold tracking-tight ${isDark ? "text-white" : "text-[#0f172a]"}`}>
              {stats.currentStreak}
            </span>
            <span className={`text-xs font-medium ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
              {stats.currentStreak === 1 ? "day" : "days"}
            </span>
          </div>
          <div className={`flex items-center justify-between text-[11px] ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
            <span>Personal best</span>
            <span className={`font-semibold ${isDark ? "text-white" : "text-[#0f172a]"}`}>
              {stats.longestStreak} {stats.longestStreak === 1 ? "day" : "days"}
            </span>
          </div>
        </div>
      </div>

      {/* Middle Row: Weekly Focus Rhythm & Peak Cognitive Window */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Weekly Focus Rhythm Chart */}
        <div className={`lg:col-span-7 p-7 rounded-2xl border flex flex-col justify-between transition-colors ${
          isDark ? "bg-[#101620] border-[#1d2634] text-[#f1f5f9]" : "bg-white border-[#e2e8f0] text-[#0f172a] shadow-sm"
        }`}>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
                FOCUS RHYTHM
              </span>
              <div className={`flex items-center gap-4 text-xs ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
                <span className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-sm transition-colors"
                    style={{ backgroundColor: activeColor }}
                  />
                  <span>Recorded</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={`w-4 h-0.5 border-t border-dashed ${isDark ? "border-[#7e8c9f]" : "border-[#94a3b8]"}`} />
                  <span>Daily Goal (4.0h)</span>
                </span>
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-8">
              <h2 className={`text-base font-bold tracking-tight ${isDark ? "text-white" : "text-[#0f172a]"}`}>
                Weekly Focus Rhythm
              </h2>
              <span className={`text-xs ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
                • {stats.weekDateRange}
              </span>
            </div>
          </div>

          {/* Bar chart with 4.0h reference line */}
          <div className="relative pt-6 pb-2">
            <div className={`absolute top-[35%] left-0 right-0 border-t border-dashed z-0 flex justify-end ${
              isDark ? "border-[#283548]" : "border-[#cbd5e1]"
            }`}>
              <span className={`text-[10px] -mt-3.5 pr-1 ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
                4.0h Target
              </span>
            </div>

            <div className="relative z-10 flex items-end justify-between gap-3 h-48">
              {stats.daysThisWeek.map((bar, i) => {
                const maxVal = Math.max(6, ...stats.daysThisWeek.map((d) => d.hours));
                const heightPercent = bar.hours > 0 ? (bar.hours / maxVal) * 100 : 4;

                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-2 group">
                    {bar.label ? (
                      <span
                        className={`text-[10.5px] font-bold transition-colors ${
                          bar.isToday ? "" : isDark ? "text-[#f1f5f9]" : "text-[#0f172a]"
                        }`}
                        style={bar.isToday ? { color: activeColor } : undefined}
                      >
                        {bar.label}
                      </span>
                    ) : (
                      <span className="text-[10.5px] opacity-0">-</span>
                    )}
                    <div
                      style={{
                        height: `${heightPercent}%`,
                        backgroundColor: bar.isToday && bar.hours > 0 ? activeColor : undefined,
                      }}
                      title={`${bar.fullDate}: ${bar.hours > 0 ? `${bar.hours}h focus time` : "No sessions logged"}`}
                      className={`w-full max-w-[52px] rounded-lg transition-all ${
                        bar.isToday && bar.hours > 0
                          ? "shadow-sm"
                          : bar.hours === 0
                          ? isDark ? "bg-[#17202c]" : "bg-[#e2e8f0]"
                          : isDark
                          ? "bg-gradient-to-t from-[#004d40] to-[#64ffda]"
                          : "bg-gradient-to-t from-[#ccfbf1] to-[#0f766e]"
                      }`}
                    />
                    <div className="flex flex-col items-center mt-1 text-center">
                      <span
                        className={`text-xs flex items-center justify-center gap-1 transition-colors ${
                          bar.isToday ? "font-bold" : "font-medium"
                        } ${bar.isToday ? "" : isDark ? "text-[#f1f5f9]" : "text-[#0f172a]"}`}
                        style={bar.isToday ? { color: activeColor } : undefined}
                      >
                        <span>{bar.day}</span>
                        {bar.isToday && (
                          <span
                            className="w-1.5 h-1.5 rounded-full animate-pulse"
                            style={{ backgroundColor: activeColor }}
                            title="Today"
                          />
                        )}
                      </span>
                      <span
                        className={`text-[10px] tracking-tight transition-colors ${
                          bar.isToday ? "font-semibold" : isDark ? "text-[#7e8c9f]" : "text-[#64748b]"
                        }`}
                        style={bar.isToday ? { color: activeColor } : undefined}
                      >
                        {bar.dateFormatted}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Diurnal Chronobiology & Peak Cognitive Window */}
        <div className={`lg:col-span-5 rounded-2xl border overflow-hidden flex flex-col justify-between transition-colors ${
          isDark ? "bg-[#101620] border-[#1d2634] text-[#f1f5f9]" : "bg-white border-[#e2e8f0] text-[#0f172a] shadow-sm"
        }`}>
          {/* Header Banner */}
          <div className="h-32 w-full relative p-5 flex flex-col justify-end overflow-hidden group">
            <img
              src="https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80"
              alt="Golden sunrise representing peak morning focus"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div
              className={`absolute inset-0 transition-opacity ${
                isDark
                  ? "bg-gradient-to-t from-[#101620] via-[#101620]/75 to-black/30"
                  : "bg-gradient-to-t from-white via-white/80 to-black/20"
              }`}
            />
            <div
              className="relative z-10 flex items-center justify-between"
              style={{ color: activeColor }}
            >
              <div className="flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider">
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center backdrop-blur-md"
                  style={{
                    backgroundColor: isDark ? "rgba(16, 22, 32, 0.85)" : "rgba(255, 255, 255, 0.85)",
                    borderColor: activeBorder,
                  }}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  </svg>
                </div>
                <span>WHEN YOU WORK BEST</span>
              </div>
            </div>
          </div>

          <div className="p-6 pt-2 flex flex-col justify-between flex-1">
            <div>
              <h2 className={`text-base font-bold tracking-tight mb-2 ${isDark ? "text-white" : "text-[#0f172a]"}`}>
                Your Peak Focus Hours
              </h2>
              <p className={`text-xs leading-relaxed mb-5 ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
                {stats.peakWindow
                  ? stats.peakWindow.description
                  : "Complete at least 3 focus sessions to uncover your natural peak productivity window and cognitive rhythm."}
              </p>
            </div>

            {/* Optimal Phase Bar */}
            <div className={`p-4 rounded-xl border mb-5 transition-colors ${
              isDark ? "bg-[#0b0f17] border-[#1d2634] text-[#f1f5f9]" : "bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a]"
            }`}>
              <div className="flex items-center justify-between text-xs mb-3">
                <span className={isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}>Best Focus Window</span>
                <span
                  className="font-bold transition-colors"
                  style={{ color: activeColor }}
                >
                  {stats.peakWindow
                    ? `${stats.peakWindow.start} — ${stats.peakWindow.end}`
                    : "Awaiting 3 sessions"}
                </span>
              </div>

              <div className={`w-full h-3 rounded-md relative mb-2 overflow-hidden flex ${
                isDark ? "bg-[#17202c]" : "bg-[#e2e8f0]"
              }`}>
                <div className={`w-[20%] h-full ${isDark ? "bg-[#121924]" : "bg-[#cbd5e1]"}`} />
                <div
                  className="w-[35%] h-full border-x relative flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: isDark ? colors.containerDark : colors.container,
                    borderColor: activeColor,
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shadow-sm"
                    style={{ backgroundColor: activeColor }}
                  />
                </div>
                <div className={`w-[45%] h-full ${isDark ? "bg-[#121924]" : "bg-[#cbd5e1]"}`} />
              </div>
              <div className={`flex justify-between text-[10px] ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
                <span>06:00</span>
                <span
                  className="font-medium transition-colors"
                  style={{ color: activeColor }}
                >
                  {stats.peakWindow ? `Peak window (${stats.peakWindow.durationHours})` : "Peak window"}
                </span>
                <span>14:00</span>
                <span>22:00</span>
              </div>
            </div>

            {/* Focus Efficacy Callout */}
            <div className={`p-4 rounded-xl border flex items-start gap-3 mb-3 transition-colors ${
              isDark ? "bg-[#0b0f17] border-[#1d2634] text-[#f1f5f9]" : "bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a]"
            }`}>
              <span
                className="w-2 h-2 mt-1.5 shrink-0 rounded-full transition-colors animate-pulse"
                style={{ backgroundColor: activeColor }}
              />
              <div>
                <h3 className={`text-xs font-semibold ${isDark ? "text-white" : "text-[#0f172a]"}`}>
                  {stats.distractionFreeRate} Distraction Free
                </h3>
                <p className={`text-[11px] mt-0.5 leading-normal ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
                  {stats.totalCount > 0
                    ? "Keep up the momentum and protect your focus intervals."
                    : "Start your first focus session to build momentum."}
                </p>
              </div>
            </div>

            <div className={`text-[10px] text-center ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
              {stats.peakWindow
                ? stats.peakWindow.confidenceText
                : `Based on ${stats.totalCount} recorded focus session${stats.totalCount === 1 ? "" : "s"}`}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Telemetry Log & Intercept History */}
      <div className={`p-7 rounded-2xl border transition-colors ${
        isDark ? "bg-[#101620] border-[#1d2634] text-[#f1f5f9]" : "bg-white border-[#e2e8f0] text-[#0f172a] shadow-sm"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
              SESSION HISTORY
            </span>
            <h2 className={`text-base font-bold tracking-tight ${isDark ? "text-white" : "text-[#0f172a]"}`}>
              Past Sessions &amp; Distraction Log
            </h2>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className={isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}>
              Showing {records.length} session{records.length === 1 ? "" : "s"}
            </span>
            {records.length > 0 && (
              <button
                onClick={handleClearHistory}
                className={`hover:underline flex items-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none rounded px-2 py-1 ${
                  isDark ? "text-[#7e8c9f] hover:text-white" : "text-[#64748b] hover:text-[#0f172a]"
                }`}
                style={{ outlineColor: activeColor }}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                <span>Clear History</span>
              </button>
            )}
          </div>
        </div>

        {/* Sessions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className={`border-b ${isDark ? "border-[#1d2634] text-[#7e8c9f]" : "border-[#e2e8f0] text-[#64748b]"}`}>
                <th className="pb-3 font-semibold uppercase tracking-wider">SESSION</th>
                <th className="pb-3 font-semibold uppercase tracking-wider">DATE &amp; TIME</th>
                <th className="pb-3 font-semibold uppercase tracking-wider">FOCUS TYPE</th>
                <th className="pb-3 font-semibold uppercase tracking-wider">PLANNED / DONE</th>
                <th className="pb-3 font-semibold uppercase tracking-wider">DISTRACTIONS STOPPED</th>
                <th className="pb-3 font-semibold uppercase tracking-wider text-right">RESULT</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? "divide-[#1d2634]" : "divide-[#e2e8f0]"}`}>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`py-12 text-center italic ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
                    No focus history recorded yet. Completed focus sessions will appear here.
                  </td>
                </tr>
              ) : (
                records.map((row) => (
                  <tr
                    key={row.id}
                    className="transition-colors hover:bg-[#f8fafc] dark:hover:bg-[#141b24]/50"
                  >
                    <td
                      className="py-3.5 font-mono font-medium transition-colors"
                      style={{ color: activeColor }}
                    >
                      {row.sessionCode || row.id}
                    </td>
                    <td className={`py-3.5 ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
                      {row.timeDisplay}
                    </td>
                    <td className="py-3.5">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 w-max ${
                        isDark ? "bg-[#0b0f17] border border-[#1d2634] text-[#f1f5f9]" : "bg-[#f8fafc] border border-[#cbd5e1] text-[#0f172a]"
                      }`}>
                        <span
                          className="w-1.5 h-1.5 rounded-full transition-colors"
                          style={{ backgroundColor: activeColor }}
                        />
                        <span>{row.protocol}</span>
                      </span>
                    </td>
                    <td className={`py-3.5 font-mono ${row.targetAlert ? "text-red-500" : isDark ? "text-[#f1f5f9]" : "text-[#0f172a]"}`}>
                      {row.target}
                    </td>
                    <td className={`py-3.5 ${row.blockColor}`}>{row.blocks}</td>
                    <td className="py-3.5 text-right">
                      {row.statusSuccess ? (
                        <span
                          className="font-medium flex items-center justify-end gap-1 transition-colors"
                          style={{ color: activeColor }}
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>{row.status}</span>
                        </span>
                      ) : (
                        <span className="text-red-500 font-medium flex items-center justify-end gap-1">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                          </svg>
                          <span>{row.status}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
