"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  SESSION_REWARD_EVENT,
} from "../../lib/gamification/gamification-store";
import { SessionRewardSummary } from "../../lib/gamification/types";
import { useCloseOnEscape } from "../../lib/overlays/use-close-on-escape";

export default function SessionRewardModal() {
  const [reward, setReward] = useState<SessionRewardSummary | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [progressWidth, setProgressWidth] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const handleReward = (e: CustomEvent<SessionRewardSummary>) => {
      if (e.detail) {
        setReward(e.detail);
        setIsOpen(true);
      }
    };

    window.addEventListener(SESSION_REWARD_EVENT as any, handleReward);
    return () => {
      window.removeEventListener(SESSION_REWARD_EVENT as any, handleReward);
    };
  }, []);

  // Animate progress bar once opened
  useEffect(() => {
    if (isOpen && reward) {
      const prevPercent = Math.min(
        100,
        Math.round((reward.previousXp / reward.nextLevelXp) * 100)
      );
      const targetPercent = Math.min(
        100,
        Math.round((reward.currentXp / reward.nextLevelXp) * 100)
      );

      setProgressWidth(prevPercent);
      const timer = setTimeout(() => {
        setProgressWidth(targetPercent);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [isOpen, reward]);

  // Subtle sparkle particles on celebration
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    const width = (canvas.width = canvas.offsetWidth);
    const height = (canvas.height = canvas.offsetHeight);

    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      alpha: number;
      decay: number;
    }[] = [];

    const colors = ["#10b981", "#14b8a6", "#38bdf8", "#fbbf24"];

    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2.5 + 1;
      particles.push({
        x: width / 2,
        y: height / 2 - 30,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        radius: Math.random() * 2 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.9,
        decay: Math.random() * 0.015 + 0.008,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      let active = 0;
      for (const p of particles) {
        if (p.alpha <= 0) continue;
        active++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.03;
        p.alpha -= p.decay;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (active > 0) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isOpen]);

  // Escape closes the reward modal (global close-all-overlays event)
  useCloseOnEscape(isOpen, () => {
    setIsOpen(false);
    try {
      localStorage.removeItem("dnd_latest_session_reward");
    } catch {
      // ignore
    }
  });

  if (!isOpen || !reward) return null;

  const handleClose = () => {
    setIsOpen(false);
    try {
      localStorage.removeItem("dnd_latest_session_reward");
    } catch {
      // ignore
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-slate-700/60 bg-[#0f172a] text-[#f1f5f9] shadow-2xl animate-pop-in no-scrollbar">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none w-full h-full z-0"
        />

        <div className="relative z-10 p-6 md:p-7 space-y-5">
          {/* Header - Friendly & natural without tag pills */}
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-white">
              Great focus session
            </h2>
            <p className="text-xs text-slate-400">
              Your focus was logged and your habit streak is active.
            </p>
          </div>

          {/* Key metrics overview */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-900/90 border border-slate-800">
            <div>
              <span className="text-xs text-slate-400">Focus earned</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-bold text-emerald-400">
                  +{reward.earnedXp}
                </span>
                <span className="text-xs text-slate-400 font-medium">XP</span>
              </div>
            </div>

            <div className="border-l border-slate-800 pl-3">
              <span className="text-xs text-slate-400">Current habit</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <svg className="w-4 h-4 text-amber-400 fill-amber-400" viewBox="0 0 24 24">
                  <path d="M12 2c-.3 0-.6.1-.8.4C9.5 4.6 7 8.2 7 12c0 3.9 3.1 7 7 7s7-3.1 7-7c0-2.4-1.2-4.6-2.5-6.2-.3-.4-.9-.5-1.3-.2-.4.3-.5.9-.2 1.3C18 8.3 19 10 19 12c0 2.8-2.2 5-5 5s-5-2.2-5-5c0-2.6 1.7-5.3 3.5-7.3.3-.4.3-.9 0-1.3-.3-.3-.7-.4-1-.4z" />
                </svg>
                <span className="text-sm font-semibold text-white">
                  {reward.streak} day streak
                </span>
              </div>
            </div>
          </div>

          {/* Level Progress */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">
                Level {reward.newLevel} • {reward.levelTitle}
              </span>
              <span className="text-slate-400 font-mono text-[11px]">
                {reward.currentXp} / {reward.nextLevelXp} XP
              </span>
            </div>

            <div className="w-full h-2 rounded bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-700 ease-out rounded"
                style={{ width: `${progressWidth}%` }}
              />
            </div>

            {reward.leveledUp && (
              <p className="text-xs text-amber-300 font-medium pt-0.5">
                Level Up! You attained <strong>{reward.levelTitle}</strong>.
              </p>
            )}
          </div>

          {/* Session points breakdown */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-300">Session details</h3>
            <div className="space-y-1.5">
              {reward.breakdown.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-1 text-xs text-slate-300 border-b border-slate-800/60 last:border-0"
                >
                  <span>{item.label}</span>
                  <span className="font-medium text-emerald-400 font-mono">
                    +{item.xp} XP
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Milestone Unlocks */}
          {reward.newAchievements.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/20 space-y-2">
              <span className="text-xs font-semibold text-amber-300">
                Milestone reached
              </span>
              {reward.newAchievements.map((ach) => (
                <div key={ach.id} className="text-xs">
                  <p className="font-semibold text-white">{ach.title}</p>
                  <p className="text-slate-400 mt-0.5">{ach.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* Primary Action Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="w-full py-2.5 px-4 rounded-xl font-medium text-sm bg-emerald-600 hover:bg-emerald-500 micro-button active:scale-[0.98] hover:shadow-lg text-white transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
