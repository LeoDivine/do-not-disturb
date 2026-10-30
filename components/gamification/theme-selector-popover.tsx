"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTimer } from "../../context/timer-context";
import { useCloseOnEscape } from "../../lib/overlays/use-close-on-escape";
import {
  HolidayId,
  HolidayTheme,
  HOLIDAY_THEMES,
  getNearestHoliday,
  getThemeRequiredLevel,
  isThemeUnlocked,
} from "./holiday-themes";
import {
  getStoredGamification,
  GAMIFICATION_UPDATED_EVENT,
} from "../../lib/gamification/gamification-store";

const CheckIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const LockIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const InfoIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const XIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export type VisualModeSelection = "timer" | "garden" | "auto" | HolidayId;

interface ThemeSelectorPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: string;
  onSelectMode: (mode: VisualModeSelection) => void;
}

export default function ThemeSelectorPopover({
  isOpen,
  onClose,
  currentMode,
  onSelectMode,
}: ThemeSelectorPopoverProps) {
  const { activeColor, activeBorder } = useTimer();
  const popoverRef = useRef<HTMLDivElement>(null);
  // Resolve the date-dependent holiday on the client only (avoids reading
  // `new Date()` during prerender).
  const [nearestHoliday, setNearestHoliday] = useState<HolidayTheme | null>(null);
  useEffect(() => {
    setNearestHoliday(getNearestHoliday());
  }, []);

  // Track user level progression from gamification store
  const [userLevel, setUserLevel] = useState<number>(() => {
    return getStoredGamification().level;
  });

  // Encouraging lock prompt feedback
  const [lockedNotice, setLockedNotice] = useState<{
    title: string;
    level: number;
  } | null>(null);

  // Sync user gamification level and update on events
  useEffect(() => {
    const handleUpdate = () => {
      setUserLevel(getStoredGamification().level);
    };

    window.addEventListener(GAMIFICATION_UPDATED_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(GAMIFICATION_UPDATED_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // Clear notice on close or when timer clicks
  useEffect(() => {
    if (!isOpen) {
      setLockedNotice(null);
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen, onClose]);

  // Close on Escape (global close-all-overlays event)
  useCloseOnEscape(isOpen, onClose);

  if (!isOpen) return null;

  const isAuto = currentMode === "auto";

  const handleAttemptSelect = (themeId: VisualModeSelection, themeTitle: string) => {
    const requiredLevel = getThemeRequiredLevel(themeId);
    if (userLevel < requiredLevel) {
      setLockedNotice({ title: themeTitle, level: requiredLevel });
      return;
    }
    setLockedNotice(null);
    onSelectMode(themeId);
    onClose();
  };

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full mt-2 w-[calc(100vw-1.5rem)] sm:w-[540px] md:w-[600px] max-w-[640px] max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101b] shadow-2xl z-50 p-4 sm:p-5 select-none text-left animate-pop-in no-scrollbar"
      role="dialog"
      aria-label="Choose Your Focus Vibe"
      style={{
        boxShadow: `0 20px 40px -15px ${activeColor}20, 0 0 0 1px ${activeBorder}40`,
      }}
    >
      {/* Popover Header with Jovial, Friendly Tone (No icon, no all-caps) */}
      <div className="flex items-start justify-between pb-3.5 mb-3.5 border-b border-slate-100 dark:border-slate-800/80">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Choose Your Focus Vibe
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Pick a cheerful world for your session and watch it bloom as you crush your goals!
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors ml-2"
          title="Close theme picker"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Jovial Encouraging Lock Banner (Appears when user clicks a locked theme) */}
      {lockedNotice && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-start gap-2.5">
            <div className="p-1 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0">
              <LockIcon className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-900 dark:text-amber-300">
                Level {lockedNotice.level} Required for {lockedNotice.title}
              </p>
              <p className="text-[11px] text-amber-700/90 dark:text-amber-400/90 mt-0.5 leading-snug">
                You are currently Level {userLevel}. Power through a couple more serene focus sessions to gain XP and unlock this magical world!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLockedNotice(null)}
            className="text-amber-600 dark:text-amber-400 hover:opacity-80 p-1 shrink-0"
            title="Dismiss notice"
          >
            <XIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
        {/* 1. Everyday Classics */}
        <div>
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 px-1">
            Everyday Classics
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Classic Flow Card */}
            <ThemeCard
              id="timer"
              title="Classic Flow"
              tagline="Clean, steady, and timeless ticking focus"
              isSelected={currentMode === "timer" && !isAuto}
              userLevel={userLevel}
              onSelect={() => handleAttemptSelect("timer", "Classic Flow")}
              preview={<ClassicFlowPreview />}
              gradient="from-slate-900 via-slate-800 to-sky-950"
            />

            {/* Bonsai Haven Card */}
            <ThemeCard
              id="garden"
              title="Bonsai Haven"
              tagline="Peaceful zen sanctuary that blossoms with every minute"
              isSelected={currentMode === "garden" && !isAuto}
              userLevel={userLevel}
              onSelect={() => handleAttemptSelect("garden", "Bonsai Haven")}
              preview={<BonsaiHavenPreview />}
              gradient="from-slate-900 via-emerald-950 to-slate-900"
            />
          </div>
        </div>

        {/* 2. Today's Festive Pick (Auto Calendar Mode) */}
        <div>
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 px-1">
            Today&apos;s Festive Pick
          </div>
          <button
            type="button"
            onClick={() => handleAttemptSelect("auto", "Auto Seasonal Magic")}
            className={`w-full group flex flex-col sm:flex-row items-center rounded-xl border text-left transition-all overflow-hidden ${
              isAuto
                ? "shadow-md"
                : "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm"
            }`}
            style={
              isAuto
                ? {
                    borderColor: activeColor,
                    boxShadow: `0 0 0 1px ${activeColor}50, 0 4px 12px -2px ${activeColor}20`,
                    backgroundColor: `${activeColor}0D`,
                  }
                : undefined
            }
          >
            {/* Preview Banner on Left / Top */}
            <div className="w-full sm:w-44 h-24 sm:h-auto self-stretch flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-amber-950 via-slate-900 to-yellow-950 shrink-0">
              <AutoMagicPreview />
              {isAuto && (
                <div
                  className="absolute top-2 right-2 sm:left-2 sm:right-auto w-5 h-5 rounded-full text-white flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: activeColor }}
                >
                  <CheckIcon className="w-3 h-3" />
                </div>
              )}
            </div>
            {/* Text on Right */}
            <div className="p-3.5 flex-1 flex flex-col justify-center">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Auto Seasonal Magic
                </span>
                <span
                  className="text-[11px] font-medium"
                  style={{ color: activeColor }}
                >
                  Active: {nearestHoliday?.shortName ?? "…"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                Sit back and relax! Automatically celebrates whatever holiday season is in the air today.
              </p>
            </div>
          </button>
        </div>

        {/* 3. Immersive Worlds & Atmospheres */}
        <div>
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 px-1 flex items-center justify-between">
            <span>Immersive Worlds & Atmospheres</span>
            <span className="text-[10px] font-medium text-slate-400">Nature, Sci-Fi & Cozy</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Cozy Coffee */}
            <ThemeCard
              id="cozycoffee"
              title="Cozy Café Hearth"
              tagline="Warm steaming mugs, gentle acoustic melodies, and rainy window calm"
              isSelected={!isAuto && currentMode === "cozycoffee"}
              userLevel={userLevel}
              onSelect={() => handleAttemptSelect("cozycoffee", "Cozy Café Hearth")}
              preview={<CozyCoffeePreview />}
              gradient="from-amber-950 via-stone-900 to-orange-950"
            />

            {/* Starry Night Campfire */}
            <ThemeCard
              id="campfire"
              title="Starry Night Campfire"
              tagline="Gather around crackling cedar embers beneath a vast blanket of stars"
              isSelected={!isAuto && currentMode === "campfire"}
              userLevel={userLevel}
              onSelect={() => handleAttemptSelect("campfire", "Starry Night Campfire")}
              preview={<CampfirePreview />}
              gradient="from-orange-950 via-slate-950 to-amber-950"
            />

            {/* Deep Ocean Sanctuary */}
            <ThemeCard
              id="deepocean"
              title="Deep Ocean Sanctuary"
              tagline="Submerge into tranquil abyss currents with glowing bioluminescent life"
              isSelected={!isAuto && currentMode === "deepocean"}
              userLevel={userLevel}
              onSelect={() => handleAttemptSelect("deepocean", "Deep Ocean Sanctuary")}
              preview={<DeepOceanPreview />}
              gradient="from-sky-950 via-slate-950 to-blue-950"
            />

            {/* Enchanted Glen */}
            <ThemeCard
              id="enchantedforest"
              title="Enchanted Glen"
              tagline="Mossy woodland paths where fireflies dance among ancient oaks"
              isSelected={!isAuto && currentMode === "enchantedforest"}
              userLevel={userLevel}
              onSelect={() => handleAttemptSelect("enchantedforest", "Enchanted Glen")}
              preview={<EnchantedForestPreview />}
              gradient="from-emerald-950 via-slate-950 to-lime-950"
            />

            {/* Neon Cyber Grid */}
            <ThemeCard
              id="cyberpunk"
              title="Neon Cyber Grid"
              tagline="Charge glowing circuits and pulse through futuristic cyber cityscapes"
              isSelected={!isAuto && currentMode === "cyberpunk"}
              userLevel={userLevel}
              onSelect={() => handleAttemptSelect("cyberpunk", "Neon Cyber Grid")}
              preview={<CyberpunkPreview />}
              gradient="from-cyan-950 via-slate-950 to-pink-950"
            />

            {/* Cosmic Nebula Voyage */}
            <ThemeCard
              id="cosmic"
              title="Cosmic Nebula Voyage"
              tagline="Chart interstellar galaxies, swirling star dust, and celestial rings"
              isSelected={!isAuto && currentMode === "cosmic"}
              userLevel={userLevel}
              onSelect={() => handleAttemptSelect("cosmic", "Cosmic Nebula Voyage")}
              preview={<CosmicPreview />}
              gradient="from-purple-950 via-slate-950 to-indigo-950"
            />
          </div>
        </div>

        {/* 4. Holiday & Festive Celebrations */}
        <div>
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 px-1 flex items-center justify-between">
            <span>Holiday & Festive Celebrations</span>
            <span className="text-[10px] font-medium text-slate-400">9 Festive Themes</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Halloween */}
            <ThemeCard
              id="halloween"
              title="Spooky Fun & Treats"
              tagline="Carve glowing pumpkins and summon friendly spirits"
              isSelected={!isAuto && currentMode === "halloween"}
              userLevel={userLevel}
              onSelect={() => handleAttemptSelect("halloween", "Spooky Fun & Treats")}
              preview={<HalloweenPreview />}
              gradient="from-purple-950 via-slate-900 to-orange-950"
            />

            {/* Thanksgiving */}
            <ThemeCard
              id="thanksgiving"
              title="Cozy Autumn Feast"
              tagline="Fill your horn of plenty with sweet harvest bounty"
              isSelected={!isAuto && currentMode === "thanksgiving"}
              userLevel={userLevel}
              onSelect={() => handleAttemptSelect("thanksgiving", "Cozy Autumn Feast")}
              preview={<ThanksgivingPreview />}
              gradient="from-amber-950 via-slate-900 to-stone-900"
            />

            {/* Christmas */}
            <ThemeCard
              id="christmas"
              title="Jolly Holiday Magic"
              tagline="Deck the evergreen with twinkling lights and cheer"
              isSelected={!isAuto && currentMode === "christmas"}
              userLevel={userLevel}
              onSelect={() => handleAttemptSelect("christmas", "Jolly Holiday Magic")}
              preview={<ChristmasPreview />}
              gradient="from-emerald-950 via-slate-900 to-red-950"
            />

            {/* New Year */}
            <ThemeCard
              id="newyear"
              title="Midnight Spark & Cheer"
              tagline="Ignite glowing starburst fireworks with every sprint"
              isSelected={!isAuto && currentMode === "newyear"}
              userLevel={userLevel}
              onSelect={() => handleAttemptSelect("newyear", "Midnight Spark & Cheer")}
              preview={<NewYearPreview />}
              gradient="from-slate-950 via-indigo-950 to-slate-900"
            />

            {/* Lunar New Year */}
            <ThemeCard
              id="lunarnewyear"
              title="Golden Lantern Festival"
              tagline="Hang swinging silk lanterns and invite pure prosperity"
              isSelected={!isAuto && currentMode === "lunarnewyear"}
              userLevel={userLevel}
              onSelect={() => handleAttemptSelect("lunarnewyear", "Golden Lantern Festival")}
              preview={<LunarNewYearPreview />}
              gradient="from-red-950 via-slate-900 to-amber-950"
            />

            {/* Valentine's Day */}
            <ThemeCard
              id="valentine"
              title="Warm Hearts & Roses"
              tagline="Grow charming bouquets and watch paper hearts take flight"
              isSelected={!isAuto && currentMode === "valentine"}
              userLevel={userLevel}
              onSelect={() => handleAttemptSelect("valentine", "Warm Hearts & Roses")}
              preview={<ValentinePreview />}
              gradient="from-rose-950 via-slate-900 to-pink-950"
            />

            {/* St. Patrick's Day */}
            <ThemeCard
              id="stpatricks"
              title="Lucky Clover & Rainbows"
              tagline="Chase vibrant rainbows and uncover the pot of gold"
              isSelected={!isAuto && currentMode === "stpatricks"}
              userLevel={userLevel}
              onSelect={() => handleAttemptSelect("stpatricks", "Lucky Clover & Rainbows")}
              preview={<StPatricksPreview />}
              gradient="from-emerald-950 via-slate-900 to-teal-950"
            />

            {/* Easter */}
            <ThemeCard
              id="easter"
              title="Springtime Meadow Hop"
              tagline="Playful painted eggs, daisies, and peeking bunny ears"
              isSelected={!isAuto && currentMode === "easter"}
              userLevel={userLevel}
              onSelect={() => handleAttemptSelect("easter", "Springtime Meadow Hop")}
              preview={<EasterPreview />}
              gradient="from-purple-950 via-slate-900 to-sky-950"
            />

            {/* Earth Day */}
            <ThemeCard
              id="earthday"
              title="Living Blue Wonder"
              tagline="Watch our gorgeous green planet thrive while you work"
              isSelected={!isAuto && currentMode === "earthday"}
              userLevel={userLevel}
              onSelect={() => handleAttemptSelect("earthday", "Living Blue Wonder")}
              preview={<EarthDayPreview />}
              gradient="from-cyan-950 via-slate-900 to-emerald-950"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Card Wrapper Component (Preview on top, Title + Tagline below)
// -------------------------------------------------------------
interface ThemeCardProps {
  id: string;
  title: string;
  tagline: string;
  isSelected: boolean;
  userLevel: number;
  onSelect: () => void;
  preview: React.ReactNode;
  gradient: string;
}

function ThemeCard({
  id,
  title,
  tagline,
  isSelected,
  userLevel,
  onSelect,
  preview,
  gradient,
}: ThemeCardProps) {
  const { activeColor } = useTimer();
  const requiredLevel = getThemeRequiredLevel(id);
  const isLocked = userLevel < requiredLevel;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative flex flex-col rounded-xl border text-left transition-all duration-200 micro-button active:scale-[0.98] overflow-hidden ${
        isSelected
          ? "shadow-md scale-[1.01]"
          : isLocked
          ? "border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700"
          : "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm hover:scale-[1.01]"
      }`}
      style={
        isSelected
          ? {
              borderColor: activeColor,
              boxShadow: `0 0 0 1px ${activeColor}50, 0 4px 12px -2px ${activeColor}20`,
              backgroundColor: `${activeColor}0D`,
            }
          : undefined
      }
    >
      {/* Top Preview Banner */}
      <div
        className={`h-20 w-full flex items-center justify-center relative overflow-hidden bg-gradient-to-br ${gradient} transition-transform duration-200 shrink-0 ${
          isLocked ? "opacity-60 grayscale-[40%]" : "group-hover:scale-[1.02]"
        }`}
      >
        {preview}

        {/* Selected badge */}
        {isSelected && (
          <div
            className="absolute top-2 right-2 w-5 h-5 rounded-full text-white flex items-center justify-center shadow-sm"
            style={{ backgroundColor: activeColor }}
          >
            <CheckIcon className="w-3 h-3" />
          </div>
        )}

        {/* Lock indicator banner */}
        {isLocked && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-sm border border-white/20 text-white flex items-center gap-1.5 shadow-sm">
            <LockIcon className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] font-medium text-slate-200">
              Level {requiredLevel}
            </span>
          </div>
        )}
      </div>

      {/* Bottom Content Area */}
      <div className="p-2.5 flex-1 flex flex-col justify-between">
        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between">
          <span className={`truncate ${isLocked ? "text-slate-700 dark:text-slate-300" : ""}`}>
            {title}
          </span>
          {isLocked && (
            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 ml-1 shrink-0">
              Locked
            </span>
          )}
        </div>
        <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5 line-clamp-2">
          {isLocked ? (
            <span className="text-slate-400 dark:text-slate-500 italic">
              Unlocks when you reach Level {requiredLevel} focus milestone!
            </span>
          ) : (
            tagline
          )}
        </p>
      </div>
    </button>
  );
}

// -------------------------------------------------------------
// Miniature Vector Previews (Zero emojis, crisp vector art)
// -------------------------------------------------------------

function ClassicFlowPreview() {
  const { activeColor } = useTimer();
  return (
    <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="18" stroke="#334155" strokeWidth="2" strokeDasharray="3 3" opacity="0.4" />
      <circle cx="24" cy="24" r="18" stroke={activeColor} strokeWidth="2.5" strokeDasharray="75 120" strokeLinecap="round" />
      <line x1="24" y1="24" x2="24" y2="13" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="24" x2="31" y2="24" stroke={activeColor} strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="24" r="2.5" fill={activeColor} />
    </svg>
  );
}

function BonsaiHavenPreview() {
  return (
    <svg width="44" height="44" viewBox="0 0 50 50">
      <rect x="14" y="38" width="22" height="6" rx="2" fill="#334155" />
      <ellipse cx="25" cy="38" rx="10" ry="2" fill="#451a03" />
      <path d="M 25 38 Q 23 29 26 23" fill="none" stroke="#92400e" strokeWidth="3" strokeLinecap="round" />
      <circle cx="26" cy="17" r="8" fill="#10b981" />
      <circle cx="19" cy="20" r="6" fill="#059669" />
      <circle cx="33" cy="20" r="6" fill="#34d399" />
      <circle cx="26" cy="14" r="2" fill="#f472b6" />
    </svg>
  );
}

function AutoMagicPreview() {
  return (
    <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
      <rect x="8" y="10" width="32" height="28" rx="4" fill="#1e293b" stroke="#eab308" strokeWidth="1.5" />
      <rect x="8" y="10" width="32" height="8" rx="4" fill="#eab308" />
      <line x1="16" y1="6" x2="16" y2="12" stroke="#fef08a" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="32" y1="6" x2="32" y2="12" stroke="#fef08a" strokeWidth="2.5" strokeLinecap="round" />
      <polygon points="24,22 25.8,26.5 30.5,26.5 26.8,29.5 28.5,34 24,31.2 19.5,34 21.2,29.5 17.5,26.5 22.2,26.5" fill="#facc15" />
    </svg>
  );
}

function HalloweenPreview() {
  return (
    <svg width="46" height="46" viewBox="0 0 50 50">
      <circle cx="38" cy="14" r="6" fill="#fed7aa" opacity="0.4" />
      <ellipse cx="25" cy="32" rx="16" ry="13" fill="#ea580c" />
      <ellipse cx="25" cy="32" rx="10" ry="13" fill="#f97316" />
      <path d="M 25 19 Q 24 14 27 12" fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" />
      <polygon points="19,28 22,30 19,31" fill="#fef08a" />
      <polygon points="31,28 28,30 31,31" fill="#fef08a" />
      <path d="M 18 35 Q 25 41 32 35 Z" fill="#fef08a" />
    </svg>
  );
}

function ThanksgivingPreview() {
  return (
    <svg width="46" height="46" viewBox="0 0 50 50">
      <path d="M 38 18 C 42 24 40 36 30 38 C 22 40 14 36 12 32 C 10 27 20 25 28 27 Z" fill="#92400e" stroke="#78350f" strokeWidth="1.5" />
      <ellipse cx="14" cy="32" rx="6" ry="7" fill="#ea580c" />
      <circle cx="20" cy="35" r="4" fill="#dc2626" />
      <circle cx="26" cy="35" r="3.5" fill="#facc15" />
      <path d="M 32 14 Q 38 12 35 20 Z" fill="#d97706" />
    </svg>
  );
}

function ChristmasPreview() {
  return (
    <svg width="46" height="46" viewBox="0 0 50 50">
      <polygon points="25,12 15,26 35,26" fill="#047857" />
      <polygon points="25,18 12,34 38,34" fill="#059669" />
      <rect x="23" y="34" width="4" height="6" fill="#78350f" />
      <polygon points="25,8 26.5,11.5 30,11.5 27,13.5 28.5,17 25,15 21.5,17 23,13.5 20,11.5 23.5,11.5" fill="#facc15" />
      <circle cx="21" cy="24" r="1.8" fill="#ef4444" />
      <circle cx="29" cy="25" r="1.8" fill="#38bdf8" />
      <circle cx="18" cy="31" r="1.8" fill="#eab308" />
      <circle cx="32" cy="31" r="1.8" fill="#ec4899" />
    </svg>
  );
}

function NewYearPreview() {
  return (
    <svg width="46" height="46" viewBox="0 0 50 50">
      <rect x="10" y="34" width="8" height="12" fill="#1e293b" />
      <rect x="20" y="28" width="10" height="18" fill="#334155" />
      <rect x="32" y="32" width="8" height="14" fill="#1e293b" />
      <circle cx="25" cy="18" r="3" fill="#fef08a" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
        <line
          key={i}
          x1="25"
          y1="18"
          x2={25 + Math.cos((deg * Math.PI) / 180) * 14}
          y2={18 + Math.sin((deg * Math.PI) / 180) * 14}
          stroke={i % 2 === 0 ? "#facc15" : "#38bdf8"}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

function LunarNewYearPreview() {
  return (
    <svg width="46" height="46" viewBox="0 0 50 50">
      <line x1="25" y1="8" x2="25" y2="15" stroke="#eab308" strokeWidth="1.5" />
      <rect x="20" y="15" width="10" height="2.5" rx="1" fill="#eab308" />
      <ellipse cx="25" cy="27" rx="12" ry="10" fill="#dc2626" />
      <ellipse cx="25" cy="27" rx="6" ry="10" fill="#b91c1c" />
      <line x1="25" y1="18" x2="25" y2="36" stroke="#eab308" strokeWidth="1" />
      <rect x="21" y="36" width="8" height="2" rx="1" fill="#eab308" />
      <line x1="23" y1="38" x2="23" y2="44" stroke="#dc2626" strokeWidth="1.5" />
      <line x1="25" y1="38" x2="25" y2="46" stroke="#eab308" strokeWidth="1.5" />
      <line x1="27" y1="38" x2="27" y2="44" stroke="#dc2626" strokeWidth="1.5" />
    </svg>
  );
}

function ValentinePreview() {
  return (
    <svg width="46" height="46" viewBox="0 0 50 50">
      <path d="M 25 38 Q 23 30 25 22" fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="25" cy="20" r="9" fill="#e11d48" />
      <circle cx="24" cy="18" r="6" fill="#f43f5e" />
      <circle cx="25" cy="19" r="3" fill="#fda4af" />
      <path d="M 14 16 C 14 12 9 12 9 16 C 9 20 14 24 14 26 C 14 24 19 20 19 16 C 19 12 14 12 14 16 Z" fill="#fb7185" />
      <path d="M 36 14 C 36 10 32 10 32 14 C 32 17 36 21 36 22 C 36 21 40 17 40 14 C 40 10 36 10 36 14 Z" fill="#fda4af" />
    </svg>
  );
}

function StPatricksPreview() {
  return (
    <svg width="46" height="46" viewBox="0 0 50 50">
      <path d="M 8 36 A 18 18 0 0 1 42 36" fill="none" stroke="#ef4444" strokeWidth="1.8" opacity="0.8" />
      <path d="M 11 36 A 15 15 0 0 1 39 36" fill="none" stroke="#eab308" strokeWidth="1.8" opacity="0.8" />
      <path d="M 14 36 A 12 12 0 0 1 36 36" fill="none" stroke="#22c55e" strokeWidth="1.8" opacity="0.8" />
      <circle cx="20" cy="24" r="3.5" fill="#22c55e" />
      <circle cx="26" cy="24" r="3.5" fill="#16a34a" />
      <circle cx="20" cy="29" r="3.5" fill="#4ade80" />
      <circle cx="26" cy="29" r="3.5" fill="#22c55e" />
      <path d="M 33 34 Q 31 38 37 38 Q 43 38 41 34 Z" fill="#1e293b" />
      <ellipse cx="37" cy="34" rx="4" ry="1.5" fill="#facc15" />
    </svg>
  );
}

function EasterPreview() {
  return (
    <svg width="46" height="46" viewBox="0 0 50 50">
      <ellipse cx="20" cy="14" rx="3.5" ry="9" fill="#f8fafc" transform="rotate(-10, 20, 14)" />
      <ellipse cx="20" cy="14" rx="2" ry="7" fill="#fda4af" transform="rotate(-10, 20, 14)" />
      <ellipse cx="30" cy="14" rx="3.5" ry="9" fill="#f8fafc" transform="rotate(10, 30, 14)" />
      <ellipse cx="30" cy="14" rx="2" ry="7" fill="#fda4af" transform="rotate(10, 30, 14)" />
      <ellipse cx="25" cy="32" rx="12" ry="14" fill="#c084fc" />
      <line x1="15" y1="30" x2="35" y2="30" stroke="#fef08a" strokeWidth="2.5" />
      <line x1="16" y1="35" x2="34" y2="35" stroke="#38bdf8" strokeWidth="2" />
      <circle cx="25" cy="24" r="2" fill="#ffffff" />
    </svg>
  );
}

function EarthDayPreview() {
  return (
    <svg width="46" height="46" viewBox="0 0 50 50">
      <circle cx="25" cy="25" r="16" fill="#0284c7" />
      <path d="M 17 20 Q 21 16 26 18 Q 28 23 23 25 Q 18 24 17 20 Z" fill="#16a34a" />
      <path d="M 21 28 Q 26 29 25 35 Q 20 37 19 33 Z" fill="#15803d" />
      <path d="M 28 20 Q 35 18 37 24 Q 34 30 29 29 Z" fill="#16a34a" />
      <path d="M 12 24 Q 22 20 38 25" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

function CyberpunkPreview() {
  return (
    <svg width="46" height="46" viewBox="0 0 50 50">
      <circle cx="25" cy="24" r="12" fill="#ec4899" />
      <line x1="13" y1="23" x2="37" y2="23" stroke="#0b101b" strokeWidth="1.5" />
      <line x1="15" y1="27" x2="35" y2="27" stroke="#0b101b" strokeWidth="1.8" />
      <line x1="18" y1="31" x2="32" y2="31" stroke="#0b101b" strokeWidth="2" />
      <line x1="6" y1="38" x2="44" y2="38" stroke="#06b6d4" strokeWidth="1.2" />
      <line x1="25" y1="32" x2="10" y2="44" stroke="#06b6d4" strokeWidth="1" opacity="0.7" />
      <line x1="25" y1="32" x2="25" y2="44" stroke="#06b6d4" strokeWidth="1" opacity="0.8" />
      <line x1="25" y1="32" x2="40" y2="44" stroke="#06b6d4" strokeWidth="1" opacity="0.7" />
    </svg>
  );
}

function DeepOceanPreview() {
  return (
    <svg width="46" height="46" viewBox="0 0 50 50">
      <path d="M 17 22 C 17 14 33 14 33 22 C 28 24 22 24 17 22 Z" fill="#06b6d4" />
      <ellipse cx="25" cy="19" rx="4" ry="2" fill="#67e8f9" />
      <path d="M 20 23 Q 18 31 21 38" fill="none" stroke="#38bdf8" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M 24 23 Q 26 33 23 41" fill="none" stroke="#67e8f9" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M 28 23 Q 27 31 30 38" fill="none" stroke="#38bdf8" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="36" cy="15" r="1.5" fill="#38bdf8" opacity="0.8" />
      <circle cx="13" cy="28" r="2" fill="#7dd3fc" opacity="0.7" />
    </svg>
  );
}

function CosmicPreview() {
  return (
    <svg width="46" height="46" viewBox="0 0 50 50">
      <ellipse cx="25" cy="25" rx="18" ry="6" fill="none" stroke="#fcd34d" strokeWidth="2" opacity="0.8" transform="rotate(-25 25 25)" />
      <circle cx="25" cy="25" r="9" fill="#6366f1" />
      <path d="M 17 26 Q 25 24 33 26" fill="none" stroke="#4338ca" strokeWidth="1.5" />
      <circle cx="37" cy="14" r="1.5" fill="#facc15" />
      <circle cx="12" cy="36" r="1.2" fill="#f472b6" />
      <circle cx="38" cy="38" r="1" fill="#38bdf8" />
    </svg>
  );
}

function CozyCoffeePreview() {
  return (
    <svg width="46" height="46" viewBox="0 0 50 50">
      <rect x="8" y="38" width="34" height="4" rx="1.5" fill="#78350f" />
      <ellipse cx="25" cy="37" rx="12" ry="3" fill="#fef3c7" />
      <path d="M 17 24 L 19 35 C 19 37 31 37 31 35 L 33 24 Z" fill="#ea580c" />
      <path d="M 33 26 C 37 26 37 32 32 32" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="25" cy="24" rx="8" ry="2.5" fill="#7c2d12" />
      <path d="M 22 20 Q 20 15 23 11" fill="none" stroke="#fed7aa" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      <path d="M 27 19 Q 29 14 26 10" fill="none" stroke="#fed7aa" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}

function EnchantedForestPreview() {
  return (
    <svg width="46" height="46" viewBox="0 0 50 50">
      <path d="M 10 40 Q 25 33 40 40" fill="#064e3b" />
      <rect x="23" y="26" width="4" height="12" fill="#78350f" />
      <circle cx="25" cy="20" r="11" fill="#059669" />
      <circle cx="18" cy="23" r="8" fill="#10b981" />
      <circle cx="32" cy="23" r="8" fill="#10b981" />
      <circle cx="25" cy="15" r="7" fill="#34d399" opacity="0.8" />
      <circle cx="14" cy="27" r="1.5" fill="#fef08a" />
      <circle cx="36" cy="28" r="1.5" fill="#a7f3d0" />
    </svg>
  );
}

function CampfirePreview() {
  return (
    <svg width="46" height="46" viewBox="0 0 50 50">
      <ellipse cx="25" cy="38" rx="15" ry="4" fill="#1e293b" />
      <line x1="16" y1="36" x2="34" y2="40" stroke="#78350f" strokeWidth="3" strokeLinecap="round" />
      <line x1="16" y1="40" x2="34" y2="36" stroke="#92400e" strokeWidth="3" strokeLinecap="round" />
      <path d="M 25 18 Q 32 29 30 37 Q 25 39 20 37 Q 18 29 25 18 Z" fill="#f97316" />
      <path d="M 25 24 Q 29 31 28 37 Q 25 38 22 37 Q 21 31 25 24 Z" fill="#fbbf24" />
      <circle cx="28" cy="16" r="1" fill="#fef08a" />
      <circle cx="21" cy="19" r="1" fill="#f97316" />
    </svg>
  );
}
