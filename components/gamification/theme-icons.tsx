"use client";

import React from "react";
import { HolidayId } from "./holiday-themes";

interface IconProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

// 1. Classic Arc Flow (Timer / Clock)
export function ArcViewIcon({ className = "w-4 h-4", size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

// 2. Zen Garden (Bonsai / Sprout in Pot)
export function ZenGardenIcon({ className = "w-4 h-4", size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22v-8" />
      <path d="M9 14c0-3.5 3-5 3-5s3 1.5 3 5" />
      <path d="M7 17c-2.5-1-3-3.5-3-3.5s2.5-.5 4.5 1.5" />
      <path d="M17 17c2.5-1 3-3.5 3-3.5s-2.5-.5-4.5 1.5" />
      <path d="M6 22h12" />
    </svg>
  );
}

// 3. Dynamic Calendar (Auto Today's Festive Pick)
export function AutoCalendarIcon({ className = "w-4 h-4", size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="m12 13 1 2 2.5.5-2 1.8.5 2.5L12 18.5 9.5 20l.5-2.5-2-1.8L10.5 15l1.5-2z" strokeWidth="1.5" />
    </svg>
  );
}

// 4. Halloween (Carved Pumpkin Smile)
export function HalloweenIcon({ className = "w-4 h-4", size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Pumpkin Body */}
      <path d="M12 6c-4.5 0-8 3-8 7.5S7.5 21 12 21s8-3 8-7.5S16.5 6 12 6z" />
      {/* Stem */}
      <path d="M12 6V3c1.5 0 2.5-.5 3-1" />
      {/* Jack-o'-Lantern Face */}
      <path d="M9 12l.5-1 .5 1" strokeWidth="1.5" />
      <path d="M14 12l.5-1 .5 1" strokeWidth="1.5" />
      <path d="M8.5 16.5c1 1.5 2.5 1.5 3.5 1.5s2.5 0 3.5-1.5" />
    </svg>
  );
}

// 5. Thanksgiving (Autumn Maple Leaf)
export function ThanksgivingIcon({ className = "w-4 h-4", size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v18" />
      <path d="M12 7c2-3 5-3 6-1s-1 4-1 6c3-1 4 2 2 4s-4 1-7 1c-3 0-5 1-7-1s-1-5 2-4c0-2-2-4-1-6s4-2 6 1z" />
    </svg>
  );
}

// 6. Christmas (Festive Evergreen Tree & Topper Star)
export function ChristmasIcon({ className = "w-4 h-4", size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 3 9 8 10.5 8 7 13 9 13 5 19 19 19 15 13 17 13 13.5 8 15 8 12 3" />
      <line x1="12" y1="19" x2="12" y2="22" strokeWidth="2.5" />
    </svg>
  );
}

// 7. New Year (Celebration Fireworks Burst)
export function NewYearIcon({ className = "w-4 h-4", size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="2" />
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  );
}

// 8. Lunar New Year (Festival Silk Lantern)
export function LunarNewYearIcon({ className = "w-4 h-4", size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="2" x2="12" y2="5" />
      <rect x="8" y="5" width="8" height="2" rx="1" />
      <ellipse cx="12" cy="12" rx="7" ry="6" />
      <line x1="12" y1="6" x2="12" y2="18" strokeDasharray="2 2" />
      <rect x="8" y="17" width="8" height="2" rx="1" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="10" y1="19" x2="10" y2="22" />
      <line x1="14" y1="19" x2="14" y2="22" />
    </svg>
  );
}

// 9. Valentine's Day (Heart of Sweethearts)
export function ValentineIcon({ className = "w-4 h-4", size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

// 10. St. Patrick's (Four-Leaf Clover)
export function StPatricksIcon({ className = "w-4 h-4", size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="7.5" r="3.5" />
      <circle cx="16.5" cy="12" r="3.5" />
      <circle cx="12" cy="16.5" r="3.5" />
      <circle cx="7.5" cy="12" r="3.5" />
      <path d="M12 12c-2 4-1 7.5 1 9" />
    </svg>
  );
}

// 11. Easter (Springtime Bunny Ears & Meadow)
export function EasterIcon({ className = "w-4 h-4", size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Left Bunny Ear */}
      <path d="M9 13C6.5 11 5 6 7 3s5 3 4 10" />
      {/* Right Bunny Ear */}
      <path d="M15 13c2.5-2 4-7 2-10s-5 3-4 10" />
      {/* Bunny Head Base */}
      <path d="M8 15c0 3 2 6 4 6s4-3 4-6" />
      <circle cx="10" cy="16" r=".5" fill="currentColor" />
      <circle cx="14" cy="16" r=".5" fill="currentColor" />
      <path d="M11 18h2" />
    </svg>
  );
}

// 12. Earth Day (Planet Biosphere)
export function EarthDayIcon({ className = "w-4 h-4", size }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

export function CyberpunkIcon({ className = "w-4 h-4", size }: IconProps) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

export function DeepOceanIcon({ className = "w-4 h-4", size }: IconProps) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12h20" />
      <path d="M20 12c-2.5 0-2.5-3-5-3s-2.5 3-5 3-2.5-3-5-3-2.5 3-5 3" />
      <path d="M20 17c-2.5 0-2.5-3-5-3s-2.5 3-5 3-2.5-3-5-3-2.5 3-5 3" />
    </svg>
  );
}

export function CosmicIcon({ className = "w-4 h-4", size }: IconProps) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M3 12a9 9 0 0 1 18 0" />
      <path d="M12 3a9 9 0 0 1 0 18" />
    </svg>
  );
}

export function CozyCoffeeIcon({ className = "w-4 h-4", size }: IconProps) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
      <line x1="6" y1="1" x2="6" y2="4" />
      <line x1="10" y1="1" x2="10" y2="4" />
      <line x1="14" y1="1" x2="14" y2="4" />
    </svg>
  );
}

export function EnchantedForestIcon({ className = "w-4 h-4", size }: IconProps) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L4 14h5l-3 7h12l-3-7h5L12 2z" />
    </svg>
  );
}

export function CampfireIcon({ className = "w-4 h-4", size }: IconProps) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

// Unified Theme Icon Dispatcher
export function ThemeIcon({
  themeId,
  className = "w-4 h-4",
  size,
  style,
}: {
  themeId: string;
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}) {
  const renderIcon = () => {
    switch (themeId) {
      case "timer":
        return <ArcViewIcon className={className} size={size} />;
      case "garden":
        return <ZenGardenIcon className={className} size={size} />;
      case "auto":
        return <AutoCalendarIcon className={className} size={size} />;
      case "halloween":
        return <HalloweenIcon className={className} size={size} />;
      case "thanksgiving":
        return <ThanksgivingIcon className={className} size={size} />;
      case "christmas":
        return <ChristmasIcon className={className} size={size} />;
      case "newyear":
        return <NewYearIcon className={className} size={size} />;
      case "lunarnewyear":
        return <LunarNewYearIcon className={className} size={size} />;
      case "valentine":
        return <ValentineIcon className={className} size={size} />;
      case "stpatricks":
        return <StPatricksIcon className={className} size={size} />;
      case "easter":
        return <EasterIcon className={className} size={size} />;
      case "earthday":
        return <EarthDayIcon className={className} size={size} />;
      case "cyberpunk":
        return <CyberpunkIcon className={className} size={size} />;
      case "deepocean":
        return <DeepOceanIcon className={className} size={size} />;
      case "cosmic":
        return <CosmicIcon className={className} size={size} />;
      case "cozycoffee":
        return <CozyCoffeeIcon className={className} size={size} />;
      case "enchantedforest":
        return <EnchantedForestIcon className={className} size={size} />;
      case "campfire":
        return <CampfireIcon className={className} size={size} />;
      default:
        return <ArcViewIcon className={className} size={size} />;
    }
  };

  if (style) {
    return (
      <span style={style} className="inline-flex items-center justify-center shrink-0">
        {renderIcon()}
      </span>
    );
  }

  return renderIcon();
}
