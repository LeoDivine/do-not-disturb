"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "../context/theme-context";
import { useTimer } from "../context/timer-context";

export default function MiniTimerWindow() {
  const pathname = usePathname();
  const isBlockedPage = pathname === "/blocked";
  const wasActiveBeforeBlockedRef = useRef<boolean>(false);

  const { isDark } = useTheme();
  const {
    mode,
    colors,
    activeColor,
    isRunning,
    secondsLeft,
    totalSeconds,
    cycle,
    totalCycles,
    toggleTimer,
    skipTimer,
    formatTime,
    setIsMiniWindowActive,
    registerMiniWindow,
  } = useTimer();

  // Keep references to latest state & callbacks to avoid stale closures in listeners
  const isRunningRef = useRef(isRunning);
  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  const toggleTimerRef = useRef(toggleTimer);
  useEffect(() => {
    toggleTimerRef.current = toggleTimer;
  }, [toggleTimer]);

  const skipTimerRef = useRef(skipTimer);
  useEffect(() => {
    skipTimerRef.current = skipTimer;
  }, [skipTimer]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pipWindowRef = useRef<Window | null>(null);

  // Sync title when tab is hidden
  useEffect(() => {
    if (typeof document === "undefined") return;

    const originalTitle = "Do Not Disturb — Stay Focused";

    const updateTitle = () => {
      if (document.visibilityState === "hidden" && isRunning) {
        document.title = `[${formatTime(secondsLeft)}] ${colors.badgeLabel} — Do Not Disturb`;
      } else {
        document.title = originalTitle;
      }
    };

    updateTitle();
    document.addEventListener("visibilitychange", updateTitle);
    return () => {
      document.removeEventListener("visibilitychange", updateTitle);
      document.title = originalTitle;
    };
  }, [isRunning, secondsLeft, colors.badgeLabel, formatTime]);

  // Connect Media Session API so OS-level controls & Video PiP controls work
  useEffect(() => {
    if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: `${formatTime(secondsLeft)} • ${colors.name}`,
          artist: "Do Not Disturb",
          album: `Cycle ${cycle} of ${totalCycles}`,
        });

        navigator.mediaSession.setActionHandler("play", () => {
          toggleTimerRef.current();
        });
        navigator.mediaSession.setActionHandler("pause", () => {
          toggleTimerRef.current();
        });
        navigator.mediaSession.setActionHandler("nexttrack", () => {
          skipTimerRef.current();
        });
      } catch {
        // Ignore media session errors
      }
    }
  }, [secondsLeft, colors.name, cycle, totalCycles, formatTime]);

  // Draw minimalist timer frame on canvas for browser Video PiP fallback (No unnecessary pills)
  const renderCanvasFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Sleek dark browser PiP background
    ctx.fillStyle = "#080c14";
    ctx.fillRect(0, 0, w, h);

    // Header Mode Title (clean text, no pill background/border)
    ctx.fillStyle = activeColor;
    ctx.font = "600 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const simpleMode = mode === "focus" ? "Focus" : mode === "shortBreak" ? "Short Break" : "Long Break";
    ctx.fillText(simpleMode, 24, 20);

    // Header Cycle Count
    ctx.fillStyle = "#64748b";
    ctx.font = "500 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${cycle} of ${totalCycles}`, w - 24, 20);

    // Large Minimalist Countdown Digits
    ctx.fillStyle = "#ffffff";
    ctx.font = "300 52px -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(formatTime(secondsLeft), w / 2, 86);

    // Sleek Progress Track (minimalist 2px line)
    const barX = 24;
    const barY = 136;
    const barW = w - 48;
    const barH = 2;
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 1);
    ctx.fill();

    // Progress Fill
    const progress = totalSeconds > 0 ? (totalSeconds - secondsLeft) / totalSeconds : 0;
    const fillW = Math.max(2, barW * progress);
    ctx.fillStyle = activeColor;
    ctx.beginPath();
    ctx.roundRect(barX, barY, fillW, barH, 1);
    ctx.fill();

    // Subtle Footer State
    ctx.fillStyle = "#94a3b8";
    ctx.font = "500 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(isRunning ? "In focus" : "Paused", w / 2, 178);
  }, [activeColor, colors.name, cycle, totalCycles, formatTime, secondsLeft, totalSeconds, isRunning, mode]);

  // Continually update canvas & video stream when timer is running
  useEffect(() => {
    renderCanvasFrame();

    if (!isRunning) return;

    const intervalId = setInterval(() => {
      renderCanvasFrame();
    }, 500);

    return () => clearInterval(intervalId);
  }, [renderCanvasFrame, secondsLeft, isRunning, mode]);

  // Keep video active and playing with canvas stream when timer is running
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    (video as unknown as { autoPictureInPicture?: boolean }).autoPictureInPicture = !isBlockedPage;

    if (isRunning) {
      renderCanvasFrame();
      if (!video.srcObject) {
        const stream = canvas.captureStream(20);
        video.srcObject = stream;
      }
      video.play().catch(() => {});
    }
  }, [isRunning, renderCanvasFrame]);

  // Update Document PiP window DOM elements on each tick
  useEffect(() => {
    if (!pipWindowRef.current) return;
    const pipDoc = pipWindowRef.current.document;
    const timeEl = pipDoc.getElementById("pip-time");
    const modeEl = pipDoc.getElementById("pip-mode");
    const cycleEl = pipDoc.getElementById("pip-cycle");
    const progressEl = pipDoc.getElementById("pip-progress");
    const playBtn = pipDoc.getElementById("pip-play-btn") as HTMLButtonElement | null;
    const skipBtn = pipDoc.getElementById("pip-skip-btn") as HTMLButtonElement | null;

    if (timeEl) timeEl.textContent = formatTime(secondsLeft);
    if (modeEl) {
      modeEl.textContent = mode === "focus" ? "Focus" : mode === "shortBreak" ? "Short Break" : "Long Break";
      modeEl.style.color = activeColor;
    }
    if (cycleEl) cycleEl.textContent = `${cycle} of ${totalCycles}`;
    if (progressEl) {
      const progress = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;
      progressEl.style.width = `${progress}%`;
      progressEl.style.backgroundColor = activeColor;
    }
    if (playBtn) {
      playBtn.style.backgroundColor = activeColor;
      playBtn.style.color = isDark && mode === "focus" ? "#00201d" : "#ffffff";
      playBtn.innerHTML = isRunning
        ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>'
        : '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="margin-left: 2px;"><polygon points="6 4 19 12 6 20 6 4"/></svg>';
      playBtn.onclick = (e) => {
        e.preventDefault();
        toggleTimerRef.current();
      };
    }
    if (skipBtn) {
      skipBtn.onclick = (e) => {
        e.preventDefault();
        skipTimerRef.current();
      };
    }
  }, [secondsLeft, isRunning, colors.name, cycle, totalCycles, totalSeconds, activeColor, isDark, mode, formatTime]);

  // Trigger minimalist Document Picture-in-Picture window (Browser native style, no pills)
  const openDocumentPip = useCallback(async () => {
    try {
      if (!("documentPictureInPicture" in window)) return false;

      // Close existing if open
      if (pipWindowRef.current) {
        pipWindowRef.current.close();
        pipWindowRef.current = null;
        setIsMiniWindowActive(false);
        return true;
      }

      const pip = await (window as unknown as {
        documentPictureInPicture: {
          requestWindow: (options: { width: number; height: number }) => Promise<Window>;
        };
      }).documentPictureInPicture.requestWindow({
        width: 280,
        height: 160,
      });

      pipWindowRef.current = pip;
      setIsMiniWindowActive(true);

      const pipDoc = pip.document;
      pipDoc.title = `Do Not Disturb — ${colors.name}`;

      // Minimalist browser native media PiP styling
      const style = pipDoc.createElement("style");
      style.textContent = `
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background-color: #080c14;
          color: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 14px 18px 16px;
          height: 100vh;
          overflow: hidden;
          user-select: none;
          -webkit-user-select: none;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          line-height: 1;
        }
        .mode-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .mode-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: ${activeColor};
        }
        .mode-title {
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.02em;
        }
        .cycle-info {
          font-size: 11px;
          font-weight: 400;
          color: #64748b;
          font-family: ui-monospace, SFMono-Regular, monospace;
        }
        .timer-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 4px 0;
        }
        .timer-digits {
          font-size: 46px;
          font-weight: 300;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.03em;
          color: #ffffff;
          line-height: 1;
          font-family: ui-monospace, SFMono-Regular, monospace;
        }
        .progress-track {
          width: 100%;
          height: 2px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 999px;
          overflow: hidden;
          margin-bottom: 12px;
        }
        .progress-fill {
          height: 100%;
          width: 0%;
          border-radius: 999px;
          transition: width 0.3s ease;
        }
        .controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: none;
          outline: none;
          cursor: pointer;
          border-radius: 50%;
          transition: opacity 0.15s ease, transform 0.1s ease, background-color 0.15s ease;
        }
        .btn:active {
          transform: scale(0.92);
        }
        .btn-play {
          width: 36px;
          height: 36px;
        }
        .btn-play:hover {
          opacity: 0.9;
        }
        .btn-skip {
          width: 30px;
          height: 30px;
          background-color: rgba(255, 255, 255, 0.06);
          color: #94a3b8;
        }
        .btn-skip:hover {
          background-color: rgba(255, 255, 255, 0.12);
          color: #ffffff;
        }
      `;
      pipDoc.head.appendChild(style);

      // DOM Content - Minimalist browser style without unnecessary pills
      const container = pipDoc.createElement("div");
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.height = "100%";
      container.style.justifyContent = "space-between";

      const progressPercent = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;
      const simpleMode = mode === "focus" ? "Focus" : mode === "shortBreak" ? "Short Break" : "Long Break";
      const playIconSvg = isRunning
        ? '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>'
        : '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" style="margin-left: 2px;"><polygon points="6 4 19 12 6 20 6 4"/></svg>';
      const skipIconSvg = '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>';
      const playBtnColor = isDark && mode === "focus" ? "#00201d" : "#ffffff";

      container.innerHTML = `
        <div class="header">
          <div class="mode-wrap">
            <span class="mode-dot"></span>
            <span id="pip-mode" class="mode-title" style="color: ${activeColor};">${simpleMode}</span>
          </div>
          <span id="pip-cycle" class="cycle-info">${cycle} of ${totalCycles}</span>
        </div>

        <div class="timer-wrap">
          <div id="pip-time" class="timer-digits">${formatTime(secondsLeft)}</div>
        </div>

        <div>
          <div class="progress-track">
            <div id="pip-progress" class="progress-fill" style="background-color: ${activeColor}; width: ${progressPercent}%;"></div>
          </div>
          <div class="controls">
            <button id="pip-play-btn" type="button" class="btn btn-play" style="background-color: ${activeColor}; color: ${playBtnColor};" title="${isRunning ? "Pause" : "Start"}">
              ${playIconSvg}
            </button>
            <button id="pip-skip-btn" type="button" class="btn btn-skip" title="Next">
              ${skipIconSvg}
            </button>
          </div>
        </div>
      `;
      pipDoc.body.appendChild(container);

      // Attach event listeners
      const playBtn = pipDoc.getElementById("pip-play-btn");
      if (playBtn) {
        playBtn.onclick = (e) => {
          e.preventDefault();
          toggleTimerRef.current();
        };
      }

      const skipBtn = pipDoc.getElementById("pip-skip-btn");
      if (skipBtn) {
        skipBtn.onclick = (e) => {
          e.preventDefault();
          skipTimerRef.current();
        };
      }

      pip.addEventListener("pagehide", () => {
        setIsMiniWindowActive(false);
        pipWindowRef.current = null;
      });

      return true;
    } catch (err) {
      console.warn("Document PiP request was not allowed or failed", err);
      return false;
    }
  }, [
    activeColor,
    colors.name,
    cycle,
    totalCycles,
    formatTime,
    secondsLeft,
    totalSeconds,
    isRunning,
    isDark,
    mode,
    setIsMiniWindowActive,
  ]);

  // Video-based Picture-in-Picture fallback
  const openVideoPip = useCallback(async () => {
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return false;

      renderCanvasFrame();

      if (!video.srcObject) {
        const stream = canvas.captureStream(20);
        video.srcObject = stream;
      }
      await video.play();

      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsMiniWindowActive(false);
        return true;
      }

      await video.requestPictureInPicture();
      setIsMiniWindowActive(true);

      video.addEventListener(
        "leavepictureinpicture",
        () => {
          setIsMiniWindowActive(false);
        },
        { once: true }
      );

      return true;
    } catch (err) {
      console.warn("Video PiP fallback request failed", err);
      return false;
    }
  }, [renderCanvasFrame, setIsMiniWindowActive]);

  // Helper to reliably close any open Picture-in-Picture window
  const closeAnyOpenPip = useCallback(() => {
    // 1. Local Document PiP reference
    if (pipWindowRef.current) {
      try {
        pipWindowRef.current.close();
      } catch {}
      pipWindowRef.current = null;
    }

    // 2. Standard documentPictureInPicture API window
    if (typeof window !== "undefined" && "documentPictureInPicture" in window) {
      try {
        const pipWin = (window as unknown as { documentPictureInPicture?: { window?: Window } }).documentPictureInPicture?.window;
        if (pipWin) {
          pipWin.close();
        }
      } catch {}
    }

    // 3. Native Video Picture-in-Picture
    if (typeof document !== "undefined" && document.pictureInPictureElement) {
      try {
        document.exitPictureInPicture().catch(() => {});
      } catch {}
    }

    setIsMiniWindowActive(false);
  }, [setIsMiniWindowActive]);

  // Master pop-out handler for browser mini pop-up
  const toggleMiniWindow = useCallback(async () => {
    if (isBlockedPage) return;
    if (typeof window !== "undefined" && "documentPictureInPicture" in window) {
      const ok = await openDocumentPip();
      if (ok) return;
    }
    await openVideoPip();
  }, [isBlockedPage, openDocumentPip, openVideoPip]);

  // Register the manual toggle function with TimerContext
  useEffect(() => {
    registerMiniWindow(toggleMiniWindow);
  }, [registerMiniWindow, toggleMiniWindow]);

  // Listen for cross-tab dismiss/restore messages (e.g. when another tab redirects to /blocked)
  useEffect(() => {
    if (typeof window === "undefined") return;

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("dnd-mini-window-control");
      bc.onmessage = (event) => {
        if (event.data?.type === "DISMISS_PIP") {
          const isCurrentlyOpen = Boolean(
            pipWindowRef.current ||
            (window as unknown as { documentPictureInPicture?: { window?: Window } }).documentPictureInPicture?.window ||
            (typeof document !== "undefined" && document.pictureInPictureElement)
          );
          if (isCurrentlyOpen) {
            wasActiveBeforeBlockedRef.current = true;
          }
          closeAnyOpenPip();
        } else if (event.data?.type === "RESTORE_PIP") {
          if (wasActiveBeforeBlockedRef.current && isRunningRef.current && !isBlockedPage) {
            wasActiveBeforeBlockedRef.current = false;
            toggleMiniWindow();
          }
        }
      };
    } catch {}

    const onStorage = (e: StorageEvent) => {
      if (e.key === "dnd_pip_dismiss_request") {
        const isCurrentlyOpen = Boolean(
          pipWindowRef.current ||
          (window as unknown as { documentPictureInPicture?: { window?: Window } }).documentPictureInPicture?.window ||
          (typeof document !== "undefined" && document.pictureInPictureElement)
        );
        if (isCurrentlyOpen) {
          wasActiveBeforeBlockedRef.current = true;
        }
        closeAnyOpenPip();
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      if (bc) bc.close();
      window.removeEventListener("storage", onStorage);
    };
  }, [closeAnyOpenPip, isBlockedPage, toggleMiniWindow]);

  // HIDE MINI POP-UP ON BLOCKED PAGE, AND RESTORE WHEN LEAVING
  useEffect(() => {
    if (isBlockedPage) {
      const isCurrentlyOpen = Boolean(
        pipWindowRef.current ||
        (typeof window !== "undefined" && (window as unknown as { documentPictureInPicture?: { window?: Window } }).documentPictureInPicture?.window) ||
        (typeof document !== "undefined" && document.pictureInPictureElement)
      );
      if (isCurrentlyOpen) {
        wasActiveBeforeBlockedRef.current = true;
      }

      // Hide and close mini pop up while user is in the blocked page
      closeAnyOpenPip();

      // Broadcast to other tabs so any background tab immediately dismisses its PiP
      try {
        const bc = new BroadcastChannel("dnd-mini-window-control");
        bc.postMessage({ type: "DISMISS_PIP" });
        bc.close();
      } catch {}

      try {
        localStorage.setItem("dnd_pip_dismiss_request", Date.now().toString());
        localStorage.setItem("dnd_blocked_page_active", "true");
      } catch {}

      if (videoRef.current) {
        (videoRef.current as unknown as { autoPictureInPicture?: boolean }).autoPictureInPicture = false;
      }

      return () => {
        try {
          localStorage.removeItem("dnd_blocked_page_active");
          const bc = new BroadcastChannel("dnd-mini-window-control");
          bc.postMessage({ type: "RESTORE_PIP" });
          bc.close();
        } catch {}
      };
    } else {
      // User left the blocked page - restore native auto-PiP eligibility
      if (videoRef.current) {
        (videoRef.current as unknown as { autoPictureInPicture?: boolean }).autoPictureInPicture = true;
      }

      // If mini pop-up was active before entering blocked page, restore it now
      if (wasActiveBeforeBlockedRef.current && isRunningRef.current) {
        wasActiveBeforeBlockedRef.current = false;
        if (typeof window !== "undefined" && "documentPictureInPicture" in window) {
          openDocumentPip().catch(() => {
            openVideoPip().catch(() => {});
          });
        } else {
          openVideoPip().catch(() => {});
        }
      } else {
        wasActiveBeforeBlockedRef.current = false;
      }
    }
  }, [isBlockedPage, closeAnyOpenPip, openDocumentPip, openVideoPip]);

  // AUTO-SHOW WHEN WEBSITE LOSES FOCUS & AUTO-HIDE WHEN WEBSITE IS IN FOCUS
  // "When the timer starts and the website is no longer in focus, the mini pop-up shows"
  // "When in the website, do not show the mini popup"
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const handleFocusLoss = async () => {
      // Never pop out if user is on the blocked page
      if (isBlockedPage) return;
      // Only pop out if the timer is actively running and PiP is not already open
      if (!isRunningRef.current) return;
      if (pipWindowRef.current || document.pictureInPictureElement) return;

      // Try Document PiP first
      if ("documentPictureInPicture" in window) {
        try {
          const ok = await openDocumentPip();
          if (ok) return;
        } catch {
          // Fall back to video PiP if Document PiP was not permitted
        }
      }

      // Fall back to native Video PiP
      try {
        await openVideoPip();
      } catch (err) {
        console.warn("Auto PiP open failed:", err);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handleFocusLoss();
      }
    };

    const onWindowBlur = () => {
      handleFocusLoss();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onWindowBlur);

    // Register MediaSession enterpictureinpicture so browser auto-PiP hooks work seamlessly
    if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
      try {
        navigator.mediaSession.setActionHandler("enterpictureinpicture" as MediaSessionAction, async () => {
          await handleFocusLoss();
        });
      } catch {}
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, [isBlockedPage, openDocumentPip, openVideoPip, setIsMiniWindowActive]);

  // NOTE: Elements are mounted with 1px off-screen fixed positioning rather than 'display: none'
  // so browser Picture-in-Picture engine and autoPictureInPicture can actively capture the stream.
  return (
    <>
      <canvas
        ref={canvasRef}
        width={360}
        height={200}
        style={{
          position: "fixed",
          top: -9999,
          left: -9999,
          width: "1px",
          height: "1px",
          opacity: 0.001,
          pointerEvents: "none",
          zIndex: -100,
        }}
        aria-hidden="true"
      />
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        style={{
          position: "fixed",
          top: -9999,
          left: -9999,
          width: "1px",
          height: "1px",
          opacity: 0.001,
          pointerEvents: "none",
          zIndex: -100,
        }}
        aria-hidden="true"
      />
    </>
  );
}
