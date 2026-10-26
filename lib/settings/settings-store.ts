import { UserSettingsPayload } from "../sync/sync-types";

export const LOCAL_SETTINGS_KEY = "dnd_user_settings";
export const SETTINGS_UPDATED_EVENT = "dnd-settings-updated";

export const DEFAULT_SETTINGS: UserSettingsPayload = {
  deepFocusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakCadence: 4,
  autoStartBreaks: true,
  autoStartFocus: false,
  strictBlocking: "STRICT",
  acousticPreset: "rain",
  bgAmbienceVolume: 65,
  completionChime: true,
  theme: "SYSTEM",
};

/**
 * Retrieves the currently saved settings from local storage,
 * cleanly falling back to defaults for any missing or invalid fields.
 */
export function getStoredSettings(): UserSettingsPayload {
  if (typeof window === "undefined") {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const raw = localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };

    const parsed = JSON.parse(raw);
    return {
      deepFocusMinutes:
        typeof parsed.deepFocusMinutes === "number" && parsed.deepFocusMinutes > 0
          ? parsed.deepFocusMinutes
          : DEFAULT_SETTINGS.deepFocusMinutes,
      shortBreakMinutes:
        typeof parsed.shortBreakMinutes === "number" && parsed.shortBreakMinutes > 0
          ? parsed.shortBreakMinutes
          : DEFAULT_SETTINGS.shortBreakMinutes,
      longBreakMinutes:
        typeof parsed.longBreakMinutes === "number" && parsed.longBreakMinutes > 0
          ? parsed.longBreakMinutes
          : DEFAULT_SETTINGS.longBreakMinutes,
      longBreakCadence:
        typeof parsed.longBreakCadence === "number" && parsed.longBreakCadence > 0
          ? parsed.longBreakCadence
          : DEFAULT_SETTINGS.longBreakCadence,
      autoStartBreaks:
        typeof parsed.autoStartBreaks === "boolean"
          ? parsed.autoStartBreaks
          : DEFAULT_SETTINGS.autoStartBreaks,
      autoStartFocus:
        typeof parsed.autoStartFocus === "boolean"
          ? parsed.autoStartFocus
          : DEFAULT_SETTINGS.autoStartFocus,
      strictBlocking:
        parsed.strictBlocking === "SUSPEND" || parsed.strictBlocking === "suspend"
          ? "SUSPEND"
          : "STRICT",
      acousticPreset:
        typeof parsed.acousticPreset === "string" && ["rain", "binaural", "space"].includes(parsed.acousticPreset)
          ? parsed.acousticPreset
          : DEFAULT_SETTINGS.acousticPreset,
      bgAmbienceVolume:
        typeof parsed.bgAmbienceVolume === "number"
          ? Math.max(0, Math.min(100, parsed.bgAmbienceVolume))
          : DEFAULT_SETTINGS.bgAmbienceVolume,
      completionChime:
        typeof parsed.completionChime === "boolean"
          ? parsed.completionChime
          : DEFAULT_SETTINGS.completionChime,
      theme:
        parsed.theme === "LIGHT" || parsed.theme === "DARK" || parsed.theme === "SYSTEM"
          ? parsed.theme
          : DEFAULT_SETTINGS.theme,
    };
  } catch (err) {
    console.warn("Could not parse stored settings, using defaults", err);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Saves new or partial settings to local storage and broadcasts to all tabs & listeners.
 */
export function saveStoredSettings(partial: Partial<UserSettingsPayload>): UserSettingsPayload {
  const current = getStoredSettings();
  const merged: UserSettingsPayload = {
    ...current,
    ...partial,
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(merged));
      window.dispatchEvent(
        new CustomEvent(SETTINGS_UPDATED_EVENT, { detail: merged })
      );

      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel("dnd-settings-channel");
        bc.postMessage({ type: "SETTINGS_SYNC", settings: merged });
        bc.close();
      }
    } catch (err) {
      console.error("Failed to save settings locally", err);
    }
  }

  return merged;
}

/**
 * Subscribes to settings updates (custom event, storage event, and broadcast channel).
 */
export function subscribeToSettings(callback: (settings: UserSettingsPayload) => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleCustomEvent = (e: Event) => {
    const detail = (e as CustomEvent<UserSettingsPayload>).detail;
    if (detail) {
      callback(detail);
    } else {
      callback(getStoredSettings());
    }
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === LOCAL_SETTINGS_KEY) {
      callback(getStoredSettings());
    }
  };

  let bc: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== "undefined") {
    try {
      bc = new BroadcastChannel("dnd-settings-channel");
      bc.onmessage = (ev) => {
        if (ev.data?.type === "SETTINGS_SYNC" && ev.data.settings) {
          callback(ev.data.settings);
        }
      };
    } catch {}
  }

  window.addEventListener(SETTINGS_UPDATED_EVENT, handleCustomEvent);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(SETTINGS_UPDATED_EVENT, handleCustomEvent);
    window.removeEventListener("storage", handleStorage);
    if (bc) {
      bc.close();
    }
  };
}
