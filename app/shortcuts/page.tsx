"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../../context/theme-context";
import { useTimer } from "../../context/timer-context";
import { useSync } from "../../context/SyncContext";
import {
  getStoredShortcuts,
  saveStoredShortcuts,
  updateShortcutKey,
  resetShortcutsToDefault,
  SHORTCUTS_UPDATED_EVENT,
  ShortcutDef,
} from "../../lib/shortcuts/shortcuts-store";

const CATEGORIES: Array<{
  name: "Timer & Flow" | "Navigation" | "Interface";
  title: string;
  subtitle: string;
}> = [
  {
    name: "Timer & Flow",
    title: "Timer & Focus Sessions",
    subtitle:
      "Start, pause, reset, or switch between work sprints and rest intervals.",
  },
  {
    name: "Navigation",
    title: "Quick Page Navigation",
    subtitle:
      "Jump straight to the timer, blocklist, statistics, or settings in one keystroke.",
  },
  {
    name: "Interface",
    title: "Display & Window Controls",
    subtitle:
      "Control the floating mini timer, toggle dark or light theme, and dismiss popups.",
  },
];

export default function ShortcutsPage() {
  const router = useRouter();
  const { isDark, theme, setTheme } = useTheme();
  const {
    activeColor,
    activeContainer,
    activeBorder,
    colors,
    isRunning,
    toggleTimer,
    resetTimer,
    skipTimer,
    setMode,
    toggleMiniWindow,
  } = useTimer();

  const { user, storageMode, openSyncModal, syncNow } = useSync();

  const [shortcuts, setShortcuts] = useState<ShortcutDef[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [shortcutsEnabled, setShortcutsEnabled] = useState<boolean>(true);
  const [testActionResult, setTestActionResult] = useState<string | null>(null);
  const [editingActionType, setEditingActionType] = useState<string | null>(null);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Load shortcuts and subscribe to updates
  useEffect(() => {
    setShortcuts(getStoredShortcuts());

    const handleUpdate = (e: CustomEvent<ShortcutDef[]>) => {
      if (Array.isArray(e.detail)) {
        setShortcuts(e.detail);
      } else {
        setShortcuts(getStoredShortcuts());
      }
    };

    window.addEventListener(
      SHORTCUTS_UPDATED_EVENT as any,
      handleUpdate as EventListener
    );

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("dnd-shortcuts-enabled");
      if (stored !== null) {
        setShortcutsEnabled(stored !== "false");
      }
    }

    return () => {
      window.removeEventListener(
        SHORTCUTS_UPDATED_EVENT as any,
        handleUpdate as EventListener
      );
    };
  }, []);

  // Find the shortcut currently being edited for user-friendly UI display
  const editingShortcut = useMemo(() => {
    if (!editingActionType) return null;
    return shortcuts.find((s) => s.actionType === editingActionType) || null;
  }, [shortcuts, editingActionType]);

  // Listen for keypress when in editing/recording mode
  useEffect(() => {
    if (!editingActionType) return;

    const handleKeyRecord = async (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Pressing Escape cancels recording mode
      if (e.key === "Escape") {
        setEditingActionType(null);
        setSyncStatusMsg("Key change cancelled");
        setTimeout(() => setSyncStatusMsg(null), 2000);
        return;
      }

      // Ignore lone modifier presses
      if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
        return;
      }

      const keys: string[] = [];
      if (e.ctrlKey) keys.push("Ctrl");
      if (e.altKey) keys.push("Alt");
      if (e.shiftKey) keys.push("Shift");
      if (e.metaKey) keys.push("Cmd");

      let keyName = e.key;
      if (e.code === "Space") keyName = "Space";
      else if (keyName.length === 1) keyName = keyName.toUpperCase();

      keys.push(keyName);

      // Save locally
      const updated = updateShortcutKey(editingActionType, keys);
      setShortcuts(updated);
      setEditingActionType(null);

      const friendlyActionLabel = editingShortcut?.label || "Shortcut";

      if (user) {
        try {
          setSyncStatusMsg(`Saved "${friendlyActionLabel}" and synced to your account!`);
          await fetch("/api/sync/shortcuts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ actionType: editingActionType, keys }),
          });
          setTimeout(() => setSyncStatusMsg(null), 3000);
        } catch {
          setSyncStatusMsg(`Saved "${friendlyActionLabel}" to this device.`);
          setTimeout(() => setSyncStatusMsg(null), 3000);
        }
      } else {
        setSyncStatusMsg(`Saved "${friendlyActionLabel}" to this device.`);
        setTimeout(() => setSyncStatusMsg(null), 3000);
      }
    };

    window.addEventListener("keydown", handleKeyRecord, true);
    return () => {
      window.removeEventListener("keydown", handleKeyRecord, true);
    };
  }, [editingActionType, editingShortcut, user]);

  const handleToggleShortcutsEnabled = () => {
    const nextVal = !shortcutsEnabled;
    setShortcutsEnabled(nextVal);
    if (typeof window !== "undefined") {
      localStorage.setItem("dnd-shortcuts-enabled", String(nextVal));
    }
  };

  const handleResetDefaults = async () => {
    if (
      confirm(
        "Restore all shortcuts to their original default keys? Any custom combinations you assigned will be cleared."
      )
    ) {
      const defaults = resetShortcutsToDefault();
      setShortcuts(defaults);
      setSyncStatusMsg("All shortcuts restored to factory defaults.");
      setTimeout(() => setSyncStatusMsg(null), 3000);
      if (user) {
        await syncNow();
      }
    }
  };

  const executeAction = (actionType: ShortcutDef["actionType"]) => {
    switch (actionType) {
      case "toggleTimer":
        toggleTimer();
        setTestActionResult(isRunning ? "Timer paused" : "Timer started");
        break;
      case "resetTimer":
        resetTimer();
        setTestActionResult("Timer reset back to original duration");
        break;
      case "skipTimer":
        skipTimer();
        setTestActionResult("Skipped to next session interval");
        break;
      case "modeFocus":
        setMode("focus");
        setTestActionResult("Switched to Focus mode — website blocking active");
        break;
      case "modeShort":
        setMode("shortBreak");
        setTestActionResult("Switched to Short Break (5 min) — time to relax!");
        break;
      case "modeLong":
        setMode("longBreak");
        setTestActionResult("Switched to Long Break (15 min) — step away and recharge!");
        break;
      case "toggleMini":
        toggleMiniWindow();
        setTestActionResult("Toggled mini floating timer window");
        break;
      case "toggleTheme":
        setTheme(theme === "dark" ? "light" : "dark");
        setTestActionResult(
          `Switched appearance to ${theme === "dark" ? "Light" : "Dark"} Mode`
        );
        break;
      case "navFocus":
        router.push("/");
        break;
      case "navBlocklist":
        router.push("/blocklist");
        break;
      case "navStats":
        router.push("/statistics");
        break;
      case "navSettings":
        router.push("/settings");
        break;
      case "navPrivacy":
        router.push("/privacy");
        break;
      case "navShortcuts":
        setTestActionResult("Already viewing Keyboard Shortcuts cheatsheet");
        break;
      case "closeModal":
        setTestActionResult("Closed open dialogs, menus, and popup windows");
        break;
    }

    setTimeout(() => {
      setTestActionResult(null);
    }, 2500);
  };

  const filteredShortcuts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return shortcuts;

    return shortcuts.filter((sc) => {
      return (
        sc.label.toLowerCase().includes(q) ||
        sc.description.toLowerCase().includes(q) ||
        sc.keys.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [shortcuts, searchQuery]);

  const faqs = [
    {
      q: "Do keyboard shortcuts interfere while I am typing?",
      a: "No. For your convenience, keyboard shortcuts are automatically paused whenever you are typing in search boxes, input fields, or text areas so you won't trigger unwanted actions.",
    },
    {
      q: "Can I use shortcuts when I am in another window or desktop application?",
      a: "Yes! If you have installed our companion browser extension, you can set global system-wide shortcuts via chrome://extensions/shortcuts to control your timer without switching tabs.",
    },
    {
      q: "Can I assign multi-key combinations?",
      a: "Yes. You can press combinations like Ctrl+Shift+S or Alt+P, as well as single keys like Space, R, or 1. Just click 'Edit' next to any shortcut and press your new keys.",
    },
    {
      q: "How do I return back to the default shortcuts?",
      a: "Simply click the 'Reset Defaults' button at the top right of this page at any time to restore all shortcuts back to their original keys.",
    },
  ];

  return (
    <main className="max-w-[1360px] w-full mx-auto p-6 md:p-8 flex flex-col gap-8">
      {/* 1. Header & Storage Sync Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0f172a] dark:text-white">
            Keyboard Shortcuts
          </h1>
          <p className="text-xs md:text-sm mt-1 text-[#64748b] dark:text-[#7e8c9f] max-w-2xl leading-relaxed">
            Stay in your flow and control your sessions with quick hotkeys.
            Press any shortcut on your keyboard, test actions below, or customize any key to match your workflow.
          </p>
        </div>

        {/* Global Controls & Sync Info */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Cloud / Local Sync */}
          <button
            onClick={openSyncModal}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              storageMode === "cloud"
                ? ""
                : "bg-slate-50 dark:bg-[#141b24] border-slate-200 dark:border-[#222d3d] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1a2330]"
            }`}
            style={
              storageMode === "cloud"
                ? {
                    backgroundColor: isDark ? colors.containerDark : colors.container,
                    borderColor: activeBorder,
                    color: activeColor,
                  }
                : undefined
            }
            title={
              storageMode === "cloud"
                ? `Custom shortcuts backed up to ${user?.email}`
                : "Saved on this device only. Click to sign in and sync everywhere."
            }
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                storageMode === "cloud"
                  ? "animate-pulse"
                  : "bg-amber-400"
              }`}
              style={storageMode === "cloud" ? { backgroundColor: activeColor } : undefined}
            />
            <span>
              {storageMode === "cloud"
                ? `Synced (${user?.email})`
                : "Device Only • Click to Sync"}
            </span>
          </button>

          {/* Reset to Defaults */}
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-200 dark:border-[#1d2634] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#141b24] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Reset all shortcuts to factory defaults"
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            <span>Reset Defaults</span>
          </button>

          {/* Master Enable/Disable Toggle */}
          <button
            onClick={handleToggleShortcutsEnabled}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              shortcutsEnabled
                ? isDark
                  ? "bg-[#64ffda] text-[#0c1017] border-[#64ffda] font-semibold"
                  : "bg-[#0f766e] text-white border-[#0f766e] font-semibold"
                : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300"
            }`}
            title={
              shortcutsEnabled
                ? "Shortcuts are currently active. Click to pause."
                : "Shortcuts are paused. Click to enable."
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                shortcutsEnabled
                  ? isDark
                    ? "bg-[#0c1017]"
                    : "bg-white"
                  : "bg-rose-500"
              }`}
            />
            <span>{shortcutsEnabled ? "Shortcuts: Active" : "Shortcuts: Paused"}</span>
          </button>
        </div>
      </div>

      {/* 2. Most Popular Shortcuts - Quick Start Hero Cards (No pills) */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="p-4 rounded-2xl border bg-white dark:bg-[#101620] border-[#e2e8f0] dark:border-[#1d2634] shadow-xs flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <kbd className="px-2.5 py-1 rounded-lg font-mono text-xs font-bold border shadow-xs bg-slate-50 dark:bg-[#0c1017] border-slate-200 dark:border-[#2a3649] text-slate-800 dark:text-slate-100">
              Space
            </kbd>
            <span className="text-[11px] font-medium text-[#64748b] dark:text-[#7e8c9f]">
              Most Used
            </span>
          </div>
          <div>
            <h2 className="text-xs font-semibold text-[#0f172a] dark:text-white">
              Start &amp; Pause Timer
            </h2>
            <p className="text-[11px] text-[#64748b] dark:text-[#7e8c9f] mt-0.5">
              Instantly toggle your active countdown.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl border bg-white dark:bg-[#101620] border-[#e2e8f0] dark:border-[#1d2634] shadow-xs flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 font-mono text-xs font-bold">
              <kbd className="px-2 py-1 rounded-lg border shadow-xs bg-slate-50 dark:bg-[#0c1017] border-slate-200 dark:border-[#2a3649] text-slate-800 dark:text-slate-100">
                1
              </kbd>
              <span className="text-slate-400">/</span>
              <kbd className="px-2 py-1 rounded-lg border shadow-xs bg-slate-50 dark:bg-[#0c1017] border-slate-200 dark:border-[#2a3649] text-slate-800 dark:text-slate-100">
                2
              </kbd>
              <span className="text-slate-400">/</span>
              <kbd className="px-2 py-1 rounded-lg border shadow-xs bg-slate-50 dark:bg-[#0c1017] border-slate-200 dark:border-[#2a3649] text-slate-800 dark:text-slate-100">
                3
              </kbd>
            </div>
            <span className="text-[11px] font-medium text-[#64748b] dark:text-[#7e8c9f]">
              Modes
            </span>
          </div>
          <div>
            <h2 className="text-xs font-semibold text-[#0f172a] dark:text-white">
              Switch Sessions
            </h2>
            <p className="text-[11px] text-[#64748b] dark:text-[#7e8c9f] mt-0.5">
              1 = Focus, 2 = Short Break, 3 = Long Break.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl border bg-white dark:bg-[#101620] border-[#e2e8f0] dark:border-[#1d2634] shadow-xs flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <kbd className="px-2.5 py-1 rounded-lg font-mono text-xs font-bold border shadow-xs bg-slate-50 dark:bg-[#0c1017] border-slate-200 dark:border-[#2a3649] text-slate-800 dark:text-slate-100">
              Esc
            </kbd>
            <span className="text-[11px] font-medium text-[#64748b] dark:text-[#7e8c9f]">
              Quick Clear
            </span>
          </div>
          <div>
            <h2 className="text-xs font-semibold text-[#0f172a] dark:text-white">
              Close Popups &amp; Menus
            </h2>
            <p className="text-[11px] text-[#64748b] dark:text-[#7e8c9f] mt-0.5">
              Dismiss modals, drop-downs, and dialogs.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl border bg-white dark:bg-[#101620] border-[#e2e8f0] dark:border-[#1d2634] shadow-xs flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <kbd className="px-2.5 py-1 rounded-lg font-mono text-xs font-bold border shadow-xs bg-slate-50 dark:bg-[#0c1017] border-slate-200 dark:border-[#2a3649] text-slate-800 dark:text-slate-100">
              M
            </kbd>
            <span className="text-[11px] font-medium text-[#64748b] dark:text-[#7e8c9f]">
              Multitask
            </span>
          </div>
          <div>
            <h2 className="text-xs font-semibold text-[#0f172a] dark:text-white">
              Mini Floating Timer
            </h2>
            <p className="text-[11px] text-[#64748b] dark:text-[#7e8c9f] mt-0.5">
              Keep time in view while working in other apps.
            </p>
          </div>
        </div>
      </section>

      {/* Sync Status or Action Feedback Toast */}
      {(testActionResult || syncStatusMsg) && (
        <div
          className="p-3.5 rounded-2xl border text-xs font-medium flex items-center justify-between animate-in fade-in transition-colors"
          style={{
            backgroundColor: isDark ? colors.containerDark : colors.container,
            borderColor: activeBorder,
            color: activeColor,
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.7)",
                color: activeColor,
              }}
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span>{testActionResult || syncStatusMsg}</span>
          </div>
          {syncStatusMsg && storageMode === "local" && (
            <button
              onClick={openSyncModal}
              className="underline hover:opacity-80 cursor-pointer ml-3 font-medium"
              style={{ color: activeColor }}
            >
              Sign in to back up and sync across devices →
            </button>
          )}
        </div>
      )}

      {/* Rebind Key Recording Banner if active */}
      {editingActionType && (
        <div className="p-4 rounded-2xl border bg-amber-500/10 border-amber-500/40 text-amber-950 dark:text-amber-200 text-xs font-medium flex items-center justify-between animate-pulse shadow-sm">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            <div>
              <p className="font-semibold text-sm text-amber-900 dark:text-amber-100">
                Listening for new key:{" "}
                <span className="underline decoration-amber-500">
                  {editingShortcut?.label || editingActionType}
                </span>
              </p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                Press any key combination (for example: Space, P, or Ctrl+Shift+T). Press Esc or click Cancel to keep your current key.
              </p>
            </div>
          </div>
          <button
            onClick={() => setEditingActionType(null)}
            className="px-3 py-1.5 rounded-xl border border-amber-600/40 hover:bg-amber-500/20 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ml-4"
          >
            Cancel
          </button>
        </div>
      )}

      {/* 3. Search Bar (Direct clean layout, no pills) */}
      <div className="relative w-full max-w-md">
        <svg
          className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"
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
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search shortcuts (e.g. Space, timer, theme)..."
          className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border bg-white dark:bg-[#101620] border-[#e2e8f0] dark:border-[#1d2634] text-[#0f172a] dark:text-white placeholder-[#94a3b8] focus:outline-none focus:ring-2 transition-all shadow-2xs"
          style={{ outlineColor: activeColor }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer transition-colors"
            title="Clear search"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* 4. Categorized Cheatsheet Tables */}
      <div className="flex flex-col gap-8">
        {CATEGORIES.map((catObj) => {
          const items = filteredShortcuts.filter(
            (sc) => sc.category === catObj.name
          );
          if (items.length === 0) return null;

          return (
            <div key={catObj.name} className="flex flex-col gap-3">
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-[#0f172a] dark:text-white flex items-center gap-2">
                  <span>{catObj.title}</span>
                  <span className="text-[11px] font-normal text-[#94a3b8]">
                    ({items.length})
                  </span>
                </h2>
                <p className="text-xs text-[#64748b] dark:text-[#7e8c9f] mt-0.5">
                  {catObj.subtitle}
                </p>
              </div>

              <div className="border rounded-2xl overflow-hidden bg-white dark:bg-[#101620] border-[#e2e8f0] dark:border-[#1d2634] shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#e2e8f0] dark:border-[#1d2634] bg-[#f8fafc]/80 dark:bg-[#0b0f17]/80 text-[#64748b] dark:text-[#7e8c9f]">
                        <th className="py-3 px-5 font-semibold w-48">Shortcut Key</th>
                        <th className="py-3 px-4 font-semibold w-60">Action</th>
                        <th className="py-3 px-4 font-semibold hidden md:table-cell">
                          What it does
                        </th>
                        <th className="py-3 px-5 font-semibold text-right w-44">
                          Quick Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0] dark:divide-[#1d2634] text-[#334155] dark:text-[#cbd5e1]">
                      {items.map((sc) => {
                        const isEditingThis = editingActionType === sc.actionType;

                        return (
                          <tr
                            key={sc.id || sc.actionType}
                            className={`transition-colors ${
                              isEditingThis
                                ? "bg-amber-500/10 dark:bg-amber-500/15"
                                : "hover:bg-[#f8fafc]/60 dark:hover:bg-[#0c1017]/60"
                            }`}
                          >
                            <td className="py-3.5 px-5 whitespace-nowrap">
                              <button
                                onClick={() =>
                                  setEditingActionType(
                                    isEditingThis ? null : sc.actionType
                                  )
                                }
                                title="Click to customize this key"
                                className="flex items-center gap-1.5 group cursor-pointer text-left"
                              >
                                {isEditingThis ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/20 border border-amber-500/40 animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    Press new key...
                                  </span>
                                ) : (
                                  sc.keys.map((k) => (
                                    <kbd
                                      key={k}
                                      className="px-2.5 py-1 rounded-lg font-mono text-[11px] font-semibold border shadow-xs transition-colors group-hover:border-teal-500"
                                      style={{
                                        backgroundColor: isDark
                                          ? "#0c1017"
                                          : "#f8fafc",
                                        borderColor: isDark
                                          ? "#2a3649"
                                          : "#cbd5e1",
                                        color: isDark ? "#f1f5f9" : "#0f172a",
                                      }}
                                    >
                                      {k}
                                    </kbd>
                                  ))
                                )}
                                {!isEditingThis && (
                                  <span className="opacity-0 group-hover:opacity-100 text-[10px] text-teal-600 dark:text-teal-400 font-medium ml-1 transition-opacity">
                                    Change
                                  </span>
                                )}
                              </button>
                            </td>

                            <td className="py-3.5 px-4 font-semibold text-[#0f172a] dark:text-white">
                              {sc.label}
                            </td>

                            <td className="py-3.5 px-4 text-[#64748b] dark:text-[#7e8c9f] hidden md:table-cell leading-relaxed">
                              {sc.description}
                            </td>

                            <td className="py-3.5 px-5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() =>
                                    setEditingActionType(
                                      isEditingThis ? null : sc.actionType
                                    )
                                  }
                                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#141b24] transition-colors cursor-pointer"
                                  title="Change the key assigned to this action"
                                >
                                  {isEditingThis ? "Cancel" : "Edit Key"}
                                </button>

                                <button
                                  onClick={() => executeAction(sc.actionType)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer bg-[#f8fafc] dark:bg-[#141b24] border-[#e2e8f0] dark:border-[#2a3649] text-[#0f172a] dark:text-white dark:hover:bg-[#64ffda] dark:hover:text-[#0c1017] dark:hover:border-[#64ffda] hover:bg-[#0f766e] hover:text-white hover:border-[#0f766e]"
                                  title="Test this shortcut right now"
                                >
                                  <svg
                                    className="w-3 h-3 text-current opacity-70"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                  >
                                    <polygon points="5 3 19 12 5 21 5 3" />
                                  </svg>
                                  <span>Try it</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })}

        {filteredShortcuts.length === 0 && (
          <div className="p-10 text-center flex flex-col items-center justify-center gap-3 border rounded-2xl bg-white dark:bg-[#101620] border-[#e2e8f0] dark:border-[#1d2634]">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#0f172a] dark:text-white">
                No shortcuts found
              </p>
              <p className="text-xs text-[#64748b] dark:text-[#7e8c9f] mt-1">
                We couldn&apos;t find any hotkeys matching &quot;{searchQuery}&quot;.
              </p>
            </div>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-1 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer bg-[#0f766e] text-white dark:bg-[#64ffda] dark:text-[#0c1017] border-transparent hover:opacity-90"
            >
              Clear search &amp; view all shortcuts
            </button>
          </div>
        )}
      </div>

      {/* 5. User Guides & Pro Tips */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl border bg-white dark:bg-[#101620] border-[#e2e8f0] dark:border-[#1d2634] shadow-xs flex flex-col gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{
              backgroundColor: isDark ? colors.containerDark : colors.container,
              color: activeColor,
            }}
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-[#0f172a] dark:text-white">
            Personalize Any Hotkey
          </h2>
          <p className="text-xs text-[#64748b] dark:text-[#7e8c9f] leading-relaxed">
            Click &apos;Edit Key&apos; or tap any key badge to assign your preferred key combinations. Your preferences save immediately and sync whenever you sign into your account.
          </p>
        </div>

        <div className="p-5 rounded-2xl border bg-white dark:bg-[#101620] border-[#e2e8f0] dark:border-[#1d2634] shadow-xs flex flex-col gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-[#0f172a] dark:text-white">
            Use Across Other Apps
          </h2>
          <p className="text-xs text-[#64748b] dark:text-[#7e8c9f] leading-relaxed">
            Want to pause your timer while coding, writing, or reading? In Chrome or Edge, visit <code className="font-mono text-[10px] px-1 py-0.5 rounded bg-[#f1f5f9] dark:bg-[#141b24]">chrome://extensions/shortcuts</code> to bind system-wide shortcuts.
          </p>
        </div>

        <div className="p-5 rounded-2xl border bg-white dark:bg-[#101620] border-[#e2e8f0] dark:border-[#1d2634] shadow-xs flex flex-col gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-[#0f172a] dark:text-white">
            Safe While Typing
          </h2>
          <p className="text-xs text-[#64748b] dark:text-[#7e8c9f] leading-relaxed">
            You never have to worry about accidentally pausing your timer while taking notes or searching. All shortcuts automatically yield whenever a text box or form field is focused.
          </p>
        </div>
      </section>

      {/* 6. Frequently Asked Questions (User Friendly Help) */}
      <section className="p-6 rounded-2xl border bg-white dark:bg-[#101620] border-[#e2e8f0] dark:border-[#1d2634] shadow-xs flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold text-[#0f172a] dark:text-white">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-[#64748b] dark:text-[#7e8c9f] mt-0.5">
            Quick answers about using and customizing keyboard hotkeys in Do Not Disturb.
          </p>
        </div>

        <div className="divide-y divide-[#e2e8f0] dark:divide-[#1d2634] text-xs">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div key={faq.q} className="py-3">
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between text-left font-medium text-[#0f172a] dark:text-white transition-colors cursor-pointer"
                  style={{ color: isOpen ? activeColor : undefined }}
                >
                  <span>{faq.q}</span>
                  <span className="text-slate-400 text-base font-mono">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                {isOpen && (
                  <p className="mt-2 text-[#64748b] dark:text-[#7e8c9f] leading-relaxed animate-in fade-in">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
