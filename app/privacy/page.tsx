"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useTheme } from "../../context/theme-context";
import { useTimer } from "../../context/timer-context";
import { useSync } from "../../context/SyncContext";
import {
  exportDataAsJSON,
  importDataFromJSON,
} from "../../lib/sync/sync-service";
import {
  getStoredBlocklist,
  saveStoredBlocklist,
  DEFAULT_ENDPOINTS,
  getTotalDeflections,
} from "../../lib/blocking/blocklist-store";
import {
  getStoredSessions,
  clearStoredSessions,
  SESSIONS_UPDATED_EVENT,
} from "../../lib/sessions/session-store";
import {
  saveStoredSettings,
  DEFAULT_SETTINGS,
  SETTINGS_UPDATED_EVENT,
} from "../../lib/settings/settings-store";
import {
  saveStoredShortcuts,
  DEFAULT_SHORTCUTS,
} from "../../lib/shortcuts/shortcuts-store";

type ResetCategory = "all" | "sessions" | "blocklist" | "settings";

export default function PrivacyPage() {
  const { isDark } = useTheme();
  const { activeColor, colors } = useTimer();
  const { user, openSyncModal } = useSync();

  // Storage info
  const [dataSizeKb, setDataSizeKb] = useState<string>("0");
  const [sessionCount, setSessionCount] = useState<number>(0);
  const [blocklistCount, setBlocklistCount] = useState<number>(0);

  // User feedback & modals
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [selectedReset, setSelectedReset] = useState<ResetCategory>("all");
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const refreshOverview = () => {
    if (typeof window === "undefined") return;

    let totalBytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith("dnd") || key.includes("timer") || key.includes("blocklist")) {
        const val = localStorage.getItem(key) || "";
        totalBytes += new Blob([key, val]).size;
      }
    }

    setDataSizeKb((totalBytes / 1024).toFixed(1));
    setSessionCount(getStoredSessions().length);
    setBlocklistCount(getStoredBlocklist().length);
  };

  useEffect(() => {
    refreshOverview();

    const handleUpdate = () => refreshOverview();
    window.addEventListener("storage", handleUpdate);
    window.addEventListener(SESSIONS_UPDATED_EVENT as any, handleUpdate);
    window.addEventListener(SETTINGS_UPDATED_EVENT as any, handleUpdate);
    window.addEventListener("dnd-blocklist-updated" as any, handleUpdate);

    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener(SESSIONS_UPDATED_EVENT as any, handleUpdate);
      window.removeEventListener(SETTINGS_UPDATED_EVENT as any, handleUpdate);
      window.removeEventListener("dnd-blocklist-updated" as any, handleUpdate);
    };
  }, []);

  const handleDownload = () => {
    setIsExporting(true);
    try {
      exportDataAsJSON();
      showToast("Your backup file has been saved to your computer.");
    } catch {
      showToast("Unable to download backup. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const success = await importDataFromJSON(file);
      if (success) {
        refreshOverview();
        showToast("Your backup was restored successfully.");
      } else {
        showToast("Could not read backup file. Please make sure it is a valid backup.");
      }
    } catch {
      showToast("Could not restore backup file.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleExecuteReset = () => {
    if (typeof window === "undefined") return;

    try {
      switch (selectedReset) {
        case "sessions":
          clearStoredSessions();
          localStorage.removeItem("dnd_deflection_events_log");
          localStorage.removeItem("dnd_primary_anchor");
          localStorage.removeItem("dnd_session_intent");
          showToast("Focus sprint history and streak counts have been cleared.");
          break;

        case "blocklist":
          saveStoredBlocklist(DEFAULT_ENDPOINTS);
          localStorage.removeItem("dnd_deflection_events_log");
          showToast("Blocklist has been restored to default websites.");
          break;

        case "settings":
          saveStoredSettings(DEFAULT_SETTINGS);
          saveStoredShortcuts(DEFAULT_SHORTCUTS);
          localStorage.removeItem("dnd_timer_presets");
          showToast("Timer intervals and sound settings have been reset.");
          break;

        case "all":
        default: {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith("dnd") || k.includes("timer") || k.includes("blocklist"))) {
              keysToRemove.push(k);
            }
          }
          keysToRemove.forEach((k) => localStorage.removeItem(k));
          showToast("All personal data and settings on this device have been cleared.");
          break;
        }
      }

      refreshOverview();
      setShowResetModal(false);
    } catch {
      showToast("An error occurred while resetting your data.");
    }
  };

  const faqs = [
    {
      question: "Do I need to sign up to use Do Not Disturb?",
      answer:
        "No. You never have to create an account, provide an email address, or create a password. You can use every single timer, ambient sound, and blocking feature completely as a guest.",
    },
    {
      question: "Can anyone see the websites I visit or block?",
      answer:
        "Never. The companion browser extension works natively inside your browser. It pauses distracting websites without ever recording your browsing history or sending visited links to any server.",
    },
    {
      question: "What is saved if I choose to use Cloud Sync?",
      answer:
        "Cloud Sync is completely optional. If you choose to log in, we only sync your timer durations, your blocklist, and your streak count so you can focus across multiple laptops or desktops. We never sync your browsing history or work notes.",
    },
    {
      question: "Does the soothing sound player stream audio over the internet?",
      answer:
        "No. Rain, ambient waves, and focus tones are synthesized directly inside your browser using mathematical audio waves. Zero audio files are downloaded, which protects your bandwidth and privacy.",
    },
    {
      question: "How do I move my setup to another computer?",
      answer:
        "Click 'Download backup' to save your settings and blocklists to a small file, then click 'Restore backup' on your other computer. Or, simply sign in with optional Cloud Sync to sync them automatically.",
    },
    {
      question: "How do I completely erase my data?",
      answer:
        "Click 'Reset data' at the top of this page anytime. You can choose to clear your focus streaks, reset your blocklist, or erase every piece of saved information with a single click.",
    },
  ];

  return (
    <main className="max-w-[1360px] w-full mx-auto p-6 md:p-8 flex flex-col gap-8 text-[#0f172a] dark:text-[#f8fafc]">
      {/* Hidden File Picker */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".json,application/json"
        className="hidden"
        aria-label="Upload backup file"
      />

      {/* Subtle Toast Notification */}
      {toastMessage && (
        <div
          className="fixed bottom-6 right-6 z-50 p-4 rounded-xl border shadow-lg bg-white dark:bg-[#141b24] border-[#e2e8f0] dark:border-[#222d3d] text-xs font-medium text-[#0f172a] dark:text-white flex items-center gap-3 animate-in fade-in"
          role="status"
        >
          <svg className="w-4 h-4 text-emerald-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white ml-2 cursor-pointer"
            aria-label="Dismiss"
          >
            &times;
          </button>
        </div>
      )}

      {/* 1. Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0f172a] dark:text-white">
          Privacy First
        </h1>
        <p className="text-xs md:text-sm text-[#64748b] dark:text-[#7e8c9f] leading-relaxed max-w-2xl">
          Your attention is personal. Do Not Disturb is designed from the ground up to respect your flow:
          no tracking, no ads, and no accounts required. Everything stays right on your device.
        </p>

        {/* Current status line */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-xs text-[#64748b] dark:text-[#7e8c9f]">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[#0f172a] dark:text-white">
              {user ? "Cloud Sync Active" : "Local Storage Mode"}
            </span>
            <span>&middot;</span>
            <span>
              {user ? `Connected as ${user.email || user.name}` : `${dataSizeKb} KB saved on this device`}
            </span>
          </div>

          <button
            onClick={openSyncModal}
            className="font-medium transition-colors hover:underline cursor-pointer inline-flex items-center gap-1"
            style={{ color: activeColor }}
          >
            <span>{user ? "Manage account & sync" : "Set up optional sync"}</span>
            <span aria-hidden="true">&rarr;</span>
          </button>
        </div>
      </div>

      {/* 2. Core Principles (Clean, uncrowded 3-part grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        <div className="p-6 rounded-2xl border bg-white dark:bg-[#101620] border-[#e2e8f0] dark:border-[#1d2634] flex flex-col gap-2.5">
          <h2 className="text-sm font-semibold text-[#0f172a] dark:text-white">
            No Account Needed
          </h2>
          <p className="text-xs text-[#64748b] dark:text-[#94a3b8] leading-relaxed">
            Open the app and get straight to work. You never need an email, phone number, or password to use all features.
          </p>
        </div>

        <div className="p-6 rounded-2xl border bg-white dark:bg-[#101620] border-[#e2e8f0] dark:border-[#1d2634] flex flex-col gap-2.5">
          <h2 className="text-sm font-semibold text-[#0f172a] dark:text-white">
            Saved on Your Computer
          </h2>
          <p className="text-xs text-[#64748b] dark:text-[#7e8c9f] leading-relaxed">
            Your timer preferences, blocklists, and streaks live securely in your browser. Nothing goes to the cloud without your explicit choice.
          </p>
        </div>

        <div className="p-6 rounded-2xl border bg-white dark:bg-[#101620] border-[#e2e8f0] dark:border-[#1d2634] flex flex-col gap-2.5">
          <h2 className="text-sm font-semibold text-[#0f172a] dark:text-white">
            Zero Tracking or Ads
          </h2>
          <p className="text-xs text-[#64748b] dark:text-[#94a3b8] leading-relaxed">
            No analytics scripts, no advertising beacons, and no tracking cookies. We never monitor or monetize your habits.
          </p>
        </div>
      </div>

      {/* 3. What Stays on Device vs What We Never Touch */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl border bg-white dark:bg-[#101620] border-[#e2e8f0] dark:border-[#1d2634] flex flex-col gap-4">
          <h2 className="text-base font-semibold text-[#0f172a] dark:text-white">
            What stays on your computer
          </h2>
          <p className="text-xs text-[#64748b] dark:text-[#94a3b8] leading-relaxed">
            We only save what is strictly necessary to remember your setup between visits:
          </p>
          <ul className="flex flex-col gap-2.5 text-xs text-[#334155] dark:text-[#cbd5e1]">
            <li className="flex items-start gap-2.5">
              <span className="text-emerald-500 font-bold shrink-0">&bull;</span>
              <span><strong>Your timer intervals:</strong> The minutes you choose for deep focus and breaks.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-emerald-500 font-bold shrink-0">&bull;</span>
              <span><strong>Your blocklist:</strong> The websites you choose to pause so you stay in flow ({blocklistCount} sites).</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-emerald-500 font-bold shrink-0">&bull;</span>
              <span><strong>Your focus history:</strong> Completed sprints and streaks ({sessionCount} recorded).</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-emerald-500 font-bold shrink-0">&bull;</span>
              <span><strong>Sound &amp; theme:</strong> Your ambient sound volume and theme choices.</span>
            </li>
          </ul>
        </div>

        <div className="p-6 rounded-2xl border bg-white dark:bg-[#101620] border-[#e2e8f0] dark:border-[#1d2634] flex flex-col gap-4">
          <h2 className="text-base font-semibold text-[#0f172a] dark:text-white">
            What we never see or touch
          </h2>
          <p className="text-xs text-[#64748b] dark:text-[#94a3b8] leading-relaxed">
            Because Do Not Disturb runs entirely on your device, we cannot see:
          </p>
          <ul className="flex flex-col gap-2.5 text-xs text-[#334155] dark:text-[#cbd5e1]">
            <li className="flex items-start gap-2.5">
              <span className="text-rose-500 font-bold shrink-0">&bull;</span>
              <span><strong>Your browsing history:</strong> We never log or transmit the websites you visit.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-rose-500 font-bold shrink-0">&bull;</span>
              <span><strong>Your focus notes:</strong> Any goals or tasks you write stay private on your screen.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-rose-500 font-bold shrink-0">&bull;</span>
              <span><strong>Your personal identity:</strong> No IP address logging, device fingerprinting, or profiling.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-rose-500 font-bold shrink-0">&bull;</span>
              <span><strong>Your keystrokes:</strong> Nothing you type is ever recorded or analyzed.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* 4. Complete Offline Freedom */}
      <section id="local-only" className="p-6 md:p-8 rounded-2xl border bg-white dark:bg-[#101620] border-[#e2e8f0] dark:border-[#1d2634] flex flex-col gap-5 scroll-mt-20">
        <div>
          <h2 className="text-lg font-bold text-[#0f172a] dark:text-white">
            Built for Offline Focus
          </h2>
          <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-1">
            Peace of mind wherever you work, without needing Wi-Fi.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-1 text-xs">
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold text-[#0f172a] dark:text-white">Accurate Device Clock</span>
            <p className="text-[#64748b] dark:text-[#94a3b8] leading-relaxed">
              Timers calculate remaining seconds using your computer&apos;s internal clock. No network delays or lost ticks on flights or trains.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-semibold text-[#0f172a] dark:text-white">Synthesized Sounds</span>
            <p className="text-[#64748b] dark:text-[#94a3b8] leading-relaxed">
              Ambient rain and noise are generated directly on your machine. Zero audio files are streamed, saving your data and battery.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-semibold text-[#0f172a] dark:text-white">Local Shield</span>
            <p className="text-[#64748b] dark:text-[#94a3b8] leading-relaxed">
              The companion extension pauses distracting tabs on your computer with zero cloud dependency.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Your Data, Your Control (Actions) */}
      <section className="p-6 md:p-8 rounded-2xl border bg-white dark:bg-[#101620] border-[#e2e8f0] dark:border-[#1d2634] flex flex-col gap-5">
        <div>
          <h2 className="text-lg font-bold text-[#0f172a] dark:text-white">
            Your Data Controls
          </h2>
          <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-1">
            Export a backup, restore your setup on another computer, or clear your history anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={handleDownload}
            disabled={isExporting}
            className="p-4 rounded-xl border text-left flex flex-col justify-between gap-3 transition-colors hover:bg-[#f8fafc] dark:hover:bg-[#141b24] cursor-pointer bg-white dark:bg-[#101620] border-[#e2e8f0] dark:border-[#1d2634]"
          >
            <div>
              <span className="text-sm font-semibold text-[#0f172a] dark:text-white block">
                {isExporting ? "Saving file..." : "Download backup"}
              </span>
              <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-1">
                Save your timer settings, blocklist, and streaks to a personal file.
              </p>
            </div>
            <span className="text-xs font-medium" style={{ color: activeColor }}>
              Export JSON &rarr;
            </span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="p-4 rounded-xl border text-left flex flex-col justify-between gap-3 transition-colors hover:bg-[#f8fafc] dark:hover:bg-[#141b24] cursor-pointer bg-white dark:bg-[#101620] border-[#e2e8f0] dark:border-[#1d2634]"
          >
            <div>
              <span className="text-sm font-semibold text-[#0f172a] dark:text-white block">
                {isImporting ? "Reading file..." : "Restore backup"}
              </span>
              <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-1">
                Load a previously saved backup file to restore your full setup.
              </p>
            </div>
            <span className="text-xs font-medium" style={{ color: activeColor }}>
              Import file &rarr;
            </span>
          </button>

          <button
            onClick={() => setShowResetModal(true)}
            className="p-4 rounded-xl border text-left flex flex-col justify-between gap-3 transition-colors hover:bg-rose-500/5 cursor-pointer bg-white dark:bg-[#101620] border-[#e2e8f0] dark:border-[#1d2634]"
          >
            <div>
              <span className="text-sm font-semibold text-rose-600 dark:text-rose-400 block">
                Reset data
              </span>
              <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-1">
                Selectively clear your focus history, blocklist, or start fresh.
              </p>
            </div>
            <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
              Choose options &rarr;
            </span>
          </button>
        </div>
      </section>

      {/* 6. Frequently Asked Questions */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0f172a] dark:text-white">
            Common Questions
          </h2>
          <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-1">
            Simple, honest answers about how your privacy is protected.
          </p>
        </div>

        <div className="divide-y divide-[#e2e8f0] dark:divide-[#1d2634] border-t border-b border-[#e2e8f0] dark:border-[#1d2634]">
          {faqs.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div key={faq.question} className="py-4">
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between text-left text-sm font-semibold text-[#0f172a] dark:text-white cursor-pointer group"
                >
                  <span>{faq.question}</span>
                  <span className="text-base text-[#94a3b8] group-hover:text-[#0f172a] dark:group-hover:text-white transition-colors ml-4">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                {isOpen && (
                  <p className="text-xs text-[#64748b] dark:text-[#94a3b8] leading-relaxed mt-2.5 max-w-2xl animate-in fade-in">
                    {faq.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. Reset Modal */}
      {showResetModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md p-6 rounded-2xl border bg-white dark:bg-[#101620] border-[#e2e8f0] dark:border-[#1d2634] text-[#0f172a] dark:text-white shadow-2xl flex flex-col gap-5">
            <div>
              <h3 className="text-base font-bold">
                Clear or Reset Data
              </h3>
              <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-1">
                Choose what you would like to reset on this browser:
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <label
                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                  selectedReset === "sessions"
                    ? "border-rose-500/50 bg-rose-500/5"
                    : "border-[#e2e8f0] dark:border-[#1d2634]"
                }`}
              >
                <input
                  type="radio"
                  name="resetOption"
                  value="sessions"
                  checked={selectedReset === "sessions"}
                  onChange={() => setSelectedReset("sessions")}
                  className="mt-0.5 text-rose-600"
                />
                <div className="flex flex-col text-xs">
                  <span className="font-semibold text-[#0f172a] dark:text-white">
                    Clear focus streaks &amp; history only
                  </span>
                  <span className="text-[#64748b] dark:text-[#94a3b8] text-[11px] mt-0.5">
                    Resets your completed session counts. Keeps your blocklist and timer intervals.
                  </span>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                  selectedReset === "blocklist"
                    ? "border-rose-500/50 bg-rose-500/5"
                    : "border-[#e2e8f0] dark:border-[#1d2634]"
                }`}
              >
                <input
                  type="radio"
                  name="resetOption"
                  value="blocklist"
                  checked={selectedReset === "blocklist"}
                  onChange={() => setSelectedReset("blocklist")}
                  className="mt-0.5 text-rose-600"
                />
                <div className="flex flex-col text-xs">
                  <span className="font-semibold text-[#0f172a] dark:text-white">
                    Reset blocklist to defaults
                  </span>
                  <span className="text-[#64748b] dark:text-[#94a3b8] text-[11px] mt-0.5">
                    Restores the original curated list of distraction websites.
                  </span>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                  selectedReset === "settings"
                    ? "border-rose-500/50 bg-rose-500/5"
                    : "border-[#e2e8f0] dark:border-[#1d2634]"
                }`}
              >
                <input
                  type="radio"
                  name="resetOption"
                  value="settings"
                  checked={selectedReset === "settings"}
                  onChange={() => setSelectedReset("settings")}
                  className="mt-0.5 text-rose-600"
                />
                <div className="flex flex-col text-xs">
                  <span className="font-semibold text-[#0f172a] dark:text-white">
                    Reset timer intervals &amp; sounds
                  </span>
                  <span className="text-[#64748b] dark:text-[#94a3b8] text-[11px] mt-0.5">
                    Restores default 25-minute focus, 5-minute break, and rain audio.
                  </span>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                  selectedReset === "all"
                    ? "border-rose-500/50 bg-rose-500/5"
                    : "border-[#e2e8f0] dark:border-[#1d2634]"
                }`}
              >
                <input
                  type="radio"
                  name="resetOption"
                  value="all"
                  checked={selectedReset === "all"}
                  onChange={() => setSelectedReset("all")}
                  className="mt-0.5 text-rose-600"
                />
                <div className="flex flex-col text-xs">
                  <span className="font-semibold text-rose-600 dark:text-rose-400">
                    Clear everything (fresh start)
                  </span>
                  <span className="text-[#64748b] dark:text-[#94a3b8] text-[11px] mt-0.5">
                    Removes all saved preferences, blocklists, and history from this browser.
                  </span>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-[#e2e8f0] dark:border-[#1d2634] text-[#64748b] dark:text-[#94a3b8] hover:text-[#0f172a] dark:hover:text-white cursor-pointer"
              >
                Keep my data
              </button>
              <button
                onClick={handleExecuteReset}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
              >
                Reset selected
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
