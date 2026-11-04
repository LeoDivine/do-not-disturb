"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "../context/theme-context";
import { useSync } from "../context/sync-context";

export default function OfflineBanner() {
  const pathname = usePathname();
  const { isDark } = useTheme();
  const { syncNow, user } = useSync();

  // Instant evaluation on initial client render
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window !== "undefined" && typeof navigator !== "undefined") {
      return navigator.onLine;
    }
    return true;
  });

  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [checkStatus, setCheckStatus] = useState<"idle" | "still-offline">("idle");

  const isOnlineRef = useRef<boolean>(isOnline);
  isOnlineRef.current = isOnline;

  // Real-time zero-latency online/offline tracking
  useEffect(() => {
    const markOffline = () => {
      if (isOnlineRef.current) {
        isOnlineRef.current = false;
        setIsOnline(false);
        setIsDismissed(false);
        setCheckStatus("idle");
      }
    };

    const markOnline = () => {
      if (!isOnlineRef.current) {
        isOnlineRef.current = true;
        setIsOnline(true);
        setIsDismissed(false);
        setCheckStatus("idle");
        syncNow().catch(() => {});
      }
    };

    // Immediate sync on mount
    if (typeof navigator !== "undefined") {
      if (!navigator.onLine) {
        markOffline();
      } else {
        markOnline();
      }
    }

    // 1. Instant event listeners on window and document
    window.addEventListener("offline", markOffline);
    window.addEventListener("online", markOnline);
    document.addEventListener("offline", markOffline);
    document.addEventListener("online", markOnline);

    // 2. Hardware connection change listener (instant in Chromium/Edge)
    const navConn = typeof navigator !== "undefined" ? (navigator as any).connection : null;
    const handleConnChange = () => {
      if (typeof navigator !== "undefined") {
        if (!navigator.onLine) markOffline();
        else markOnline();
      }
    };
    if (navConn && typeof navConn.addEventListener === "function") {
      navConn.addEventListener("change", handleConnChange);
    }

    // 3. Tab focus & visibility change checks
    window.addEventListener("focus", handleConnChange);
    document.addEventListener("visibilitychange", handleConnChange);

    // 4. Ultra-fast 400ms polling interval to catch silent OS/DevTools state changes immediately
    const interval = setInterval(() => {
      if (typeof navigator !== "undefined") {
        if (!navigator.onLine && isOnlineRef.current) {
          markOffline();
        } else if (navigator.onLine && !isOnlineRef.current) {
          markOnline();
        }
      }
    }, 400);

    return () => {
      window.removeEventListener("offline", markOffline);
      window.removeEventListener("online", markOnline);
      document.removeEventListener("offline", markOffline);
      document.removeEventListener("online", markOnline);
      if (navConn && typeof navConn.removeEventListener === "function") {
        navConn.removeEventListener("change", handleConnChange);
      }
      window.removeEventListener("focus", handleConnChange);
      document.removeEventListener("visibilitychange", handleConnChange);
      clearInterval(interval);
    };
  }, [syncNow]);

  // Manual Retry tap handler
  const handleCheckConnection = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (isChecking) return;

    setIsChecking(true);
    setCheckStatus("idle");

    setTimeout(() => {
      setIsChecking(false);
      if (typeof navigator !== "undefined" && navigator.onLine) {
        isOnlineRef.current = true;
        setIsOnline(true);
        setIsDismissed(false);
        syncNow().catch(() => {});
      } else {
        isOnlineRef.current = false;
        setIsOnline(false);
        setCheckStatus("still-offline");
        setTimeout(() => setCheckStatus("idle"), 2500);
      }
    }, 300);
  }, [isChecking, syncNow]);

  // Hide on blocked sanctuary deflection page or when online or dismissed
  if (pathname === "/blocked" || isOnline || isDismissed) {
    return null;
  }

  // Minimalist Offline Banner (Zero pills, zero circular dots, instant response)
  return (
    <aside
      role="alert"
      aria-live="polite"
      aria-label="Offline status banner"
      className={`w-full border-b text-xs transition-colors relative z-30 select-none ${
        isDark
          ? "bg-[#0e131b] border-amber-500/20 text-slate-300"
          : "bg-amber-50/70 border-amber-200/80 text-amber-950"
      }`}
    >
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 md:px-8 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
        {/* Left: Icon & Description */}
        <div className="flex items-center gap-2.5 min-w-0">
          <svg
            className="w-4 h-4 text-amber-500 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>

          <p className="leading-snug">
            <strong className={`font-semibold ${isDark ? "text-amber-400" : "text-amber-900"}`}>
              You are currently offline.
            </strong>{" "}
            <span className={isDark ? "text-slate-400" : "text-amber-800/90"}>
              Your timer, ambient sounds, and site blockers will continue working on this device.
              {user?.email
                ? " Changes will sync to your account once reconnected."
                : " Progress will sync once reconnected."}
            </span>
          </p>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
          {/* Retry Button with In-Place Touch Feedback */}
          <button
            type="button"
            onClick={handleCheckConnection}
            disabled={isChecking}
            aria-label="Retry connection check"
            className={`cursor-pointer touch-manipulation inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all active:scale-95 disabled:opacity-60 ${
              checkStatus === "still-offline"
                ? isDark
                  ? "bg-amber-950/40 border-amber-500/40 text-amber-300"
                  : "bg-amber-100 border-amber-300 text-amber-900"
                : isDark
                ? "bg-[#141a24] hover:bg-[#1b2230] border-[#253042] text-slate-200"
                : "bg-white hover:bg-slate-50 border-amber-200 text-amber-950 shadow-2xs"
            }`}
          >
            <svg
              className={`w-3 h-3 shrink-0 ${isChecking ? "animate-spin text-amber-500" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
            <span>
              {isChecking
                ? "Checking..."
                : checkStatus === "still-offline"
                ? "Still offline"
                : "Retry"}
            </span>
          </button>

          {/* Dismiss Button */}
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            aria-label="Dismiss offline banner"
            title="Dismiss notice"
            className="p-1.5 opacity-50 hover:opacity-100 transition-opacity cursor-pointer touch-manipulation"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
