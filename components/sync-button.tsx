"use client";

import React from "react";
import { useSync } from "../context/sync-context";
import { useTimer } from "../context/timer-context";

export default function SyncButton() {
  const { user, storageMode, syncState, openSyncModal } = useSync();
  const { activeColor } = useTimer();

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
      aria-label={isCloud ? "Manage cloud sync" : "Sync across devices"}
      className="group flex items-center gap-1.5 py-1 text-xs font-medium text-[#64748b] hover:text-[#0f172a] dark:text-[#7e8c9f] dark:hover:text-white whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:outline-none rounded"
      style={isCloud ? { color: activeColor } : undefined}
    >
      <svg
        className={`w-4 h-4 transition-transform duration-300 group-hover:rotate-45 ${
          syncState === "syncing" ? "animate-spin" : ""
        }`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
      </svg>
      {!user && (
        <span className="tracking-tight whitespace-nowrap">Sync</span>
      )}
    </button>
  );
}
