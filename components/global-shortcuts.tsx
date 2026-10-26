"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTimer } from "../context/timer-context";
import { useTheme } from "../context/theme-context";
import {
  getStoredShortcuts,
  doesKeyEventMatchShortcut,
  SHORTCUTS_UPDATED_EVENT,
  ShortcutDef,
} from "../lib/shortcuts/shortcuts-store";

type ToastIconType =
  | "play"
  | "pause"
  | "reset"
  | "skip"
  | "focus"
  | "break"
  | "window"
  | "theme"
  | "shortcuts"
  | "nav";

interface ToastInfo {
  id: number;
  message: string;
  keyLabel: string;
  iconType: ToastIconType;
}

function renderToastIcon(type: ToastIconType) {
  switch (type) {
    case "play":
      return (
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      );
    case "pause":
      return (
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <rect x="6" y="4" width="4" height="16" />
          <rect x="14" y="4" width="4" height="16" />
        </svg>
      );
    case "reset":
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 4v6h6M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      );
    case "skip":
      return (
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <polygon points="5 4 15 12 5 20 5 4" />
          <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case "focus":
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "break":
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3" />
        </svg>
      );
    case "window":
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      );
    case "theme":
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      );
    case "shortcuts":
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10" strokeLinecap="round" />
        </svg>
      );
    case "nav":
    default:
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      );
  }
}

export default function GlobalShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    isRunning,
    toggleTimer,
    resetTimer,
    skipTimer,
    setMode,
    toggleMiniWindow,
    activeColor,
  } = useTimer();
  const { theme, setTheme, isDark } = useTheme();

  const [toast, setToast] = useState<ToastInfo | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [shortcuts, setShortcuts] = useState<ShortcutDef[]>([]);

  useEffect(() => {
    setShortcuts(getStoredShortcuts());

    const handleShortcutsUpdate = (e: CustomEvent<ShortcutDef[]>) => {
      if (Array.isArray(e.detail)) {
        setShortcuts(e.detail);
      } else {
        setShortcuts(getStoredShortcuts());
      }
    };

    window.addEventListener(
      SHORTCUTS_UPDATED_EVENT as any,
      handleShortcutsUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        SHORTCUTS_UPDATED_EVENT as any,
        handleShortcutsUpdate as EventListener
      );
    };
  }, []);

  const showToast = useCallback((message: string, keyLabel: string, iconType: ToastIconType = "nav") => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ id: Date.now(), message, keyLabel, iconType });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 1800);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (typeof window !== "undefined") {
        try {
          if (localStorage.getItem("dnd-shortcuts-enabled") === "false") {
            return;
          }
        } catch {}
      }

      const target = e.target as HTMLElement | null;
      if (target) {
        const tagName = target.tagName.toUpperCase();
        if (
          tagName === "INPUT" ||
          tagName === "TEXTAREA" ||
          tagName === "SELECT" ||
          target.isContentEditable ||
          target.getAttribute("role") === "textbox"
        ) {
          return;
        }
      }

      // 1. Try matching against user's custom shortcuts
      const matched = shortcuts.find((s) => doesKeyEventMatchShortcut(e, s.keys));
      if (matched) {
        const keyLabel = matched.keys.join(" + ");
        switch (matched.actionType) {
          case "toggleTimer":
            e.preventDefault();
            toggleTimer();
            showToast(isRunning ? "Timer Paused" : "Timer Started", keyLabel, isRunning ? "pause" : "play");
            return;
          case "resetTimer":
            e.preventDefault();
            resetTimer();
            showToast("Timer Reset to Beginning", keyLabel, "reset");
            return;
          case "skipTimer":
            e.preventDefault();
            skipTimer();
            showToast("Skipped to Next Interval", keyLabel, "skip");
            return;
          case "modeFocus":
            e.preventDefault();
            setMode("focus");
            showToast("Switched to Focus Session", keyLabel, "focus");
            return;
          case "modeShort":
            e.preventDefault();
            setMode("shortBreak");
            showToast("Switched to Short Break", keyLabel, "break");
            return;
          case "modeLong":
            e.preventDefault();
            setMode("longBreak");
            showToast("Switched to Long Break", keyLabel, "break");
            return;
          case "toggleMini":
            e.preventDefault();
            toggleMiniWindow();
            showToast("Toggled Mini-Timer Window", keyLabel, "window");
            return;
          case "toggleTheme":
            e.preventDefault();
            const nextTheme = theme === "dark" ? "light" : "dark";
            setTheme(nextTheme);
            showToast(nextTheme === "dark" ? "Dark Theme Active" : "Light Theme Active", keyLabel, "theme");
            return;
          case "navFocus":
            if (pathname !== "/") {
              e.preventDefault();
              router.push("/");
              showToast("Navigated to Focus Dashboard", keyLabel, "nav");
            }
            return;
          case "navBlocklist":
            if (pathname !== "/blocklist") {
              e.preventDefault();
              router.push("/blocklist");
              showToast("Navigated to Blocklist", keyLabel, "nav");
            }
            return;
          case "navStats":
            if (pathname !== "/statistics") {
              e.preventDefault();
              router.push("/statistics");
              showToast("Navigated to Statistics", keyLabel, "nav");
            }
            return;
          case "navSettings":
            if (pathname !== "/settings") {
              e.preventDefault();
              router.push("/settings");
              showToast("Navigated to Settings", keyLabel, "nav");
            }
            return;
          case "navPrivacy":
            if (pathname !== "/privacy" && pathname !== "/privacy-first") {
              e.preventDefault();
              router.push("/privacy");
              showToast("Navigated to Privacy", keyLabel, "nav");
            }
            return;
          case "navShortcuts":
            if (pathname !== "/shortcuts" && pathname !== "/keyboard-shortcuts") {
              e.preventDefault();
              router.push("/shortcuts");
              showToast("Opened Keyboard Shortcuts", keyLabel, "shortcuts");
            }
            return;
        }
      }

      // Question mark fallback for shortcuts page
      if (e.key === "?") {
        e.preventDefault();
        if (pathname !== "/shortcuts" && pathname !== "/keyboard-shortcuts") {
          router.push("/shortcuts");
          showToast("Opened Keyboard Shortcuts", "?", "shortcuts");
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isRunning,
    toggleTimer,
    resetTimer,
    skipTimer,
    setMode,
    toggleMiniWindow,
    theme,
    setTheme,
    pathname,
    router,
    showToast,
  ]);

  if (!toast) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex items-center gap-2.5 px-4 py-2.5 rounded-full border shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{
        backgroundColor: isDark ? "rgba(16, 22, 32, 0.94)" : "rgba(255, 255, 255, 0.94)",
        borderColor: isDark ? "#1d2634" : "#e2e8f0",
        color: isDark ? "#f1f5f9" : "#0f172a",
        boxShadow: `0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 0 0 1px ${activeColor}33`,
      }}
    >
      <span className="flex items-center justify-center shrink-0" style={{ color: activeColor }}>
        {renderToastIcon(toast.iconType)}
      </span>
      <span className="text-xs font-medium tracking-tight">{toast.message}</span>
      <kbd
        className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wider border select-none ml-1 uppercase"
        style={{
          backgroundColor: isDark ? "#0c1017" : "#f1f5f9",
          borderColor: isDark ? "#2a3649" : "#cbd5e1",
          color: activeColor,
        }}
      >
        {toast.keyLabel}
      </kbd>
    </div>
  );
}
