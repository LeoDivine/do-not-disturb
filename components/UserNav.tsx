"use client";

import React from "react";
import { useSync } from "../context/SyncContext";
import { useTimer } from "../context/timer-context";
import { useTheme } from "../context/theme-context";

export default function UserNav() {
  const { user, openSyncModal } = useSync();
  const { activeColor, colors } = useTimer();
  const { isDark } = useTheme();

  // When no user is logged in, the Sync button in the navbar already serves as the sync/auth trigger
  if (!user) {
    return null;
  }

  const displayName = user.name || (user.email ? user.email.split("@")[0] : "User");
  const initial = (user.name || user.email || "U")[0].toUpperCase();

  return (
    <button
      onClick={openSyncModal}
      type="button"
      title={`Signed in as ${user.email || displayName} • Click to manage account`}
      aria-label={`Signed in as ${user.email || displayName}`}
      className="flex items-center gap-2 p-1 md:pr-2.5 rounded-xl border transition-all cursor-pointer shadow-xs hover:opacity-90"
      style={{
        backgroundColor: isDark ? colors.containerDark : colors.container,
        borderColor: isDark ? colors.borderDark : colors.border,
        color: activeColor,
      }}
    >
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={displayName}
          className="w-6 h-6 rounded-lg object-cover"
        />
      ) : (
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs"
          style={{
            backgroundColor: activeColor,
            color: "#ffffff",
          }}
        >
          {initial}
        </div>
      )}
      <span className="hidden md:inline text-xs font-semibold max-w-[120px] truncate">
        {displayName}
      </span>
    </button>
  );
}
