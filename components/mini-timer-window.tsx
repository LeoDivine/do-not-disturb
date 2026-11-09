"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useTheme } from "../context/theme-context";
import { useTimer } from "../context/timer-context";
import { getStoredBlocklist } from "../lib/blocking/blocklist-store";
import { HolidayId, HOLIDAY_THEMES } from "./gamification/holiday-themes";
import {
  ActiveTrackInfo,
  getCurrentPlayingTrack,
  setCurrentPlayingTrack,
  subscribeToCurrentPlayingTrack,
} from "../lib/sound/current-track-store";
import {
  SpotifyStoredPreference,
  SpotifyPlaylistItem,
  DEFAULT_SPOTIFY_PREFS,
  CURATED_FOCUS_PLAYLISTS,
  CURATED_FOCUS_TRACKS,
  fetchSpotifyPlaylistsShared,
  getStoredSpotifyPreferences,
  saveStoredSpotifyPreferences,
  subscribeToSpotifyAuthUpdates,
  subscribeToSpotifyPreferences,
} from "../lib/spotify/spotify-store";
import {
  sendSpotifyCommand,
} from "../lib/sound/audio-coordinator";
import { OPEN_SPOTIFY_WIDGET_EVENT } from "./spotify/draggable-spotify-widget";

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

  // Active playing audio track (Ambient or Spotify)
  const [currentTrack, setCurrentTrack] = useState<ActiveTrackInfo>(() =>
    getCurrentPlayingTrack()
  );
  const currentTrackRef = useRef<ActiveTrackInfo>(currentTrack);
  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  useEffect(() => {
    setCurrentTrack(getCurrentPlayingTrack());
    return subscribeToCurrentPlayingTrack((track) => {
      setCurrentTrack(track);
    });
  }, []);

  // Spotify preferences for embed player
  const [spotifyPrefs, setSpotifyPrefs] = useState<SpotifyStoredPreference>(DEFAULT_SPOTIFY_PREFS);
  const spotifyPrefsRef = useRef<SpotifyStoredPreference>(spotifyPrefs);
  const userPlaylistsRef = useRef<SpotifyPlaylistItem[]>([]);
  useEffect(() => {
    spotifyPrefsRef.current = spotifyPrefs;
  }, [spotifyPrefs]);

  useEffect(() => {
    setSpotifyPrefs(getStoredSpotifyPreferences());
    fetchSpotifyPlaylistsShared(false)
      .then((res) => {
        userPlaylistsRef.current = res.playlists || [];
      })
      .catch(() => {});
    const unsubAuth = subscribeToSpotifyAuthUpdates(() => {
      fetchSpotifyPlaylistsShared(true)
        .then((res) => {
          userPlaylistsRef.current = res.playlists || [];
        })
        .catch(() => {});
    });
    const unsubPrefs = subscribeToSpotifyPreferences((updated) => {
      setSpotifyPrefs(updated);
    });
    return () => {
      unsubAuth();
      unsubPrefs();
    };
  }, []);

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

  // Instant play/pause toggle with zero delay and automatic audio start/stop
  const handlePlayToggle = useCallback(() => {
    const willBeRunning = !isRunningRef.current;

    // 1. Instant optimistic UI update in Document PiP window (< 1ms delay)
    if (pipWindowRef.current) {
      const pipDoc = pipWindowRef.current.document;
      const playBtn = pipDoc.getElementById("pip-play-btn");
      const statusEl = pipDoc.getElementById("pip-status");
      const trackIconEl = pipDoc.getElementById("pip-track-icon");

      if (playBtn) {
        playBtn.innerHTML = willBeRunning
          ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>'
          : '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="margin-left: 2px;"><polygon points="6 4 19 12 6 20 6 4"/></svg>';
        playBtn.title = willBeRunning ? "Pause" : "Start";
      }

      if (statusEl) {
        statusEl.textContent = willBeRunning ? "In focus" : "Paused";
        statusEl.style.color = willBeRunning
          ? (resolvedVisualModeRef.current === "garden" ? "#34d399" : activeColor)
          : "#64748b";
      }

      if (trackIconEl) {
        if (willBeRunning && spotifyPrefsRef.current?.autoPlayOnFocus) {
          trackIconEl.classList.add("playing");
        } else if (!willBeRunning) {
          trackIconEl.classList.remove("playing");
        }
      }
    }

    // 2. Immediately trigger timer context state toggle (TimerContext orchestrates audio centrally)
    toggleTimerRef.current();
  }, [activeColor]);

  const handleSkip = useCallback(() => {
    skipTimerRef.current();
  }, []);

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
          handlePlayToggle();
        });
        navigator.mediaSession.setActionHandler("pause", () => {
          handlePlayToggle();
        });
        navigator.mediaSession.setActionHandler("nexttrack", () => {
          handleSkip();
        });
      } catch {
        // Ignore media session errors
      }
    }
  }, [secondsLeft, colors.name, cycle, totalCycles, formatTime, handlePlayToggle, handleSkip]);

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

    // Header Cycle Info (Clean minimalist text without pills or badges)
    ctx.font = "500 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "right";
    ctx.fillText(`${cycle}/${totalCycles}`, w - 24, 18);

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

    // Draw Current Playing Track info bar on Canvas PiP
    const track = currentTrackRef.current;
    if (track && track.title) {
      const trackText = track.artist ? `${track.title} • ${track.artist}` : track.title;
      const truncated = trackText.length > 34 ? trackText.slice(0, 32) + "…" : trackText;

      ctx.save();
      ctx.font = "500 10.5px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const textWidth = ctx.measureText(truncated).width;
      const iconWidth = 11;
      const spacing = 5;
      const totalWidth = iconWidth + spacing + textWidth;
      const startX = (w - totalWidth) / 2;
      const trackY = isGarden || isHoliday ? 160 : (anchor ? 154 : 151);

      // Equalizer bars or musical note (floating cleanly without pill background)
      ctx.fillStyle = activeColor;
      if (track.isPlaying) {
        const t = Date.now() / 250;
        const h1 = 3 + Math.abs(Math.sin(t)) * 5;
        const h2 = 4 + Math.abs(Math.cos(t * 1.3)) * 6;
        const h3 = 3 + Math.abs(Math.sin(t * 0.8)) * 5;
        ctx.fillRect(startX, trackY + 4 - h1, 2, h1);
        ctx.fillRect(startX + 3.5, trackY + 4 - h2, 2, h2);
        ctx.fillRect(startX + 7, trackY + 4 - h3, 2, h3);
      } else {
        ctx.font = "10px sans-serif";
        ctx.fillText("♪", startX + 4, trackY);
        ctx.font = "500 10.5px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      }

      // Track text
      ctx.fillStyle = track.isPlaying ? "#f1f5f9" : "#94a3b8";
      ctx.textAlign = "left";
      ctx.fillText(truncated, startX + iconWidth + spacing, trackY);
      ctx.restore();
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
  }, [activeColor, colors.name, cycle, totalCycles, formatTime, secondsLeft, totalSeconds, isRunning, mode, visualMode, resolvedVisualMode, currentTrack]);

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
    if (cycleEl) cycleEl.textContent = `${cycle}/${totalCycles}`;
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
        handlePlayToggle();
      };
    }
    if (skipBtn) {
      skipBtn.onclick = (e) => {
        e.preventDefault();
        handleSkip();
      };
    }

    // Update track info row in Document PiP
    const trackRowEl = pipDoc.getElementById("pip-track-row");
    const trackIconEl = pipDoc.getElementById("pip-track-icon");
    const trackTitleEl = pipDoc.getElementById("pip-track-title");
    const trackArtistEl = pipDoc.getElementById("pip-track-artist");

    if (trackRowEl && trackTitleEl && trackArtistEl) {
      const track = currentTrackRef.current;
      const hasTrack = Boolean(track && track.title);
      trackRowEl.style.display = hasTrack ? "flex" : "none";
      if (hasTrack) {
        trackTitleEl.textContent = track.title;
        trackArtistEl.textContent = track.artist || "";
        if (trackIconEl) {
          if (track.isPlaying) {
            trackIconEl.classList.add("playing");
          } else {
            trackIconEl.classList.remove("playing");
          }
        }
      }
    }
    // Update compact header time in Document PiP
    const compactTimeEl = pipDoc.getElementById("pip-compact-time");
    if (compactTimeEl) compactTimeEl.textContent = formatTime(secondsLeft);

    // Update Spotify Remote Card in Document PiP
    const cardTitleEl = pipDoc.getElementById("pip-card-title");
    const cardArtistEl = pipDoc.getElementById("pip-card-artist");
    const cardArtEl = pipDoc.getElementById("pip-card-art") as HTMLImageElement | null;
    const cardArtFallback = pipDoc.getElementById("pip-card-art-fallback");
    const cardToggleBtn = pipDoc.getElementById("pip-card-toggle");

    const track = currentTrackRef.current;
    if (cardTitleEl) {
      cardTitleEl.textContent = track?.title || spotifyPrefsRef.current?.selectedPlaylistName || "Deep Focus";
    }
    if (cardArtistEl) {
      cardArtistEl.textContent = track?.artist || "Spotify Focus";
    }
    if (cardArtEl && cardArtFallback) {
      if (track?.artworkUrl) {
        cardArtEl.src = track.artworkUrl;
        cardArtEl.style.display = "block";
        cardArtFallback.style.display = "none";
      } else {
        cardArtEl.style.display = "none";
        cardArtFallback.style.display = "flex";
      }
    }
    if (cardToggleBtn) {
      cardToggleBtn.innerHTML = track?.isPlaying
        ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>'
        : '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="margin-left: 1px;"><polygon points="6 4 19 12 6 20 6 4"/></svg>';
    }

    // Update active highlight on track items
    const activeTrackUri = track?.uri || spotifyPrefsRef.current?.lastPlayedTrackUri || spotifyPrefsRef.current?.selectedPlaylistUri;
    const trackItems = pipDoc.querySelectorAll(".spotify-track-item");
    trackItems.forEach((el) => {
      const uri = el.getAttribute("data-uri");
      if (uri && activeTrackUri && (uri === activeTrackUri || activeTrackUri.includes(uri))) {
        el.classList.add("active");
      } else {
        el.classList.remove("active");
      }
    });
  }, [secondsLeft, isRunning, colors.name, cycle, totalCycles, totalSeconds, activeColor, isDark, mode, formatTime, visualMode, resolvedVisualMode, currentTrack, spotifyPrefs, handlePlayToggle, handleSkip]);

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
        width: 360,
        height: 380,
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
        .compact-time {
          font-size: 13px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          font-family: ui-monospace, SFMono-Regular, monospace;
          color: #ffffff;
          margin-left: 3px;
          letter-spacing: -0.02em;
        }
        .player-toggle-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 500;
          color: #94a3b8;
          background: transparent;
          border: none;
          cursor: pointer;
          font-family: inherit;
          padding: 3px 6px;
          line-height: 1;
          border-radius: 6px;
          transition: color 0.15s ease, background-color 0.15s ease;
        }
        .player-toggle-btn:hover {
          color: #1DB954;
          background-color: rgba(29, 185, 84, 0.08);
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
          color: #94a3b8;
          background: transparent;
          border: none;
          cursor: pointer;
          font-family: inherit;
          padding: 3px 6px;
          line-height: 1;
          border-radius: 6px;
          transition: color 0.15s ease, background-color 0.15s ease;
        }
        .view-type.timer {
          color: #64748b;
        }
        .view-type:hover {
          color: #f8fafc;
          background-color: rgba(255, 255, 255, 0.06);
        }
        .meta-sep {
          color: #334155;
          font-size: 10px;
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
        .spotify-container {
          width: 100%;
          height: 220px;
          margin: 2px 0 4px;
          border-radius: 12px;
          background: rgba(18, 18, 18, 0.96);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-sizing: border-box;
          padding: 8px 10px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          flex-shrink: 0;
        }
        .spotify-card-top {
          display: flex;
          align-items: center;
          gap: 8px;
          padding-bottom: 6px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .spotify-card-art-wrap {
          width: 36px;
          height: 36px;
          border-radius: 6px;
          overflow: hidden;
          flex-shrink: 0;
          background: #282828;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .spotify-card-details {
          flex: 1;
          min-width: 0;
        }
        .spotify-card-title {
          font-size: 12px;
          font-weight: 600;
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .spotify-card-artist {
          font-size: 10px;
          color: #94a3b8;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 1px;
        }
        .spotify-mini-controls {
          display: flex;
          align-items: center;
          gap: 5px;
          flex-shrink: 0;
        }
        .spotify-ctrl-btn {
          background: rgba(255, 255, 255, 0.06);
          border: none;
          border-radius: 50%;
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #cbd5e1;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .spotify-ctrl-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
        }
        .spotify-play-btn {
          background: #1DB954;
          border: none;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #000000;
          cursor: pointer;
          transition: transform 0.1s ease, background-color 0.15s ease;
        }
        .spotify-play-btn:hover {
          transform: scale(1.05);
          background: #1ed760;
        }
        .spotify-track-list-section {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          margin: 3px 0;
        }
        .spotify-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 10px;
          font-weight: 600;
          color: #94a3b8;
          margin-bottom: 3px;
          letter-spacing: 0.02em;
        }
        .spotify-track-count {
          color: #64748b;
          font-size: 9px;
        }
        .spotify-track-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding-right: 2px;
        }
        .spotify-track-list::-webkit-scrollbar {
          width: 3px;
        }
        .spotify-track-list::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 3px;
        }
        .spotify-track-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 3px 5px;
          border-radius: 5px;
          cursor: pointer;
          transition: background-color 0.12s ease;
          user-select: none;
        }
        .spotify-track-item:hover {
          background: rgba(255, 255, 255, 0.08);
        }
        .spotify-track-item.active {
          background: rgba(29, 185, 84, 0.15);
        }
        .spotify-item-icon {
          width: 14px;
          height: 14px;
          border-radius: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          color: #94a3b8;
          background: rgba(255, 255, 255, 0.05);
          flex-shrink: 0;
        }
        .spotify-track-item.active .spotify-item-icon {
          color: #1DB954;
          background: rgba(29, 185, 84, 0.2);
        }
        .spotify-item-info {
          flex: 1;
          min-width: 0;
          line-height: 1.15;
        }
        .spotify-item-name {
          font-size: 10.5px;
          font-weight: 500;
          color: #f1f5f9;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .spotify-track-item.active .spotify-item-name {
          color: #1DB954;
          font-weight: 600;
        }
        .spotify-item-sub {
          font-size: 8.5px;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .spotify-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 4px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          font-size: 10px;
        }
        .spotify-back-btn, .spotify-switch-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 9.5px;
          cursor: pointer;
          font-family: inherit;
          padding: 1px 4px;
          border-radius: 4px;
          transition: color 0.15s ease;
        }
        .spotify-back-btn:hover, .spotify-switch-btn:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.06);
        }
        .progress-track {
          width: 100%;
          height: 2px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 8px;
        }
        .progress-fill {
          height: 100%;
          width: 0%;
          border-radius: 2px;
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
        .track-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 2px 0;
          background: transparent;
          border: none;
          margin: 4px auto 2px;
          max-width: 96%;
          overflow: hidden;
          line-height: 1.2;
          font-size: 11px;
        }
        .track-icon {
          display: inline-flex;
          align-items: flex-end;
          gap: 2px;
          height: 10px;
          flex-shrink: 0;
        }
        .eq-bar {
          width: 2px;
          background: ${activeColor};
          border-radius: 1px;
        }
        .eq-bar-1 { height: 5px; }
        .eq-bar-2 { height: 8px; }
        .eq-bar-3 { height: 4px; }
        .track-icon.playing .eq-bar-1 {
          animation: pip-eq-1 0.7s ease-in-out infinite alternate;
        }
        .track-icon.playing .eq-bar-2 {
          animation: pip-eq-2 0.5s ease-in-out infinite alternate;
        }
        .track-icon.playing .eq-bar-3 {
          animation: pip-eq-3 0.9s ease-in-out infinite alternate;
        }
        @keyframes pip-eq-1 { 0% { height: 3px; } 100% { height: 9px; } }
        @keyframes pip-eq-2 { 0% { height: 9px; } 100% { height: 4px; } }
        @keyframes pip-eq-3 { 0% { height: 4px; } 100% { height: 10px; } }
        .track-meta {
          display: flex;
          align-items: center;
          gap: 4px;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .track-title {
          font-weight: 600;
          color: #f1f5f9;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .track-sep {
          color: #64748b;
          font-size: 9px;
          flex-shrink: 0;
        }
        .track-artist {
          color: #94a3b8;
          font-weight: 400;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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

      const initialShowSpotify = false;

      const focusTracksList = [
        ...userPlaylistsRef.current.map((pl) => ({
          name: pl.name,
          artist: pl.ownerName || "Your Playlist",
          uri: pl.uri,
          type: "playlist" as const,
        })),
        ...CURATED_FOCUS_PLAYLISTS.filter(
          (c) => !userPlaylistsRef.current.some((u) => u.uri === c.uri)
        ).map((pl) => ({
          name: pl.name,
          artist: pl.ownerName,
          uri: pl.uri,
          type: "playlist" as const,
        })),
        ...CURATED_FOCUS_TRACKS.slice(0, 5).map((tr) => ({
          name: tr.title,
          artist: `${tr.artist}${tr.category ? ` • ${tr.category}` : ""}`,
          uri: tr.uri,
          type: "track" as const,
        })),
      ];

      const activeUri =
        (currentTrackRef.current?.uri && currentTrackRef.current.uri.startsWith("spotify:"))
          ? currentTrackRef.current.uri
          : spotifyPrefsRef.current?.lastPlayedTrackUri || spotifyPrefsRef.current?.selectedPlaylistUri;

      const trackListHtml = focusTracksList
        .map((item) => {
          const isActive = activeUri && (activeUri === item.uri || activeUri.includes(item.uri));
          return `
            <div class="spotify-track-item ${isActive ? "active" : ""}" data-uri="${item.uri}" data-name="${item.name}" data-artist="${item.artist}">
              <div class="spotify-item-icon">${item.type === "track" ? "♪" : "♫"}</div>
              <div class="spotify-item-info">
                <div class="spotify-item-name">${item.name}</div>
                <div class="spotify-item-sub">${item.artist}</div>
              </div>
              ${isActive ? '<span style="color: #1DB954; font-size: 9px; margin-right: 2px;">▶</span>' : ""}
            </div>
          `;
        })
        .join("");

      container.innerHTML = `
        <div class="header">
          <div class="mode-wrap">
            <span class="mode-dot"></span>
            <span id="pip-mode" class="mode-title" style="color: ${activeColor};">${simpleMode}</span>
            <span id="pip-compact-time" class="compact-time" style="display: ${initialShowSpotify ? "inline-block" : "none"};">${formatTime(secondsLeft)}</span>
          </div>
          <div class="meta-wrap">
            <button id="pip-player-toggle" type="button" class="player-toggle-btn" title="Toggle Spotify Player">
              <span id="pip-player-icon" style="font-size: 10px;">${initialShowSpotify ? "⏱" : "♫"}</span>
              <span id="pip-player-label">${initialShowSpotify ? "Timer" : "Spotify"}</span>
            </button>
            <button id="pip-view-toggle" type="button" class="view-type ${isVisual ? "" : "timer"}" title="Toggle Focus View" style="display: ${initialShowSpotify ? "none" : "inline-flex"}; color: ${holidayTheme ? holidayTheme.accentColor : isGarden ? "#34d399" : "#64748b"};">
              <span id="pip-view-icon" style="display: inline-flex; align-items: center;">
                ${viewIcon}
              </span>
              <span id="pip-view-label">${viewLabel}</span>
            </button>
            <span class="meta-sep">•</span>
            <span id="pip-cycle" class="cycle-info">${cycle}/${totalCycles}</span>
          </div>
        </div>

        <div id="pip-anchor" class="anchor-text" style="display: ${anchor && !initialShowSpotify ? "flex" : "none"};">
          <svg class="anchor-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="6"/>
            <circle cx="12" cy="12" r="2"/>
          </svg>
          <span id="pip-anchor-val" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${anchor}</span>
        </div>

        <div id="pip-timer-view" class="timer-wrap" style="display: ${initialShowSpotify ? "none" : isVisual ? "none" : "flex"};">
          <div id="pip-time" class="timer-digits">${formatTime(secondsLeft)}</div>
        </div>

        <div id="pip-garden-view" class="garden-wrap" style="display: ${initialShowSpotify ? "none" : isVisual ? "flex" : "none"};">
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

        <!-- SPOTIFY REMOTE CONTROL CARD & TRACK SELECTOR -->
        <div id="pip-spotify-container" class="spotify-container" style="display: ${initialShowSpotify ? "flex" : "none"};">
          <div class="spotify-card-top">
            <div class="spotify-card-art-wrap">
              <img id="pip-card-art" src="${currentTrack?.artworkUrl || ""}" alt="Album Art" style="display: ${currentTrack?.artworkUrl ? "block" : "none"}; width: 36px; height: 36px; border-radius: 6px; object-fit: cover;" />
              <div id="pip-card-art-fallback" style="display: ${currentTrack?.artworkUrl ? "none" : "flex"}; width: 36px; height: 36px; border-radius: 6px; background: rgba(29, 185, 84, 0.15); color: #1DB954; align-items: center; justify-content: center; font-size: 16px;">♫</div>
            </div>
            <div class="spotify-card-details">
              <div id="pip-card-title" class="spotify-card-title">${currentTrack?.title || spotifyPrefsRef.current?.selectedPlaylistName || "Deep Focus"}</div>
              <div id="pip-card-artist" class="spotify-card-artist">${currentTrack?.artist || "Spotify Focus"}</div>
            </div>
            <div class="spotify-mini-controls">
              <button id="pip-card-prev" type="button" class="spotify-ctrl-btn" title="Previous Track">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" stroke-width="2.5"/></svg>
              </button>
              <button id="pip-card-toggle" type="button" class="spotify-play-btn" title="Play / Pause">
                ${currentTrack?.isPlaying
                  ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>'
                  : '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="margin-left: 1px;"><polygon points="6 4 19 12 6 20 6 4"/></svg>'}
              </button>
              <button id="pip-card-next" type="button" class="spotify-ctrl-btn" title="Next Track">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="2.5"/></svg>
              </button>
            </div>
          </div>

          <div class="spotify-track-list-section">
            <div class="spotify-section-header">
              <span>Select Focus Track or Playlist</span>
              <span class="spotify-track-count">${focusTracksList.length} items</span>
            </div>
            <div id="pip-spotify-track-list" class="spotify-track-list">
              ${trackListHtml}
            </div>
          </div>

          <div class="spotify-card-footer">
            <button id="pip-card-back" type="button" class="spotify-back-btn">← Back to Timer</button>
            <button id="pip-card-switch" type="button" class="spotify-switch-btn" title="Open full player in web app">Full Player ↗</button>
          </div>
        </div>

        <div id="pip-track-row" class="track-row" style="display: ${!initialShowSpotify && currentTrack?.title ? "flex" : "none"};">
          <div id="pip-track-icon" class="track-icon ${currentTrack?.isPlaying ? "playing" : ""}">
            <span class="eq-bar eq-bar-1"></span>
            <span class="eq-bar eq-bar-2"></span>
            <span class="eq-bar eq-bar-3"></span>
          </div>
          <div class="track-meta">
            <span id="pip-track-title" class="track-title">${currentTrack?.title || ""}</span>
            <span id="pip-track-sep" class="track-sep">•</span>
            <span id="pip-track-artist" class="track-artist">${currentTrack?.artist || ""}</span>
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
      let isSpotifyView = initialShowSpotify;
      const setSpotifyViewActive = (active: boolean) => {
        isSpotifyView = active;
        const spotifyContainer = pipDoc.getElementById("pip-spotify-container");
        const timerView = pipDoc.getElementById("pip-timer-view");
        const gardenView = pipDoc.getElementById("pip-garden-view");
        const trackRow = pipDoc.getElementById("pip-track-row");
        const compactTime = pipDoc.getElementById("pip-compact-time");
        const viewToggle = pipDoc.getElementById("pip-view-toggle");
        const anchorEl = pipDoc.getElementById("pip-anchor");
        const playerToggleBtn = pipDoc.getElementById("pip-player-toggle");

        const isCurrentVisual = resolvedVisualModeRef.current === "garden" || Boolean(resolvedVisualModeRef.current && resolvedVisualModeRef.current in HOLIDAY_THEMES);

        if (isSpotifyView) {
          if (spotifyContainer) spotifyContainer.style.display = "flex";
          if (timerView) timerView.style.display = "none";
          if (gardenView) gardenView.style.display = "none";
          if (trackRow) trackRow.style.display = "none";
          if (compactTime) compactTime.style.display = "inline-block";
          if (viewToggle) viewToggle.style.display = "none";
          if (anchorEl) anchorEl.style.display = "none";
          if (playerToggleBtn) {
            playerToggleBtn.title = "Switch to Timer View";
            playerToggleBtn.innerHTML = '<span style="font-size: 10px;">⏱</span> <span id="pip-player-label">Timer</span>';
          }
        } else {
          if (spotifyContainer) spotifyContainer.style.display = "none";
          if (timerView) timerView.style.display = isCurrentVisual ? "none" : "flex";
          if (gardenView) gardenView.style.display = isCurrentVisual ? "flex" : "none";
          if (trackRow) {
            const track = currentTrackRef.current;
            trackRow.style.display = track?.title ? "flex" : "none";
          }
          if (compactTime) compactTime.style.display = "none";
          if (viewToggle) viewToggle.style.display = "inline-flex";
          const anchorText = typeof window !== "undefined" ? localStorage.getItem("dnd_primary_anchor") || localStorage.getItem("dnd_session_intent") || "" : "";
          if (anchorEl) anchorEl.style.display = anchorText ? "flex" : "none";
          if (playerToggleBtn) {
            playerToggleBtn.title = "Open Spotify Player";
            playerToggleBtn.innerHTML = '<span style="font-size: 10px;">♫</span> <span id="pip-player-label">Spotify</span>';
          }
        }
      };

      const playerToggleBtn = pipDoc.getElementById("pip-player-toggle");
      if (playerToggleBtn) {
        playerToggleBtn.onclick = (e) => {
          e.preventDefault();
          setSpotifyViewActive(!isSpotifyView);
        };
      }

      const cardBackBtn = pipDoc.getElementById("pip-card-back");
      if (cardBackBtn) {
        cardBackBtn.onclick = (e) => {
          e.preventDefault();
          setSpotifyViewActive(false);
        };
      }

      // Track item selection
      const trackItems = pipDoc.querySelectorAll(".spotify-track-item");
      trackItems.forEach((el) => {
        el.addEventListener("click", () => {
          const uri = el.getAttribute("data-uri");
          const name = el.getAttribute("data-name") || "Spotify Track";
          const artist = el.getAttribute("data-artist") || "Spotify Focus";
          if (!uri) return;

          if (uri.startsWith("spotify:track:")) {
            saveStoredSpotifyPreferences({
              audioSource: "spotify",
              lastPlayedTrackUri: uri,
            });
          } else {
            saveStoredSpotifyPreferences({
              selectedPlaylistUri: uri,
              selectedPlaylistName: name,
              selectedPlaylistOwner: artist,
              audioSource: "spotify",
              lastPlayedTrackUri: null,
            });
          }

          sendSpotifyCommand("play", uri);

          setCurrentPlayingTrack({
            title: name,
            artist: artist,
            source: "spotify",
            isPlaying: true,
            uri: uri,
          });

          trackItems.forEach((t) => t.classList.remove("active"));
          el.classList.add("active");

          const cardTitleEl = pipDoc.getElementById("pip-card-title");
          if (cardTitleEl) cardTitleEl.textContent = name;
          const cardArtistEl = pipDoc.getElementById("pip-card-artist");
          if (cardArtistEl) cardArtistEl.textContent = artist;
          const cardToggleBtn = pipDoc.getElementById("pip-card-toggle");
          if (cardToggleBtn) {
            cardToggleBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
          }
          const trackIcon = pipDoc.getElementById("pip-track-icon");
          if (trackIcon) trackIcon.classList.add("playing");
        });
      });

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
          handlePlayToggle();
        };
      }

      const skipBtn = pipDoc.getElementById("pip-skip-btn");
      if (skipBtn) {
        skipBtn.onclick = (e) => {
          e.preventDefault();
          handleSkip();
        };
      }

      const appBtn = pipDoc.getElementById("pip-app-btn");
      if (appBtn) {
        appBtn.onclick = (e) => {
          e.preventDefault();
          window.focus();
        };
      }

      const cardPrevBtn = pipDoc.getElementById("pip-card-prev");
      if (cardPrevBtn) {
        cardPrevBtn.onclick = (e) => {
          e.preventDefault();
          sendSpotifyCommand("prev");
        };
      }

      const cardToggleBtn = pipDoc.getElementById("pip-card-toggle");
      if (cardToggleBtn) {
        cardToggleBtn.onclick = (e) => {
          e.preventDefault();
          sendSpotifyCommand("toggle");
        };
      }

      const cardNextBtn = pipDoc.getElementById("pip-card-next");
      if (cardNextBtn) {
        cardNextBtn.onclick = (e) => {
          e.preventDefault();
          sendSpotifyCommand("next");
        };
      }

      const cardSwitchBtn = pipDoc.getElementById("pip-card-switch");
      if (cardSwitchBtn) {
        cardSwitchBtn.onclick = (e) => {
          e.preventDefault();
          window.focus();
          window.dispatchEvent(new CustomEvent(OPEN_SPOTIFY_WIDGET_EVENT));
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
    currentTrack,
    spotifyPrefs,
    handlePlayToggle,
    handleSkip,
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
