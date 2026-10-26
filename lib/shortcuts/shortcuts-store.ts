/**
 * Keyboard Shortcuts Storage & Management
 * Persists shortcuts in localStorage for local-first/guest users,
 * and integrates with the cloud sync service when logged in.
 */

export interface ShortcutDef {
  id: string;
  keys: string[];
  label: string;
  description: string;
  category: "Timer & Flow" | "Navigation" | "Interface";
  actionType:
    | "toggleTimer"
    | "resetTimer"
    | "skipTimer"
    | "modeFocus"
    | "modeShort"
    | "modeLong"
    | "toggleMini"
    | "toggleTheme"
    | "navFocus"
    | "navBlocklist"
    | "navStats"
    | "navSettings"
    | "navPrivacy"
    | "navShortcuts"
    | "closeModal";
}

export const DEFAULT_SHORTCUTS: ShortcutDef[] = [
  // Timer & Flow
  {
    id: "space",
    keys: ["Space"],
    label: "Start / Pause Timer",
    description: "Quickly start your focus session or pause to take an unexpected break.",
    category: "Timer & Flow",
    actionType: "toggleTimer",
  },
  {
    id: "r",
    keys: ["R"],
    label: "Reset Current Session",
    description: "Resets the countdown timer back to its full starting time.",
    category: "Timer & Flow",
    actionType: "resetTimer",
  },
  {
    id: "s",
    keys: ["S"],
    label: "Skip to Next Interval",
    description: "Finishes early and moves ahead to the next session or break.",
    category: "Timer & Flow",
    actionType: "skipTimer",
  },
  {
    id: "digit1",
    keys: ["1"],
    label: "Switch to Focus Mode",
    description: "Starts a deep work sprint and activates website blocking.",
    category: "Timer & Flow",
    actionType: "modeFocus",
  },
  {
    id: "digit2",
    keys: ["2"],
    label: "Switch to Short Break",
    description: "Starts a 5-minute break and temporarily pauses website blocking.",
    category: "Timer & Flow",
    actionType: "modeShort",
  },
  {
    id: "digit3",
    keys: ["3"],
    label: "Switch to Long Break",
    description: "Starts an extended 15-minute break to step away and recharge.",
    category: "Timer & Flow",
    actionType: "modeLong",
  },

  // Navigation
  {
    id: "nav-f",
    keys: ["F"],
    label: "Go to Focus Timer",
    description: "Jump straight to the main timer countdown screen.",
    category: "Navigation",
    actionType: "navFocus",
  },
  {
    id: "nav-b",
    keys: ["B"],
    label: "Go to Blocklist",
    description: "Open your blocklist to add or adjust restricted websites.",
    category: "Navigation",
    actionType: "navBlocklist",
  },
  {
    id: "nav-a",
    keys: ["A"],
    label: "Go to Statistics",
    description: "Review your focus streaks, completed sessions, and daily time.",
    category: "Navigation",
    actionType: "navStats",
  },
  {
    id: "nav-p",
    keys: ["P"],
    label: "Go to Settings",
    description: "Customize timer durations, alert sounds, and visual themes.",
    category: "Navigation",
    actionType: "navSettings",
  },
  {
    id: "nav-l",
    keys: ["L"],
    label: "Go to Privacy",
    description: "Learn how your data stays 100% private and stored locally on your device.",
    category: "Navigation",
    actionType: "navPrivacy",
  },
  {
    id: "nav-question",
    keys: ["?"],
    label: "Open Shortcuts Guide",
    description: "Opens this cheatsheet anytime to quickly view or customize your keys.",
    category: "Navigation",
    actionType: "navShortcuts",
  },

  // Interface & Controls
  {
    id: "m",
    keys: ["M"],
    label: "Toggle Mini Floating Timer",
    description: "Open or dock the compact picture-in-picture floating timer.",
    category: "Interface",
    actionType: "toggleMini",
  },
  {
    id: "t",
    keys: ["T"],
    label: "Toggle Dark / Light Theme",
    description: "Switch seamlessly between serene dark mode and clean light mode.",
    category: "Interface",
    actionType: "toggleTheme",
  },
  {
    id: "esc",
    keys: ["Esc"],
    label: "Close Overlays & Menus",
    description: "Instantly dismiss any open popup window, menu, or dialog.",
    category: "Interface",
    actionType: "closeModal",
  },
];

const STORAGE_KEY = "dnd_shortcuts";
export const SHORTCUTS_UPDATED_EVENT = "dnd-shortcuts-updated";

/**
 * Retrieves shortcuts from localStorage, merging with defaults in case
 * new shortcuts were introduced.
 */
export function getStoredShortcuts(): ShortcutDef[] {
  if (typeof window === "undefined") return DEFAULT_SHORTCUTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SHORTCUTS));
      return DEFAULT_SHORTCUTS;
    }
    const parsed: Partial<ShortcutDef>[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_SHORTCUTS;

    // Merge custom keys with default metadata
    return DEFAULT_SHORTCUTS.map((def) => {
      const match = parsed.find((p) => p.actionType === def.actionType || p.id === def.id);
      if (match && Array.isArray(match.keys) && match.keys.length > 0) {
        return {
          ...def,
          keys: match.keys,
        };
      }
      return def;
    });
  } catch {
    return DEFAULT_SHORTCUTS;
  }
}

/**
 * Persists shortcuts to localStorage and emits an update event.
 */
export function saveStoredShortcuts(shortcuts: ShortcutDef[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts));
    window.dispatchEvent(
      new CustomEvent(SHORTCUTS_UPDATED_EVENT, { detail: shortcuts })
    );

    // Seamless background sync if authenticated
    if (typeof fetch !== "undefined" && navigator.onLine) {
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shortcuts: shortcuts.map((s) => ({
            actionType: s.actionType,
            keys: s.keys,
          })),
        }),
      }).catch(() => {
        // Guest mode / offline: persists locally
      });
    }
  } catch (err) {
    console.error("Failed to persist shortcuts:", err);
  }
}

/**
 * Updates a specific shortcut's key binding.
 */
export function updateShortcutKey(actionType: string, newKeys: string[]): ShortcutDef[] {
  const current = getStoredShortcuts();
  const updated = current.map((s) => {
    if (s.actionType === actionType) {
      return { ...s, keys: newKeys };
    }
    return s;
  });
  saveStoredShortcuts(updated);
  return updated;
}

/**
 * Resets all shortcuts back to factory defaults.
 */
export function resetShortcutsToDefault(): ShortcutDef[] {
  saveStoredShortcuts(DEFAULT_SHORTCUTS);
  return DEFAULT_SHORTCUTS;
}

/**
 * Checks if a KeyboardEvent matches a configured list of key combinations.
 */
export function doesKeyEventMatchShortcut(e: KeyboardEvent, keys: string[]): boolean {
  if (!keys || keys.length === 0) return false;

  const requiresCtrl = keys.some((k) => k.toLowerCase() === "ctrl" || k.toLowerCase() === "control");
  const requiresAlt = keys.some((k) => k.toLowerCase() === "alt");
  const requiresShift = keys.some((k) => k.toLowerCase() === "shift");
  const requiresMeta = keys.some((k) => k.toLowerCase() === "meta" || k.toLowerCase() === "cmd");

  if (Boolean(e.ctrlKey) !== requiresCtrl) return false;
  if (Boolean(e.altKey) !== requiresAlt) return false;
  if (Boolean(e.shiftKey) !== requiresShift) return false;
  if (Boolean(e.metaKey) !== requiresMeta) return false;

  const primaryKey = keys.find(
    (k) => !["ctrl", "control", "alt", "shift", "meta", "cmd"].includes(k.toLowerCase())
  );
  if (!primaryKey) return false;

  // Space check
  if (primaryKey.toLowerCase() === "space") {
    return e.code === "Space";
  }

  // Escape check
  if (primaryKey.toLowerCase() === "esc" || primaryKey.toLowerCase() === "escape") {
    return e.key === "Escape";
  }

  // General alphanumeric/symbol check
  return e.key.toLowerCase() === primaryKey.toLowerCase();
}

