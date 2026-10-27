"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "../../context/theme-context";
import { useTimer } from "../../context/timer-context";
import {
  BlocklistEndpoint,
  getStoredBlocklist,
  saveStoredBlocklist,
  addDomainToBlocklist,
  toggleDomainActive,
  removeDomainFromBlocklist,
  getTotalDeflections,
  getDeflectionsByDay,
  getDeflectionWeekDateRange,
  DeflectionDayStat,
  DEFLECTIONS_UPDATED_EVENT,
} from "../../lib/blocking/blocklist-store";
import { useExtensionStatus } from "../../lib/blocking/use-extension-status";
import { extensionClient } from "../../lib/blocking/extension-client";

export default function BlocklistPage() {
  const { isDark } = useTheme();
  const { mode, colors, activeColor, activeContainer, activeBorder, isRunning, formatTime } = useTimer();

  const [endpoints, setEndpoints] = useState<BlocklistEndpoint[]>([]);
  const [newRuleDomain, setNewRuleDomain] = useState<string>("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState<string>("");
  const [strictFocusShield, setStrictFocusShield] = useState<boolean>(true);
  const [pausedAll, setPausedAll] = useState<boolean>(false);
  const [showExtensionHelp, setShowExtensionHelp] = useState<boolean>(false);

  const { isInstalled, isBlockingActive, ruleCount, version, refresh: refreshExtension } = useExtensionStatus();

  const [totalDeflections, setTotalDeflections] = useState<number>(0);
  const [deflectionsByDay, setDeflectionsByDay] = useState<DeflectionDayStat[]>([]);
  const [weekDateRange, setWeekDateRange] = useState<string>("");

  // Load from persistent storage
  useEffect(() => {
    setEndpoints(getStoredBlocklist());
    setTotalDeflections(getTotalDeflections());
    setDeflectionsByDay(getDeflectionsByDay());
    setWeekDateRange(getDeflectionWeekDateRange());

    const handleUpdate = (e: CustomEvent<BlocklistEndpoint[]>) => {
      setEndpoints(e.detail);
      setTotalDeflections(getTotalDeflections());
      setDeflectionsByDay(getDeflectionsByDay());
      setWeekDateRange(getDeflectionWeekDateRange());
    };

    const handleDeflectionsUpdate = () => {
      setTotalDeflections(getTotalDeflections());
      setDeflectionsByDay(getDeflectionsByDay());
      setWeekDateRange(getDeflectionWeekDateRange());
    };

    window.addEventListener("dnd-blocklist-updated" as any, handleUpdate);
    window.addEventListener(DEFLECTIONS_UPDATED_EVENT as any, handleDeflectionsUpdate);
    return () => {
      window.removeEventListener("dnd-blocklist-updated" as any, handleUpdate);
      window.removeEventListener(DEFLECTIONS_UPDATED_EVENT as any, handleDeflectionsUpdate);
    };
  }, []);

  const syncWithExtension = (updatedEndpoints: BlocklistEndpoint[]) => {
    const activeTargets = updatedEndpoints
      .filter((e) => e.active)
      .map((e) => ({
        id: e.id,
        hostname: e.domain,
        includeSubdomains: Boolean(e.subdomainNote),
        category: e.category,
        enabled: e.active,
      }));
    extensionClient.sendMessage({
      type: "DND_UPDATE_BLOCKLIST",
      requestId: `update_${Date.now()}`,
      domains: activeTargets,
    }).catch(() => {});
  };
  const handleAddDomain = (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);
    if (!newRuleDomain.trim()) return;

    const result = addDomainToBlocklist(newRuleDomain);
    if (!result.success) {
      setInputError(result.error || "Invalid URL");
      return;
    }

    const updated = getStoredBlocklist();
    setEndpoints(updated);
    setNewRuleDomain("");
    syncWithExtension(updated);
  };

  const handleToggleActive = (id: string) => {
    const updated = toggleDomainActive(id);
    setEndpoints(updated);
    syncWithExtension(updated);
  };

  const handleDeleteDomain = (id: string) => {
    const updated = removeDomainFromBlocklist(id);
    setEndpoints(updated);
    syncWithExtension(updated);
  };

  return (
    <main className="max-w-[1360px] w-full mx-auto p-6 md:p-8 flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${isDark ? "text-white" : "text-[#0f172a]"}`}>
            Website Blocklist
          </h1>
          <p className={`text-xs mt-1 max-w-xl ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
            {mode === "focus"
              ? "Distracting websites are quietly blocked so you can stay in flow and protect your time."
              : `Currently on a break (${colors.name}). You're free to browse whenever you want!`}
          </p>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-colors"
            style={{
              backgroundColor: isDark ? colors.containerDark : colors.container,
              borderColor: isDark ? colors.borderDark : colors.border,
              color: activeColor,
            }}
          >
            <span
              className="w-2 h-2 rounded-full transition-colors"
              style={{ backgroundColor: activeColor }}
            />
            <span className="font-semibold">
              {endpoints.filter((e) => e.active).length}
            </span>
            <span>Sites Blocked</span>
          </div>

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-colors ${
            isDark ? "bg-[#0b0f17] border-[#1d2634] text-[#7e8c9f]" : "bg-[#f8fafc] border-[#e2e8f0] text-[#64748b]"
          }`}>
            <svg
              className="w-3.5 h-3.5 transition-colors"
              style={{ color: activeColor }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span className={`font-semibold ${isDark ? "text-white" : "text-[#0f172a]"}`}>
              {isRunning ? formatTime() : "Active"}
            </span>
          </div>
        </div>
      </div>

      {/* Extension Integration Card — Friendly, Zen & Human */}
      <div
        className={`p-5 rounded-2xl border transition-all ${
          isDark ? "bg-[#101620] border-[#1d2634]" : "bg-white border-[#e2e8f0] shadow-xs"
        }`}
      >
        {isInstalled ? (
          <div className="flex flex-col gap-4">
            {/* Status & Message */}
            <div className="flex items-start gap-3.5">
              {/* Visual Icon */}
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                  isDark ? "bg-[#0b0f17] border-[#1d2634]" : "bg-[#f8fafc] border-[#e2e8f0]"
                }`}
                style={{ color: activeColor }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${isBlockingActive ? "animate-pulse" : ""}`}
                    style={{ backgroundColor: activeColor }}
                  />
                  <h2 className={`font-semibold text-sm ${isDark ? "text-white" : "text-[#0f172a]"}`}>
                    {isBlockingActive
                      ? "Browser protection is active"
                      : "Browser extension is connected"}
                  </h2>
                </div>
                <p className={`text-xs mt-1 leading-relaxed max-w-2xl ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
                  {isBlockingActive
                    ? "Your blocked websites are currently paused in your browser. If you try to visit one, you'll be gently redirected to your focus screen so you can stay in flow."
                    : `Your companion extension is running quietly in the background. It will automatically pause ${
                        endpoints.filter((e) => e.active).length === 1
                          ? "1 website"
                          : `${endpoints.filter((e) => e.active).length} websites`
                      } whenever you start a focus session.`}
                </p>
              </div>
            </div>

            {/* Natural, friendly reassurance row */}
            <div
              className={`pt-3 border-t grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs ${
                isDark ? "border-[#1d2634] text-[#7e8c9f]" : "border-[#f1f5f9] text-[#64748b]"
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Works across all open tabs</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Pauses only during focus sessions</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>100% private — runs on your device</span>
              </div>
            </div>
          </div>
        ) : (
          /* Disconnected State — Warm, helpful & simple */
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-amber-500/20 bg-amber-500/10 text-amber-500">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <h2 className={`font-semibold text-sm ${isDark ? "text-white" : "text-[#0f172a]"}`}>
                      Protect your browser tabs
                    </h2>
                  </div>
                  <p className={`text-xs mt-1 leading-relaxed max-w-2xl ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
                    Add the lightweight companion extension so distracting websites are quietly paused in your browser while you focus.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowExtensionHelp(!showExtensionHelp)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1a2330] ${
                    isDark ? "bg-[#141b24] border-[#1d2634] text-slate-200" : "bg-white border-[#e2e8f0] text-slate-700"
                  }`}
                >
                  {showExtensionHelp ? "Hide guide" : "How to install (30s)"}
                </button>
                <button
                  type="button"
                  onClick={refreshExtension}
                  title="Check connection"
                  className={`p-2 rounded-xl text-xs border transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1a2330] ${
                    isDark ? "bg-[#141b24] border-[#1d2634] text-slate-400" : "bg-white border-[#e2e8f0] text-slate-600"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Simple Step-by-Step Guide */}
            {showExtensionHelp && (
              <div className={`pt-3 border-t text-xs ${isDark ? "border-[#1d2634] text-slate-400" : "border-[#f1f5f9] text-slate-600"}`}>
                <div className="font-medium mb-2.5 text-slate-900 dark:text-white">Quick 3-step setup:</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className={`p-3 rounded-xl border ${isDark ? "bg-[#0b0f17] border-[#1d2634]" : "bg-[#f8fafc] border-[#e2e8f0]"}`}>
                    <div className="font-semibold text-amber-500 mb-1">1. Open Extensions</div>
                    <div>Open <code className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-[11px]">chrome://extensions</code> in a new tab.</div>
                  </div>
                  <div className={`p-3 rounded-xl border ${isDark ? "bg-[#0b0f17] border-[#1d2634]" : "bg-[#f8fafc] border-[#e2e8f0]"}`}>
                    <div className="font-semibold text-amber-500 mb-1">2. Enable Developer Mode</div>
                    <div>Turn on the toggle switch in the top right corner.</div>
                  </div>
                  <div className={`p-3 rounded-xl border ${isDark ? "bg-[#0b0f17] border-[#1d2634]" : "bg-[#f8fafc] border-[#e2e8f0]"}`}>
                    <div className="font-semibold text-amber-500 mb-1">3. Load Unpacked</div>
                    <div>Click <strong className="text-slate-900 dark:text-white">Load unpacked</strong> and choose the <code className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-[11px]">extension</code> folder.</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className="text-emerald-600 dark:text-emerald-400">✓ It connects automatically once loaded — no restart needed.</span>
                  <button
                    type="button"
                    onClick={refreshExtension}
                    className="font-medium hover:underline cursor-pointer"
                    style={{ color: activeColor }}
                  >
                    Check again →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Blocklist Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Add Domain & Endpoints List */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* 1. Add Restrictive Domain Card */}
          <div className={`p-6 rounded-2xl border transition-colors ${
            isDark ? "bg-[#101620] border-[#1d2634] text-[#f1f5f9]" : "bg-white border-[#e2e8f0] text-[#0f172a] shadow-sm"
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 transition-colors"
                  style={{ color: activeColor }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                <h2 className={`font-bold text-sm ${isDark ? "text-white" : "text-[#0f172a]"}`}>
                  Block a Website
                </h2>
              </div>
              <span className={`text-[11px] ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
                Blocks instantly during focus
              </span>
            </div>

            <form onSubmit={handleAddDomain} className="flex flex-col gap-3">
              <div className="flex gap-3">
                <div
                  className={`flex-1 flex items-center px-4 rounded-xl border transition-colors ${
                    isDark ? "bg-[#0b0f17] border-[#1d2634]" : "bg-[#f8fafc] border-[#cbd5e1]"
                  }`}
                >
                  <svg className={`w-4 h-4 mr-2 shrink-0 ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  <input
                    type="text"
                    placeholder="e.g. reddit.com or youtube.com"
                    value={newRuleDomain}
                    onChange={(e) => setNewRuleDomain(e.target.value)}
                    className={`w-full bg-transparent py-3 text-sm focus:outline-none placeholder:text-[#7e8c9f] font-mono ${
                      isDark ? "text-white" : "text-[#0f172a]"
                    }`}
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl font-semibold text-sm flex items-center gap-1.5 transition-all active:scale-[0.99] shrink-0 shadow-sm focus-visible:ring-2 focus-visible:outline-none"
                  style={{
                    backgroundColor: activeColor,
                    color: isDark && mode === "focus" ? "#00201d" : isDark && mode === "shortBreak" ? "#082f49" : isDark && mode === "longBreak" ? "#431407" : "#ffffff",
                    outlineColor: activeColor,
                  }}
                >
                  <span className="text-base font-bold">+</span>
                  <span>Block Website</span>
                </button>
              </div>

              {inputError && (
                <div className="text-xs text-red-500 font-medium flex items-center gap-1.5 px-1">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{inputError}</span>
                </div>
              )}
            </form>
          </div>

          {/* 2. Restricted Endpoints Card */}
          <div className={`p-6 rounded-2xl border transition-colors ${
            isDark ? "bg-[#101620] border-[#1d2634] text-[#f1f5f9]" : "bg-white border-[#e2e8f0] text-[#0f172a] shadow-sm"
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2.5">
                <svg
                  className="w-4 h-4 transition-colors"
                  style={{ color: activeColor }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
                <h2 className={`font-bold text-sm ${isDark ? "text-white" : "text-[#0f172a]"}`}>
                  Blocked Websites
                </h2>
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded transition-colors"
                  style={{
                    backgroundColor: isDark ? colors.containerDark : colors.container,
                    color: activeColor,
                  }}
                >
                  {endpoints.filter((e) => e.domain.toLowerCase().includes(filterQuery.toLowerCase())).length} sites
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Search Filter */}
                <div className={`flex items-center px-3 py-1.5 rounded-xl border text-xs transition-colors ${
                  isDark ? "bg-[#0b0f17] border-[#1d2634] text-[#f1f5f9]" : "bg-[#f8fafc] border-[#cbd5e1] text-[#0f172a]"
                }`}>
                  <svg className={`w-3.5 h-3.5 mr-2 ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search blocked websites..."
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    className={`bg-transparent focus:outline-none placeholder:text-[#7e8c9f] w-32 sm:w-40 ${
                      isDark ? "text-white" : "text-[#0f172a]"
                    }`}
                  />
                </div>

                {/* Pause All Toggle */}
                <button
                  onClick={() => {
                    const nextState = !pausedAll;
                    setPausedAll(nextState);
                    const updated = endpoints.map((e) => ({ ...e, active: !nextState }));
                    saveStoredBlocklist(updated);
                    setEndpoints(updated);
                    syncWithExtension(updated);
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                    pausedAll
                      ? "border-current font-semibold"
                      : "border-[#cbd5e1] dark:border-[#222d3d] bg-white dark:bg-[#141b24] hover:bg-[#f1f5f9] dark:hover:bg-[#1a2330] text-[#64748b] dark:text-[#7e8c9f]"
                  }`}
                  style={
                    pausedAll
                      ? {
                          backgroundColor: isDark ? colors.containerDark : colors.container,
                          color: activeColor,
                          borderColor: activeBorder,
                        }
                      : { outlineColor: activeColor }
                  }
                >
                  <span>{pausedAll ? "Resume All" : "Pause All"}</span>
                </button>
              </div>
            </div>

            {/* Endpoints List */}
            <div className={`flex flex-col divide-y ${isDark ? "divide-[#1d2634]" : "divide-[#e2e8f0]"}`}>
              {endpoints
                .filter((item) =>
                  (item.url || item.domain).toLowerCase().includes(filterQuery.toLowerCase())
                )
                .map((item) => (
                  <div
                    key={item.id}
                    className="py-3.5 flex items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs transition-colors ${
                          !item.active ? "bg-[#f1f5f9] dark:bg-[#141b24] text-[#64748b] dark:text-[#7e8c9f]" : ""
                        }`}
                        style={
                          item.active
                            ? {
                                backgroundColor: isDark ? colors.containerDark : colors.container,
                                color: activeColor,
                              }
                            : undefined
                        }
                      >
                        {item.domain.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold font-mono ${
                            !item.active ? "line-through opacity-50" : isDark ? "text-white" : "text-[#0f172a]"
                          }`}>
                            {item.url || item.domain}
                          </span>
                        </div>
                        <div className={`flex items-center gap-2 text-xs mt-0.5 ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
                          <span
                            className="font-medium transition-colors"
                            style={{ color: item.active ? activeColor : undefined }}
                          >
                            {item.deflections} distractions avoided
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Active Toggle Switch */}
                      <button
                        onClick={() => handleToggleActive(item.id)}
                        aria-label={`Toggle blocking for ${item.domain}`}
                        className="w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 focus-visible:ring-2 focus-visible:outline-none"
                        style={{
                          backgroundColor: item.active ? activeColor : isDark ? "#1c2432" : "#cbd5e1",
                          outlineColor: activeColor,
                        }}
                      >
                        <span
                          className={`w-5 h-5 rounded-full transition-transform ${
                            item.active
                              ? isDark
                                ? "translate-x-5 bg-[#00201d]"
                                : "translate-x-5 bg-white shadow-sm"
                              : "translate-x-0 bg-[#7e8c9f]"
                          }`}
                        />
                      </button>

                      <button
                        onClick={() => handleDeleteDomain(item.id)}
                        aria-label={`Remove ${item.domain}`}
                        className={`hover:text-red-500 p-1 rounded transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                          isDark ? "text-[#7e8c9f]" : "text-[#64748b]"
                        }`}
                        style={{ outlineColor: activeColor }}
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            {/* Card Footer */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-4 mt-2 border-t text-[11px] ${
              isDark ? "border-[#1d2634] text-[#7e8c9f]" : "border-[#e2e8f0] text-[#64748b]"
            }`}>
              <div className="flex items-center gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full transition-colors"
                  style={{ backgroundColor: activeColor }}
                />
                <span>{endpoints.filter((e) => e.active).length} sites blocked during focus • Running quietly on your device</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Deflection Engine, Strict Focus Shield & Philosophy */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* 1. Deflection Engine Card */}
          <div className={`p-6 rounded-2xl border transition-colors ${
            isDark ? "bg-[#101620] border-[#1d2634] text-[#f1f5f9]" : "bg-white border-[#e2e8f0] text-[#0f172a] shadow-sm"
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 transition-colors"
                  style={{ color: activeColor }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <h3 className={`font-bold text-sm ${isDark ? "text-white" : "text-[#0f172a]"}`}>
                  Distractions Avoided
                </h3>
              </div>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-md transition-colors"
                style={{
                  backgroundColor: isDark ? colors.containerDark : colors.container,
                  color: activeColor,
                }}
              >
                This Week
              </span>
            </div>
            <p className={`text-xs mb-4 ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
              Sites quietly paused before they pull your attention away.
            </p>

            <div className="flex items-baseline gap-2 mb-4">
              <span className={`text-5xl font-bold tracking-tight ${isDark ? "text-white" : "text-[#0f172a]"}`}>
                {totalDeflections}
              </span>
              <span
                className="text-xs font-semibold"
                style={{ color: activeColor }}
              >
                {totalDeflections > 0 ? "Preserved focus intervals" : "Protected focus active"}
              </span>
            </div>

            {/* Weekly Flow Chart */}
            <div className="mb-4">
              <div className={`flex items-center justify-between text-xs mb-2 ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
                <span>Weekly overview{weekDateRange ? ` • ${weekDateRange}` : ""}</span>
                <span>
                  {totalDeflections > 0
                    ? `~${Math.round(totalDeflections / 7)} distractions avoided / day`
                    : "Zero interruptions so far"}
                </span>
              </div>
              <div className="flex items-end justify-between gap-1.5 h-16 pt-2">
                {deflectionsByDay.map((bar, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <div
                      style={{
                        height: bar.h > 0 ? `${bar.h}%` : "4px",
                        backgroundColor: bar.isToday && bar.count > 0 ? activeColor : isDark ? "#1c2432" : "#e2e8f0",
                      }}
                      title={`${bar.fullDate}: ${bar.count} deflection${bar.count === 1 ? "" : "s"}`}
                      className="w-full rounded-sm transition-all"
                    />
                    <div className="flex flex-col items-center mt-0.5 text-center">
                      <span
                        className={`text-[10px] font-medium leading-none ${
                          bar.isToday ? "font-bold" : isDark ? "text-[#f1f5f9]" : "text-[#0f172a]"
                        }`}
                        style={bar.isToday ? { color: activeColor } : undefined}
                      >
                        {bar.day}
                      </span>
                      <span
                        className={`text-[9px] mt-0.5 leading-none ${
                          bar.isToday ? "font-semibold" : isDark ? "text-[#7e8c9f]" : "text-[#94a3b8]"
                        }`}
                        style={bar.isToday ? { color: activeColor } : undefined}
                      >
                        {bar.dayNumber}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`flex items-center justify-between pt-3 border-t text-xs ${
              isDark ? "border-[#1d2634] text-[#7e8c9f]" : "border-[#e2e8f0] text-[#64748b]"
            }`}>
              <span>Estimated time saved</span>
              <span className={`font-bold ${isDark ? "text-white" : "text-[#0f172a]"}`}>
                {totalDeflections > 0
                  ? totalDeflections * 2 >= 60
                    ? `${Math.floor((totalDeflections * 2) / 60)}h ${(totalDeflections * 2) % 60}m`
                    : `${totalDeflections * 2}m`
                  : "0m"}
              </span>
            </div>
          </div>

          {/* 2. Strict Focus Shield Card */}
          <div className={`p-6 rounded-2xl border transition-colors ${
            isDark ? "bg-[#101620] border-[#1d2634] text-[#f1f5f9]" : "bg-white border-[#e2e8f0] text-[#0f172a] shadow-sm"
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <h3 className={`font-bold text-sm ${isDark ? "text-white" : "text-[#0f172a]"}`}>
                  Lock Settings During Focus
                </h3>
              </div>
              <button
                onClick={() => setStrictFocusShield(!strictFocusShield)}
                aria-label="Toggle focus lock"
                className="w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 focus-visible:ring-2 focus-visible:outline-none"
                style={{
                  backgroundColor: strictFocusShield ? activeColor : isDark ? "#1c2432" : "#cbd5e1",
                  outlineColor: activeColor,
                }}
              >
                <span
                  className={`w-5 h-5 rounded-full transition-transform ${
                    strictFocusShield
                      ? isDark
                        ? "translate-x-5 bg-[#00201d]"
                        : "translate-x-5 bg-white shadow-sm"
                      : "translate-x-0 bg-[#7e8c9f]"
                  }`}
                />
              </button>
            </div>

            <p className={`text-xs leading-relaxed mb-4 ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
              Prevents giving in to temptation. When turned on, you can't edit or turn off the blocklist until your timer finishes.
            </p>

            <div
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 transition-colors ${
                isDark ? "bg-[#0b0f17]" : "bg-[#f8fafc]"
              }`}
              style={{
                borderColor: isDark ? colors.borderDark : colors.border,
              }}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0 mt-1.5 transition-colors animate-pulse"
                style={{ backgroundColor: activeColor }}
              />
              <p
                className="text-[11px] leading-tight font-medium transition-colors"
                style={{ color: activeColor }}
              >
                Strict mode is active. Settings stay locked until your timer ends.
              </p>
            </div>
          </div>

          {/* 3. Philosophy Card */}
          <div className={`rounded-2xl border overflow-hidden transition-colors ${
            isDark ? "bg-[#101620] border-[#1d2634] text-[#f1f5f9]" : "bg-white border-[#e2e8f0] text-[#0f172a] shadow-sm"
          }`}>
            <div className="h-32 w-full relative p-4 flex flex-col justify-end overflow-hidden group">
              <img
                src="https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=800&q=80"
                alt="Serene sunlight through green forest canopy"
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
                className="relative z-10 flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider"
                style={{ color: activeColor }}
              >
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center backdrop-blur-md"
                  style={{
                    backgroundColor: isDark ? "rgba(16, 22, 32, 0.85)" : "rgba(255, 255, 255, 0.85)",
                    borderColor: activeBorder,
                  }}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </div>
                <span>WHY THIS WORKS</span>
              </div>
            </div>

            <div className="p-5 flex flex-col gap-3">
              <h4 className={`font-bold text-sm ${isDark ? "text-white" : "text-[#0f172a]"}`}>
                A little friction goes a long way
              </h4>
              <p className={`text-xs leading-relaxed ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
                We often open distracting apps without even thinking. By adding a gentle pause, you get a moment to take a breath and stay focused on what you actually set out to do.
              </p>

              <div className={`flex items-center justify-between pt-2 border-t text-xs ${
                isDark ? "border-[#1d2634] text-[#7e8c9f]" : "border-[#e2e8f0] text-[#64748b]"
              }`}>
                <span>— Focus Habits Guide</span>
                <span
                  className="hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  style={{ color: activeColor }}
                >
                  <span>Read friendly tips</span>
                  <span>→</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
