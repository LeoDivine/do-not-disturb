"use client";

import React from "react";
import { useTimer } from "../../context/timer-context";
import { HolidayId, HOLIDAY_THEMES } from "./holiday-themes";

interface HolidayVisualizerProps {
  holidayId: HolidayId;
  size?: number;
  className?: string;
  showStatusText?: boolean;
}

export default function HolidayVisualizer({
  holidayId,
  size = 220,
  className = "",
  showStatusText = true,
}: HolidayVisualizerProps) {
  const { mode, secondsLeft, totalSeconds, isRunning, activeColor } = useTimer();
  const theme = HOLIDAY_THEMES[holidayId] || HOLIDAY_THEMES.halloween;

  // Session progress from 0 to 1
  const progress = totalSeconds > 0 ? Math.max(0, Math.min(1, (totalSeconds - secondsLeft) / totalSeconds)) : 0;
  const stageIndex = Math.min(4, Math.floor(progress * 5));
  const currentStageText = theme.stages[stageIndex];
  const isComplete = progress >= 0.98;

  // Reusable progress scaling factors
  const p1 = Math.min(1, progress * 4); // 0 to 0.25
  const p2 = Math.min(1, Math.max(0, (progress - 0.2) * 3.33)); // 0.2 to 0.5
  const p3 = Math.min(1, Math.max(0, (progress - 0.45) * 3.33)); // 0.45 to 0.75
  const p4 = Math.min(1, Math.max(0, (progress - 0.7) * 3.33)); // 0.7 to 1.0

  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`}>
      <div className="relative flex items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox="0 0 200 200"
          className="transition-transform duration-700 ease-out max-w-full h-auto"
        >
          {/* Subtle Outer Focus Track */}
          <circle
            cx="100"
            cy="100"
            r="88"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.8"
            className="text-slate-300 dark:text-slate-800 opacity-40"
            strokeDasharray="4 4"
          />

          {/* Running Aura Halo */}
          {isRunning && mode === "focus" && (
            <circle
              cx="100"
              cy="100"
              r="84"
              fill="none"
              stroke={theme.accentColor}
              strokeWidth="1.5"
              strokeDasharray="6 4"
              className="animate-spin opacity-40 transition-colors duration-500"
              style={{ animationDuration: "35s" }}
            />
          )}

          {/* HOLIDAY SPECIFIC SCENE */}
          {renderHolidayScene(holidayId, progress, p1, p2, p3, p4, isComplete, theme)}

          {/* Golden Celebration Radiance on 100% completion */}
          {isComplete && (
            <g className="animate-pulse">
              <circle
                cx="100"
                cy="100"
                r="72"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                className="opacity-70 animate-spin"
                style={{ animationDuration: "20s" }}
              />
              <circle cx="45" cy="45" r="2" fill="#fbbf24" />
              <circle cx="155" cy="45" r="2" fill="#fbbf24" />
              <circle cx="160" cy="150" r="2.5" fill="#fbbf24" />
              <circle cx="40" cy="150" r="2.5" fill="#fbbf24" />
            </g>
          )}
        </svg>
      </div>

      {/* Stage Description & Status */}
      {showStatusText && (
        <div className="text-center mt-1 space-y-0.5">
          <p className="text-xs font-semibold text-[#0f172a] dark:text-[#f8fafc] flex items-center justify-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full animate-ping"
              style={{ backgroundColor: theme.accentColor }}
            />
            <span>{isComplete ? theme.completionTitle : currentStageText}</span>
          </p>
          <p className="text-[10px] text-[#64748b] dark:text-[#94a3b8]">
            {Math.round(progress * 100)}% nurtured • Step {stageIndex + 1} of 5
          </p>
        </div>
      )}
    </div>
  );
}

function renderHolidayScene(
  holiday: HolidayId,
  progress: number,
  p1: number,
  p2: number,
  p3: number,
  p4: number,
  isComplete: boolean,
  theme: typeof HOLIDAY_THEMES[HolidayId]
) {
  switch (holiday) {
    case "halloween":
      return (
        <g>
          {/* Spooky Harvest Moon */}
          <circle cx="150" cy="50" r="24" fill="#fed7aa" opacity="0.3" />
          <circle cx="144" cy="46" r="20" fill="#0b0f17" opacity="0.4" />

          {/* Autumn Patch Soil & Vine */}
          <ellipse cx="100" cy="162" rx="65" ry="12" fill="#1e293b" opacity="0.6" />
          <path
            d="M 60 160 Q 80 148 100 152 T 140 160"
            fill="none"
            stroke="#166534"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Growing Pumpkin Body */}
          <g transform={`translate(100, 130) scale(${0.4 + p1 * 0.3 + p2 * 0.3}) translate(-100, -130)`}>
            {/* Pumpkin Segments */}
            <ellipse cx="76" cy="132" rx="22" ry="28" fill="#ea580c" />
            <ellipse cx="124" cy="132" rx="22" ry="28" fill="#ea580c" />
            <ellipse cx="88" cy="132" rx="24" ry="31" fill="#f97316" />
            <ellipse cx="112" cy="132" rx="24" ry="31" fill="#f97316" />
            <ellipse cx="100" cy="132" rx="24" ry="33" fill="#fb923c" />

            {/* Stem */}
            <path
              d="M 98 102 C 95 90 108 85 106 80"
              fill="none"
              stroke="#15803d"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>

          {/* Glowing Carved Jack-o'-Lantern Face (Appears at Stage 3+) */}
          {progress > 0.45 && (
            <g
              opacity={p3}
              style={{
                filter: "drop-shadow(0 0 6px rgba(251, 146, 60, 0.8))",
              }}
            >
              {/* Left Eye */}
              <polygon points="85,120 95,128 85,130" fill="#fef08a" />
              {/* Right Eye */}
              <polygon points="115,120 105,128 115,130" fill="#fef08a" />
              {/* Nose */}
              <polygon points="100,128 96,135 104,135" fill="#fef08a" />
              {/* Grin with Teeth */}
              <path
                d="M 80 142 Q 100 160 120 142 L 115 145 L 110 142 L 105 146 L 100 142 L 95 146 L 90 142 L 85 145 Z"
                fill="#fef08a"
              />
            </g>
          )}

          {/* Floating Friendly Spirit / Ghost (Stage 4+) */}
          {progress > 0.65 && (
            <g
              transform="translate(135, 75)"
              opacity={p4}
              className="animate-bounce"
              style={{ animationDuration: "3s" }}
            >
              <path
                d="M 0 -16 C -10 -16 -12 -5 -12 6 C -12 14 -8 18 0 16 C 8 18 12 14 12 6 C 12 -5 10 -16 0 -16 Z"
                fill="#f8fafc"
                opacity="0.85"
              />
              <circle cx="-4" cy="-2" r="1.5" fill="#0f172a" />
              <circle cx="4" cy="-2" r="1.5" fill="#0f172a" />
              <ellipse cx="0" cy="4" rx="2" ry="3" fill="#0f172a" />
            </g>
          )}
        </g>
      );

    case "christmas":
      return (
        <g>
          {/* Snowy Floor Base */}
          <ellipse cx="100" cy="168" rx="68" ry="14" fill="#e2e8f0" opacity="0.35" />
          <ellipse cx="100" cy="165" rx="54" ry="8" fill="#f8fafc" opacity="0.6" />

          {/* Tree Trunk */}
          <rect x="94" y="146" width="12" height="18" rx="2" fill="#78350f" />

          {/* Growing Pine Tree Tiers */}
          {/* Bottom Tier */}
          <polygon
            points="100,95 55,148 145,148"
            fill="#065f46"
            transform={`translate(100, 148) scale(${0.3 + p1 * 0.7}) translate(-100, -148)`}
          />
          <polygon
            points="100,95 62,148 138,148"
            fill="#047857"
            transform={`translate(100, 148) scale(${0.3 + p1 * 0.7}) translate(-100, -148)`}
          />

          {/* Middle Tier */}
          {progress > 0.2 && (
            <g transform={`translate(100, 120) scale(${p2}) translate(-100, -120)`}>
              <polygon points="100,72 65,120 135,120" fill="#047857" />
              <polygon points="100,72 72,120 128,120" fill="#059669" />
            </g>
          )}

          {/* Top Tier */}
          {progress > 0.4 && (
            <g transform={`translate(100, 95) scale(${p3}) translate(-100, -95)`}>
              <polygon points="100,50 75,95 125,95" fill="#059669" />
              <polygon points="100,50 82,95 118,95" fill="#10b981" />
            </g>
          )}

          {/* Twinkling Garland Ribbon (Stage 3+) */}
          {progress > 0.55 && (
            <path
              d="M 85 85 Q 100 95 115 88 Q 80 115 128 114 Q 70 142 135 140"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2"
              strokeDasharray="3 3"
              opacity={p3}
              className="animate-pulse"
            />
          )}

          {/* Festive Bauble Ornaments (Stage 4+) */}
          {progress > 0.65 && (
            <g opacity={p4}>
              <circle cx="85" cy="112" r="3.5" fill="#ef4444" />
              <circle cx="115" cy="115" r="3.5" fill="#38bdf8" />
              <circle cx="95" cy="90" r="3" fill="#eab308" />
              <circle cx="106" cy="135" r="4" fill="#ec4899" />
              <circle cx="78" cy="140" r="3.5" fill="#a855f7" />
              <circle cx="125" cy="138" r="3.5" fill="#ef4444" />
            </g>
          )}

          {/* Wrapped Presents Under Tree (Stage 4+) */}
          {progress > 0.75 && (
            <g opacity={p4}>
              {/* Box 1 (Red) */}
              <rect x="68" y="148" width="15" height="14" rx="2" fill="#ef4444" />
              <line x1="75.5" y1="148" x2="75.5" y2="162" stroke="#fef08a" strokeWidth="2" />
              <line x1="68" y1="155" x2="83" y2="155" stroke="#fef08a" strokeWidth="2" />
              {/* Box 2 (Blue) */}
              <rect x="118" y="150" width="14" height="12" rx="2" fill="#0284c7" />
              <line x1="125" y1="150" x2="125" y2="162" stroke="#ffffff" strokeWidth="1.5" />
            </g>
          )}

          {/* Shining Golden Topper Star */}
          {progress > 0.85 && (
            <g
              transform="translate(100, 48)"
              opacity={p4}
              style={{ filter: "drop-shadow(0 0 6px #facc15)" }}
            >
              <polygon
                points="0,-12 3.5,-3 12,-3 5,3 8,11 0,6 -8,11 -5,3 -12,-3 -3.5,-3"
                fill="#facc15"
              />
            </g>
          )}
        </g>
      );

    case "newyear":
      return (
        <g>
          {/* Midnight Skyline Silhouettes */}
          <rect x="35" y="140" width="22" height="35" fill="#1e293b" opacity="0.7" />
          <rect x="58" y="125" width="26" height="50" fill="#334155" opacity="0.8" />
          <rect x="85" y="110" width="30" height="65" fill="#1e293b" />
          {/* Spire */}
          <line x1="100" y1="85" x2="100" y2="110" stroke="#475569" strokeWidth="2" />
          <rect x="116" y="130" width="24" height="45" fill="#334155" opacity="0.8" />
          <rect x="141" y="145" width="24" height="30" fill="#1e293b" opacity="0.7" />

          {/* City Windows Glow */}
          <circle cx="95" cy="120" r="1.5" fill="#fef08a" opacity="0.7" />
          <circle cx="105" cy="120" r="1.5" fill="#fef08a" opacity="0.7" />
          <circle cx="95" cy="132" r="1.5" fill="#fef08a" opacity="0.7" />
          <circle cx="105" cy="132" r="1.5" fill="#fef08a" opacity="0.7" />
          <circle cx="70" cy="138" r="1.5" fill="#fef08a" opacity="0.6" />
          <circle cx="128" cy="142" r="1.5" fill="#fef08a" opacity="0.6" />

          {/* Stage 1: Ascending Rocket Trails */}
          <path
            d="M 65 140 Q 62 100 68 75"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            opacity={p1}
          />
          <path
            d="M 135 140 Q 138 95 132 65"
            fill="none"
            stroke="#f472b6"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            opacity={p1}
          />

          {/* Stage 2 & 3: Starburst Fireworks */}
          {progress > 0.25 && (
            <g transform="translate(68, 70)" opacity={p2}>
              <circle cx="0" cy="0" r={16 * p2} fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="2 4" />
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                <line
                  key={i}
                  x1="0"
                  y1="0"
                  x2={Math.cos((angle * Math.PI) / 180) * 16}
                  y2={Math.sin((angle * Math.PI) / 180) * 16}
                  stroke="#fbbf24"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              ))}
            </g>
          )}

          {progress > 0.45 && (
            <g transform="translate(132, 60)" opacity={p3}>
              <circle cx="0" cy="0" r={20 * p3} fill="none" stroke="#ec4899" strokeWidth="1.5" strokeDasharray="3 4" />
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => (
                <line
                  key={i}
                  x1="0"
                  y1="0"
                  x2={Math.cos((angle * Math.PI) / 180) * 20}
                  y2={Math.sin((angle * Math.PI) / 180) * 20}
                  stroke="#f43f5e"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              ))}
            </g>
          )}

          {/* Grand Finale Central Midnight Burst (Stage 4+) */}
          {progress > 0.7 && (
            <g
              transform="translate(100, 45)"
              opacity={p4}
              style={{ filter: "drop-shadow(0 0 10px #facc15)" }}
            >
              <circle cx="0" cy="0" r={28 * p4} fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 5" />
              <circle cx="0" cy="0" r={16 * p4} fill="none" stroke="#fbbf24" strokeWidth="2" />
              {[0, 24, 48, 72, 96, 120, 144, 168, 192, 216, 240, 264, 288, 312, 336].map((deg, i) => (
                <line
                  key={i}
                  x1="0"
                  y1="0"
                  x2={Math.cos((deg * Math.PI) / 180) * 28}
                  y2={Math.sin((deg * Math.PI) / 180) * 28}
                  stroke={i % 2 === 0 ? "#facc15" : "#38bdf8"}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              ))}
            </g>
          )}
        </g>
      );

    case "valentine":
      return (
        <g>
          {/* Decorative Ceramic Vase */}
          <ellipse cx="100" cy="165" rx="35" ry="8" fill="#1e293b" opacity="0.6" />
          <path
            d="M 85 162 Q 78 140 88 126 L 112 126 Q 122 140 115 162 Z"
            fill="#be123c"
            stroke="#9f1239"
            strokeWidth="1.5"
          />

          {/* Rose Stems Growing */}
          <path
            d="M 100 126 Q 95 105 100 80"
            fill="none"
            stroke="#15803d"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {progress > 0.2 && (
            <path
              d="M 98 115 Q 80 102 75 90"
              fill="none"
              stroke="#15803d"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          )}
          {progress > 0.3 && (
            <path
              d="M 100 110 Q 118 98 125 88"
              fill="none"
              stroke="#15803d"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          )}

          {/* Rose Blossom Left */}
          {progress > 0.4 && (
            <g transform={`translate(75, 90) scale(${p2}) translate(-75, -90)`}>
              <circle cx="75" cy="90" r="12" fill="#e11d48" />
              <circle cx="72" cy="88" r="8" fill="#f43f5e" />
              <path d="M 70 85 Q 75 92 80 87" fill="none" stroke="#ffe4e6" strokeWidth="1.5" />
            </g>
          )}

          {/* Rose Blossom Right */}
          {progress > 0.45 && (
            <g transform={`translate(125, 88) scale(${p3}) translate(-125, -88)`}>
              <circle cx="125" cy="88" r="11" fill="#be123c" />
              <circle cx="127" cy="86" r="7" fill="#fb7185" />
              <path d="M 122 84 Q 126 90 130 85" fill="none" stroke="#ffe4e6" strokeWidth="1.5" />
            </g>
          )}

          {/* Center Crown Queen Rose */}
          {progress > 0.6 && (
            <g
              transform={`translate(100, 80) scale(${p3}) translate(-100, -80)`}
              style={{ filter: "drop-shadow(0 0 6px rgba(244, 63, 94, 0.6))" }}
            >
              <circle cx="100" cy="80" r="16" fill="#e11d48" />
              <circle cx="98" cy="78" r="11" fill="#f43f5e" />
              <circle cx="100" cy="79" r="6" fill="#fda4af" />
              <path d="M 94 74 Q 100 84 106 75" fill="none" stroke="#ffe4e6" strokeWidth="1.8" />
            </g>
          )}

          {/* Floating Origami Hearts (Stage 4+) */}
          {progress > 0.75 && (
            <g opacity={p4}>
              {/* Heart 1 */}
              <path
                d="M 55 65 C 55 58 46 58 46 65 C 46 72 55 78 55 81 C 55 78 64 72 64 65 C 64 58 55 58 55 65 Z"
                fill="#f43f5e"
                className="animate-pulse"
              />
              {/* Heart 2 */}
              <path
                d="M 145 60 C 145 54 137 54 137 60 C 137 66 145 71 145 74 C 145 71 153 66 153 60 C 153 54 145 54 145 60 Z"
                fill="#fda4af"
              />
              {/* Heart 3 (Crown Top) */}
              <path
                d="M 100 48 C 100 40 88 40 88 48 C 88 56 100 64 100 68 C 100 64 112 56 112 48 C 112 40 100 40 100 48 Z"
                fill="#ec4899"
                style={{ filter: "drop-shadow(0 0 8px #f43f5e)" }}
              />
            </g>
          )}
        </g>
      );

    case "stpatricks":
      return (
        <g>
          {/* Shimmering Arching Rainbow across sky */}
          {progress > 0.4 && (
            <g opacity={p3}>
              <path d="M 40 160 A 65 65 0 0 1 160 160" fill="none" stroke="#ef4444" strokeWidth="3" opacity="0.6" />
              <path d="M 43 160 A 62 62 0 0 1 157 160" fill="none" stroke="#f97316" strokeWidth="3" opacity="0.6" />
              <path d="M 46 160 A 59 59 0 0 1 154 160" fill="none" stroke="#eab308" strokeWidth="3" opacity="0.7" />
              <path d="M 49 160 A 56 56 0 0 1 151 160" fill="none" stroke="#22c55e" strokeWidth="3" opacity="0.7" />
              <path d="M 52 160 A 53 53 0 0 1 148 160" fill="none" stroke="#06b6d4" strokeWidth="3" opacity="0.7" />
              <path d="M 55 160 A 50 50 0 0 1 145 160" fill="none" stroke="#6366f1" strokeWidth="3" opacity="0.6" />
            </g>
          )}

          {/* Rolling Emerald Hill */}
          <ellipse cx="100" cy="165" rx="65" ry="14" fill="#15803d" />
          <ellipse cx="100" cy="162" rx="55" ry="9" fill="#16a34a" />

          {/* Central Four-Leaf Clover Stem */}
          <path
            d="M 100 162 Q 95 135 100 115"
            fill="none"
            stroke="#14532d"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Four-Leaf Clover Leaves */}
          <g transform={`translate(100, 115) scale(${0.3 + p1 * 0.7}) translate(-100, -115)`}>
            {/* Top Leaf */}
            <path
              d="M 100 115 C 92 102 92 90 100 95 C 108 90 108 102 100 115 Z"
              fill="#22c55e"
            />
            {/* Right Leaf */}
            <path
              d="M 100 115 C 113 107 125 107 120 115 C 125 123 113 123 100 115 Z"
              fill="#16a34a"
            />
            {/* Bottom Leaf */}
            <path
              d="M 100 115 C 108 128 108 140 100 135 C 92 140 92 128 100 115 Z"
              fill="#22c55e"
            />
            {/* Left Leaf (The rare 4th lucky charm!) */}
            <path
              d="M 100 115 C 87 123 75 123 80 115 C 75 107 87 107 100 115 Z"
              fill="#4ade80"
            />
            <circle cx="100" cy="115" r="3" fill="#14532d" />
          </g>

          {/* Glistening Pot of Gold (Stage 4+) */}
          {progress > 0.65 && (
            <g
              transform="translate(138, 142)"
              opacity={p4}
              style={{ filter: "drop-shadow(0 0 6px #facc15)" }}
            >
              {/* Cauldron */}
              <ellipse cx="0" cy="14" rx="16" ry="4" fill="#0f172a" />
              <path d="M -14 0 Q -18 10 0 14 Q 18 10 14 0 Z" fill="#1e293b" />
              <rect x="-16" y="-2" width="32" height="4" rx="2" fill="#334155" />
              {/* Golden Coins Pile */}
              <ellipse cx="0" cy="-2" rx="13" ry="5" fill="#eab308" />
              <circle cx="-5" cy="-3" r="3" fill="#facc15" />
              <circle cx="4" cy="-4" r="3" fill="#fef08a" />
              <circle cx="0" cy="-6" r="3" fill="#facc15" />
            </g>
          )}
        </g>
      );

    case "easter":
      return (
        <g>
          {/* Spring Meadow Base */}
          <ellipse cx="100" cy="165" rx="65" ry="12" fill="#15803d" opacity="0.7" />
          <ellipse cx="100" cy="162" rx="55" ry="8" fill="#22c55e" opacity="0.8" />

          {/* Spring Flowers / Daisies */}
          <circle cx="48" cy="158" r="3" fill="#fef08a" />
          <circle cx="152" cy="156" r="3" fill="#f472b6" />

          {/* Handwoven Pastel Easter Basket */}
          <g transform={`translate(100, 140) scale(${0.5 + p1 * 0.5}) translate(-100, -140)`}>
            {/* Basket Handle */}
            <path
              d="M 65 140 A 35 45 0 0 1 135 140"
              fill="none"
              stroke="#b45309"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Basket Body */}
            <path
              d="M 60 140 Q 56 160 100 162 Q 144 160 140 140 Z"
              fill="#d97706"
              stroke="#b45309"
              strokeWidth="2"
            />
            {/* Woven Strands */}
            <line x1="75" y1="140" x2="80" y2="160" stroke="#f59e0b" strokeWidth="2" />
            <line x1="100" y1="140" x2="100" y2="162" stroke="#f59e0b" strokeWidth="2" />
            <line x1="125" y1="140" x2="120" y2="160" stroke="#f59e0b" strokeWidth="2" />
          </g>

          {/* Decorated Easter Eggs (Stage 2 & 3) */}
          {progress > 0.25 && (
            <g opacity={p2}>
              {/* Egg 1 (Lilac Striped) */}
              <ellipse cx="82" cy="132" rx="9" ry="13" fill="#c084fc" transform="rotate(-15, 82, 132)" />
              <line x1="74" y1="130" x2="90" y2="134" stroke="#ffffff" strokeWidth="2" />
              {/* Egg 2 (Cyan Polka) */}
              <ellipse cx="118" cy="132" rx="9" ry="13" fill="#38bdf8" transform="rotate(15, 118, 132)" />
              <circle cx="118" cy="128" r="2" fill="#fef08a" />
              <circle cx="115" cy="136" r="2" fill="#fef08a" />
              {/* Egg 3 (Golden Center) */}
              <ellipse cx="100" cy="125" rx="10" ry="14" fill="#fbbf24" />
              <line x1="92" y1="125" x2="108" y2="125" stroke="#f43f5e" strokeWidth="2" />
            </g>
          )}

          {/* Peeking Cute Bunny Ears (Stage 4+) */}
          {progress > 0.65 && (
            <g opacity={p4} className="animate-bounce" style={{ animationDuration: "2.5s" }}>
              {/* Left Ear */}
              <ellipse cx="90" cy="85" rx="6" ry="20" fill="#f8fafc" transform="rotate(-12, 90, 85)" />
              <ellipse cx="90" cy="85" rx="3.5" ry="15" fill="#fda4af" transform="rotate(-12, 90, 85)" />
              {/* Right Ear */}
              <ellipse cx="110" cy="85" rx="6" ry="20" fill="#f8fafc" transform="rotate(12, 110, 85)" />
              <ellipse cx="110" cy="85" rx="3.5" ry="15" fill="#fda4af" transform="rotate(12, 110, 85)" />
              {/* Bunny Head Peeking */}
              <circle cx="100" cy="106" r="14" fill="#f8fafc" />
              <circle cx="95" cy="104" r="2" fill="#0f172a" />
              <circle cx="105" cy="104" r="2" fill="#0f172a" />
              <ellipse cx="100" cy="110" rx="2" ry="1.5" fill="#f43f5e" />
            </g>
          )}

          {/* Fluttering Butterflies (Stage 4+) */}
          {progress > 0.8 && (
            <g opacity={p4}>
              <path d="M 50 90 Q 42 80 50 75 Q 58 80 50 90" fill="#ec4899" />
              <path d="M 150 90 Q 142 80 150 75 Q 158 80 150 90" fill="#38bdf8" />
            </g>
          )}
        </g>
      );

    case "thanksgiving":
      return (
        <g>
          {/* Autumn Table Runner & Falling Swirling Leaves */}
          <ellipse cx="100" cy="165" rx="65" ry="12" fill="#78350f" opacity="0.6" />

          {/* Falling Autumn Leaves */}
          <g opacity={p1}>
            <path d="M 45 70 Q 55 60 50 80 Z" fill="#d97706" />
            <path d="M 155 75 Q 145 65 150 85 Z" fill="#b91c1c" />
            <path d="M 135 110 Q 145 100 140 120 Z" fill="#f59e0b" />
          </g>

          {/* Woven Cornucopia (Horn of Plenty) */}
          <g transform={`translate(100, 140) scale(${0.5 + p1 * 0.5}) translate(-100, -140)`}>
            <path
              d="M 145 105 C 160 120 155 150 125 155 C 95 160 70 155 65 142 C 60 130 90 125 115 130 C 135 135 140 115 145 105 Z"
              fill="#92400e"
              stroke="#78350f"
              strokeWidth="2"
            />
            {/* Horn Ridges */}
            <path d="M 85 132 Q 95 156 112 152" fill="none" stroke="#b45309" strokeWidth="2" />
            <path d="M 105 130 Q 115 150 128 145" fill="none" stroke="#b45309" strokeWidth="2" />
          </g>

          {/* Harvest Bounty Overflowing (Stages 2, 3 & 4) */}
          {progress > 0.3 && (
            <g opacity={p2}>
              {/* Plump Pumpkin */}
              <ellipse cx="68" cy="142" rx="14" ry="16" fill="#ea580c" />
              <ellipse cx="68" cy="142" rx="8" ry="16" fill="#f97316" />
              <rect x="66" y="123" width="4" height="6" rx="1" fill="#15803d" />
            </g>
          )}

          {progress > 0.5 && (
            <g opacity={p3}>
              {/* Golden Corn Cob */}
              <ellipse cx="88" cy="145" rx="8" ry="14" fill="#eab308" transform="rotate(-30, 88, 145)" />
              <circle cx="86" cy="142" r="1.5" fill="#fef08a" />
              <circle cx="89" cy="146" r="1.5" fill="#fef08a" />

              {/* Red Crisp Apples */}
              <circle cx="102" cy="146" r="8" fill="#dc2626" />
              <circle cx="114" cy="148" r="7" fill="#b91c1c" />
            </g>
          )}

          {progress > 0.7 && (
            <g opacity={p4}>
              {/* Purple Grape Cluster */}
              <circle cx="96" cy="152" r="4" fill="#7e22ce" />
              <circle cx="102" cy="154" r="4" fill="#6b21a8" />
              <circle cx="108" cy="152" r="4" fill="#7e22ce" />
              <circle cx="102" cy="158" r="3.5" fill="#581c87" />

              {/* Wheat Sheaves */}
              <path d="M 52 140 Q 40 120 48 105" fill="none" stroke="#facc15" strokeWidth="2.5" />
              <circle cx="48" cy="105" r="3" fill="#fef08a" />
            </g>
          )}
        </g>
      );

    case "lunarnewyear":
      return (
        <g>
          {/* Traditional Crimson Pavilion Eaves */}
          <path
            d="M 50 62 Q 100 48 150 62 L 140 70 Q 100 58 60 70 Z"
            fill="#b91c1c"
            stroke="#eab308"
            strokeWidth="1.5"
          />

          {/* Plum Blossom Branch */}
          <path
            d="M 55 100 Q 75 85 95 82 Q 120 80 145 92"
            fill="none"
            stroke="#78350f"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Blossom Petals */}
          <circle cx="75" cy="88" r="4" fill="#fda4af" />
          <circle cx="110" cy="80" r="4" fill="#f43f5e" />
          <circle cx="135" cy="88" r="4" fill="#fda4af" />

          {/* Central Ornate Lucky Red Lantern (Stage 2+) */}
          {progress > 0.25 && (
            <g
              transform={`translate(100, 110) scale(${0.4 + p2 * 0.6}) translate(-100, -110)`}
              className="origin-top animate-pulse"
              style={{ animationDuration: "3s" }}
            >
              {/* Hanging Cord */}
              <line x1="100" y1="58" x2="100" y2="85" stroke="#eab308" strokeWidth="2" />
              {/* Lantern Cap */}
              <rect x="88" y="85" width="24" height="6" rx="2" fill="#eab308" />
              {/* Main Lantern Silk Body */}
              <ellipse cx="100" cy="112" rx="26" ry="24" fill="#dc2626" />
              <ellipse cx="100" cy="112" rx="14" ry="24" fill="#b91c1c" />
              {/* Golden Character / Trim */}
              <line x1="100" y1="92" x2="100" y2="132" stroke="#eab308" strokeWidth="2" />
              {/* Bottom Cap & Tassels */}
              <rect x="90" y="132" width="20" height="5" rx="2" fill="#eab308" />
              <line x1="95" y1="137" x2="95" y2="162" stroke="#dc2626" strokeWidth="2" />
              <line x1="100" y1="137" x2="100" y2="166" stroke="#eab308" strokeWidth="2" />
              <line x1="105" y1="137" x2="105" y2="162" stroke="#dc2626" strokeWidth="2" />
            </g>
          )}

          {/* Golden Prosperity Coins (Stage 3+) */}
          {progress > 0.55 && (
            <g opacity={p3}>
              {/* Left Coin */}
              <circle cx="62" cy="135" r="9" fill="#eab308" />
              <rect x="59" y="132" width="6" height="6" fill="#0b0f17" />
              {/* Right Coin */}
              <circle cx="138" cy="135" r="9" fill="#eab308" />
              <rect x="135" y="132" width="6" height="6" fill="#0b0f17" />
            </g>
          )}

          {/* Auspicious Firecracker Sparkles (Stage 4+) */}
          {progress > 0.75 && (
            <g
              opacity={p4}
              style={{ filter: "drop-shadow(0 0 6px #eab308)" }}
            >
              <circle cx="45" cy="120" r="2.5" fill="#facc15" />
              <circle cx="52" cy="110" r="2" fill="#ef4444" />
              <circle cx="155" cy="120" r="2.5" fill="#facc15" />
              <circle cx="148" cy="110" r="2" fill="#ef4444" />
            </g>
          )}
        </g>
      );

    case "earthday":
      return (
        <g>
          {/* Starlight Constellation Dots in Deep Space */}
          <circle cx="40" cy="45" r="1.5" fill="#94a3b8" opacity="0.6" />
          <circle cx="160" cy="40" r="1.5" fill="#94a3b8" opacity="0.6" />
          <circle cx="165" cy="150" r="1.5" fill="#94a3b8" opacity="0.6" />
          <circle cx="35" cy="155" r="1.5" fill="#94a3b8" opacity="0.6" />

          {/* Atmosphere Radiant Outer Halo */}
          <circle
            cx="100"
            cy="100"
            r="64"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2"
            opacity="0.35"
          />

          {/* Planet Earth Sphere (Ocean Blue) */}
          <circle
            cx="100"
            cy="100"
            r="56"
            fill="#0284c7"
            transform={`scale(${0.6 + p1 * 0.4})`}
            style={{ transformOrigin: "100px 100px" }}
          />

          {/* Emerging Continents (Lush Vibrant Green) */}
          {progress > 0.2 && (
            <g opacity={p2} transform={`scale(${0.6 + p1 * 0.4})`} style={{ transformOrigin: "100px 100px" }}>
              {/* Continent 1 (North-West) */}
              <path
                d="M 72 80 Q 82 72 94 76 Q 98 90 85 96 Q 74 95 72 80 Z"
                fill="#16a34a"
              />
              {/* Continent 2 (South-West) */}
              <path
                d="M 80 105 Q 92 108 90 128 Q 78 135 75 120 Z"
                fill="#15803d"
              />
              {/* Continent 3 (East Eurasia/Africa) */}
              <path
                d="M 108 75 Q 128 72 135 88 Q 130 110 115 112 Q 106 95 108 75 Z"
                fill="#16a34a"
              />
            </g>
          )}

          {/* Sprouting Ancient Forest Trees on Continents (Stage 3+) */}
          {progress > 0.45 && (
            <g opacity={p3}>
              <circle cx="84" cy="84" r="4" fill="#22c55e" />
              <circle cx="120" cy="82" r="4.5" fill="#22c55e" />
              <circle cx="85" cy="116" r="3.5" fill="#4ade80" />
            </g>
          )}

          {/* Soft Swirling White Cloud Bands (Stage 4+) */}
          {progress > 0.65 && (
            <g opacity={p4} className="animate-spin" style={{ animationDuration: "60s", transformOrigin: "100px 100px" }}>
              <path
                d="M 60 92 Q 80 86 100 95 Q 120 102 140 92"
                fill="none"
                stroke="#ffffff"
                strokeWidth="4"
                strokeLinecap="round"
                opacity="0.75"
              />
              <path
                d="M 75 118 Q 95 125 125 115"
                fill="none"
                stroke="#ffffff"
                strokeWidth="3.5"
                strokeLinecap="round"
                opacity="0.65"
              />
            </g>
          )}

          {/* Planetary Sunbeam Blessing Aura */}
          {progress > 0.85 && (
            <circle
              cx="100"
              cy="100"
              r="60"
              fill="none"
              stroke="#67e8f9"
              strokeWidth="2"
              strokeDasharray="4 6"
              className="animate-spin"
              style={{ animationDuration: "30s" }}
            />
          )}
        </g>
      );

    case "cyberpunk":
      return (
        <g>
          {/* Cyberpunk Neon Perspective Floor Grid */}
          <path d="M 40 160 L 160 160" stroke="#06b6d4" strokeWidth="1.5" opacity="0.6" />
          <path d="M 55 145 L 145 145" stroke="#06b6d4" strokeWidth="1" opacity="0.4" />
          <path d="M 70 135 L 130 135" stroke="#06b6d4" strokeWidth="0.8" opacity="0.3" />
          {/* Perspective grid lines converging to horizon */}
          <line x1="100" y1="125" x2="30" y2="170" stroke="#06b6d4" strokeWidth="1" opacity="0.4" />
          <line x1="100" y1="125" x2="65" y2="170" stroke="#06b6d4" strokeWidth="1" opacity="0.4" />
          <line x1="100" y1="125" x2="100" y2="170" stroke="#06b6d4" strokeWidth="1" opacity="0.5" />
          <line x1="100" y1="125" x2="135" y2="170" stroke="#06b6d4" strokeWidth="1" opacity="0.4" />
          <line x1="100" y1="125" x2="170" y2="170" stroke="#06b6d4" strokeWidth="1" opacity="0.4" />

          {/* Synthwave Neon Sun at Horizon */}
          <g>
            <circle cx="100" cy="95" r="32" fill="#ec4899" opacity="0.85" />
            {/* Blinds / horizontal cutout lines across the sun */}
            <line x1="68" y1="92" x2="132" y2="92" stroke="#0b101b" strokeWidth="2" />
            <line x1="71" y1="99" x2="129" y2="99" stroke="#0b101b" strokeWidth="2.5" />
            <line x1="76" y1="107" x2="124" y2="107" stroke="#0b101b" strokeWidth="3" />
            <line x1="82" y1="116" x2="118" y2="116" stroke="#0b101b" strokeWidth="3.5" />
          </g>

          {/* Distant Cyber City Skyline Silhouettes (Stage 2+) */}
          {progress > 0.25 && (
            <g opacity={p2}>
              <rect x="52" y="90" width="14" height="35" fill="#1e1b4b" opacity="0.8" />
              <rect x="68" y="78" width="12" height="47" fill="#0f172a" opacity="0.9" />
              <line x1="74" y1="65" x2="74" y2="78" stroke="#ec4899" strokeWidth="1.5" />
              <rect x="120" y="82" width="14" height="43" fill="#0f172a" opacity="0.9" />
              <rect x="136" y="95" width="12" height="30" fill="#1e1b4b" opacity="0.8" />
              {/* Glowing window dots */}
              <circle cx="73" cy="88" r="1" fill="#06b6d4" />
              <circle cx="73" cy="98" r="1" fill="#ec4899" />
              <circle cx="126" cy="92" r="1" fill="#06b6d4" />
              <circle cx="126" cy="104" r="1" fill="#facc15" />
            </g>
          )}

          {/* Holographic HUD Targeting Reticle & Hexagon (Stage 3+) */}
          {progress > 0.5 && (
            <g opacity={p3}>
              <circle cx="100" cy="95" r="44" fill="none" stroke="#06b6d4" strokeWidth="1.2" strokeDasharray="6 6" />
              <circle cx="100" cy="95" r="54" fill="none" stroke="#ec4899" strokeWidth="0.8" strokeDasharray="3 9" />
              <line x1="42" y1="95" x2="48" y2="95" stroke="#06b6d4" strokeWidth="2" />
              <line x1="152" y1="95" x2="158" y2="95" stroke="#06b6d4" strokeWidth="2" />
            </g>
          )}

          {/* High-speed Laser Pulse Streams (Stage 4+) */}
          {progress > 0.75 && (
            <g opacity={p4}>
              <line x1="25" y1="50" x2="60" y2="50" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" className="animate-pulse" />
              <line x1="140" y1="42" x2="175" y2="42" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" className="animate-pulse" />
              <circle cx="100" cy="95" r="62" fill="none" stroke="#06b6d4" strokeWidth="1" strokeDasharray="12 12" className="animate-spin" style={{ animationDuration: "20s" }} />
            </g>
          )}
        </g>
      );

    case "deepocean":
      return (
        <g>
          {/* Deep Abyss Gradient Vignette Circle */}
          <circle cx="100" cy="100" r="76" fill="#031b33" opacity="0.6" />

          {/* Rising Oxygen Pearl Bubbles (Always visible, animated) */}
          <g>
            <circle cx="70" cy={140 - p1 * 30} r="2.5" fill="#38bdf8" opacity="0.6" />
            <circle cx="130" cy={150 - p2 * 40} r="3" fill="#38bdf8" opacity="0.7" />
            <circle cx="95" cy={165 - p3 * 50} r="2" fill="#7dd3fc" opacity="0.8" />
            <circle cx="120" cy={120 - p4 * 40} r="4" fill="#bae6fd" opacity="0.5" />
          </g>

          {/* Bioluminescent Jellyfish Canopy (Stage 1+) */}
          <g opacity={Math.max(0.3, p1)}>
            <path
              d="M 82 85 C 82 68 118 68 118 85 C 110 88 100 86 82 85 Z"
              fill="#06b6d4"
              opacity="0.85"
            />
            {/* Inner glowing core */}
            <ellipse cx="100" cy="80" rx="9" ry="5" fill="#67e8f9" opacity="0.9" />
            {/* Trailing tendrils */}
            <path d="M 88 86 Q 85 105 90 120" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
            <path d="M 95 87 Q 98 110 94 130" fill="none" stroke="#67e8f9" strokeWidth="1.8" strokeLinecap="round" opacity="0.9" />
            <path d="M 104 87 Q 102 110 106 130" fill="none" stroke="#67e8f9" strokeWidth="1.8" strokeLinecap="round" opacity="0.9" />
            <path d="M 112 86 Q 115 105 110 120" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
          </g>

          {/* Sea Ribbons & Coral Fans (Stage 2+) */}
          {progress > 0.25 && (
            <g opacity={p2}>
              <path d="M 45 160 Q 52 135 48 115 Q 44 95 50 80" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
              <path d="M 55 160 Q 62 140 58 125" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
              <path d="M 155 160 Q 148 135 152 115 Q 156 95 150 80" fill="none" stroke="#06b6d4" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
            </g>
          )}

          {/* Swimming Little Angel Fish (Stage 3+) */}
          {progress > 0.5 && (
            <g opacity={p3}>
              <g transform="translate(130, 95)">
                <polygon points="0,0 -12,-6 -12,6" fill="#f59e0b" />
                <polygon points="-12,0 -18,-4 -18,4" fill="#fbbf24" />
                <circle cx="-4" cy="-2" r="1" fill="#ffffff" />
              </g>
              <g transform="translate(65, 115)">
                <polygon points="0,0 10,-5 10,5" fill="#38bdf8" />
                <polygon points="10,0 15,-3 15,3" fill="#67e8f9" />
              </g>
            </g>
          )}

          {/* Majestic Bioluminescent Whale Shadow & Glow Aura (Stage 4+) */}
          {progress > 0.75 && (
            <g opacity={p4}>
              <circle cx="100" cy="100" r="70" fill="none" stroke="#0ea5e9" strokeWidth="1" strokeDasharray="8 8" className="animate-spin" style={{ animationDuration: "40s" }} />
              {/* Distant majestic whale silhouette arching through upper water */}
              <path
                d="M 40 55 Q 80 42 120 48 Q 150 54 165 48 Q 155 58 135 62 Q 90 68 50 62 Z"
                fill="#0284c7"
                opacity="0.3"
              />
            </g>
          )}
        </g>
      );

    case "cosmic":
      return (
        <g>
          {/* Deep Space Background Void */}
          <circle cx="100" cy="100" r="78" fill="#090514" opacity="0.8" />

          {/* Twinkling Distant Stars Field */}
          <circle cx="45" cy="55" r="1.5" fill="#facc15" opacity="0.9" />
          <circle cx="155" cy="65" r="1.2" fill="#e0e7ff" opacity="0.8" />
          <circle cx="70" cy="145" r="1.5" fill="#f472b6" opacity="0.8" />
          <circle cx="140" cy="140" r="1.2" fill="#38bdf8" opacity="0.9" />
          <circle cx="110" cy="40" r="1.8" fill="#ffffff" opacity="0.95" />

          {/* Swirling Nebula Dust Cloud (Stage 1+) */}
          <g opacity={Math.max(0.4, p1)} className="animate-spin" style={{ animationDuration: "80s", transformOrigin: "100px 100px" }}>
            <ellipse cx="100" cy="100" rx="55" ry="24" fill="#8b5cf6" opacity="0.3" transform="rotate(-30 100 100)" />
            <ellipse cx="100" cy="100" rx="45" ry="18" fill="#ec4899" opacity="0.35" transform="rotate(35 100 100)" />
          </g>

          {/* Majestic Ringed Planet (Stage 2+) */}
          {progress > 0.25 && (
            <g opacity={p2} transform="translate(100, 100)">
              {/* Back half of ring */}
              <ellipse cx="0" cy="0" rx="36" ry="11" fill="none" stroke="#fcd34d" strokeWidth="3" opacity="0.7" transform="rotate(-22)" />
              {/* Planet Sphere */}
              <circle cx="0" cy="0" r="20" fill="#6366f1" />
              <circle cx="-5" cy="-5" r="18" fill="#818cf8" opacity="0.5" />
              {/* Surface banding */}
              <path d="M -18 2 Q 0 -2 18 2" fill="none" stroke="#4338ca" strokeWidth="2.5" />
              {/* Front half of ring */}
              <path d="M -33 13 Q 0 4 33 -13" fill="none" stroke="#fef08a" strokeWidth="3" opacity="0.9" />
            </g>
          )}

          {/* Golden Cosmic Pulsar Core (Stage 3+) */}
          {progress > 0.5 && (
            <g opacity={p3}>
              <circle cx="45" cy="125" r="4" fill="#fbbf24" className="animate-pulse" />
              <line x1="45" y1="110" x2="45" y2="140" stroke="#fef08a" strokeWidth="1" strokeLinecap="round" />
              <line x1="30" y1="125" x2="60" y2="125" stroke="#fef08a" strokeWidth="1" strokeLinecap="round" />
            </g>
          )}

          {/* Grand Shimmering Starlight Constellation (Stage 4+) */}
          {progress > 0.75 && (
            <g opacity={p4}>
              <polyline points="140,45 160,55 155,75 135,70 140,45" fill="none" stroke="#c084fc" strokeWidth="1.2" strokeDasharray="2 2" />
              <circle cx="140" cy="45" r="2.5" fill="#f0abfc" />
              <circle cx="160" cy="55" r="2.5" fill="#f0abfc" />
              <circle cx="155" cy="75" r="2.5" fill="#f0abfc" />
              <circle cx="135" cy="70" r="2.5" fill="#f0abfc" />
              {/* Orbiting Stardust Rings */}
              <circle cx="100" cy="100" r="70" fill="none" stroke="#c084fc" strokeWidth="1.2" strokeDasharray="4 8" className="animate-spin" style={{ animationDuration: "25s" }} />
            </g>
          )}
        </g>
      );

    case "cozycoffee":
      return (
        <g>
          {/* Wooden Café Table Plank */}
          <rect x="35" y="145" width="130" height="18" rx="4" fill="#78350f" />
          <line x1="35" y1="151" x2="165" y2="151" stroke="#92400e" strokeWidth="1" opacity="0.5" />

          {/* Ceramic Coffee Saucer & Mug */}
          <ellipse cx="100" cy="144" rx="38" ry="8" fill="#d97706" opacity="0.6" />
          <ellipse cx="100" cy="142" rx="32" ry="6" fill="#fef3c7" />

          {/* Mug Body */}
          <path
            d="M 75 95 L 80 135 C 80 141 120 141 120 135 L 125 95 Z"
            fill="#ea580c"
          />
          {/* Mug Handle */}
          <path
            d="M 124 102 C 138 102 138 126 122 126"
            fill="none"
            stroke="#ea580c"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* Mug Rim & Coffee Surface */}
          <ellipse cx="100" cy="95" rx="25" ry="8" fill="#fed7aa" />
          <ellipse cx="100" cy="95" rx="22" ry="6" fill="#7c2d12" />

          {/* Latte Foam Art Heart (Stage 2+) */}
          {progress > 0.25 && (
            <g opacity={p2}>
              <ellipse cx="100" cy="95" rx="14" ry="4" fill="#fef3c7" />
              <path
                d="M 100 97 C 96 93 93 94 95 96 C 97 98 100 99 100 99 C 100 99 103 98 105 96 C 107 94 104 93 100 97 Z"
                fill="#b45309"
              />
            </g>
          )}

          {/* Swirling Hot Steam Ribbons (Stage 1+, animated) */}
          <g opacity={Math.max(0.4, p1)}>
            <path
              d="M 92 88 Q 88 72 94 62 Q 100 52 94 40"
              fill="none"
              stroke="#fed7aa"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.8"
              className="animate-pulse"
            />
            <path
              d="M 106 86 Q 112 70 106 58 Q 100 46 108 36"
              fill="none"
              stroke="#fed7aa"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.8"
              className="animate-pulse"
              style={{ animationDelay: "400ms" }}
            />
          </g>

          {/* Fresh Croissant & Coffee Beans beside Mug (Stage 3+) */}
          {progress > 0.5 && (
            <g opacity={p3}>
              {/* Croissant */}
              <path
                d="M 45 142 C 45 130 65 130 68 142 C 60 144 50 144 45 142 Z"
                fill="#d97706"
              />
              <path d="M 52 134 Q 57 132 62 135" fill="none" stroke="#b45309" strokeWidth="1.5" />
              {/* Coffee Beans */}
              <ellipse cx="145" cy="144" rx="4" ry="2.5" fill="#451a03" transform="rotate(-20 145 144)" />
              <ellipse cx="154" cy="145" rx="3.5" ry="2.2" fill="#78350f" transform="rotate(25 154 145)" />
            </g>
          )}

          {/* Warm Ambient Sunlight Glow Ring (Stage 4+) */}
          {progress > 0.75 && (
            <circle cx="100" cy="100" r="70" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="6 6" opacity={p4} />
          )}
        </g>
      );

    case "enchantedforest":
      return (
        <g>
          {/* Woodland Hill Mound */}
          <path d="M 30 165 Q 100 135 170 165" fill="#064e3b" />
          <path d="M 45 165 Q 100 142 155 165" fill="#047857" opacity="0.7" />

          {/* Ancient Guardian Oak Trunk & Roots */}
          <path
            d="M 94 150 Q 92 115 88 95 Q 100 98 100 95 Q 100 98 112 95 Q 108 115 106 150 Q 120 156 128 160 M 72 160 Q 80 156 94 150"
            fill="#78350f"
            stroke="#451a03"
            strokeWidth="1.5"
          />

          {/* Lush Emerald Canopy Clustered Foliage (Stage 1+) */}
          <g opacity={Math.max(0.4, p1)}>
            <circle cx="100" cy="72" r="28" fill="#059669" />
            <circle cx="78" cy="80" r="22" fill="#10b981" />
            <circle cx="122" cy="80" r="22" fill="#10b981" />
            <circle cx="100" cy="55" r="20" fill="#34d399" opacity="0.9" />
            <circle cx="88" cy="68" r="14" fill="#6ee7b7" opacity="0.7" />
          </g>

          {/* Little Forest Mushrooms on Mound (Stage 2+) */}
          {progress > 0.25 && (
            <g opacity={p2}>
              <path d="M 60 152 Q 65 140 70 152" fill="#ef4444" />
              <rect x="63" y="150" width="3" height="6" fill="#fef2f2" />
              <circle cx="63" cy="146" r="0.8" fill="#ffffff" />
              <circle cx="67" cy="147" r="0.8" fill="#ffffff" />
              {/* Small glowing toadstool */}
              <path d="M 135 154 Q 140 144 145 154" fill="#8b5cf6" />
              <rect x="139" y="152" width="2.5" height="5" fill="#f5f3ff" />
            </g>
          )}

          {/* Sunbeams Filtering from Canopy (Stage 3+) */}
          {progress > 0.5 && (
            <g opacity={p3}>
              <polygon points="65,30 85,30 115,160 85,160" fill="#fef08a" opacity="0.18" />
              <polygon points="110,30 130,30 145,160 125,160" fill="#fef08a" opacity="0.18" />
            </g>
          )}

          {/* Dancing Glowing Golden Fireflies (Stage 4+) */}
          {progress > 0.75 && (
            <g opacity={p4}>
              <g className="animate-pulse">
                <circle cx="60" cy="95" r="2.5" fill="#fef08a" />
                <circle cx="60" cy="95" r="5" fill="#facc15" opacity="0.4" />
              </g>
              <g className="animate-pulse" style={{ animationDelay: "300ms" }}>
                <circle cx="140" cy="105" r="2.5" fill="#a7f3d0" />
                <circle cx="140" cy="105" r="5" fill="#34d399" opacity="0.4" />
              </g>
              <g className="animate-pulse" style={{ animationDelay: "600ms" }}>
                <circle cx="100" cy="125" r="2" fill="#fef08a" />
                <circle cx="100" cy="125" r="4.5" fill="#eab308" opacity="0.4" />
              </g>
              <circle cx="100" cy="100" r="74" fill="none" stroke="#10b981" strokeWidth="1" strokeDasharray="4 6" className="animate-spin" style={{ animationDuration: "50s" }} />
            </g>
          )}
        </g>
      );

    case "campfire":
      return (
        <g>
          {/* Hearth Stone Circle */}
          <ellipse cx="100" cy="146" rx="42" ry="12" fill="#1e293b" />
          {/* Ring of River Stones */}
          <circle cx="62" cy="146" r="6" fill="#475569" />
          <circle cx="74" cy="154" r="7" fill="#64748b" />
          <circle cx="100" cy="157" r="7.5" fill="#475569" />
          <circle cx="126" cy="154" r="7" fill="#64748b" />
          <circle cx="138" cy="146" r="6" fill="#475569" />
          <circle cx="128" cy="138" r="5.5" fill="#334155" />
          <circle cx="72" cy="138" r="5.5" fill="#334155" />

          {/* Crossed Cedar Firewood Logs */}
          <line x1="75" y1="140" x2="125" y2="152" stroke="#78350f" strokeWidth="7" strokeLinecap="round" />
          <line x1="75" y1="152" x2="125" y2="140" stroke="#92400e" strokeWidth="7" strokeLinecap="round" />

          {/* Glowing Heart of the Embers */}
          <ellipse cx="100" cy="145" rx="16" ry="6" fill="#ea580c" opacity="0.9" />
          <ellipse cx="100" cy="145" rx="10" ry="4" fill="#facc15" />

          {/* Crackling Campfire Flame Tongue (Stage 1+) */}
          <g opacity={Math.max(0.5, p1)}>
            {/* Outer flame */}
            <path
              d="M 100 80 Q 120 115 116 142 Q 100 148 84 142 Q 80 115 100 80 Z"
              fill="#f97316"
            />
            {/* Middle flame */}
            <path
              d="M 100 95 Q 112 120 110 142 Q 100 146 90 142 Q 88 120 100 95 Z"
              fill="#fbbf24"
            />
            {/* Inner flame core */}
            <path
              d="M 100 115 Q 106 130 104 143 Q 100 145 96 143 Q 94 130 100 115 Z"
              fill="#fef08a"
            />
          </g>

          {/* Rising Sparks and Embers (Stage 2+, animated) */}
          {progress > 0.25 && (
            <g opacity={p2}>
              <circle cx="92" cy={110 - p2 * 25} r="2" fill="#facc15" className="animate-pulse" />
              <circle cx="108" cy={100 - p3 * 35} r="2" fill="#f97316" className="animate-pulse" style={{ animationDelay: "200ms" }} />
              <circle cx="98" cy={85 - p4 * 40} r="1.5" fill="#fef08a" className="animate-pulse" style={{ animationDelay: "400ms" }} />
              <circle cx="85" cy={118 - p2 * 20} r="1.5" fill="#f97316" />
              <circle cx="115" cy={115 - p3 * 22} r="1.8" fill="#facc15" />
            </g>
          )}

          {/* Roasting Marshmallow on a Stick (Stage 3+) */}
          {progress > 0.5 && (
            <g opacity={p3}>
              <line x1="148" y1="90" x2="105" y2="120" stroke="#b45309" strokeWidth="2" strokeLinecap="round" />
              <rect x="108" y="113" width="9" height="7" rx="2" fill="#fffbeb" stroke="#d97706" strokeWidth="0.8" transform="rotate(-35 112 116)" />
            </g>
          )}

          {/* Night Sky Warmth Aura & Star Blanket (Stage 4+) */}
          {progress > 0.75 && (
            <g opacity={p4}>
              <circle cx="100" cy="120" r="62" fill="none" stroke="#f97316" strokeWidth="1.2" strokeDasharray="6 6" className="animate-spin" style={{ animationDuration: "35s" }} />
              {/* Distant gentle stars */}
              <circle cx="50" cy="50" r="1.5" fill="#fef08a" opacity="0.8" />
              <circle cx="150" cy="55" r="1.5" fill="#fef08a" opacity="0.8" />
              <circle cx="80" cy="38" r="1.2" fill="#ffffff" opacity="0.9" />
              <circle cx="125" cy="42" r="1.2" fill="#ffffff" opacity="0.9" />
            </g>
          )}
        </g>
      );

    default:
      return null;
  }
}
