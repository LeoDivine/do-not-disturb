export interface PlatformTourStep {
  id: string;
  stepNumber: number;
  title: string;
  headline: string;
  description: string;
  keyTakeaway: string;
  targetRoute: string;
  routeLabel?: string;
  category: string;
}

export const TOUR_STORAGE_KEY = "dnd_platform_tour_seen";
export const TOUR_EVENT = "dnd-tour-updated";

export const PLATFORM_TOUR_STEPS: PlatformTourStep[] = [
  {
    id: "welcome",
    stepNumber: 1,
    category: "Focus Foundation",
    title: "Welcome to Serene Focus",
    headline: "A calm, distraction-free space for deep work",
    description:
      "Do Not Disturb is crafted to help you sink into uninterrupted flow. Alternate effortlessly between Deep Focus, Short Breaks, and Long Breaks with zero noise or friction.",
    keyTakeaway: "Press the Space key anytime to start or pause your session hands-free.",
    targetRoute: "/",
  },
  {
    id: "audio",
    stepNumber: 2,
    category: "Audio Sanctuary",
    title: "Acoustic Sanctuary",
    headline: "Calm soundscapes and Spotify in harmony",
    description:
      "Soothe mental chatter with procedural background audio—rain, ocean waves, binaural beats, and forest birds—or link your personal Spotify playlists.",
    keyTakeaway:
      "Procedural soundscapes run offline in your browser with zero tracking and pure local audio synthesis.",
    targetRoute: "/",
  },
  {
    id: "blocklist",
    stepNumber: 3,
    category: "Distraction Shield",
    title: "Deflect Distractions",
    headline: "Shield your attention from impulse browsing",
    description:
      "List the websites that tempt your attention. With our lightweight companion extension, visiting blocked domains during a focus session gently steers you back to your flow.",
    keyTakeaway:
      "Rules automatically disengage during breaks so you can browse freely without turning off your blocker.",
    targetRoute: "/blocklist",
    routeLabel: "Explore Blocklist",
  },
  {
    id: "statistics",
    stepNumber: 4,
    category: "Reflective Progress",
    title: "Mindful Momentum",
    headline: "Honor consistency, not exhaustion",
    description:
      "Reflect on your daily focus minutes and gentle streaks without pressure. Watch your personal Zen Garden flourish as you spend quiet time in meaningful work.",
    keyTakeaway:
      "Life happens. Compassionate rest tokens preserve your streak without penalty whenever you need a breather.",
    targetRoute: "/statistics",
    routeLabel: "View Focus Insights",
  },
  {
    id: "shortcuts",
    stepNumber: 5,
    category: "Privacy & Controls",
    title: "Effortless Control & Privacy",
    headline: "Everything stays on your device",
    description:
      "Your focus history, habits, and preferences are stored 100% locally in your browser by default. Control your entire flow with keyboard hotkeys and tune timers to your personal pace.",
    keyTakeaway: "Press '?' anywhere on any page to open your keyboard shortcuts cheat sheet.",
    targetRoute: "/shortcuts",
    routeLabel: "Explore Shortcuts",
  },
];

/**
 * Check whether the user has previously completed or dismissed the platform tour.
 */
export function hasSeenPlatformTour(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(TOUR_STORAGE_KEY) === "true";
  } catch {
    return true;
  }
}

/**
 * Record that the platform tour has been seen (or clear it to reset).
 */
export function setPlatformTourSeen(seen: boolean = true): void {
  if (typeof window === "undefined") return;
  try {
    if (seen) {
      localStorage.setItem(TOUR_STORAGE_KEY, "true");
    } else {
      localStorage.removeItem(TOUR_STORAGE_KEY);
    }
    window.dispatchEvent(
      new CustomEvent(TOUR_EVENT, {
        detail: { seen },
      })
    );
  } catch {
    // Graceful fallback if storage is restricted
  }
}

/**
 * Reset tour status so first-time onboarding can be experienced again.
 */
export function resetPlatformTour(): void {
  setPlatformTourSeen(false);
}
