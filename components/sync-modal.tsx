"use client";

import React, { useState, useEffect } from "react";
import { useSync } from "../context/sync-context";
import { useTheme } from "../context/theme-context";
import { useTimer } from "../context/timer-context";
import { useCloseOnEscape } from "../lib/overlays/use-close-on-escape";

export default function SyncModal() {
  const {
    user,
    storageMode,
    syncState,
    lastSyncedAt,
    isModalOpen,
    closeSyncModal,
    syncNow,
    login,
    loginWithGoogle,
    register,
    exportBackup,
    importBackup,
  } = useSync();

  const { isDark } = useTheme();
  const { activeColor, activeContainer, activeBorder, colors } = useTimer();

  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showOfflineTools, setShowOfflineTools] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [backupNotice, setBackupNotice] = useState<string | null>(null);

  // Close on Escape key (global close-all-overlays event)
  useCloseOnEscape(isModalOpen, closeSyncModal);

  // Reset form when opening or toggling modes
  useEffect(() => {
    setErrorMessage(null);
  }, [isSignUp, isModalOpen]);

  if (!isModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      if (isSignUp) {
        const res = await register(email, password, name);
        if (!res.success) {
          setErrorMessage(res.error || "Unable to create your account.");
        } else {
          closeSyncModal();
        }
      } else {
        const res = await login(email, password, true);
        if (!res.success) {
          setErrorMessage(res.error || "Incorrect email or password.");
        } else {
          closeSyncModal();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsGoogleLoading(true);
    try {
      const res = await loginWithGoogle();
      if (!res.success) {
        if (
          res.error &&
          !res.error.toLowerCase().includes("canceled") &&
          !res.error.toLowerCase().includes("cancelled")
        ) {
          setErrorMessage(res.error);
        }
      } else {
        closeSyncModal();
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setBackupNotice("Restoring settings...");
      await importBackup(file);
      setBackupNotice("Settings restored to this device.");
      setTimeout(() => setBackupNotice(null), 3000);
    } catch {
      setBackupNotice("Could not read backup file.");
      setTimeout(() => setBackupNotice(null), 3500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={closeSyncModal}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl sm:rounded-3xl border p-5 sm:p-7 shadow-2xl relative transition-all duration-200 bg-white dark:bg-[#0e141e] border-[#e2e8f0] dark:border-[#1d2634] text-[#0f172a] dark:text-[#f1f5f9] animate-pop-in no-scrollbar"
        role="dialog"
        aria-modal="true"
      >
        {/* Dismiss Button */}
        <button
          onClick={closeSyncModal}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1a2332] transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
          aria-label="Close"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* ================================================================= */}
        {/* VIEW A: AUTHENTICATED / IN SYNC                                   */}
        {/* ================================================================= */}
        {user ? (
          <div className="flex flex-col items-center text-center pt-2">
            <h3 className="text-xl font-bold tracking-tight">Everything is in Sync</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
              Your blocklist, shortcuts, streaks, goals, Flow XP, and level are in sync with your account.
            </p>

            {/* Sync Status Card */}
            <div className="w-full mt-6 p-4 rounded-2xl border bg-slate-50/70 dark:bg-[#131b27] border-slate-200/80 dark:border-[#1e2a3b] text-left flex items-center justify-between">
              <div className="min-w-0 pr-3">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  Cloud sync
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {syncState === "syncing"
                    ? "Syncing changes..."
                    : syncState === "error"
                    ? "Last sync failed"
                    : syncState === "offline"
                    ? "You're offline"
                    : "Up to date across your devices"}
                </div>
              </div>

              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0 border transition-colors"
                style={{
                  backgroundColor: isDark ? colors.containerDark : colors.container,
                  borderColor: activeBorder,
                  color: activeColor,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ backgroundColor: activeColor }}
                />
                <span>{syncState === "syncing" ? "Syncing" : syncState === "error" || syncState === "offline" ? "Paused" : "Synced"}</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
              Last synced: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
            </div>


            {/* Actions */}
            <div className="w-full flex flex-col gap-2.5 mt-6">
              <button
                onClick={syncNow}
                disabled={syncState === "syncing"}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                style={{
                  backgroundColor: activeColor,
                  color: isDark && colors.mode === "focus" ? "#00201d" : isDark && colors.mode === "shortBreak" ? "#082f49" : isDark && colors.mode === "longBreak" ? "#431407" : "#ffffff",
                }}
              >
                <svg
                  className={`w-3.5 h-3.5 ${syncState === "syncing" ? "animate-spin" : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                >
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                </svg>
                {syncState === "syncing" ? "Checking for updates..." : "Sync Now"}
              </button>

              <p className="text-[11px] text-slate-400 dark:text-slate-500 py-1.5">
                Signed in as {user.email || user.name}. Use your avatar menu to manage your account.
              </p>
            </div>
          </div>
        ) : (
          /* ================================================================= */
          /* VIEW B: MINIMALIST SIGN UP / SIGN IN                              */
          /* ================================================================= */
          <div>
            {/* Header */}
            <div className="mb-6">
              <h3 className="text-xl font-bold tracking-tight">
                {isSignUp ? "Take your focus anywhere" : "Welcome back"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {isSignUp
                  ? "Create an account to bring your blocklist, custom shortcuts, and focus level to every computer you work on."
                  : "Sign in to keep your shortcuts, focus shields, and Flow XP up to date."}
              </p>
            </div>

            {/* Error banner */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/50 flex items-center gap-2 animate-in fade-in">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Google Sign In Button */}
            {/* <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl font-medium text-xs border border-slate-200 dark:border-[#222d3d] bg-white dark:bg-[#121924] hover:bg-slate-50 dark:hover:bg-[#18202d] text-[#0f172a] dark:text-[#f1f5f9] transition-all shadow-2xs flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
            >
              {isGoogleLoading ? (
                <svg className="w-4 h-4 animate-spin text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{isSignUp ? "Continue with Google" : "Sign in with Google"}</span>
            </button> */}

            {/* Divider */}
            {/* <div className="relative my-3.5 flex items-center justify-center">
              <div className="border-t border-slate-200 dark:border-[#1d2634] w-full" />
              <span className="bg-white dark:bg-[#0e141e] px-2.5 text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium">
                or
              </span>
            </div> */}

            {/* Minimalist Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {isSignUp && (
                <div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="First name (optional)"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-200 dark:border-[#222d3d] bg-slate-50/60 dark:bg-[#121924] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                  />
                </div>
              )}

              <div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-200 dark:border-[#222d3d] bg-slate-50/60 dark:bg-[#121924] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                />
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignUp ? "Create a password (min 6 characters)" : "Your password"}
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl text-xs border border-slate-200 dark:border-[#222d3d] bg-slate-50/60 dark:bg-[#121924] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Primary Action Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-2.5 px-4 rounded-xl font-semibold text-xs transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                style={{
                  backgroundColor: activeColor,
                  color: isDark && colors.mode === "focus" ? "#00201d" : isDark && colors.mode === "shortBreak" ? "#082f49" : isDark && colors.mode === "longBreak" ? "#431407" : "#ffffff",
                }}
              >
                {isSubmitting ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    <span>{isSignUp ? "Setting up account..." : "Signing in..."}</span>
                  </>
                ) : (
                  <span>{isSignUp ? "Create account & sync" : "Sign in"}</span>
                )}
              </button>
            </form>

            {/* Toggle Mode Footer */}
            <div className="mt-4 pt-3 text-center border-t border-slate-100 dark:border-[#1a2332]">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-xs text-slate-500 hover:opacity-80 dark:text-slate-400 transition-colors cursor-pointer"
              >
                {isSignUp ? (
                  <>
                    Already have an account? <span className="font-semibold underline" style={{ color: activeColor }}>Sign in</span>
                  </>
                ) : (
                  <>
                    New to Do Not Disturb? <span className="font-semibold underline" style={{ color: activeColor }}>Create an account</span>
                  </>
                )}
              </button>
            </div>

            {/* Subtle Privacy note */}
            <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 mt-3 leading-relaxed">
              Zero surveillance. We only sync your blocklist rules and keyboard shortcuts.
            </p>
          </div>
        )}

        {/* ================================================================= */}
        {/* COLLAPSIBLE OFFLINE BACKUP (UNOBTRUSIVE)                          */}
        {/* ================================================================= */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-[#19212d]">
          {!showOfflineTools ? (
            <button
              onClick={() => setShowOfflineTools(true)}
              className="w-full text-center text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Prefer offline backups?</span>
              <span className="underline">Export or restore file</span>
            </button>
          ) : (
            <div className="space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Manual Backup File
                </span>
                <button
                  onClick={() => setShowOfflineTools(false)}
                  className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  Hide
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={exportBackup}
                  className="flex-1 py-1.5 px-3 rounded-lg text-[11px] font-medium border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#141b25] transition-colors cursor-pointer text-center"
                >
                  Download .json
                </button>

                <label className="flex-1 py-1.5 px-3 rounded-lg text-[11px] font-medium border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#141b25] transition-colors cursor-pointer text-center">
                  Restore from file
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileImport}
                    className="hidden"
                  />
                </label>
              </div>

              {backupNotice && (
                <p className="text-[10px] text-center text-teal-600 dark:text-teal-400 mt-1">
                  {backupNotice}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
