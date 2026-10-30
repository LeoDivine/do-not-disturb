"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme } from "../context/theme-context";
import { useTimer } from "../context/timer-context";

export default function MobileDesktopNotice() {
  const pathname = usePathname();
  const { isDark } = useTheme();
  const { activeColor, mode } = useTimer();
  const [copied, setCopied] = useState(false);

  // Permanently lock scroll on mobile viewports (< 768px)
  useEffect(() => {
    if (pathname === "/blocked") return;

    const lockMobileScroll = () => {
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";
        document.body.style.overscrollBehavior = "none";
        document.documentElement.style.overscrollBehavior = "none";
      } else {
        document.body.style.overflow = "";
        document.documentElement.style.overflow = "";
        document.body.style.overscrollBehavior = "";
        document.documentElement.style.overscrollBehavior = "";
      }
    };

    lockMobileScroll();
    window.addEventListener("resize", lockMobileScroll);

    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.body.style.overscrollBehavior = "";
      document.documentElement.style.overscrollBehavior = "";
      window.removeEventListener("resize", lockMobileScroll);
    };
  }, [pathname]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleEmailSelf = () => {
    if (typeof window !== "undefined") {
      const url = window.location.origin;
      const subject = encodeURIComponent("Open Do Not Disturb on my computer");
      const body = encodeURIComponent(
        `Here is the link to open Do Not Disturb on your computer:\n\n${url}\n\nGet ready for deep, distraction-free focus!`
      );
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    }
  };

  // Hide on blocked page
  if (pathname === "/blocked") return null;

  return (
    <div
      role="region"
      aria-label="Desktop experience notice"
      className="md:hidden fixed inset-0 z-[100] w-full h-[100dvh] overflow-hidden overscroll-none touch-none bg-[#faf8ff] dark:bg-[#070a12] text-[#0f172a] dark:text-[#f8fafc] flex flex-col justify-between items-center px-6 py-8 selection:bg-teal-500/20"
    >
      {/* Subtle ambient aura */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-[110px] opacity-20 dark:opacity-15 transition-all duration-700"
        style={{ backgroundColor: activeColor }}
      />

      {/* Top: Official Brand Logo */}
      <div className="relative z-10 pt-2 flex flex-col items-center shrink-0">
        <Image
          src="/logo-dark.png"
          alt="Do Not Disturb Logo"
          width={180}
          height={44}
          className="h-8 w-auto object-contain hidden dark:block"
          priority
        />
        <Image
          src="/logo-light.png"
          alt="Do Not Disturb Logo"
          width={180}
          height={44}
          className="h-8 w-auto object-contain block dark:hidden"
          priority
        />
      </div>

      {/* Center: Minimalist Copy & Quiet Highlights */}
      <div className="relative z-10 w-full max-w-sm text-center my-auto py-2 shrink-0">
        <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-[#0f172a] dark:text-white leading-snug">
          Deep work belongs on the <span className="font-semibold">big screen</span>.
        </h1>

        <p className="mt-3 text-xs sm:text-sm text-[#64748b] dark:text-[#94a3b8] leading-relaxed">
          Phones are designed for constant interruptions. Do Not Disturb is designed to silence them.
          Open this on your laptop or desktop where real focus happens.
        </p>

        {/* Minimalist highlights with subtle dots */}
        <div className="mt-6 space-y-2.5 text-left">
          <div className="flex items-center gap-3 text-xs sm:text-sm text-[#475569] dark:text-[#cbd5e1]">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: activeColor }}
            />
            <span>Active tab and site blocker for your browser</span>
          </div>
          <div className="flex items-center gap-3 text-xs sm:text-sm text-[#475569] dark:text-[#cbd5e1]">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: activeColor }}
            />
            <span>Floating picture-in-picture timer over your work</span>
          </div>
          <div className="flex items-center gap-3 text-xs sm:text-sm text-[#475569] dark:text-[#cbd5e1]">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: activeColor }}
            />
            <span>Instant keyboard shortcuts for zero-friction sprints</span>
          </div>
        </div>

        {/* Minimalist Action Buttons */}
        <div className="mt-7 flex flex-col gap-2.5">
          <button
            onClick={handleCopyLink}
            className="w-full py-3 px-5 rounded-2xl text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-sm"
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
            {copied ? (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Link Copied</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>Copy Link for PC</span>
              </>
            )}
          </button>

          <button
            onClick={handleEmailSelf}
            className="w-full py-2.5 px-5 rounded-2xl border text-xs sm:text-sm font-normal flex items-center justify-center gap-2 transition-colors border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.03] dark:hover:bg-white/[0.03] text-[#475569] dark:text-[#94a3b8] cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <span>Email link</span>
          </button>
        </div>
      </div>

      {/* Bottom spacer for balanced centering */}
      <div className="shrink-0 h-4" aria-hidden="true" />
    </div>
  );
}
