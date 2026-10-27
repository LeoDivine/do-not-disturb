"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useTheme } from "../../context/theme-context";
import { useTimer } from "../../context/timer-context";

type FilterCategory = "all" | "focus" | "breaks" | "habits";

interface Tip {
  id: string;
  title: string;
  category: "focus" | "breaks" | "habits";
  body: string;
  tryThis: string;
  icon: "pause" | "sun" | "spark" | "coffee" | "window" | "shield" | "music" | "compass" | "target" | "eye" | "check" | "heart";
}

const TIPS: Tip[] = [
  {
    id: "pause",
    title: "The 10-Second Pause",
    category: "habits",
    body: "When an app or site opens in a fraction of a second, our hands wander there on pure autopilot. Adding just a tiny delay gives your brain a moment to catch up and ask: 'Do I actually want to check this right now?'",
    tryThis: "Keep your blocklist active during focus sprints. That brief moment of friction is usually all you need to stay on track.",
    icon: "pause",
  },
  {
    id: "first-30",
    title: "Win the First 30 Minutes",
    category: "focus",
    body: "Before opening email, chat apps, or social feeds, spend your first half-hour on the one thing that matters most. Once you get that early win under your belt, the rest of the day feels much lighter.",
    tryThis: "Pick your main task the evening before so you can start right away in the morning without overthinking.",
    icon: "sun",
  },
  {
    id: "two-minutes",
    title: "The Two-Minute Start",
    category: "focus",
    body: "Big projects feel intimidating when you picture the finish line. Lower the pressure by committing to only work for two minutes. If you still want to stop after that, you're free to.",
    tryThis: "Tell yourself: 'I'll just write one sentence' or 'I'll just open the file.' Starting is almost always the hardest part.",
    icon: "spark",
  },
  {
    id: "real-rest",
    title: "Real Rest Beats Scrolling",
    category: "breaks",
    body: "Scrolling on your break isn't real rest—it just replaces one type of screen fatigue with another. Genuine breaks let your eyes relax and give your mind space to breathe.",
    tryThis: "When the timer rings, stand up, stretch your shoulders, look out the window, or drink a glass of water.",
    icon: "coffee",
  },
  {
    id: "tab-clutter",
    title: "Close the Tabs You Don't Need",
    category: "habits",
    body: "Having dozens of open tabs is like having 40 sticky notes waving in your face. Most tabs are just things we are worried about forgetting, not things we are working on right now.",
    tryThis: "Close any tab you aren't actively using. If you ever need an article or page again, it's always waiting in your browser history.",
    icon: "window",
  },
  {
    id: "deflections-kindness",
    title: "Deflections Are a Win",
    category: "habits",
    body: "If you unconsciously type a blocked website URL, don't get frustrated with yourself. That's just old muscle memory at work.",
    tryThis: "Take a gentle breath, smile, and let the block screen remind you of what you chose to accomplish.",
    icon: "shield",
  },
  {
    id: "soundscapes",
    title: "Gentle Soundscapes",
    category: "focus",
    body: "Sudden, unpredictable noises—like doors, phone buzzes, or distant chatter—naturally tug at your attention. A steady, gentle acoustic background helps your mind settle.",
    tryThis: "Try gentle rain, soft cafe sounds, or ambient noise to create a quiet, comfortable bubble for your work.",
    icon: "music",
  },
  {
    id: "downhill-slope",
    title: "Leave a Downhill Slope",
    category: "focus",
    body: "When you stop work for lunch or wrap up for the day, pause at an easy, obvious next step. It makes jumping back in later effortless.",
    tryThis: "Leave a one-line note to your future self: 'Next step: finish the introduction paragraph.'",
    icon: "compass",
  },
  {
    id: "one-thing",
    title: "One Thing at a Time",
    category: "focus",
    body: "Multitasking feels fast, but it usually just splits your energy into messy pieces. You finish sooner and feel calmer when you give one task your full attention.",
    tryThis: "Maximize your active window and minimize background apps while your timer is ticking.",
    icon: "target",
  },
  {
    id: "eye-break",
    title: "Give Your Eyes a Break",
    category: "breaks",
    body: "Staring at a screen without blinking strains your eyes and tires your brain faster than you might realize.",
    tryThis: "Every 20 minutes, look at an object far across the room or out a window for 20 seconds to relax your eye muscles.",
    icon: "eye",
  },
  {
    id: "shutdown-ritual",
    title: "Close the Day with a Clear Finish",
    category: "habits",
    body: "Work easily spills into your evening if you don't mark a clear stopping point. A simple ritual signals to your subconscious that work is done for the day.",
    tryThis: "Close your work windows, write tomorrow's top goal on a notepad, and mentally say: 'I am done for today.'",
    icon: "check",
  },
  {
    id: "self-compassion",
    title: "Be Kind to Yourself",
    category: "habits",
    body: "Focus isn't about being robotic. Some days flow effortlessly, and other days your attention will wander. Both are completely normal parts of being human.",
    tryThis: "When you lose focus, don't beat yourself up. Just take a slow breath, reset your timer, and gently begin again.",
    icon: "heart",
  },
];

export default function TipsPage() {
  const { isDark } = useTheme();
  const { mode, colors, activeColor, activeContainer, activeBorder } = useTimer();

  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredTips = useMemo(() => {
    return TIPS.filter((tip) => {
      if (activeFilter !== "all" && tip.category !== activeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          tip.title.toLowerCase().includes(q) ||
          tip.body.toLowerCase().includes(q) ||
          tip.tryThis.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [activeFilter, searchQuery]);

  const renderIcon = (icon: Tip["icon"]) => {
    switch (icon) {
      case "pause":
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        );
      case "sun":
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
          </svg>
        );
      case "spark":
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" />
          </svg>
        );
      case "coffee":
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
            <line x1="6" y1="1" x2="6" y2="4" />
            <line x1="10" y1="1" x2="10" y2="4" />
            <line x1="14" y1="1" x2="14" y2="4" />
          </svg>
        );
      case "window":
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
        );
      case "shield":
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        );
      case "music":
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        );
      case "compass":
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
          </svg>
        );
      case "target":
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        );
      case "eye":
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        );
      case "check":
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        );
      case "heart":
      default:
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        );
    }
  };

  return (
    <main className="max-w-[1080px] w-full mx-auto px-6 py-8 md:py-12 flex flex-col gap-8">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#e2e8f0] dark:border-[#1d2634]">
        <div className="flex flex-col gap-2">
          <Link
            href="/blocklist"
            className="text-xs text-[#64748b] dark:text-[#7e8c9f] hover:underline flex items-center gap-1 w-fit transition-colors"
          >
            <span>← Back to Blocklist</span>
          </Link>
          <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${isDark ? "text-white" : "text-[#0f172a]"}`}>
            Friendly Tips
          </h1>
          <p className={`text-xs md:text-sm max-w-xl leading-relaxed ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
            Simple reminders and gentle habits to help you protect your time, feel calm, and stay in flow.
          </p>
        </div>

        <Link
          href="/"
          className="px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-transform active:scale-[0.98] w-fit shrink-0"
          style={{
            backgroundColor: activeColor,
            color: isDark && mode === "focus" ? "#00201d" : "#ffffff",
          }}
        >
          Start Focus Sprint →
        </Link>
      </div>

      {/* 2. Minimalist Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Simple text filter tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeFilter === "all"
                ? "font-semibold"
                : "text-[#64748b] dark:text-[#7e8c9f] hover:text-[#0f172a] dark:hover:text-white"
            }`}
            style={
              activeFilter === "all"
                ? {
                    backgroundColor: isDark ? colors.containerDark : colors.container,
                    color: activeColor,
                  }
                : undefined
            }
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter("focus")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeFilter === "focus"
                ? "font-semibold"
                : "text-[#64748b] dark:text-[#7e8c9f] hover:text-[#0f172a] dark:hover:text-white"
            }`}
            style={
              activeFilter === "focus"
                ? {
                    backgroundColor: isDark ? colors.containerDark : colors.container,
                    color: activeColor,
                  }
                : undefined
            }
          >
            Focus
          </button>
          <button
            onClick={() => setActiveFilter("breaks")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeFilter === "breaks"
                ? "font-semibold"
                : "text-[#64748b] dark:text-[#7e8c9f] hover:text-[#0f172a] dark:hover:text-white"
            }`}
            style={
              activeFilter === "breaks"
                ? {
                    backgroundColor: isDark ? colors.containerDark : colors.container,
                    color: activeColor,
                  }
                : undefined
            }
          >
            Breaks
          </button>
          <button
            onClick={() => setActiveFilter("habits")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeFilter === "habits"
                ? "font-semibold"
                : "text-[#64748b] dark:text-[#7e8c9f] hover:text-[#0f172a] dark:hover:text-white"
            }`}
            style={
              activeFilter === "habits"
                ? {
                    backgroundColor: isDark ? colors.containerDark : colors.container,
                    color: activeColor,
                  }
                : undefined
            }
          >
            Habits
          </button>
        </div>

        {/* Minimal Search input */}
        <div
          className={`flex items-center px-3 py-1.5 rounded-xl border text-xs transition-colors ${
            isDark ? "bg-[#101620] border-[#1d2634] text-[#f1f5f9]" : "bg-white border-[#cbd5e1] text-[#0f172a]"
          }`}
        >
          <svg
            className={`w-3.5 h-3.5 mr-2 shrink-0 ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search tips..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent focus:outline-none placeholder:text-[#7e8c9f] w-36 sm:w-48"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="hover:text-red-500 ml-1 text-[#7e8c9f] p-0.5 rounded cursor-pointer transition-colors"
              aria-label="Clear search"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 3. Clean Tips Grid (No badges, user-friendly language) */}
      {filteredTips.length === 0 ? (
        <div className="py-16 text-center text-xs text-[#7e8c9f]">
          No tips found matching &ldquo;{searchQuery}&rdquo;.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredTips.map((tip) => (
            <article
              key={tip.id}
              className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 transition-colors ${
                isDark
                  ? "bg-[#101620] border-[#1d2634] text-[#f1f5f9]"
                  : "bg-white border-[#e2e8f0] text-[#0f172a] shadow-xs"
              }`}
            >
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                    style={{
                      backgroundColor: isDark ? colors.containerDark : colors.container,
                      color: activeColor,
                    }}
                  >
                    {renderIcon(tip.icon)}
                  </div>
                  <h2 className={`font-semibold text-sm ${isDark ? "text-white" : "text-[#0f172a]"}`}>
                    {tip.title}
                  </h2>
                </div>

                <p className={`text-xs leading-relaxed ${isDark ? "text-[#7e8c9f]" : "text-[#64748b]"}`}>
                  {tip.body}
                </p>
              </div>

              <div
                className={`p-3 rounded-xl text-xs leading-relaxed transition-colors ${
                  isDark ? "bg-[#0b0f17] text-[#cbd5e1]" : "bg-[#f8fafc] text-[#334155]"
                }`}
              >
                <span className="font-semibold" style={{ color: activeColor }}>
                  Try this:{" "}
                </span>
                <span>{tip.tryThis}</span>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* 4. Minimalist footer link */}
      <div className="pt-4 border-t border-[#e2e8f0] dark:border-[#1d2634] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748b] dark:text-[#7e8c9f]">
        <span>Small habits compound into hours of calm focus.</span>
        <div className="flex items-center gap-4">
          <Link href="/blocklist" className="hover:underline" style={{ color: activeColor }}>
            Manage Blocklist →
          </Link>
          <Link href="/" className="hover:underline">
            Timer Dashboard →
          </Link>
        </div>
      </div>
    </main>
  );
}
