import type { Metadata } from "next";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "https://www.donotdistrb.com"
).replace(/\/+$/, "");

export const SITE_NAME = "Do Not Disturb";
export const SITE_SHORT_NAME = "DND";
export const SITE_TAGLINE =
  "Focus Timer, Website Blocker & Ambient Soundscapes";
export const SITE_DEFAULT_TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const SITE_DESCRIPTION =
  "A calm, privacy-first focus timer and Pomodoro workspace with a companion website blocker extension, procedural Web Audio soundscapes, Spotify integration, and local-first productivity analytics.";

/**
 * Comprehensive keyword taxonomy tailored for the Do Not Disturb platform,
 * organized by functional pillar and route intent.
 */
export const SEO_KEYWORDS = {
  core: [
    "do not disturb",
    "do not disturb app",
    "donotdistrb",
    "focus timer",
    "pomodoro timer",
    "online pomodoro timer",
    "deep work timer",
    "distraction-free workspace",
    "productivity timer",
    "website blocker",
    "distraction blocker",
    "ambient focus sounds",
    "study timer",
    "work sprint timer",
    "flow state app",
    "mindful productivity",
    "privacy-first productivity app",
    "offline focus timer",
  ],
  home: [
    "pomodoro focus timer",
    "customizable pomodoro clock",
    "zen garden focus timer",
    "bonsai focus timer",
    "deep focus sessions",
    "short break timer",
    "long break timer",
    "floating mini timer",
    "picture in picture focus timer",
    "adhd focus timer",
    "study with me timer",
    "work interval timer",
    "daily focus goal tracker",
    "session intent tracker",
  ],
  blocklist: [
    "website blocklist",
    "block distracting websites",
    "browser website blocker",
    "chrome extension website blocker",
    "manifest v3 website blocker",
    "strict focus mode",
    "lock settings during focus",
    "distraction deflection",
    "stop doomscrolling",
    "block social media while studying",
    "block youtube during work",
    "block reddit during work",
    "focus shield",
    "screen time blocker",
  ],
  statistics: [
    "focus statistics",
    "productivity analytics",
    "deep work tracker",
    "weekly focus rhythm",
    "peak focus hours",
    "most active focus window",
    "distraction log",
    "focus streak tracker",
    "flow xp gamification",
    "focus achievements",
    "time tracking for deep work",
    "pomodoro session history",
  ],
  connectedApps: [
    "spotify focus timer",
    "spotify study playlists",
    "focus music integration",
    "browser blocker extension",
    "cloud sync focus app",
    "local-first cloud backup",
    "productivity app integrations",
    "deep work tools",
  ],
  settings: [
    "custom pomodoro durations",
    "auto start breaks timer",
    "ambient soundscape generator",
    "web audio synthesizer",
    "rain sounds for focus",
    "binaural beats for concentration",
    "white noise for studying",
    "quiet cafe ambience",
    "ocean waves focus sound",
    "singing bowl meditation sound",
    "strict blocking settings",
  ],
  shortcuts: [
    "pomodoro keyboard shortcuts",
    "focus timer hotkeys",
    "customizable keyboard shortcuts",
    "keyboard-first productivity app",
    "quick timer controls",
    "global browser extension shortcuts",
  ],
  tips: [
    "how to stay focused",
    "deep work habits",
    "mindful break ideas",
    "overcome procrastination",
    "two-minute rule productivity",
    "stop multitasking",
    "digital minimalism tips",
    "reduce screen fatigue",
    "20-20-20 eye break rule",
    "daily shutdown ritual",
    "calm productivity advice",
  ],
  privacy: [
    "privacy-first focus timer",
    "no account pomodoro timer",
    "local-only productivity app",
    "zero tracking web app",
    "ad-free focus timer",
    "offline-first pomodoro",
    "export focus data json",
    "private website blocker",
  ],
} as const;

export type PageSeoKey =
  | "home"
  | "blocklist"
  | "statistics"
  | "connectedApps"
  | "settings"
  | "shortcuts"
  | "tips"
  | "privacy"
  | "blocked"
  | "callback"
  | "admin";

export interface PageSeoConfig {
  title: string;
  description: string;
  path: string;
  keywords: readonly string[];
  noIndex?: boolean;
}

export const PAGE_SEO: Record<PageSeoKey, PageSeoConfig> = {
  home: {
    title: SITE_DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
    path: "/",
    keywords: [...SEO_KEYWORDS.core, ...SEO_KEYWORDS.home],
  },
  blocklist: {
    title: "Website Blocklist & Distraction Shield",
    description:
      "Quietly pause distracting websites during focus sessions with strict mode protection, instant domain rules, and real-time deflection tracking.",
    path: "/blocklist",
    keywords: [...SEO_KEYWORDS.blocklist, ...SEO_KEYWORDS.core],
  },
  statistics: {
    title: "Focus Statistics, Rhythm & Achievements",
    description:
      "Track your deep work hours, weekly focus rhythm, peak cognitive hours, distraction-free rate, daily streaks, and unlocked Flow XP achievements.",
    path: "/statistics",
    keywords: [...SEO_KEYWORDS.statistics, ...SEO_KEYWORDS.core],
  },
  connectedApps: {
    title: "Connected Apps — Spotify, Website Blocker & Cloud Sync",
    description:
      "Connect Spotify for personal focus playlists, install the companion Chromium website blocker extension, or enable optional cross-device Cloud Sync.",
    path: "/connected-apps",
    keywords: [...SEO_KEYWORDS.connectedApps, ...SEO_KEYWORDS.core],
  },
  settings: {
    title: "Timer, Blocking & Soundscape Settings",
    description:
      "Customize your deep focus and break durations, strict website blocking rules, procedural Web Audio ambient soundscapes, and Spotify playback preferences.",
    path: "/settings",
    keywords: [...SEO_KEYWORDS.settings, ...SEO_KEYWORDS.core],
  },
  shortcuts: {
    title: "Keyboard Shortcuts & Hotkeys Cheatsheet",
    description:
      "Control your focus timer, switch session modes, open the floating mini timer, and navigate Do Not Disturb effortlessly with customizable keyboard shortcuts.",
    path: "/shortcuts",
    keywords: [...SEO_KEYWORDS.shortcuts, ...SEO_KEYWORDS.core],
  },
  tips: {
    title: "Friendly Focus Tips, Mindful Breaks & Deep Work Habits",
    description:
      "Practical, gentle habits and attention-saving reminders to help you start deep work, take restorative breaks, and stay in flow without burnout.",
    path: "/tips",
    keywords: [...SEO_KEYWORDS.tips, ...SEO_KEYWORDS.core],
  },
  privacy: {
    title: "Privacy First — Local-Only Mode, Zero Tracking & Data Controls",
    description:
      "Do Not Disturb works out of the box with no account required, zero ads or tracking cookies, offline Web Audio synthesis, and full JSON data export.",
    path: "/privacy",
    keywords: [...SEO_KEYWORDS.privacy, ...SEO_KEYWORDS.core],
  },
  blocked: {
    title: "Focus Sanctuary — Website Paused",
    description:
      "This website is gently paused while your focus session is active. Take a slow breath and return to your flow.",
    path: "/blocked",
    keywords: SEO_KEYWORDS.blocklist,
    noIndex: true,
  },
  callback: {
    title: "Connecting Account",
    description: "Completing secure authentication for Do Not Disturb.",
    path: "/callback",
    keywords: SEO_KEYWORDS.core,
    noIndex: true,
  },
  admin: {
    title: "Admin Command Center",
    description: "Privacy-first telemetry and platform overview.",
    path: "/admin",
    keywords: SEO_KEYWORDS.core,
    noIndex: true,
  },
};

/**
 * Generates a standardized Next.js Metadata object for a given route key.
 */
export function createPageMetadata(key: PageSeoKey): Metadata {
  const page = PAGE_SEO[key];
  const uniqueKeywords = Array.from(new Set(page.keywords));
  const fullTitle =
    key === "home" ? page.title : `${page.title} — ${SITE_NAME}`;
  const canonicalUrl =
    page.path === "/" ? SITE_URL : `${SITE_URL}${page.path}`;

  return {
    title: page.title,
    description: page.description,
    keywords: uniqueKeywords,
    alternates: {
      canonical: page.path,
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: canonicalUrl,
      siteName: SITE_NAME,
      title: fullTitle,
      description: page.description,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: page.description,
    },
    robots: page.noIndex
      ? {
          index: false,
          follow: false,
          nocache: true,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
  };
}

/**
 * Safely serializes JSON-LD payloads for inline <script type="application/ld+json">,
 * escaping `<` characters to prevent XSS injection per Next.js JSON-LD guidelines.
 */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * Root structured data graph: WebSite, WebApplication, and Organization schemas.
 */
export function getRootJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        alternateName: [
          SITE_SHORT_NAME,
          "Do Not Disturb Focus Timer",
          "Do Not Disturb Productivity Platform",
        ],
        description: SITE_DESCRIPTION,
        inLanguage: "en-US",
      },
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#webapp`,
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        applicationCategory: "ProductivityApplication",
        applicationSubCategory: "Focus Timer & Website Blocker",
        operatingSystem:
          "Web, Chrome, Microsoft Edge, Brave, macOS, Windows, Linux",
        browserRequirements: "Requires a modern web browser with JavaScript",
        isAccessibleForFree: true,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        featureList: [
          "Customizable Pomodoro & Deep Focus Timer with Arc, Zen Garden, and Holiday visualizers",
          "Companion Chromium Manifest V3 Browser Extension for website deflection",
          "Procedural Web Audio API ambient soundscapes (Gentle Rain, Binaural Beats, Deep Space, Warm Fire, Quiet Cafe, Ocean Waves, Soft Static, Forest Breeze, Singing Bowl, Night Synth)",
          "Spotify integration with curated focus playlists and personal library sync",
          "Floating Document Picture-in-Picture mini timer window",
          "Focus analytics, weekly rhythm charts, peak cognitive hours, and distraction logs",
          "Gamified Flow XP progression, daily streaks, and unlockable achievements",
          "Customizable keyboard shortcuts with instant testing",
          "Privacy-first local storage by default with optional encrypted Cloud Sync",
        ],
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/android-chrome-512x512.png`,
          width: 512,
          height: 512,
        },
      },
    ],
  };
}

/**
 * Generates a BreadcrumbList JSON-LD object for secondary routes.
 */
export function getBreadcrumbJsonLd(
  pageName: string,
  pagePath: string
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: SITE_NAME,
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: pageName,
        item: `${SITE_URL}${pagePath}`,
      },
    ],
  };
}

/**
 * Generates FAQPage JSON-LD structured data.
 */
export function getFaqJsonLd(
  faqs: ReadonlyArray<{ question: string; answer: string }>
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
