"use client";

import React from "react";
import { useTimer } from "../../context/timer-context";

interface ZenGardenProps {
  size?: number;
  className?: string;
  showStatusText?: boolean;
}

export default function ZenGardenWidget({
  size = 220,
  className = "",
  showStatusText = true,
}: ZenGardenProps) {
  const { mode, secondsLeft, totalSeconds, isRunning, activeColor } = useTimer();

  // Progress from 0 (start) to 1 (complete)
  const progress = totalSeconds > 0 ? Math.max(0, Math.min(1, (totalSeconds - secondsLeft) / totalSeconds)) : 0;

  // Stages of growth (1 to 5)
  const growthStage = Math.min(5, Math.floor(progress * 5) + 1);

  // Growth thresholds
  const hasSprout = progress > 0.05;
  const hasBranches = progress > 0.25;
  const hasFoliage = progress > 0.5;
  const hasBlossoms = progress > 0.75;
  const isFullBloom = progress >= 0.98;

  // Blossom scale based on late progress
  const blossomScale = progress > 0.6 ? Math.min(1, (progress - 0.6) / 0.35) : 0;

  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`}>
      {/* SVG Canvas for Zen Bonsai & Garden */}
      <div className="relative flex items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox="0 0 200 200"
          className="transition-transform duration-700 ease-out max-w-full h-auto"
        >
          {/* Subtle Zen Sand Patterns (Raked Zen Rock Circles) */}
          <circle
            cx="100"
            cy="165"
            r="70"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.8"
            className="text-slate-300 dark:text-slate-800 opacity-60"
            strokeDasharray="4 3"
          />
          <circle
            cx="100"
            cy="165"
            r="55"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.8"
            className="text-slate-300 dark:text-slate-800 opacity-60"
            strokeDasharray="3 3"
          />

          {/* Protective Zen Shield Halo (Glows when running) */}
          {isRunning && mode === "focus" && (
            <circle
              cx="100"
              cy="105"
              r="68"
              fill="none"
              stroke={activeColor}
              strokeWidth="1.5"
              strokeDasharray="6 4"
              className="animate-spin opacity-40 transition-colors duration-500"
              style={{ animationDuration: "35s" }}
            />
          )}

          {/* Bonsai Ceramic Pot / Planter */}
          <g className="transition-colors">
            {/* Pot Base */}
            <path
              d="M 68 152 L 132 152 L 126 168 L 74 168 Z"
              className="fill-slate-700 dark:fill-slate-800 stroke-slate-600 dark:stroke-slate-700"
              strokeWidth="1.5"
            />
            {/* Pot Rim */}
            <rect
              x="64"
              y="149"
              width="72"
              height="4"
              rx="2"
              className="fill-slate-600 dark:fill-slate-700"
            />
            {/* Soil */}
            <ellipse
              cx="100"
              cy="151"
              rx="32"
              ry="3"
              className="fill-amber-900/60 dark:fill-stone-900"
            />
            {/* Small Zen Stones on Soil */}
            <circle cx="82" cy="150" r="2.5" className="fill-slate-400 dark:fill-slate-600" />
            <circle cx="118" cy="151" r="3.2" className="fill-slate-500 dark:fill-slate-500" />
            <circle cx="90" cy="152" r="2" className="fill-slate-400 dark:fill-slate-600" />
          </g>

          {/* Bonsai Trunk (Grows upwards smoothly) */}
          <path
            d="M 98 150 Q 94 135 101 120 T 96 95 T 100 80"
            fill="none"
            stroke="#78350f" // Amber-900 wood
            strokeWidth="5"
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />

          {/* Primary Left Branch */}
          {hasBranches && (
            <path
              d="M 98 122 Q 85 115 76 108"
              fill="none"
              stroke="#78350f"
              strokeWidth="3.2"
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          )}

          {/* Secondary Right Branch */}
          {hasBranches && (
            <path
              d="M 98 110 Q 112 104 125 98"
              fill="none"
              stroke="#78350f"
              strokeWidth="2.8"
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          )}

          {/* Tertiary Top Branch */}
          {hasBranches && (
            <path
              d="M 97 92 Q 88 84 82 78"
              fill="none"
              stroke="#78350f"
              strokeWidth="2.2"
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          )}

          {/* Foliage Clouds (Serene Pine Needle Tufts) */}
          {hasFoliage && (
            <g className="transition-all duration-700">
              {/* Left Foliage Pad */}
              <ellipse
                cx="74"
                cy="104"
                rx={12 * Math.min(1, progress * 1.5)}
                ry={7 * Math.min(1, progress * 1.5)}
                className="fill-emerald-600/80 dark:fill-emerald-500/80 transition-all duration-500"
              />
              <ellipse
                cx="71"
                cy="101"
                rx="8"
                ry="5"
                className="fill-teal-500/90 dark:fill-teal-400/90"
              />

              {/* Right Foliage Pad */}
              <ellipse
                cx="126"
                cy="95"
                rx={14 * Math.min(1, progress * 1.4)}
                ry={8 * Math.min(1, progress * 1.4)}
                className="fill-emerald-600/80 dark:fill-emerald-500/80 transition-all duration-500"
              />
              <ellipse
                cx="129"
                cy="92"
                rx="9"
                ry="5"
                className="fill-teal-500/90 dark:fill-teal-400/90"
              />

              {/* Top Canopy Pad */}
              <ellipse
                cx="98"
                cy="75"
                rx={17 * Math.min(1, progress * 1.3)}
                ry={10 * Math.min(1, progress * 1.3)}
                className="fill-emerald-700/80 dark:fill-emerald-600/80 transition-all duration-500"
              />
              <ellipse
                cx="97"
                cy="71"
                rx="12"
                ry="7"
                className="fill-emerald-500/90 dark:fill-teal-400/90"
              />

              {/* Left Top Sub-pad */}
              <ellipse
                cx="81"
                cy="77"
                rx="9"
                ry="5"
                className="fill-teal-600/80 dark:fill-teal-500/80"
              />
            </g>
          )}

          {/* Blooming Serene Sakura Petals & Flowers */}
          {hasBlossoms && blossomScale > 0 && (
            <g
              className="transition-all duration-500"
              style={{ transformOrigin: "100px 90px" }}
            >
              {/* Petal 1 (Top Left) */}
              <circle
                cx="67"
                cy="98"
                r={2.8 * blossomScale}
                className="fill-rose-300 dark:fill-rose-400 animate-pulse"
              />
              {/* Petal 2 (Right Center) */}
              <circle
                cx="135"
                cy="90"
                r={3 * blossomScale}
                className="fill-amber-300 dark:fill-amber-300"
              />
              {/* Petal 3 (Canopy Crown) */}
              <circle
                cx="98"
                cy="64"
                r={3.2 * blossomScale}
                className="fill-rose-300 dark:fill-rose-300"
              />
              {/* Petal 4 (Left Upper) */}
              <circle
                cx="88"
                cy="72"
                r={2.4 * blossomScale}
                className="fill-pink-300 dark:fill-pink-400"
              />
              {/* Petal 5 (Right Lower) */}
              <circle
                cx="120"
                cy="100"
                r={2.5 * blossomScale}
                className="fill-rose-200 dark:fill-rose-300"
              />
            </g>
          )}

          {/* Golden Aura in Full Bloom */}
          {isFullBloom && (
            <circle
              cx="100"
              cy="90"
              r="45"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="1.2"
              strokeDasharray="2 4"
              className="animate-spin opacity-50"
              style={{ animationDuration: "20s" }}
            />
          )}
        </svg>
      </div>

      {/* Growth Stage Description */}
      {showStatusText && (
        <div className="text-center mt-1 space-y-0.5">
          <p className="text-xs font-semibold text-[#0f172a] dark:text-[#f8fafc] flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span>
              {isFullBloom
                ? "Zen Sanctuary in Full Bloom"
                : hasBlossoms
                ? "Buds Flowering"
                : hasFoliage
                ? "Canopy Flourishing"
                : hasBranches
                ? "Cultivating Branches"
                : "Seeding Flow"}
            </span>
          </p>
          <p className="text-[10px] text-[#64748b] dark:text-[#94a3b8]">
            {Math.round(progress * 100)}% nurtured • Step {growthStage} of 5
          </p>
        </div>
      )}
    </div>
  );
}
