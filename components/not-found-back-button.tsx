"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function NotFoundBackButton() {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors rounded-lg border border-[#e2e8f0] dark:border-[#1d2634] bg-white dark:bg-[#101620] text-[#0f172a] dark:text-[#f1f5f9] hover:bg-slate-50 dark:hover:bg-[#141b24] hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer"
    >
      <svg
        className="w-4 h-4 text-[#64748b] dark:text-[#7e8c9f]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 19l-7-7m0 0l7-7m-7 7h18"
        />
      </svg>
      <span>Go back</span>
    </button>
  );
}
