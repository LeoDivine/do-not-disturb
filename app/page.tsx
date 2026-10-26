"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "../context/theme-context";
import { useTimer } from "../context/timer-context";
import {
  getRecentDeflections,
  getTotalDeflections,
  DEFLECTIONS_UPDATED_EVENT,
} from "../lib/blocking/blocklist-store";
import {
  getSessionStats,
  SESSIONS_UPDATED_EVENT,
  SessionStats,
} from "../lib/sessions/session-store";
import { getSoundSynth, AcousticPreset, ACOUSTIC_PRESETS } from "../lib/sound/sound-synth";

const PRESET_IMAGES: Record<AcousticPreset, string> = {
  rain: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=240&q=80",
  binaural: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=240&q=80",
  space: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=240&q=80",
};

export default function DashboardPage() {
  const { isDark } = useTheme();
  const {
    mode,
    setMode,
    secondsLeft,
    totalSeconds,
    isRunning,
    cycle,
    totalCycles,
    toggleTimer,
    resetTimer,
    skipTimer,
    formatTime,
    toggleMiniWindow,
    isMiniWindowActive,
    activeColor,
    activeContainer,
    activeBorder,
    colors,
    allModeColors,
    settings,
  } = useTimer();

  // Focus Goal & Milestone
  const [primaryAnchor, setPrimaryAnchor] = useState<string>("");
  const [isEditingAnchor, setIsEditingAnchor] = useState<boolean>(false);
  const [sessionIntent, setSessionIntent] = useState<string>("");
  const [isEditingIntent, setIsEditingIntent] = useState<boolean>(false);

  // Real stats & real blocked distractions
  const [stats, setStats] = useState<SessionStats>(() => getSessionStats());
  const [recentBlocked, setRecentBlocked] = useState<Array<{ id: string; domain: string; timeAgo: string }>>([]);
  const [totalDeflections, setTotalDeflections] = useState<number>(0);

  useEffect(() => {
    // Load stored goal/intent
    if (typeof window !== "undefined") {
      const savedAnchor = localStorage.getItem("dnd_primary_anchor");
      if (savedAnchor !== null) setPrimaryAnchor(savedAnchor);
      const savedIntent = localStorage.getItem("dnd_session_intent");
      if (savedIntent !== null) setSessionIntent(savedIntent);
    }

    const refreshData = () => {
      setStats(getSessionStats());
      setRecentBlocked(getRecentDeflections(4));
      setTotalDeflections(getTotalDeflections());
    };

    refreshData();

    window.addEventListener(SESSIONS_UPDATED_EVENT as any, refreshData);
    window.addEventListener(DEFLECTIONS_UPDATED_EVENT as any, refreshData);
    window.addEventListener("dnd-blocklist-updated" as any, refreshData);

    return () => {
      window.removeEventListener(SESSIONS_UPDATED_EVENT as any, refreshData);
      window.removeEventListener(DEFLECTIONS_UPDATED_EVENT as any, refreshData);
      window.removeEventListener("dnd-blocklist-updated" as any, refreshData);
    };
  }, []);

  const handleUpdateAnchor = (val: string) => {
    setPrimaryAnchor(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("dnd_primary_anchor", val);
    }
  };

  const handleUpdateIntent = (val: string) => {
    setSessionIntent(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("dnd_session_intent", val);
    }
  };

  // Ambient sound state (Real Web Audio Synth)
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [ambientPreset, setAmbientPreset] = useState<AcousticPreset>("rain");
  const [audioVolume, setAudioVolume] = useState<number>(0.65);

  useEffect(() => {
    const loadSettings = () => {
      try {
        const raw = localStorage.getItem("dnd_user_settings");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.acousticPreset && ["rain", "binaural", "space"].includes(parsed.acousticPreset)) {
            setAmbientPreset(parsed.acousticPreset as AcousticPreset);
          }
          if (typeof parsed.bgAmbienceVolume === "number") {
            setAudioVolume(parsed.bgAmbienceVolume / 100);
          }
        }
      } catch (e) {
        console.warn("Could not load ambient settings", e);
      }
    };

    loadSettings();
    window.addEventListener("dnd-settings-updated" as any, loadSettings);
    return () => {
      window.removeEventListener("dnd-settings-updated" as any, loadSettings);
      const synth = getSoundSynth();
      synth.stop();
    };
  }, []);

  const toggleAudio = () => {
    const synth = getSoundSynth();
    if (isAudioPlaying) {
      synth.stop();
      setIsAudioPlaying(false);
    } else {
      const ok = synth.playPreset(ambientPreset, Math.round(audioVolume * 100));
      if (ok) {
        setIsAudioPlaying(true);
      }
    }
  };

  const handleVolumeChange = (vol: number) => {
    setAudioVolume(vol);
    const synth = getSoundSynth();
    synth.setVolume(Math.round(vol * 100));
  };

  // Semi-circle progress calculation
  const radius = 115;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = totalSeconds > 0 ? (totalSeconds - secondsLeft) / totalSeconds : 0;
  const arcLength = circumference * 0.75; // 270 degrees
  const strokeDashoffset = arcLength * (1 - progressRatio);

  return (
    <main className="max-w-[1360px] w-full mx-auto p-6 md:p-8 flex flex-col gap-6">
      {/* Top Grid: Left (Focus Hub) and Right (Intelligence & Velocity) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Focus Hub */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Main Focus Card */}
          <div className={`rounded-2xl p-7 border flex flex-col justify-between transition-colors ${
            isDark ? "bg-[#101620] border-[#1d2634] text-[#f1f5f9]" : "bg-white border-[#e2e8f0] text-[#0f172a] shadow-sm"
          }`}>
            {/* Mode Bar & Blocker Active Status */}
            <div className="flex items-center justify-between mb-6">
              {/* Mode switch segmented buttons with distinct colors per mode */}
              <div className={`flex items-center p-1 rounded-xl border ${
                isDark ? "bg-[#0b0f17] border-[#1c2432]" : "bg-[#f1f5f9] border-[#cbd5e1]"
              }`}>
                {/* 1. Focus Mode Button (Teal / Primary) */}
                <button
                  onClick={() => setMode("focus")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:outline-none ${
                    mode === "focus"
                      ? isDark
                        ? "bg-[#004d40] text-[#64ffda] shadow-sm border border-[#00bfa5]/40"
                        : "bg-white text-[#0f766e] shadow-sm border border-teal-300 font-semibold"
                      : isDark
                      ? "text-[#7e8c9f] hover:text-white"
                      : "text-[#64748b] hover:text-[#0f172a]"
                  }`}
                  style={{ outlineColor: allModeColors.focus.primary }}
                >
                  Focus {settings?.deepFocusMinutes ?? 25}m
                </button>

                {/* 2. Short Break Button (Sky Cyan / Secondary) */}
                <button
                  onClick={() => setMode("shortBreak")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all focus-visible:ring-2 focus-visible:outline-none ${
                    mode === "shortBreak"
                      ? isDark
                        ? "bg-[#0c4a6e] text-[#38bdf8] shadow-sm border border-[#0284c7]/40 font-semibold"
                        : "bg-white text-[#0284c7] shadow-sm border border-sky-200 font-semibold"
                      : isDark
                      ? "text-[#7e8c9f] hover:text-white"
                      : "text-[#64748b] hover:text-[#0f172a]"
                  }`}
                  style={{ outlineColor: allModeColors.shortBreak.primary }}
                >
                  Short Break {settings?.shortBreakMinutes ?? 5}m
                </button>

                {/* 3. Long Break Button (Terracotta Coral / Tertiary) */}
                <button
                  onClick={() => setMode("longBreak")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all focus-visible:ring-2 focus-visible:outline-none ${
                    mode === "longBreak"
                      ? isDark
                        ? "bg-[#7c2d12] text-[#fb923c] shadow-sm border border-[#ea580c]/40 font-semibold"
                        : "bg-white text-[#ea580c] shadow-sm border border-orange-200 font-semibold"
                      : isDark
                      ? "text-[#7e8c9f] hover:text-white"
                      : "text-[#64748b] hover:text-[#0f172a]"
                  }`}
                  style={{ outlineColor: allModeColors.longBreak.primary }}
                >
                  Long Break {settings?.longBreakMinutes ?? 15}m
                </button>
              </div>

              <div className="flex items-center gap-3">
                {/* Mode-responsive Status Badge */}
                {colors.statusText ? (
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full animate-pulse transition-colors"
                      style={{ backgroundColor: activeColor }}
                    />
                    <span
                      className="text-[11px] font-semibold tracking-wider uppercase transition-colors"
                      style={{ color: activeColor }}
                    >
                      {colors.statusText}
                    </span>
                  </div>
                ) : null}

                {/* Browser Mini Pop-up Trigger */}
                <button
                  type="button"
                  onClick={toggleMiniWindow}
                  title={isMiniWindowActive ? "Close browser mini pop-up" : "Open browser mini pop-up"}
                  aria-label="Toggle browser mini pop-up"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                    isMiniWindowActive
                      ? "border-current shadow-xs"
                      : isDark
                      ? "bg-[#0b0f17] border-[#1c2432] text-[#7e8c9f] hover:text-white hover:border-[#2a3649]"
                      : "bg-[#f8fafc] border-[#cbd5e1] text-[#64748b] hover:text-[#0f172a]"
                  }`}
                  style={
                    isMiniWindowActive
                      ? {
                          backgroundColor: isDark ? colors.containerDark : colors.container,
                          borderColor: activeBorder,
                          color: activeColor,
                        }
                      : undefined
                  }
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <rect x="12" y="9" width="8" height="6" rx="1" ry="1" />
                  </svg>
                  <span className="hidden sm:inline">Mini Pop-up</span>
                </button>
              </div>
            </div>

            {/* Circular Arc Timer Visualizer (Colors adapt dynamically to mode) */}
            <div className="relative flex flex-col items-center justify-center my-6">
              <svg className="w-72 h-72 transform -rotate-[135deg]" viewBox="0 0 280 280">
                {/* Background Track Arc */}
                <circle
                  cx="140"
                  cy="140"
                  r={radius}
                  fill="transparent"
                  stroke={isDark ? "#17202c" : "#e2e8f0"}
                  strokeWidth="10"
                  strokeDasharray={`${arcLength} ${circumference}`}
                  strokeLinecap="round"
                />
                {/* Active Progress Arc with dynamic mode accent stroke */}
                <circle
                  cx="140"
                  cy="140"
                  r={radius}
                  fill="transparent"
                  stroke={activeColor}
                  strokeWidth="10"
                  strokeDasharray={`${arcLength} ${circumference}`}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-linear"
                />
              </svg>

              {/* Inner Timer Details */}
              <div className="absolute flex flex-col items-center text-center">
                <span
                  className="text-[11px] font-bold tracking-[0.2em] uppercase mb-1 transition-colors"
                  style={{ color: activeColor }}
                >
                  {colors.badgeLabel}
                </span>
                <span className={`text-6xl font-semibold tracking-tight tabular-nums ${
                  isDark ? "text-white" : "text-[#0f172a]"
                }`}>
                  {formatTime(secondsLeft)}
                </span>
                <div className={`flex items-center gap-1.5 text-xs mt-3 ${
                  isDark ? "text-[#7e8c9f]" : "text-[#64748b]"
                }`}>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  <span>Cycle {cycle} of {totalCycles}</span>
                </div>
              </div>
            </div>

            {/* Current Focus Goal Box with mode-responsive border and accent */}
            <div
              className={`p-4 rounded-xl border mb-5 transition-colors ${
                isDark ? "bg-[#0b0f17] text-[#f1f5f9]" : "bg-[#f8fafc] text-[#0f172a]"
              }`}
              style={{ borderColor: activeBorder }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full border-2 transition-colors"
                    style={{ borderColor: activeColor, backgroundColor: activeContainer }}
                  />
                  <span
                    className="text-[10.5px] font-bold tracking-wider uppercase transition-colors"
                    style={{ color: activeColor }}
                  >
                    WHAT I'M WORKING ON
                  </span>
                </div>
                <span className={`text-[10px] ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
                  {isEditingAnchor ? "Click out to save" : "Press Enter to save"}
                </span>
              </div>

              {isEditingAnchor ? (
                <input
                  type="text"
                  placeholder="e.g. Finish the presentation slides"
                  value={primaryAnchor}
                  onChange={(e) => handleUpdateAnchor(e.target.value)}
                  onBlur={() => setIsEditingAnchor(false)}
                  onKeyDown={(e) => e.key === "Enter" && setIsEditingAnchor(false)}
                  autoFocus
                  className={`w-full bg-transparent text-sm font-medium focus:outline-none border-b ${
                    isDark ? "text-white" : "text-[#0f172a]"
                  }`}
                  style={{ borderColor: activeColor }}
                />
              ) : (
                <p
                  onClick={() => setIsEditingAnchor(true)}
                  className={`text-sm font-medium cursor-text hover:opacity-80 transition-opacity ${
                    !primaryAnchor ? "italic text-[#7e8c9f] dark:text-[#64748b]" : ""
                  }`}
                >
                  {primaryAnchor || "Click to set your focus goal..."}
                </p>
              )}
            </div>

            {/* Primary Action Buttons styled according to active mode */}
            <div className="grid grid-cols-12 gap-3 mb-5">
              {/* Main Pause / Resume Button with mode-dependent background */}
              <button
                onClick={toggleTimer}
                className="col-span-8 py-3.5 px-6 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 shadow-sm transition-all active:scale-[0.99] focus-visible:ring-2 focus-visible:outline-none"
                style={{
                  backgroundColor: activeColor,
                  color: isDark && mode === "focus" ? "#00201d" : isDark && mode === "shortBreak" ? "#082f49" : isDark && mode === "longBreak" ? "#431407" : "#ffffff",
                  outlineColor: activeColor,
                }}
              >
                {isRunning ? (
                  <>
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                    <span>Pause {colors.name}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    <span>Start {colors.name}</span>
                  </>
                )}
              </button>

              {/* Stop Button */}
              <button
                onClick={resetTimer}
                className="col-span-2 py-3.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none border-[#cbd5e1] dark:border-[#222d3d] bg-white dark:bg-[#141b24] hover:bg-[#f1f5f9] dark:hover:bg-[#1a2330] text-[#0f172a] dark:text-[#f1f5f9]"
                style={{ outlineColor: activeColor }}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                </svg>
                <span>Reset</span>
              </button>

              {/* Skip Button */}
              <button
                onClick={skipTimer}
                className="col-span-2 py-3.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none border-[#cbd5e1] dark:border-[#222d3d] bg-white dark:bg-[#141b24] hover:bg-[#f1f5f9] dark:hover:bg-[#1a2330] text-[#0f172a] dark:text-[#f1f5f9]"
                style={{ outlineColor: activeColor }}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 4 15 12 5 20 5 4" />
                  <line x1="19" y1="5" x2="19" y2="19" strokeWidth="2" stroke="currentColor" />
                </svg>
                <span>Skip</span>
              </button>
            </div>

            {/* Ambient Soundscape Bar */}
            <div className={`p-3 rounded-xl border flex items-center justify-between transition-colors relative overflow-hidden ${
              isDark ? "bg-[#0b0f17] border-[#1d2634] text-[#f1f5f9]" : "bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a]"
            }`}>
              <div className="flex items-center gap-3 relative z-10">
                <div
                  onClick={toggleAudio}
                  aria-label={isAudioPlaying ? "Pause background sound" : "Play background sound"}
                  className="w-11 h-11 rounded-lg overflow-hidden relative cursor-pointer group shrink-0 border border-[#e2e8f0] dark:border-[#1d2634]"
                >
                  <img
                    src={PRESET_IMAGES[ambientPreset] || PRESET_IMAGES.rain}
                    alt={`${ACOUSTIC_PRESETS[ambientPreset]?.name || "Ambient"} soundscape`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center transition-colors group-hover:bg-black/50">
                    {isAudioPlaying ? (
                      <svg className="w-4 h-4 text-white fill-current" viewBox="0 0 24 24">
                        <rect x="6" y="4" width="4" height="16" rx="1" />
                        <rect x="14" y="4" width="4" height="16" rx="1" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-white fill-current ml-0.5" viewBox="0 0 24 24">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    )}
                  </div>
                </div>
                <div>
                  <div className={`text-xs font-semibold flex items-center gap-2 ${isDark ? "text-white" : "text-[#0f172a]"}`}>
                    <span>Background Sound: {ACOUSTIC_PRESETS[ambientPreset]?.name || "Gentle Rain"}</span>
                    {isAudioPlaying && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{
                          backgroundColor: isDark ? colors.containerDark : colors.container,
                          color: activeColor,
                        }}
                      >
                        Playing
                      </span>
                    )}
                  </div>
                  <div className={`text-[11px] ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
                    {ACOUSTIC_PRESETS[ambientPreset]?.description || "Peaceful ambient sound"} • Plays smoothly offline
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-end gap-1 h-3.5" aria-hidden="true">
                  <span
                    className="w-1 rounded-full transition-all"
                    style={{
                      height: isAudioPlaying ? "12px" : "6px",
                      backgroundColor: isAudioPlaying ? activeColor : isDark ? "#7e8c9f" : "#94a3b8",
                    }}
                  />
                  <span
                    className="w-1 rounded-full transition-all"
                    style={{
                      height: isAudioPlaying ? "14px" : "8px",
                      backgroundColor: isAudioPlaying ? activeColor : isDark ? "#7e8c9f" : "#94a3b8",
                    }}
                  />
                  <span
                    className="w-1 rounded-full transition-all"
                    style={{
                      height: isAudioPlaying ? "8px" : "4px",
                      backgroundColor: isAudioPlaying ? activeColor : isDark ? "#7e8c9f" : "#94a3b8",
                    }}
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  aria-label="Sound volume"
                  value={audioVolume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className={`w-20 h-1 rounded-lg cursor-pointer ${isDark ? "bg-[#222d3d]" : "bg-[#cbd5e1]"}`}
                  style={{ accentColor: activeColor }}
                />
                <span className={`text-xs font-mono ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
                  {Math.round(audioVolume * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Session Milestone Card */}
          <div className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${
            isDark ? "bg-[#101620] border-[#1d2634] text-[#f1f5f9]" : "bg-white border-[#e2e8f0] text-[#0f172a] shadow-sm"
          }`}>
            <div className="flex items-center gap-3 flex-1 mr-4">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                style={{
                  backgroundColor: isDark ? colors.containerDark : colors.container,
                  color: activeColor,
                }}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                  <line x1="4" y1="22" x2="4" y2="15" />
                </svg>
              </div>
              <div className="flex-1">
                <div className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
                  KEY STEP FOR THIS SESSION
                </div>
                {isEditingIntent ? (
                  <input
                    type="text"
                    placeholder="e.g. Draft the key points before adding finishing touches"
                    value={sessionIntent}
                    onChange={(e) => handleUpdateIntent(e.target.value)}
                    onBlur={() => setIsEditingIntent(false)}
                    onKeyDown={(e) => e.key === "Enter" && setIsEditingIntent(false)}
                    autoFocus
                    className={`w-full bg-transparent text-xs font-medium focus:outline-none border-b mt-0.5 ${
                      isDark ? "text-white" : "text-[#0f172a]"
                    }`}
                    style={{ borderColor: activeColor }}
                  />
                ) : (
                  <div
                    onClick={() => setIsEditingIntent(true)}
                    className={`text-xs font-medium truncate mt-0.5 cursor-text ${
                      isDark ? "text-white" : "text-[#0f172a]"
                    } ${!sessionIntent ? "italic opacity-60" : ""}`}
                  >
                    {sessionIntent || "Click to add a key milestone or next step..."}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setIsEditingIntent(!isEditingIntent)}
              className="text-xs font-medium transition-colors"
              style={{ color: activeColor }}
            >
              Edit
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Intelligence & Metrics */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* 1. Blocked Distractions Card */}
          <div className={`rounded-2xl p-6 border transition-colors ${
            isDark ? "bg-[#101620] border-[#1d2634] text-[#f1f5f9]" : "bg-white border-[#e2e8f0] text-[#0f172a] shadow-sm"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full transition-colors"
                  style={{ backgroundColor: activeColor }}
                />
                <h3 className={`font-semibold text-sm ${isDark ? "text-white" : "text-[#0f172a]"}`}>
                  Paused Websites
                </h3>
              </div>
            </div>
            <p className={`text-xs mb-4 ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
              {mode === "focus"
                ? "Distracting sites are paused during your session so you stay in flow."
                : "Break is active. Take a breath and let your attention recharge."}
            </p>

            <div className="flex flex-col gap-2.5">
              {recentBlocked.length === 0 ? (
                <div className={`p-4 rounded-xl border text-center text-xs italic ${
                  isDark ? "bg-[#0b0f17] border-[#1d2634] text-[#7e8c9f]" : "bg-[#f8fafc] border-[#e2e8f0] text-[#64748b]"
                }`}>
                  No distractions paused yet. Sites will appear here when visited during focus.
                </div>
              ) : (
                recentBlocked.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${
                      isDark ? "bg-[#0b0f17] border-[#1c2432] text-[#f1f5f9]" : "bg-[#f8fafc] border-[#e2e8f0] text-[#0f172a]"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-mono">
                      <span className="w-3.5 h-3.5 rounded border border-red-500/40 text-red-500 flex items-center justify-center">
                        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </span>
                      <span className={isDark ? "text-[#f1f5f9]" : "text-[#0f172a]"}>{item.domain}</span>
                    </div>
                    <span className={`text-[11px] ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
                      {item.timeAgo}
                    </span>
                  </div>
                ))
              )}
            </div>

            <Link
              href="/blocklist"
              className="mt-4 text-xs font-medium hover:underline flex items-center gap-1.5 w-max"
              style={{ color: activeColor }}
            >
              <span>Manage your Blocklist</span>
              <span>→</span>
            </Link>
          </div>

          {/* 2. Best Focus Hours Card */}
          <div className={`rounded-2xl border overflow-hidden transition-colors ${
            isDark ? "bg-[#101620] border-[#1d2634] text-[#f1f5f9]" : "bg-white border-[#e2e8f0] text-[#0f172a] shadow-sm"
          }`}>
            <div className="h-32 w-full relative p-4 flex flex-col justify-end overflow-hidden group">
              <img
                src="https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=800&q=80"
                alt="Morning workspace sunlight"
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
                className="relative z-10 flex items-center gap-2"
                style={{ color: activeColor }}
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center backdrop-blur-md"
                  style={{
                    backgroundColor: isDark ? "rgba(16, 22, 32, 0.85)" : "rgba(255, 255, 255, 0.85)",
                    borderColor: activeBorder,
                  }}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
                <h4 className={`font-bold text-sm tracking-tight ${isDark ? "text-white" : "text-[#0f172a]"}`}>
                  Best Focus Hours
                </h4>
              </div>
            </div>

            <div className="p-5 flex flex-col gap-3">
              {stats.peakWindow ? (
                <p className={`text-xs leading-relaxed ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
                  Your focus is naturally highest between{" "}
                  <span className={isDark ? "text-white font-medium" : "text-[#0f172a] font-semibold"}>
                    {stats.peakWindow.start} - {stats.peakWindow.end}
                  </span>
                  . {stats.peakWindow.description}
                </p>
              ) : (
                <p className={`text-xs leading-relaxed ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
                  Complete at least 3 focus sessions to uncover your natural peak productivity window and cognitive flow rhythm.
                </p>
              )}

              <div className={`flex items-center justify-between pt-2 border-t text-xs ${
                isDark ? "border-[#1d2634] text-[#7e8c9f]" : "border-[#e2e8f0] text-[#64748b]"
              }`}>
                <span>{stats.peakWindow ? stats.peakWindow.confidenceText : "Insights appear as you build your routine"}</span>
                <Link
                  href="/statistics"
                  className="hover:underline font-medium"
                  style={{ color: activeColor }}
                >
                  View stats
                </Link>
              </div>
            </div>
          </div>

          {/* 3. Weekly Focus Hours Card */}
          <div className={`rounded-2xl p-6 border transition-colors ${
            isDark ? "bg-[#101620] border-[#1d2634] text-[#f1f5f9]" : "bg-white border-[#e2e8f0] text-[#0f172a] shadow-sm"
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className={`font-semibold text-sm ${isDark ? "text-white" : "text-[#0f172a]"}`}>
                  Weekly Focus Hours
                </h3>
                <p className={`text-xs ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
                  Daily focus • {stats.weekDateRange}
                </p>
              </div>
              <span
                className="text-xs font-semibold"
                style={{ color: activeColor }}
              >
                {stats.weeklyFocusHours}h Total
              </span>
            </div>

            {/* Velocity Bar Chart */}
            <div className="flex items-end justify-between gap-2 h-28 pt-4 pb-1">
              {stats.daysThisWeek.map((col, idx) => {
                const maxHour = Math.max(4, ...stats.daysThisWeek.map((d) => d.hours));
                const heightPercent = col.hours > 0 ? Math.min(100, Math.round((col.hours / maxHour) * 100)) : 6;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    {col.hours > 0 && (
                      <span
                        className="text-[10px] font-bold"
                        style={{ color: col.isToday ? activeColor : undefined }}
                      >
                        {col.hours}h
                      </span>
                    )}
                    <div
                      className={`w-full rounded-t-md transition-all ${
                        col.isToday
                          ? col.hours > 0
                            ? ""
                            : "bg-[#cbd5e1]/60 dark:bg-[#1f2b3c]/80"
                          : col.hours > 0
                          ? "bg-[#cbd5e1] dark:bg-[#1f2b3c]"
                          : "bg-[#f1f5f9] dark:bg-[#141b24]"
                      }`}
                      style={{
                        height: `${heightPercent}%`,
                        backgroundColor: col.isToday && col.hours > 0 ? activeColor : undefined,
                      }}
                      title={`${col.fullDate}: ${col.hours > 0 ? `${col.hours}h focus time` : "No sessions logged"}`}
                    />
                    <div className="flex flex-col items-center mt-0.5 text-center">
                      <span
                        className={`text-[11px] leading-none transition-colors flex items-center justify-center gap-0.5 ${
                          col.isToday
                            ? "font-bold"
                            : isDark ? "text-[#f1f5f9]" : "text-[#0f172a]"
                        }`}
                        style={col.isToday ? { color: activeColor } : undefined}
                      >
                        <span>{col.shortDay}</span>
                        {col.isToday && (
                          <span
                            className="w-1 h-1 rounded-full animate-pulse"
                            style={{ backgroundColor: activeColor }}
                            title="Today"
                          />
                        )}
                      </span>
                      <span
                        className={`text-[9.5px] mt-0.5 leading-none transition-colors ${
                          col.isToday
                            ? "font-bold"
                            : isDark ? "text-[#7e8c9f]" : "text-[#94a3b8]"
                        }`}
                        style={col.isToday ? { color: activeColor } : undefined}
                      >
                        {col.dayNumber}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className={`p-5 rounded-2xl border transition-colors ${
          isDark ? "bg-[#101620] border-[#1d2634] text-[#f1f5f9]" : "bg-white border-[#e2e8f0] text-[#0f172a] shadow-sm"
        }`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
              TOTAL SESSIONS
            </span>
            <span
              className="text-xs font-semibold"
              style={{ color: activeColor }}
            >
              {stats.completedCount} finished
            </span>
          </div>
          <div className={`text-3xl font-semibold tracking-tight ${isDark ? "text-white" : "text-[#0f172a]"}`}>
            {stats.totalCount}
          </div>
          <p className={`text-xs mt-1.5 ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
            {stats.totalCount > 0
              ? `${stats.completedCount} of ${stats.totalCount} sessions completed (${stats.completionRate})`
              : "Completed focus sessions will be tallied here"}
          </p>
        </div>

        <div className={`p-5 rounded-2xl border transition-colors ${
          isDark ? "bg-[#101620] border-[#1d2634] text-[#f1f5f9]" : "bg-white border-[#e2e8f0] text-[#0f172a] shadow-sm"
        }`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
              DISTRACTIONS AVOIDED
            </span>
            <span className="text-xs font-semibold text-emerald-500 dark:text-emerald-400">
              {stats.distractionFreeRate} In Flow
            </span>
          </div>
          <div className={`text-3xl font-semibold tracking-tight ${isDark ? "text-white" : "text-[#0f172a]"}`}>
            {totalDeflections}
          </div>
          <p className={`text-xs mt-1.5 ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
            Distractions blocked so you could stay in the zone
          </p>
        </div>

        <div className={`p-5 rounded-2xl border transition-colors ${
          isDark ? "bg-[#101620] border-[#1d2634] text-[#f1f5f9]" : "bg-white border-[#e2e8f0] text-[#0f172a] shadow-sm"
        }`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
              CURRENT STREAK
            </span>
            <span className="text-xs font-semibold text-amber-500 dark:text-amber-400 flex items-center gap-1">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 23c-4.97 0-9-4.03-9-9 0-3.3 1.83-6.23 4.54-7.79.46-.26 1.05.02 1.13.55.22 1.45.92 2.76 1.95 3.73.18.17.47.14.61-.07.72-1.09 1.16-2.4 1.16-3.8 0-1.74-.69-3.31-1.81-4.47-.38-.4-.14-1.06.39-1.12 3.84-.44 7.6 1.81 8.89 5.48C20.47 9.07 21 11.47 21 14c0 4.97-4.03 9-9 9z" />
              </svg>
              <span>{stats.currentStreak} {stats.currentStreak === 1 ? "Day" : "Days"}</span>
            </span>
          </div>
          <div className={`text-3xl font-semibold tracking-tight ${isDark ? "text-white" : "text-[#0f172a]"}`}>
            {stats.currentStreak} {stats.currentStreak === 1 ? "Day" : "Days"}
          </div>
          <p className={`text-xs mt-1.5 ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
            {stats.currentStreak > 0
              ? "You're building an amazing daily habit!"
              : "Complete a focus session today to start your streak!"}
          </p>
        </div>
      </div>
    </main>
  );
}
