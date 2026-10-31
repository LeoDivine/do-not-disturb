"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useExtensionStatus } from "../lib/blocking/use-extension-status";
import { useTheme } from "../context/theme-context";
import { useTimer } from "../context/timer-context";
import { useCloseOnEscape } from "../lib/overlays/use-close-on-escape";

const DISMISS_KEY = "dnd-extension-banner-dismissed-until";
const AUTO_MODAL_SEEN_KEY = "dnd-extension-update-modal-seen-v1";
const DISMISS_DURATION_MS = 3 * 24 * 60 * 60 * 1000; // 3 days snooze

export default function ExtensionInstallBanner() {
  const pathname = usePathname();
  const { isInstalled, connectionState } = useExtensionStatus();
  const { isDark } = useTheme();
  const { activeColor, mode } = useTimer();

  // High contrast text on top of activeColor background
  const buttonTextColor =
    isDark && mode === "focus"
      ? "#00201d"
      : isDark && mode === "shortBreak"
      ? "#082f49"
      : isDark && mode === "longBreak"
      ? "#431407"
      : "#ffffff";

  const [isDismissed, setIsDismissed] = useState<boolean>(true);
  const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<"update" | "install">("update");
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const wasInstalledRef = React.useRef<boolean>(false);

  // Fast check: if companion extension content script is present in the DOM
  const isDomBridgeInstalled =
    typeof document !== "undefined" &&
    (document.documentElement.dataset.dndExtensionInstalled === "true" ||
      document.documentElement.getAttribute("data-dnd-extension-installed") === "true");

  // Check dismissal timestamp on mount
  useEffect(() => {
    try {
      const dismissedUntil = localStorage.getItem(DISMISS_KEY);
      if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
        setIsDismissed(true);
      } else {
        setIsDismissed(false);
      }
    } catch {
      setIsDismissed(false);
    }
  }, []);

  // Automatically pop up the modal the first time a user loads the website,
  // tracked in localStorage so it only displays once per user/browser.
  useEffect(() => {
    // Wait until the initial connection check is completed
    if (connectionState === "detecting") return;

    // Do not pop up on blocked deflection page
    if (pathname === "/blocked") return;

    // Do not auto-show on mobile devices (< 768px) where desktop browser extensions cannot be installed
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return;
    }

    // If extension is already active & connected, mark as seen and do not pop up
    if (isInstalled || isDomBridgeInstalled) {
      try {
        localStorage.setItem(AUTO_MODAL_SEEN_KEY, "true");
      } catch {}
      return;
    }

    try {
      const hasSeen = localStorage.getItem(AUTO_MODAL_SEEN_KEY) === "true";
      if (!hasSeen) {
        setShowSetupModal(true);
      }
    } catch {
      // In case of restricted localStorage, do not break rendering
    }
  }, [connectionState, isInstalled, isDomBridgeInstalled, pathname]);

  // Track installation status. If extension was installed and becomes disconnected/uninstalled,
  // immediately show the banner without requiring a page refresh.
  useEffect(() => {
    if (isInstalled || isDomBridgeInstalled) {
      wasInstalledRef.current = true;
    } else if (connectionState === "disconnected" && wasInstalledRef.current && !isDomBridgeInstalled) {
      wasInstalledRef.current = false;
      setIsDismissed(false);
    }
  }, [isInstalled, connectionState, isDomBridgeInstalled]);

  // Listen for direct uninstalled event from content script or extension client
  useEffect(() => {
    const handleUninstalled = () => {
      wasInstalledRef.current = false;
      setIsDismissed(false);
    };

    window.addEventListener("dnd-extension-uninstalled", handleUninstalled);
    return () => window.removeEventListener("dnd-extension-uninstalled", handleUninstalled);
  }, []);

  const handleCloseModal = () => {
    try {
      localStorage.setItem(AUTO_MODAL_SEEN_KEY, "true");
    } catch {}
    setShowSetupModal(false);
  };

  // Listen to Escape to close modal (global close-all-overlays event)
  useCloseOnEscape(showSetupModal, handleCloseModal);

  // Do not render banner on blocked deflection screen
  if (pathname === "/blocked") {
    return null;
  }

  // Do not show banner while still detecting connection or if already installed or dismissed
  if (connectionState === "detecting" || isInstalled || isDomBridgeInstalled || isDismissed) {
    // If the modal was opened, keep modal visible so user can finish setup
    if (!showSetupModal) return null;
  }

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, (Date.now() + DISMISS_DURATION_MS).toString());
    } catch {}
    setIsDismissed(true);
  };

  const copyExtensionsUrl = () => {
    navigator.clipboard.writeText("chrome://extensions");
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <>
      {/* Top Productivity Banner */}
      {!isDismissed && !isInstalled && connectionState !== "detecting" && (
        <aside
          role="complementary"
          aria-label="Extension recommendation"
          className={`w-full border-b transition-colors relative z-30 ${
            isDark
              ? "bg-[#0b0f17] border-[#1d2634] text-slate-300"
              : "bg-[#f8fafc] border-[#e2e8f0] text-slate-700"
          }`}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            {/* Friendly Message */}
            <div className="flex items-center gap-2.5 text-center sm:text-left">
              <p className="leading-snug">
                <strong className={isDark ? "text-white" : "text-[#0f172a]"}>
                  Extension Update Available:
                </strong>{" "}
                Install or update the companion extension to automatically pause distracting websites while you focus.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowSetupModal(true)}
                className="font-medium px-3.5 py-1 rounded-lg border transition-all cursor-pointer hover:opacity-90 shadow-2xs"
                style={{
                  backgroundColor: activeColor,
                  borderColor: activeColor,
                  color: buttonTextColor,
                }}
              >
                Setup / Update extension
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                title="Dismiss for 3 days"
                aria-label="Dismiss banner"
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isDark
                    ? "text-slate-400 hover:text-white hover:bg-[#1a2332]"
                    : "text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Setup & Update Guide Modal */}
      {showSetupModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={handleCloseModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-[520px] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl sm:rounded-3xl border p-5 sm:p-7 shadow-2xl relative transition-all duration-200 no-scrollbar ${
              isDark
                ? "bg-[#0e141e] border-[#1d2634] text-[#f1f5f9]"
                : "bg-white border-[#e2e8f0] text-[#0f172a]"
            }`}
            role="dialog"
            aria-modal="true"
          >
            {/* Close Button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-5 right-5 p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1a2332] transition-colors cursor-pointer"
              aria-label="Close"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Header (No shield icon, no pill) */}
            <div className="mb-4 pr-8">
              <h3 className="font-semibold text-lg leading-tight">Browser Extension Update</h3>
              <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Website blocker support for https://www.donotdistrb.com
              </p>
            </div>

            {/* Mode Selector with SVG icons */}
            <div className={`grid grid-cols-2 p-1 rounded-xl mb-4 text-xs font-medium border ${
              isDark ? "bg-[#0b0f17] border-[#1d2634]" : "bg-slate-100 border-slate-200"
            }`}>
              <button
                type="button"
                onClick={() => setModalMode("update")}
                className={`py-1.5 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  modalMode === "update"
                    ? isDark
                      ? "bg-[#1a2332] text-white shadow-2xs"
                      : "bg-white text-slate-900 shadow-2xs"
                    : isDark
                    ? "text-slate-400 hover:text-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2v6h-6" />
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                  <path d="M3 22v-6h6" />
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                </svg>
                <span>Update Existing</span>
              </button>
              <button
                type="button"
                onClick={() => setModalMode("install")}
                className={`py-1.5 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  modalMode === "install"
                    ? isDark
                      ? "bg-[#1a2332] text-white shadow-2xs"
                      : "bg-white text-slate-900 shadow-2xs"
                    : isDark
                    ? "text-slate-400 hover:text-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>New Install</span>
              </button>
            </div>

            {/* Quick Context Callout */}
            {modalMode === "update" ? (
              <div
                className={`p-3 rounded-xl mb-4 border text-xs leading-relaxed ${
                  isDark ? "bg-[#101725] border-[#1d2634] text-slate-300" : "bg-[#f8fafc] border-[#e2e8f0] text-slate-600"
                }`}
              >
                We recently moved to our custom domain (<strong>https://www.donotdistrb.com</strong>). Because developer-mode extensions do not auto-update, follow these 3 quick steps to reconnect site blocking:
              </div>
            ) : (
              <div
                className={`p-3 rounded-xl mb-4 border text-xs leading-relaxed ${
                  isDark ? "bg-[#101725] border-[#1d2634] text-slate-300" : "bg-[#f8fafc] border-[#e2e8f0] text-slate-600"
                }`}
              >
                The companion extension runs 100% locally on your computer. During focus sessions, it quietly pauses websites on your blocklist and returns you to flow.
              </div>
            )}

            {/* Steps based on Mode */}
            <div className="space-y-3 mb-6 text-xs">
              {modalMode === "update" ? (
                <>
                  {/* Update Step 1 */}
                  <div
                    className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                      isDark ? "bg-[#0b0f17] border-[#1d2634]" : "bg-[#f8fafc] border-[#e2e8f0]"
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center font-bold text-[11px] shrink-0"
                      style={{ backgroundColor: activeColor, color: buttonTextColor }}
                    >
                      1
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold mb-0.5">Download updated extension</div>
                      <div className={`${isDark ? "text-slate-400" : "text-slate-500"} mb-2`}>
                        Contains the new manifest rules for <code>donotdistrb.com</code>.
                      </div>
                      <a
                        href="/do-not-disturb-extension.zip"
                        download="do-not-disturb-extension.zip"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1a2332]"
                        style={{ borderColor: activeColor, color: activeColor }}
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        <span>Download updated package (.zip)</span>
                      </a>
                    </div>
                  </div>

                  {/* Update Step 2 */}
                  <div
                    className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                      isDark ? "bg-[#0b0f17] border-[#1d2634]" : "bg-[#f8fafc] border-[#e2e8f0]"
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center font-bold text-[11px] shrink-0"
                      style={{ backgroundColor: activeColor, color: buttonTextColor }}
                    >
                      2
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold mb-0.5">Overwrite files in your extension folder</div>
                      <div className={`${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Unzip the archive and replace the files in your existing extension directory on your machine.
                      </div>
                    </div>
                  </div>

                  {/* Update Step 3 */}
                  <div
                    className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                      isDark ? "bg-[#0b0f17] border-[#1d2634]" : "bg-[#f8fafc] border-[#e2e8f0]"
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center font-bold text-[11px] shrink-0"
                      style={{ backgroundColor: activeColor, color: buttonTextColor }}
                    >
                      3
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold mb-0.5">Click Reload in extensions</div>
                      <div className={`${isDark ? "text-slate-400" : "text-slate-500"} mb-1.5`}>
                        Visit <code className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-[11px]">chrome://extensions</code> and click the circular <strong>Reload</strong> icon on the Do Not Disturb card.
                      </div>
                      <button
                        type="button"
                        onClick={copyExtensionsUrl}
                        className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer inline-flex items-center gap-1"
                      >
                        {copiedLink ? (
                          <>
                            <svg className="w-3 h-3 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span>Copied to clipboard</span>
                          </>
                        ) : (
                          "Copy chrome://extensions URL"
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Install Step 1 */}
                  <div
                    className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                      isDark ? "bg-[#0b0f17] border-[#1d2634]" : "bg-[#f8fafc] border-[#e2e8f0]"
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center font-bold text-[11px] shrink-0"
                      style={{ backgroundColor: activeColor, color: buttonTextColor }}
                    >
                      1
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold mb-0.5">Download the extension package</div>
                      <div className={`${isDark ? "text-slate-400" : "text-slate-500"} mb-2`}>
                        Get the lightweight zipped folder and unzip it anywhere on your computer.
                      </div>
                      <a
                        href="/do-not-disturb-extension.zip"
                        download="do-not-disturb-extension.zip"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1a2332]"
                        style={{ borderColor: activeColor, color: activeColor }}
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        <span>Download extension (.zip)</span>
                      </a>
                    </div>
                  </div>

                  {/* Install Step 2 */}
                  <div
                    className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                      isDark ? "bg-[#0b0f17] border-[#1d2634]" : "bg-[#f8fafc] border-[#e2e8f0]"
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center font-bold text-[11px] shrink-0"
                      style={{ backgroundColor: activeColor, color: buttonTextColor }}
                    >
                      2
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold mb-0.5">Open your browser extensions page</div>
                      <div className={`${isDark ? "text-slate-400" : "text-slate-500"} mb-1.5`}>
                        Open a new tab and visit <code className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-[11px]">chrome://extensions</code>
                      </div>
                      <button
                        type="button"
                        onClick={copyExtensionsUrl}
                        className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer inline-flex items-center gap-1"
                      >
                        {copiedLink ? (
                          <>
                            <svg className="w-3 h-3 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span>Copied to clipboard</span>
                          </>
                        ) : (
                          "Copy chrome://extensions URL"
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Install Step 3 */}
                  <div
                    className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                      isDark ? "bg-[#0b0f17] border-[#1d2634]" : "bg-[#f8fafc] border-[#e2e8f0]"
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center font-bold text-[11px] shrink-0"
                      style={{ backgroundColor: activeColor, color: buttonTextColor }}
                    >
                      3
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold mb-0.5">Turn on Developer Mode & Load Unpacked</div>
                      <div className={`${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Toggle <strong>Developer mode</strong> in the top-right corner, click <strong>Load unpacked</strong>, and select the unzipped folder.
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer Status and Close */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#1d2634] text-xs">
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                Connects automatically once reloaded
              </span>
              <button
                type="button"
                onClick={handleCloseModal}
                className={`px-4 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                  isDark
                    ? "bg-[#141b24] hover:bg-[#1a2332] text-slate-200 border border-[#1d2634]"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
