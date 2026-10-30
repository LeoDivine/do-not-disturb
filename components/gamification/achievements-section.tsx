"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "../../context/theme-context";
import { useTimer } from "../../context/timer-context";
import {
  getAchievementsWithProgress,
  GAMIFICATION_UPDATED_EVENT,
} from "../../lib/gamification/gamification-store";
import { Achievement } from "../../lib/gamification/types";

export default function AchievementsSection() {
  const { isDark } = useTheme();
  const { activeColor, activeBorder, activeContainer, colors } = useTimer();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [filterUnlocked, setFilterUnlocked] = useState<"all" | "unlocked" | "locked">("all");

  useEffect(() => {
    setAchievements(getAchievementsWithProgress());

    const handleUpdate = () => {
      setAchievements(getAchievementsWithProgress());
    };

    window.addEventListener(GAMIFICATION_UPDATED_EVENT as any, handleUpdate);
    return () => {
      window.removeEventListener(GAMIFICATION_UPDATED_EVENT as any, handleUpdate);
    };
  }, []);

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;
  const totalCount = achievements.length;
  const totalXpPotential = achievements.reduce((acc, a) => acc + (a.isUnlocked ? a.xpReward : 0), 0);

  const filtered = achievements.filter((a) => {
    if (selectedCategory !== "all" && a.category !== selectedCategory) {
      return false;
    }
    if (filterUnlocked === "unlocked" && !a.isUnlocked) return false;
    if (filterUnlocked === "locked" && a.isUnlocked) return false;
    return true;
  });

  const renderBadgeIcon = (ach: Achievement) => {
    if (!ach.isUnlocked) {
      return (
        <svg
          className="w-4 h-4 opacity-40 text-slate-500 dark:text-slate-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    }

    switch (ach.icon) {
      case "sparkles":
        return (
          <svg className="w-4 h-4" style={{ color: activeColor }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
          </svg>
        );
      case "waves":
        return (
          <svg className="w-4 h-4" style={{ color: activeColor }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
            <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
            <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
          </svg>
        );
      case "shield-check":
      case "shield":
        return (
          <svg className="w-4 h-4" style={{ color: activeColor }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        );
      case "refresh-cw":
        return (
          <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 21h5v-5" />
          </svg>
        );
      case "target":
        return (
          <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        );
      case "zap":
        return (
          <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        );
      case "flame":
        return (
          <svg className="w-4 h-4 text-amber-500 fill-amber-500" viewBox="0 0 24 24">
            <path d="M12 2c-.3 0-.6.1-.8.4C9.5 4.6 7 8.2 7 12c0 3.9 3.1 7 7 7s7-3.1 7-7c0-2.4-1.2-4.6-2.5-6.2-.3-.4-.9-.5-1.3-.2-.4.3-.5.9-.2 1.3C18 8.3 19 10 19 12c0 2.8-2.2 5-5 5s-5-2.2-5-5c0-2.6 1.7-5.3 3.5-7.3.3-.4.3-.9 0-1.3-.3-.3-.7-.4-1-.4z" />
          </svg>
        );
      case "crown":
        return (
          <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.203a4 4 0 0 1-3.86 2.928H8.713a4 4 0 0 1-3.86-2.928L2.019 6.019a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" />
          </svg>
        );
      case "clock":
        return (
          <svg className="w-4 h-4" style={{ color: activeColor }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        );
      case "sunrise":
        return (
          <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v6M4.93 10.93l4.24-4.24M19.07 10.93l-4.24-4.24M2 18h20M20 22H4" />
          </svg>
        );
      case "moon":
        return (
          <svg className="w-4 h-4 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        );
      case "calendar-check":
        return (
          <svg className="w-4 h-4" style={{ color: activeColor }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <path d="m9 16 2 2 4-4" />
          </svg>
        );
      case "lock":
        return (
          <svg className="w-4 h-4" style={{ color: activeColor }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" style={{ color: activeColor }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        );
    }
  };

  return (
    <section id="achievements" className="space-y-5 pt-4">
      {/* Header with simple, friendly summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl border border-[#e2e8f0] dark:border-[#1e293b] bg-white dark:bg-[#0c1017]">
        <div>
          <h3 className="text-lg font-bold text-[#0f172a] dark:text-white">
            Focus Milestones
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Milestones that celebrate your deep focus habits and consistency.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
          <div>
            <span className="font-semibold text-slate-900 dark:text-white">{unlockedCount}</span> of {totalCount} completed
          </div>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <div>
            <span
              className="font-semibold font-mono transition-colors"
              style={{ color: activeColor }}
            >
              +{totalXpPotential} XP
            </span>{" "}
            earned
          </div>
        </div>
      </div>

      {/* Filter Tabs - Clean, standard segmented controls with dynamic active color */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1 sm:pb-0 no-scrollbar">
          {[
            { id: "all", label: "All" },
            { id: "focus", label: "Focus" },
            { id: "shield", label: "Deflection" },
            { id: "streak", label: "Habits" },
            { id: "mastery", label: "Mastery" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 text-xs font-medium transition-all cursor-pointer rounded-lg border whitespace-nowrap shrink-0 ${
                selectedCategory === cat.id
                  ? "shadow-xs font-semibold"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              style={
                selectedCategory === cat.id
                  ? {
                      backgroundColor: isDark ? colors.containerDark : colors.container,
                      borderColor: activeBorder,
                      color: activeColor,
                    }
                  : undefined
              }
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs shrink-0">
          {(["all", "unlocked", "locked"] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setFilterUnlocked(filter)}
              className={`px-2.5 py-1 rounded capitalize transition-colors cursor-pointer ${
                filterUnlocked === filter
                  ? "font-semibold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              style={
                filterUnlocked === filter
                  ? { color: activeColor }
                  : undefined
              }
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Achievement Grid - Clean, readable, with dynamic mode colors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
        {filtered.map((ach) => {
          const progressPercent = ach.maxProgress
            ? Math.min(100, Math.round(((ach.currentProgress || 0) / ach.maxProgress) * 100))
            : ach.isUnlocked
            ? 100
            : 0;

          return (
            <div
              key={ach.id}
              className={`group relative flex flex-col justify-between p-4 rounded-xl border transition-all duration-200 micro-card hover:shadow-md ${
                ach.isUnlocked
                  ? "bg-white dark:bg-[#0c1017] shadow-xs"
                  : "bg-white/60 dark:bg-[#0c1017]/40 border-slate-200 dark:border-slate-800/80"
              }`}
              style={
                ach.isUnlocked
                  ? {
                      borderColor: `${activeBorder}70`,
                      boxShadow: `0 2px 8px -2px ${activeColor}15`,
                    }
                  : undefined
              }
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-300 group-hover:scale-110 ${
                      ach.isUnlocked
                        ? ""
                        : "bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400"
                    }`}
                    style={
                      ach.isUnlocked
                        ? {
                            backgroundColor: isDark ? colors.containerDark : colors.container,
                            borderColor: activeBorder,
                            color: activeColor,
                          }
                        : undefined
                    }
                  >
                    {renderBadgeIcon(ach)}
                  </div>

                  <span
                    className="text-xs font-mono font-medium transition-colors"
                    style={{ color: activeColor }}
                  >
                    +{ach.xpReward} XP
                  </span>
                </div>

                <div className="mt-3 space-y-1">
                  <h4
                    className={`font-semibold text-sm tracking-tight ${
                      ach.isUnlocked
                        ? "text-slate-900 dark:text-white"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {ach.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {ach.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                {ach.isUnlocked ? (
                  <div
                    className="flex items-center justify-between text-xs transition-colors"
                    style={{ color: activeColor }}
                  >
                    <span className="font-medium">Completed</span>
                    {ach.unlockedAt && (
                      <span className="text-slate-400 text-[11px]">
                        {new Date(ach.unlockedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      <span>Progress</span>
                      <span>
                        {ach.currentProgress || 0} / {ach.maxProgress || 1}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded transition-all duration-300"
                        style={{
                          width: `${progressPercent}%`,
                          backgroundColor: progressPercent > 0 ? activeColor : undefined,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
