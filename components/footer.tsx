"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "../context/theme-context";
import { useTimer } from "../context/timer-context";

export default function Footer() {
  const pathname = usePathname();
  const { isDark } = useTheme();
  const { activeColor, colors } = useTimer();

  // Hide the global footer on the blocked page
  if (pathname === "/blocked") {
    return null;
  }

  return (
    <footer className="px-6 md:px-8 py-5 border-t mt-auto text-xs transition-colors border-[#e2e8f0] dark:border-[#1b2432] text-[#64748b] dark:text-[#7e8c9f]">
      <div className="max-w-[1360px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="flex items-center gap-2">
          <span>© 2025 Do Not Disturb.</span>
          <span className="font-medium" style={{ color: activeColor }}>
            {colors.name} Active
          </span>
        </p>
        <div className="flex items-center gap-6">
          <Link
            href="/privacy"
            className="cursor-pointer transition-colors hover:opacity-80"
            style={{ color: activeColor }}
          >
            Privacy First
          </Link>
          <Link
            href="/privacy#local-only"
            className="cursor-pointer transition-colors hover:opacity-80"
          >
            Local-Only Mode
          </Link>
          <Link
            href="/shortcuts"
            className="cursor-pointer transition-colors hover:opacity-80"
          >
            Keyboard Shortcuts
          </Link>
        </div>
      </div>
    </footer>
  );
}
