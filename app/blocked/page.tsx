"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { useTheme } from "../../context/theme-context";
import { useTimer } from "../../context/timer-context";
import { incrementDeflection } from "../../lib/blocking/blocklist-store";
import { extensionClient } from "../../lib/blocking/extension-client";

// Curated 20 serene, minimalist landscape & nature scenes
const AMBIENT_IMAGES = [
  {
    url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2000&q=80",
    title: "Still Lake & Mist",
  },
  {
    url: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=2000&q=80",
    title: "Sunlit Forest",
  },
  {
    url: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=2000&q=80",
    title: "Alpine Quiet",
  },
  {
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=80",
    title: "Ocean Tide",
  },
  {
    url: "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=2000&q=80",
    title: "Misty Pines",
  },
  {
    url: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=2000&q=80",
    title: "Quiet Canopy",
  },
  {
    url: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=2000&q=80",
    title: "Desert Twilight",
  },
  {
    url: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=2000&q=80",
    title: "Calm Fjord",
  },
  {
    url: "https://images.unsplash.com/photo-1499002238440-d264edd596ec?auto=format&fit=crop&w=2000&q=80",
    title: "Lavender Horizon",
  },
  {
    url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2000&q=80",
    title: "Silent Peaks",
  },
  {
    url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=2000&q=80",
    title: "Golden Dawn",
  },
  {
    url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=2000&q=80",
    title: "Emerald Lake",
  },
  {
    url: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=2000&q=80",
    title: "Verdant Valley",
  },
  {
    url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=2000&q=80",
    title: "Starlit Mountain",
  },
  {
    url: "https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=2000&q=80",
    title: "Valley Mist",
  },
  {
    url: "https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?auto=format&fit=crop&w=2000&q=80",
    title: "Soft Meadow",
  },
  {
    url: "https://images.unsplash.com/photo-1498429089284-41f8cf3ffd39?auto=format&fit=crop&w=2000&q=80",
    title: "Misty Ridge",
  },
  {
    url: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=2000&q=80",
    title: "Forest Solitude",
  },
  {
    url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=2000&q=80",
    title: "Northern Light",
  },
  {
    url: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&w=2000&q=80",
    title: "Azure Coast",
  },
];

const BREATH_STEPS = [
  { text: "Breathe in slowly", scale: 1.28, opacity: 0.9 },
  { text: "Hold gently", scale: 1.28, opacity: 0.7 },
  { text: "Breathe out smoothly", scale: 1.0, opacity: 0.5 },
  { text: "Rest peacefully", scale: 1.0, opacity: 0.35 },
];

const ROTATION_INTERVAL_MS = 7500;

function getDestinationUrl(site: string): string | null {
  try {
    let clean = decodeURIComponent(site).trim();
    clean = clean.replace(/^["']|["']$/g, "");
    if (
      !clean ||
      clean.startsWith("javascript:") ||
      clean.startsWith("data:") ||
      clean.startsWith("vbscript:")
    ) {
      return null;
    }
    // Disallow protocol-relative URLs like //evil.com
    clean = clean.replace(/^\/+/, "");
    if (!/^https?:\/\//i.test(clean)) {
      clean = `https://${clean}`;
    }
    const parsed = new URL(clean);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

function BlockedContent() {
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();
  const { mode, colors, activeColor, secondsLeft, formatTime, isRunning, pauseTimer } = useTimer();
  const searchParams = useSearchParams();
  const queryBlocked = searchParams.get("blocked");
  const [blockedSite, setBlockedSite] = useState<string | null>(() => {
    if (queryBlocked) return queryBlocked;
    if (typeof window !== "undefined") {
      try {
        return sessionStorage.getItem("dnd_last_blocked_site");
      } catch {}
    }
    return null;
  });

  useEffect(() => {
    if (queryBlocked) {
      setBlockedSite(queryBlocked);
      try {
        sessionStorage.setItem("dnd_last_blocked_site", queryBlocked);
      } catch {}
    }
  }, [queryBlocked]);

  // Dual-slot state for flawless CSS crossfade without unmounting
  const [activeSlot, setActiveSlot] = useState<"A" | "B">("A");
  const [slotA, setSlotA] = useState(AMBIENT_IMAGES[0]);
  const [slotB, setSlotB] = useState(AMBIENT_IMAGES[1]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [breathIndex, setBreathIndex] = useState(0);

  // Track deflection count with strict navigation and ref deduplication
  const hasRecordedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!blockedSite) return;
    // Guard against duplicate execution in React StrictMode or multiple component updates
    if (hasRecordedRef.current === blockedSite) return;
    hasRecordedRef.current = blockedSite;

    // Guard against duplicate increment across fast navigations within 4 seconds
    const navKey = `dnd_defl_logged_${blockedSite.toLowerCase().trim()}_${Math.floor(Date.now() / 4000)}`;
    if (typeof window !== "undefined") {
      try {
        if (sessionStorage.getItem(navKey)) return;
        sessionStorage.setItem(navKey, "1");
      } catch {}
    }

    incrementDeflection(blockedSite);
  }, [blockedSite]);

  // State to track manual user redirect action
  const [isRedirecting, setIsRedirecting] = useState<boolean>(false);

  const handleProceed = async () => {
    if (!blockedSite || isRedirecting) return;
    setIsRedirecting(true);
    if (isRunning) {
      pauseTimer();
    }

    try {
      await Promise.race([
        extensionClient.stopSession(),
        new Promise((resolve) => setTimeout(resolve, 350)),
      ]);
    } catch {}

    const destination = getDestinationUrl(blockedSite);
    if (destination && !destination.includes("/blocked")) {
      setTimeout(() => {
        window.location.replace(destination);
      }, 150);
    }
  };

  // Preload upcoming images
  useEffect(() => {
    const nextIdx1 = (currentIndex + 1) % AMBIENT_IMAGES.length;
    const nextIdx2 = (currentIndex + 2) % AMBIENT_IMAGES.length;
    [currentIndex, nextIdx1, nextIdx2].forEach((idx) => {
      const img = new window.Image();
      img.src = AMBIENT_IMAGES[idx].url;
    });
  }, [currentIndex]);

  // Switch image smoothly using alternating persistent layers
  const goToIndex = useCallback(
    (targetIndex: number) => {
      const normalized = (targetIndex + AMBIENT_IMAGES.length) % AMBIENT_IMAGES.length;
      if (normalized === currentIndex) return;

      const targetImg = AMBIENT_IMAGES[normalized];
      setCurrentIndex(normalized);

      setActiveSlot((prevSlot) => {
        if (prevSlot === "A") {
          setSlotB(targetImg);
          return "B";
        } else {
          setSlotA(targetImg);
          return "A";
        }
      });
    },
    [currentIndex]
  );

  // Continuous auto-rotation timer (pauses when user activates pause)
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      goToIndex(currentIndex + 1);
    }, ROTATION_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isPaused, currentIndex, goToIndex]);

  // Gentle breathing cycle
  useEffect(() => {
    const breathInterval = setInterval(() => {
      setBreathIndex((prev) => (prev + 1) % BREATH_STEPS.length);
    }, 4000);
    return () => clearInterval(breathInterval);
  }, []);

  // Keyboard controls:
  // - Space: Toggle Pause / Resume
  // - Escape or Enter: Return to sanctuary
  // - ArrowRight / ArrowLeft: Next / Previous scenery
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        setIsPaused((prev) => !prev);
      } else if (e.key === "Escape" || e.key === "Enter") {
        router.push("/");
      } else if (e.key === "ArrowRight") {
        goToIndex(currentIndex + 1);
      } else if (e.key === "ArrowLeft") {
        goToIndex(currentIndex - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, currentIndex, goToIndex]);

  const currentBreath = BREATH_STEPS[breathIndex];
  const cleanDomain = blockedSite
    ? blockedSite.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0]
    : null;

  const currentTitle = AMBIENT_IMAGES[currentIndex].title;

  return (
    <div
      className={`relative min-h-screen flex flex-col justify-between overflow-hidden font-sans transition-colors duration-700 select-none ${
        isDark ? "bg-[#0b0f17] text-[#f1f5f9]" : "bg-[#f8fafc] text-[#0f172a]"
      }`}
    >
      {/* 
        Continuous Ambient Background Imagery 
        Two persistent layer elements crossfade seamlessly with zero unmount flashes 
      */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
        {/* Layer A */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('${slotA.url}')`,
            opacity: activeSlot === "A" ? 1 : 0,
            transform: activeSlot === "A" ? "scale(1.05)" : "scale(1.0)",
            transitionProperty: "opacity, transform",
            transitionDuration: activeSlot === "A" ? "2400ms, 9000ms" : "2400ms, 2400ms",
            transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1), ease-out",
            willChange: "opacity, transform",
          }}
        />

        {/* Layer B */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('${slotB.url}')`,
            opacity: activeSlot === "B" ? 1 : 0,
            transform: activeSlot === "B" ? "scale(1.05)" : "scale(1.0)",
            transitionProperty: "opacity, transform",
            transitionDuration: activeSlot === "B" ? "2400ms, 9000ms" : "2400ms, 2400ms",
            transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1), ease-out",
            willChange: "opacity, transform",
          }}
        />

        {/* Minimalist Ambient Tint Layer for Ultra-Clear Contrast */}
        <div
          className={`absolute inset-0 transition-colors duration-700 ${
            isDark
              ? "bg-gradient-to-b from-[#0b0f17]/75 via-[#0b0f17]/60 to-[#0b0f17]/85"
              : "bg-gradient-to-b from-white/80 via-white/60 to-white/85"
          } backdrop-blur-[2px]`}
        />
      </div>

      {/* Minimal Top Bar */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link
          href="/"
          className="group flex items-center transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none rounded-lg p-0.5"
          aria-label="Do Not Disturb Home"
          title="Return to Home"
        >
          {/* Dark mode logo (white artwork) shown on dark theme */}
          <Image
            src="/logo-dark.png"
            alt="Do Not Disturb"
            width={130}
            height={31}
            priority
            className={`${isDark ? "block" : "hidden"} dark:block h-6 sm:h-7 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]`}
          />
          {/* Light mode logo (black artwork) shown on light theme */}
          <Image
            src="/logo-light.png"
            alt="Do Not Disturb"
            width={130}
            height={31}
            priority
            className={`${!isDark ? "block" : "hidden"} dark:hidden h-6 sm:h-7 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]`}
          />
        </Link>

        {/* Controls: Scenery transition toggle + Theme toggle */}
        <div className="flex items-center gap-3">
          {/* Scenery Auto-Rotation Toggle */}
          <button
            onClick={() => setIsPaused((prev) => !prev)}
            aria-label={isPaused ? "Resume scenery transition" : "Pause scenery transition"}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border backdrop-blur-md transition-all duration-200 cursor-pointer ${
              isDark
                ? "bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:text-white"
                : "bg-black/5 border-black/10 text-slate-700 hover:bg-black/10 hover:text-black"
            }`}
            title="Toggle wallpaper scenery transition"
          >
            {isPaused ? (
              <>
                <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <span>Scenery: Paused</span>
              </>
            ) : (
              <>
                <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
                <span>Scenery: Active</span>
              </>
            )}
          </button>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className={`p-2 rounded-full transition-all duration-200 border backdrop-blur-md ${
              isDark
                ? "bg-white/5 border-white/10 text-white/75 hover:text-white hover:bg-white/10"
                : "bg-black/5 border-black/10 text-slate-700 hover:text-black hover:bg-black/10"
            }`}
          >
            {isDark ? (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Main Sanctuary Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 text-center max-w-xl mx-auto my-auto">
        {/* Subtle Domain Indicator Pill */}
        {cleanDomain ? (
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono tracking-wide mb-8 border backdrop-blur-md transition-colors ${
              isDark
                ? "bg-white/5 border-white/10 text-white/80"
                : "bg-black/5 border-black/10 text-slate-700"
            }`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: activeColor }}
            />
            <span>{cleanDomain} is paused</span>
          </div>
        ) : (
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono tracking-wide mb-8 border backdrop-blur-md transition-colors ${
              isDark
                ? "bg-white/5 border-white/10 text-white/80"
                : "bg-black/5 border-black/10 text-slate-700"
            }`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: activeColor }}
            />
            <span>Focus Sanctuary</span>
          </div>
        )}

        {/* Minimalist Breathing Ring Focal Point */}
        <div className="relative flex items-center justify-center my-4">
          {/* Outer Pulsing Halo */}
          <div
            className="absolute rounded-full pointer-events-none transition-transform duration-[4000ms] ease-in-out"
            style={{
              width: "280px",
              height: "280px",
              transform: `scale(${currentBreath.scale})`,
              border: `1px solid ${activeColor}`,
              opacity: currentBreath.opacity * 0.4,
            }}
          />

          {/* Inner Breathing Ring */}
          <div
            className="absolute rounded-full pointer-events-none transition-transform duration-[4000ms] ease-in-out"
            style={{
              width: "220px",
              height: "220px",
              transform: `scale(${currentBreath.scale})`,
              border: `1px dashed ${activeColor}`,
              opacity: currentBreath.opacity * 0.7,
            }}
          />

          {/* Clean Central Timer Display */}
          <div className="flex flex-col items-center justify-center z-10 py-8 px-4">
            <span
              className={`text-6xl sm:text-7xl font-extralight tracking-tight font-mono tabular-nums leading-none mb-3 transition-colors ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              {formatTime(secondsLeft)}
            </span>
            <span
              className="text-xs font-medium tracking-widest uppercase transition-colors"
              style={{ color: activeColor }}
            >
              {colors.name}
            </span>
          </div>
        </div>

        {/* Breathing Rhythm Text */}
        <p
          className="text-sm font-light tracking-wide mt-6 mb-2 transition-all duration-1000 ease-in-out"
          style={{ color: activeColor }}
        >
          {currentBreath.text}
        </p>

        <p
          className={`text-xs max-w-sm mx-auto leading-relaxed mb-8 transition-colors ${
            isDark ? "text-slate-400" : "text-slate-500"
          }`}
        >
          Take a gentle pause. Protect your attention and remain in your flow.
        </p>

        {/* Minimalist Actions (Responsive across small screens & desktop) */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 max-w-full py-1 px-2">
          <Link
            href="/"
            className="flex-shrink-0 px-4 sm:px-6 py-2.5 sm:py-3 rounded-full text-xs font-semibold tracking-wide flex items-center justify-center gap-1.5 transition-all duration-200 shadow-sm hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none"
            style={{
              backgroundColor: activeColor,
              color:
                isDark && mode === "focus"
                  ? "#00201d"
                  : isDark && mode === "shortBreak"
                  ? "#082f49"
                  : isDark && mode === "longBreak"
                  ? "#431407"
                  : "#ffffff",
            }}
          >
            <span>Return to Focus</span>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>

          {blockedSite && (
            <button
              onClick={handleProceed}
              disabled={isRedirecting}
              className={`flex-shrink-0 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full text-xs font-medium tracking-wide transition-all border backdrop-blur-md cursor-pointer ${
                isDark
                  ? "bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
                  : "bg-black/5 border-black/10 text-slate-600 hover:text-black hover:bg-black/10"
              }`}
            >
              {isRedirecting ? "Unblocking..." : isRunning ? "Pause & Proceed" : "Proceed to Website"}
            </button>
          )}

          <Link
            href="/blocklist"
            className={`flex-shrink-0 px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-full text-xs font-medium tracking-wide transition-all border backdrop-blur-md ${
              isDark
                ? "bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
                : "bg-black/5 border-black/10 text-slate-600 hover:text-black hover:bg-black/10"
            }`}
          >
            Manage List
          </Link>
        </div>

        {/* Discreet Keyboard Shortcut Hint */}
        <span
          className={`text-[10px] tracking-widest uppercase mt-6 font-mono transition-opacity ${
            isDark ? "text-white/30" : "text-slate-400"
          }`}
        >
          Press Space to {isPaused ? "play" : "pause"} • Arrow keys change scenery • Esc to return
        </span>
      </main>

      {/* Minimal Footer with Ambient Image Status & Navigation */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div
          className={`flex items-center gap-2 transition-colors ${
            isDark ? "text-white/40" : "text-slate-400"
          }`}
        >
          <span className="font-light">{currentTitle}</span>
        </div>

        {/* Minimal Progress Dots for all 20 scenes */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-xs py-1" aria-label="Wallpaper progression">
          {AMBIENT_IMAGES.map((img, idx) => (
            <button
              key={img.url}
              onClick={() => goToIndex(idx)}
              aria-label={`View ${img.title}`}
              className={`h-1 rounded-full transition-all duration-500 focus:outline-none flex-shrink-0 cursor-pointer ${
                idx === currentIndex
                  ? "w-5"
                  : "w-1 opacity-25 hover:opacity-60"
              }`}
              style={{
                backgroundColor: idx === currentIndex ? activeColor : isDark ? "#ffffff" : "#0f172a",
              }}
            />
          ))}
        </div>
      </footer>
    </div>
  );
}

export default function BlockedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0b0f17]" />}>
      <BlockedContent />
    </Suspense>
  );
}
