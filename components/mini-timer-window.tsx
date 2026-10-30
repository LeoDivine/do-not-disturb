"use client";

import { useEffect, useRef, useCallback } from "react";
import { useTheme } from "../context/theme-context";
import { useTimer } from "../context/timer-context";
import { getStoredBlocklist } from "../lib/blocking/blocklist-store";
import { HolidayId, HOLIDAY_THEMES } from "./gamification/holiday-themes";

export default function MiniTimerWindow() {
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
    visualMode,
    resolvedVisualMode,
    toggleVisualMode,
  } = useTimer();

  // Keep references to latest state & callbacks to avoid stale closures in listeners
  const isRunningRef = useRef(isRunning);
  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  const visualModeRef = useRef(visualMode);
  useEffect(() => {
    visualModeRef.current = visualMode;
  }, [visualMode]);

  const resolvedVisualModeRef = useRef(resolvedVisualMode);
  useEffect(() => {
    resolvedVisualModeRef.current = resolvedVisualMode;
  }, [resolvedVisualMode]);

  const toggleVisualModeRef = useRef(toggleVisualMode);
  useEffect(() => {
    toggleVisualModeRef.current = toggleVisualMode;
  }, [toggleVisualMode]);

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

    // Header Mode Title & View Type Badge
    ctx.fillStyle = activeColor;
    ctx.font = "600 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const simpleMode = mode === "focus" ? "Focus" : mode === "shortBreak" ? "Short Break" : "Long Break";
    ctx.fillText(simpleMode, 24, 18);

    // Focus View Type Label (Arc View vs Zen Garden vs Holiday) — Minimal text without pills or badges
    const isGarden = resolvedVisualMode === "garden";
    const isHoliday = Boolean(resolvedVisualMode && resolvedVisualMode in HOLIDAY_THEMES);
    const holidayTheme = isHoliday ? HOLIDAY_THEMES[resolvedVisualMode as HolidayId] : null;

    let viewBadge = "Arc View";
    let viewColor = "#64748b";
    if (isGarden) {
      viewBadge = "Zen Garden";
      viewColor = "#34d399";
    } else if (holidayTheme) {
      viewBadge = holidayTheme.shortName;
      viewColor = holidayTheme.accentColor;
    }

    ctx.save();
    ctx.font = "500 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    const modeWidth = ctx.measureText(simpleMode).width;
    const textX = 24 + modeWidth + 8;
    const textY = 18;

    ctx.fillStyle = viewColor;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`• ${viewBadge}`, textX, textY);
    ctx.restore();

    // Header Shield & Cycle Count
    let blockedCount = 0;
    try {
      blockedCount = getStoredBlocklist().filter((e) => e.active).length;
    } catch {}

    const cycleInfo = `${cycle}/${totalCycles}`;
    const blockedInfo = `${blockedCount} guarded`;

    ctx.font = "500 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textBaseline = "middle";

    const cycleWidth = ctx.measureText(cycleInfo).width;
    const sepWidth = ctx.measureText(" • ").width;
    const blockedWidth = ctx.measureText(blockedInfo).width;

    let rx = w - 24;
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "right";
    ctx.fillText(cycleInfo, rx, 18);
    rx -= cycleWidth;

    ctx.fillText(" • ", rx, 18);
    rx -= sepWidth;

    ctx.fillText(blockedInfo, rx, 18);
    rx -= (blockedWidth + 4);

    // Vector shield icon
    ctx.save();
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 1.3;
    ctx.lineJoin = "round";
    ctx.beginPath();
    const sx = rx - 9;
    const sy = 13;
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + 7, sy);
    ctx.lineTo(sx + 7, sy + 3.5);
    ctx.quadraticCurveTo(sx + 7, sy + 8, sx + 3.5, sy + 10);
    ctx.quadraticCurveTo(sx, sy + 8, sx, sy + 3.5);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Header Goal / Anchor Task
    const anchor = typeof window !== "undefined" ? localStorage.getItem("dnd_primary_anchor") || localStorage.getItem("dnd_session_intent") || "" : "";
    if (anchor) {
      ctx.font = "500 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.textBaseline = "middle";
      const truncated = anchor.length > 36 ? anchor.slice(0, 34) + "…" : anchor;
      const textWidth = ctx.measureText(truncated).width;
      const iconSize = 10;
      const iconGap = 5;
      const totalWidth = iconSize + iconGap + textWidth;
      const startX = (w - totalWidth) / 2;

      // Vector target icon
      ctx.save();
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1.2;
      const cx = startX + 5;
      const cy = 42;
      ctx.beginPath();
      ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = "#94a3b8";
      ctx.fill();
      ctx.restore();

      // Anchor text
      ctx.fillStyle = "#cbd5e1";
      ctx.textAlign = "left";
      ctx.fillText(truncated, startX + iconSize + iconGap, 42);
    }

    const progress = totalSeconds > 0 ? (totalSeconds - secondsLeft) / totalSeconds : 0;

    if (isGarden || isHoliday) {
      // VISUAL GROWTH MINI POP-UP VIEW (Zen Garden or Holiday Theme)
      const treeCenterX = 82;
      const treeBaseY = 146;

      // Protective Glowing Halo (Glows when running)
      if (isRunning) {
        ctx.save();
        ctx.strokeStyle = holidayTheme ? holidayTheme.accentColor : activeColor;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(treeCenterX, treeBaseY - 45, 48, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (isHoliday && holidayTheme) {
        // Holiday Center Motif Vector Graphic (No emojis)
        ctx.save();
        const mx = treeCenterX;
        const my = treeBaseY - 45;
        if (holidayTheme.id === "halloween") {
          ctx.fillStyle = "#f97316";
          ctx.beginPath();
          ctx.arc(mx, my, 22, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#15803d";
          ctx.fillRect(mx - 2, my - 26, 4, 6);
        } else if (holidayTheme.id === "christmas") {
          ctx.fillStyle = "#10b981";
          ctx.beginPath();
          ctx.moveTo(mx, my - 24);
          ctx.lineTo(mx - 20, my + 16);
          ctx.lineTo(mx + 20, my + 16);
          ctx.closePath();
          ctx.fill();
        } else if (holidayTheme.id === "newyear") {
          ctx.strokeStyle = "#eab308";
          ctx.lineWidth = 2;
          for (let a = 0; a < 8; a++) {
            const rad = (a * Math.PI) / 4;
            ctx.beginPath();
            ctx.moveTo(mx, my);
            ctx.lineTo(mx + Math.cos(rad) * 22, my + Math.sin(rad) * 22);
            ctx.stroke();
          }
        } else if (holidayTheme.id === "valentine") {
          ctx.fillStyle = "#ec4899";
          ctx.beginPath();
          ctx.arc(mx - 8, my - 6, 10, Math.PI, 0, false);
          ctx.arc(mx + 8, my - 6, 10, Math.PI, 0, false);
          ctx.lineTo(mx, my + 18);
          ctx.closePath();
          ctx.fill();
        } else if (holidayTheme.id === "stpatricks") {
          ctx.fillStyle = "#22c55e";
          ctx.beginPath();
          ctx.arc(mx - 8, my, 8, 0, Math.PI * 2);
          ctx.arc(mx + 8, my, 8, 0, Math.PI * 2);
          ctx.arc(mx, my - 8, 8, 0, Math.PI * 2);
          ctx.arc(mx, my + 8, 8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = holidayTheme.accentColor;
          ctx.beginPath();
          ctx.arc(mx, my, 20, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else {
        // Bonsai Pot / Planter
        ctx.save();
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.moveTo(treeCenterX - 25, treeBaseY);
        ctx.lineTo(treeCenterX + 25, treeBaseY);
        ctx.lineTo(treeCenterX + 19, treeBaseY + 14);
        ctx.lineTo(treeCenterX - 19, treeBaseY + 14);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Pot rim
        ctx.fillStyle = "#334155";
        ctx.beginPath();
        ctx.roundRect(treeCenterX - 28, treeBaseY - 3, 56, 4, 2);
        ctx.fill();

        // Soil
        ctx.fillStyle = "#451a03";
        ctx.beginPath();
        ctx.ellipse(treeCenterX, treeBaseY - 1, 23, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Bonsai Trunk (Grows smoothly)
        ctx.strokeStyle = "#92400e";
        ctx.lineWidth = 4.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(treeCenterX, treeBaseY - 2);
        ctx.quadraticCurveTo(treeCenterX - 6, treeBaseY - 22, treeCenterX + 4, treeBaseY - 44);
        ctx.stroke();

        // Branches (if progress > 0.15)
        if (progress > 0.15) {
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(treeCenterX - 2, treeBaseY - 22);
          ctx.quadraticCurveTo(treeCenterX - 16, treeBaseY - 28, treeCenterX - 24, treeBaseY - 36);
          ctx.moveTo(treeCenterX + 2, treeBaseY - 30);
          ctx.quadraticCurveTo(treeCenterX + 14, treeBaseY - 36, treeCenterX + 22, treeBaseY - 44);
          ctx.stroke();
        }

        // Foliage Clouds (scales with progress)
        const foliageScale = Math.min(1, Math.max(0.25, progress * 1.2));
        ctx.fillStyle = "#10b981";
        ctx.globalAlpha = 0.88;

        ctx.beginPath();
        ctx.arc(treeCenterX + 4, treeBaseY - 50, 15 * foliageScale, 0, Math.PI * 2);
        ctx.arc(treeCenterX - 8, treeBaseY - 46, 13 * foliageScale, 0, Math.PI * 2);
        ctx.arc(treeCenterX + 16, treeBaseY - 46, 13 * foliageScale, 0, Math.PI * 2);
        ctx.fill();

        if (progress > 0.25) {
          ctx.fillStyle = "#059669";
          ctx.beginPath();
          ctx.arc(treeCenterX - 24, treeBaseY - 38, 12 * foliageScale, 0, Math.PI * 2);
          ctx.arc(treeCenterX - 16, treeBaseY - 44, 10 * foliageScale, 0, Math.PI * 2);
          ctx.fill();
        }

        if (progress > 0.35) {
          ctx.fillStyle = "#34d399";
          ctx.beginPath();
          ctx.arc(treeCenterX + 22, treeBaseY - 46, 12 * foliageScale, 0, Math.PI * 2);
          ctx.arc(treeCenterX + 16, treeBaseY - 52, 9 * foliageScale, 0, Math.PI * 2);
          ctx.fill();
        }

        // Blossoms (if progress > 0.6)
        if (progress > 0.6) {
          ctx.fillStyle = "#f472b6";
          const blossoms = [
            [treeCenterX + 2, treeBaseY - 58],
            [treeCenterX - 12, treeBaseY - 50],
            [treeCenterX + 18, treeBaseY - 44],
            [treeCenterX - 26, treeBaseY - 42],
            [treeCenterX + 24, treeBaseY - 52],
          ];
          for (const [bx, by] of blossoms) {
            ctx.beginPath();
            ctx.arc(bx, by, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      }

      // Right side: Bold Countdown Digits & Growth Stage
      const timeX = 246;
      const timeY = 88;

      ctx.fillStyle = "#ffffff";
      ctx.font = "700 40px -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(formatTime(secondsLeft), timeX, timeY);

      // Growth stage label (Zero emojis)
      let growthStageName = "Growing Sprout";
      let growthStageColor = "#34d399";
      if (holidayTheme) {
        const stageIdx = Math.min(4, Math.floor(progress * 5));
        growthStageName = progress >= 0.98 ? holidayTheme.completionTitle : holidayTheme.stages[stageIdx];
        growthStageColor = holidayTheme.accentColor;
      } else {
        growthStageName =
          progress >= 0.95
            ? "Full Zen Bloom"
            : progress >= 0.7
            ? "Blossoming Sanctuary"
            : progress >= 0.45
            ? "Flourishing Canopy"
            : progress >= 0.2
            ? "Branching Out"
            : "Growing Sprout";
      }

      ctx.fillStyle = growthStageColor;
      ctx.font = "600 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      ctx.fillText(growthStageName, timeX, timeY + 30);

      // Mini progress bar under the time
      const barX = 175;
      const barY = timeY + 46;
      const barW = 142;
      const barH = 2.5;
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, barH, 1);
      ctx.fill();

      const fillW = Math.max(2, barW * progress);
      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.roundRect(barX, barY, fillW, barH, 1);
      ctx.fill();
    } else {
      // CLASSIC ARC / LINEAR TIMER VIEW
      // Large Minimalist Bold Countdown Digits
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 48px -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(formatTime(secondsLeft), w / 2, anchor ? 90 : 86);

      // Sleek Progress Track (minimalist 2px line)
      const barX = 24;
      const barY = anchor ? 136 : 134;
      const barW = w - 48;
      const barH = 2.5;
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, barH, 1);
      ctx.fill();

      // Progress Fill
      const fillW = Math.max(2, barW * progress);
      ctx.fillStyle = activeColor;
      ctx.beginPath();
      ctx.roundRect(barX, barY, fillW, barH, 1);
      ctx.fill();
    }

    // Subtle Footer State
    ctx.fillStyle = "#94a3b8";
    ctx.font = "500 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(isRunning ? "● Active in flow" : "○ Paused", 24, 180);

    ctx.textAlign = "right";
    ctx.fillStyle = "#64748b";
    ctx.fillText(`Target: ${Math.round(totalSeconds / 60)}m`, w - 24, 180);
  }, [activeColor, colors.name, cycle, totalCycles, formatTime, secondsLeft, totalSeconds, isRunning, mode, visualMode, resolvedVisualMode]);

  const renderCanvasFrameRef = useRef(renderCanvasFrame);
  useEffect(() => {
    renderCanvasFrameRef.current = renderCanvasFrame;
  }, [renderCanvasFrame]);

  // Continually update canvas & video stream when timer is running
  useEffect(() => {
    renderCanvasFrame();

    const intervalId = setInterval(() => {
      renderCanvasFrame();
    }, 500);

    return () => clearInterval(intervalId);
  }, [renderCanvasFrame, secondsLeft, isRunning, mode, visualMode, resolvedVisualMode]);

  // Keep video active and playing with canvas stream so auto-PiP is always armed
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    (video as unknown as { autoPictureInPicture?: boolean }).autoPictureInPicture = isRunning;
    video.setAttribute("autopictureinpicture", "");

    renderCanvasFrame();
    if (!video.srcObject) {
      const stream = canvas.captureStream(20);
      video.srcObject = stream;
    }
    video.play().catch(() => {});
  }, [isRunning, renderCanvasFrame]);

  // Ensure video playback is primed whenever the user interacts with the document
  useEffect(() => {
    const primeVideo = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      (video as unknown as { autoPictureInPicture?: boolean }).autoPictureInPicture = true;
      video.setAttribute("autopictureinpicture", "");

      if (!video.srcObject) {
        video.srcObject = canvas.captureStream(20);
      }
      if (video.paused) {
        video.play().catch(() => {});
      }
    };

    window.addEventListener("pointerdown", primeVideo, { passive: true });
    window.addEventListener("keydown", primeVideo, { passive: true });
    window.addEventListener("focus", primeVideo, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", primeVideo);
      window.removeEventListener("keydown", primeVideo);
      window.removeEventListener("focus", primeVideo);
    };
  }, []);

  // Update Document PiP window DOM elements on each tick
  useEffect(() => {
    if (!pipWindowRef.current) return;
    const pipDoc = pipWindowRef.current.document;
    const timeEl = pipDoc.getElementById("pip-time");
    const modeEl = pipDoc.getElementById("pip-mode");
    const cycleEl = pipDoc.getElementById("pip-cycle");
    const progressEl = pipDoc.getElementById("pip-progress");
    const anchorEl = pipDoc.getElementById("pip-anchor");
    const shieldEl = pipDoc.getElementById("pip-shield");
    const statusEl = pipDoc.getElementById("pip-status");
    const playBtn = pipDoc.getElementById("pip-play-btn") as HTMLButtonElement | null;
    const skipBtn = pipDoc.getElementById("pip-skip-btn") as HTMLButtonElement | null;

    // View type elements
    const timerViewEl = pipDoc.getElementById("pip-timer-view");
    const gardenViewEl = pipDoc.getElementById("pip-garden-view");
    const viewLabelEl = pipDoc.getElementById("pip-view-label");
    const viewToggleEl = pipDoc.getElementById("pip-view-toggle");
    const viewIconEl = pipDoc.getElementById("pip-view-icon");
    const gardenTimeEl = pipDoc.getElementById("pip-garden-time");
    const growthBadgeEl = pipDoc.getElementById("pip-growth-badge");
    const bonsaiHaloEl = pipDoc.getElementById("pip-bonsai-halo");
    const bonsaiBranchesEl = pipDoc.getElementById("pip-bonsai-branches");
    const bonsaiFoliageEl = pipDoc.getElementById("pip-bonsai-foliage");
    const bonsaiBlossomsEl = pipDoc.getElementById("pip-bonsai-blossoms");

    const isGarden = resolvedVisualMode === "garden";
    const isHoliday = Boolean(resolvedVisualMode && resolvedVisualMode in HOLIDAY_THEMES);
    const holidayTheme = isHoliday ? HOLIDAY_THEMES[resolvedVisualMode as HolidayId] : null;
    const isVisual = isGarden || isHoliday;

    if (timerViewEl) timerViewEl.style.display = isVisual ? "none" : "flex";
    if (gardenViewEl) gardenViewEl.style.display = isVisual ? "flex" : "none";

    if (viewLabelEl) {
      if (holidayTheme) {
        viewLabelEl.textContent = holidayTheme.shortName;
      } else if (isGarden) {
        viewLabelEl.textContent = "Zen Garden";
      } else {
        viewLabelEl.textContent = "Arc View";
      }
    }
    if (viewToggleEl) {
      viewToggleEl.className = isVisual ? "view-type" : "view-type timer";
      if (holidayTheme) {
        viewToggleEl.style.color = holidayTheme.accentColor;
      } else if (isGarden) {
        viewToggleEl.style.color = "#34d399";
      } else {
        viewToggleEl.style.color = "#64748b";
      }
    }
    if (viewIconEl) {
      if (holidayTheme) {
        viewIconEl.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
      } else if (isGarden) {
        viewIconEl.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
      } else {
        viewIconEl.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
      }
    }

    if (timeEl) timeEl.textContent = formatTime(secondsLeft);
    if (gardenTimeEl) gardenTimeEl.textContent = formatTime(secondsLeft);

    const progress = totalSeconds > 0 ? (totalSeconds - secondsLeft) / totalSeconds : 0;

    if (growthBadgeEl) {
      if (holidayTheme) {
        const stageIdx = Math.min(4, Math.floor(progress * 5));
        growthBadgeEl.textContent = progress >= 0.98 ? holidayTheme.completionTitle : holidayTheme.stages[stageIdx];
        growthBadgeEl.style.color = holidayTheme.accentColor;
      } else {
        const stageName =
          progress >= 0.95
            ? "Full Zen Bloom"
            : progress >= 0.7
            ? "Blossoming Sanctuary"
            : progress >= 0.45
            ? "Flourishing Canopy"
            : progress >= 0.2
            ? "Branching Out"
            : "Growing Sprout";
        growthBadgeEl.textContent = stageName;
        growthBadgeEl.style.color = "#34d399";
      }
    }
    if (bonsaiHaloEl) {
      bonsaiHaloEl.setAttribute("opacity", isRunning && mode === "focus" ? "0.45" : "0");
      bonsaiHaloEl.setAttribute("stroke", holidayTheme ? holidayTheme.accentColor : activeColor);
    }
    if (bonsaiBranchesEl) {
      bonsaiBranchesEl.style.display = isHoliday ? "none" : progress > 0.15 ? "block" : "none";
    }
    if (bonsaiFoliageEl) {
      const foliageScale = Math.min(1, Math.max(0.25, progress * 1.2));
      bonsaiFoliageEl.setAttribute("transform", `scale(${foliageScale})`);
      bonsaiFoliageEl.setAttribute("transform-origin", "100 85");
      bonsaiFoliageEl.style.display = isHoliday ? "none" : "block";
    }
    if (bonsaiBlossomsEl) {
      bonsaiBlossomsEl.style.display = isHoliday ? "none" : progress > 0.6 ? "block" : "none";
    }

    if (modeEl) {
      modeEl.textContent = mode === "focus" ? "Focus" : mode === "shortBreak" ? "Short Break" : "Long Break";
      modeEl.style.color = activeColor;
    }
    if (cycleEl) cycleEl.textContent = `${cycle} of ${totalCycles}`;
    if (progressEl) {
      const progressPercent = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;
      progressEl.style.width = `${progressPercent}%`;
      progressEl.style.backgroundColor = holidayTheme ? holidayTheme.accentColor : isGarden ? "#10b981" : activeColor;
    }
    if (anchorEl) {
      const anchor = typeof window !== "undefined" ? localStorage.getItem("dnd_primary_anchor") || localStorage.getItem("dnd_session_intent") || "" : "";
      const anchorVal = pipDoc.getElementById("pip-anchor-val");
      if (anchorVal) {
        anchorVal.textContent = anchor;
      }
      anchorEl.style.display = anchor ? "flex" : "none";
    }
    if (shieldEl) {
      let blockedCount = 0;
      try {
        blockedCount = getStoredBlocklist().filter((e) => e.active).length;
      } catch {}
      const shieldVal = pipDoc.getElementById("pip-shield-val");
      if (shieldVal) {
        shieldVal.textContent = `${blockedCount} blocked`;
      }
    }
    if (statusEl) {
      statusEl.textContent = isRunning ? "In focus" : "Paused";
      statusEl.style.color = isRunning ? (isGarden ? "#34d399" : activeColor) : "#64748b";
    }
    if (playBtn) {
      playBtn.style.backgroundColor = isGarden ? "#10b981" : activeColor;
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
  }, [secondsLeft, isRunning, colors.name, cycle, totalCycles, totalSeconds, activeColor, isDark, mode, formatTime, visualMode, resolvedVisualMode]);

  // Trigger minimalist Document Picture-in-Picture window (Browser native style, no pills)
  const openDocumentPip = useCallback(async (forceOpen = false) => {
    try {
      if (!("documentPictureInPicture" in window)) return false;

      // If already open
      if (pipWindowRef.current) {
        if (forceOpen) {
          setIsMiniWindowActive(true);
          return true;
        }
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
        width: 330,
        height: 215,
      });

      pipWindowRef.current = pip;
      setIsMiniWindowActive(true);

      const pipDoc = pip.document;
      pipDoc.title = `Do Not Disturb — ${colors.name}`;

      let blockedCount = 0;
      try {
        blockedCount = getStoredBlocklist().filter((e) => e.active).length;
      } catch {}

      const anchor = typeof window !== "undefined" ? localStorage.getItem("dnd_primary_anchor") || localStorage.getItem("dnd_session_intent") || "" : "";

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
          padding: 12px 16px 14px;
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
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        .meta-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .view-type {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 500;
          color: #34d399;
          background: transparent;
          border: none;
          cursor: pointer;
          font-family: inherit;
          padding: 0;
          line-height: 1;
          transition: color 0.15s ease;
        }
        .view-type.timer {
          color: #64748b;
        }
        .view-type:hover {
          color: #f8fafc;
        }
        .shield-meta {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: #64748b;
          font-weight: 400;
          line-height: 1;
        }
        .meta-sep {
          color: #334155;
          font-size: 10px;
        }
        .shield-icon {
          display: inline-block;
          flex-shrink: 0;
          color: #64748b;
        }
        .cycle-info {
          font-size: 11px;
          font-weight: 400;
          color: #64748b;
          font-family: ui-monospace, SFMono-Regular, monospace;
        }
        .anchor-text {
          font-size: 11px;
          color: #cbd5e1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: center;
          padding: 2px 0 0;
          line-height: 1.2;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
        }
        .anchor-icon {
          display: inline-block;
          flex-shrink: 0;
          color: #94a3b8;
        }
        .timer-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 2px 0;
        }
        .timer-digits {
          font-size: 44px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.03em;
          color: #ffffff;
          line-height: 1;
          font-family: ui-monospace, SFMono-Regular, monospace;
        }
        .garden-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          margin: 2px 0;
        }
        .bonsai-box {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .garden-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
        }
        .timer-digits-garden {
          font-size: 34px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.02em;
          color: #ffffff;
          line-height: 1;
          font-family: ui-monospace, SFMono-Regular, monospace;
        }
        .growth-meta {
          font-size: 11px;
          font-weight: 500;
          color: #34d399;
          line-height: 1.2;
        }
        .progress-track {
          width: 100%;
          height: 2.5px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 999px;
          overflow: hidden;
          margin-bottom: 8px;
        }
        .progress-fill {
          height: 100%;
          width: 0%;
          border-radius: 999px;
          transition: width 0.3s ease;
        }
        .footer-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .status-text {
          font-size: 10.5px;
          color: #94a3b8;
          font-weight: 500;
        }
        .controls {
          display: flex;
          align-items: center;
          gap: 8px;
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
          width: 32px;
          height: 32px;
        }
        .btn-play:hover {
          opacity: 0.9;
        }
        .btn-skip {
          width: 26px;
          height: 26px;
          background-color: rgba(255, 255, 255, 0.06);
          color: #94a3b8;
        }
        .btn-skip:hover {
          background-color: rgba(255, 255, 255, 0.12);
          color: #ffffff;
        }
        .btn-app {
          font-size: 10.5px;
          color: #64748b;
          background: transparent;
          border: none;
          cursor: pointer;
          font-family: inherit;
        }
        .btn-app:hover {
          color: #ffffff;
        }
      `;
      pipDoc.head.appendChild(style);

      // DOM Content
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
      const isGarden = resolvedVisualMode === "garden";
      const isHoliday = Boolean(resolvedVisualMode && resolvedVisualMode in HOLIDAY_THEMES);
      const holidayTheme = isHoliday ? HOLIDAY_THEMES[resolvedVisualMode as HolidayId] : null;
      const isVisual = isGarden || isHoliday;
      const viewLabel = holidayTheme ? holidayTheme.shortName : isGarden ? "Zen Garden" : "Arc View";
      const viewIcon = isVisual
        ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>'
        : '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
      const growthLabel = holidayTheme
        ? holidayTheme.stages[0]
        : "Growing Sprout";

      container.innerHTML = `
        <div class="header">
          <div class="mode-wrap">
            <span class="mode-dot"></span>
            <span id="pip-mode" class="mode-title" style="color: ${activeColor};">${simpleMode}</span>
          </div>
          <div class="meta-wrap">
            <button id="pip-view-toggle" type="button" class="view-type ${isVisual ? "" : "timer"}" title="Toggle Focus View" style="color: ${holidayTheme ? holidayTheme.accentColor : isGarden ? "#34d399" : "#64748b"};">
              <span id="pip-view-icon" style="display: inline-flex; align-items: center;">
                ${viewIcon}
              </span>
              <span id="pip-view-label">${viewLabel}</span>
            </button>
            <span class="meta-sep">•</span>
            <span id="pip-shield" class="shield-meta">
              <svg class="shield-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span id="pip-shield-val">${blockedCount} blocked</span>
            </span>
            <span class="meta-sep">•</span>
            <span id="pip-cycle" class="cycle-info">${cycle} of ${totalCycles}</span>
          </div>
        </div>

        <div id="pip-anchor" class="anchor-text" style="display: ${anchor ? "flex" : "none"};">
          <svg class="anchor-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="6"/>
            <circle cx="12" cy="12" r="2"/>
          </svg>
          <span id="pip-anchor-val" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${anchor}</span>
        </div>

        <div id="pip-timer-view" class="timer-wrap" style="display: ${isVisual ? "none" : "flex"};">
          <div id="pip-time" class="timer-digits">${formatTime(secondsLeft)}</div>
        </div>

        <div id="pip-garden-view" class="garden-wrap" style="display: ${isVisual ? "flex" : "none"};">
          <div class="bonsai-box">
            <svg id="pip-bonsai-svg" width="88" height="88" viewBox="0 0 200 200">
              <circle cx="100" cy="165" r="70" fill="none" stroke="#334155" stroke-width="1" stroke-dasharray="4 3" opacity="0.6"/>
              <circle id="pip-bonsai-halo" cx="100" cy="105" r="68" fill="none" stroke="${holidayTheme ? holidayTheme.accentColor : activeColor}" stroke-width="2" stroke-dasharray="6 4" opacity="${isRunning && mode === 'focus' ? '0.45' : '0'}"/>
              <path d="M 68 152 L 132 152 L 126 168 L 74 168 Z" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
              <rect x="64" y="149" width="72" height="4" rx="2" fill="#334155"/>
              <ellipse cx="100" cy="151" rx="32" ry="3" fill="#451a03"/>
              <path d="M 98 150 Q 94 135 101 120 T 96 95 T 100 80" fill="none" stroke="#92400e" stroke-width="6" stroke-linecap="round"/>
              <g id="pip-bonsai-branches">
                <path d="M 98 122 Q 85 115 76 108" fill="none" stroke="#92400e" stroke-width="3.5" stroke-linecap="round"/>
                <path d="M 98 110 Q 112 104 125 98" fill="none" stroke="#92400e" stroke-width="3" stroke-linecap="round"/>
              </g>
              <g id="pip-bonsai-foliage">
                <circle cx="100" cy="74" r="24" fill="#10b981" opacity="0.85"/>
                <circle cx="82" cy="80" r="18" fill="#059669" opacity="0.85"/>
                <circle cx="118" cy="80" r="18" fill="#34d399" opacity="0.85"/>
                <circle cx="70" cy="104" r="16" fill="#10b981" opacity="0.85"/>
                <circle cx="128" cy="96" r="16" fill="#059669" opacity="0.85"/>
              </g>
              <g id="pip-bonsai-blossoms">
                <circle cx="100" cy="62" r="4.5" fill="#f472b6"/>
                <circle cx="76" cy="72" r="4" fill="#f472b6"/>
                <circle cx="124" cy="74" r="4" fill="#f472b6"/>
                <circle cx="64" cy="100" r="3.5" fill="#f472b6"/>
                <circle cx="134" cy="92" r="3.5" fill="#f472b6"/>
              </g>
            </svg>
          </div>
          <div class="garden-info">
            <div id="pip-garden-time" class="timer-digits-garden">${formatTime(secondsLeft)}</div>
            <span id="pip-growth-badge" class="growth-meta" style="color: ${holidayTheme ? holidayTheme.accentColor : '#34d399'};">${growthLabel}</span>
          </div>
        </div>

        <div>
          <div class="progress-track">
            <div id="pip-progress" class="progress-fill" style="background-color: ${holidayTheme ? holidayTheme.accentColor : isGarden ? "#10b981" : activeColor}; width: ${progressPercent}%;"></div>
          </div>
          <div class="footer-row">
            <span id="pip-status" class="status-text">${isRunning ? "In focus" : "Paused"}</span>
            <div class="controls">
              <button id="pip-play-btn" type="button" class="btn btn-play" style="background-color: ${holidayTheme ? holidayTheme.accentColor : isGarden ? "#10b981" : activeColor}; color: ${playBtnColor};" title="${isRunning ? "Pause" : "Start"}">
                ${playIconSvg}
              </button>
              <button id="pip-skip-btn" type="button" class="btn btn-skip" title="Next">
                ${skipIconSvg}
              </button>
            </div>
            <button id="pip-app-btn" type="button" class="btn-app" title="Focus website" style="display: inline-flex; align-items: center; gap: 4px;">
              <span>App</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </button>
          </div>
        </div>
      `;
      pipDoc.body.appendChild(container);

      // Attach event listeners
      const viewToggleBtn = pipDoc.getElementById("pip-view-toggle");
      if (viewToggleBtn) {
        viewToggleBtn.onclick = (e) => {
          e.preventDefault();
          toggleVisualModeRef.current();
        };
      }

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

      const appBtn = pipDoc.getElementById("pip-app-btn");
      if (appBtn) {
        appBtn.onclick = (e) => {
          e.preventDefault();
          window.focus();
        };
      }

      pip.addEventListener("pagehide", () => {
        setIsMiniWindowActive(false);
        pipWindowRef.current = null;
      });

      return true;
    } catch (err: unknown) {
      const isNotAllowed = (err as { name?: string })?.name === "NotAllowedError";
      if (!isNotAllowed) {
        console.warn("Document PiP request failed", err);
      }
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
    visualMode,
    resolvedVisualMode,
    setIsMiniWindowActive,
  ]);

  // Video-based Picture-in-Picture fallback
  const openVideoPip = useCallback(async (forceOpen = false) => {
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return false;

      renderCanvasFrame();

      if (!video.srcObject) {
        const stream = canvas.captureStream(20);
        video.srcObject = stream;
      }
      (video as unknown as { autoPictureInPicture?: boolean }).autoPictureInPicture = true;
      video.setAttribute("autopictureinpicture", "");
      await video.play().catch(() => {});

      if (document.pictureInPictureElement) {
        if (forceOpen) {
          setIsMiniWindowActive(true);
          return true;
        }
        await document.exitPictureInPicture();
        setIsMiniWindowActive(false);
        return true;
      }

      await video.requestPictureInPicture();
      setIsMiniWindowActive(true);

      const handleLeave = () => {
        setIsMiniWindowActive(false);
        if (videoRef.current) {
          (videoRef.current as unknown as { autoPictureInPicture?: boolean }).autoPictureInPicture = true;
          videoRef.current.setAttribute("autopictureinpicture", "");
          videoRef.current.play().catch(() => {});
        }
      };
      video.removeEventListener("leavepictureinpicture", handleLeave);
      video.addEventListener("leavepictureinpicture", handleLeave, { once: true });

      return true;
    } catch (err: unknown) {
      const isNotAllowed = (err as { name?: string })?.name === "NotAllowedError";
      if (!isNotAllowed) {
        console.warn("Video PiP fallback request failed", err);
      }
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

    // Re-arm video playback and auto-PiP immediately for next blur
    if (videoRef.current) {
      (videoRef.current as unknown as { autoPictureInPicture?: boolean }).autoPictureInPicture = true;
      videoRef.current.setAttribute("autopictureinpicture", "");
      videoRef.current.play().catch(() => {});
    }
  }, [setIsMiniWindowActive]);

  // Master pop-out handler for browser mini pop-up
  const toggleMiniWindow = useCallback(async () => {
    if (typeof window !== "undefined" && "documentPictureInPicture" in window) {
      const ok = await openDocumentPip();
      if (ok) return;
    }
    await openVideoPip();
  }, [openDocumentPip, openVideoPip]);

  // Register the manual toggle function with TimerContext
  useEffect(() => {
    registerMiniWindow(toggleMiniWindow);
  }, [registerMiniWindow, toggleMiniWindow]);

  // PERSISTENT MINI POP-UP ACROSS TAB SWITCHES, WEBSITE CHANGES & NAVIGATION
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Prevent accidental unload in the same tab if the focus timer and mini window are active
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const isCurrentlyOpen = Boolean(
        pipWindowRef.current ||
        (window as unknown as { documentPictureInPicture?: { window?: Window } }).documentPictureInPicture?.window ||
        (typeof document !== "undefined" && document.pictureInPictureElement)
      );
      if (isRunningRef.current && isCurrentlyOpen) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Register MediaSession enterpictureinpicture so browser auto-PiP hooks work seamlessly
    if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
      try {
        navigator.mediaSession.setActionHandler("enterpictureinpicture" as MediaSessionAction, async () => {
          const isCurrentlyOpen = Boolean(
            pipWindowRef.current ||
            (window as unknown as { documentPictureInPicture?: { window?: Window } }).documentPictureInPicture?.window ||
            (typeof document !== "undefined" && document.pictureInPictureElement)
          );
          if (!isCurrentlyOpen) {
            await toggleMiniWindow();
          }
        });
      } catch {}
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [toggleMiniWindow]);

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
