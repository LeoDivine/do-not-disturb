"use client";

import React from "react";
import { useSync } from "../context/SyncContext";
import { useTimer } from "../context/timer-context";

export default function SyncButton() {
  const { user, storageMode, syncState, openSyncModal } = useSync();
  const { activeColor, activeContainer, activeBorder } = useTimer();

  const isCloud = storageMode === "cloud";

  return (
    <button
      onClick={openSyncModal}
      type="button"
      title={
        isCloud
          ? `Synced as ${user?.email || "User"} • Click to manage`
          : "Saved to this device only • Click to sync across devices"
      }
      className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-medium transition-all cursor-pointer ${
        isCloud
          ? "shadow-2xs"
          : "bg-slate-100/80 dark:bg-[#141b24] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#222d3d] hover:border-slate-300 dark:hover:border-slate-700"
      }`}
      style={
        isCloud
          ? {
              backgroundColor: activeContainer,
              borderColor: activeBorder,
              color: activeColor,
            }
          : undefined
      }
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isCloud
            ? syncState === "syncing"
              ? "animate-ping"
              : ""
            : "bg-amber-400"
        }`}
        style={isCloud ? { backgroundColor: activeColor } : undefined}
      />
      <span className="hidden sm:inline tracking-tight">
        {isCloud ? "In Sync" : "Sync"}
      </span>
      <svg
        className={`w-3.5 h-3.5 opacity-60 ${
          syncState === "syncing" ? "animate-spin opacity-100" : ""
        }`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
      </svg>
    </button>
  );
}
