import { BlocklistEndpoint } from "../blocking/blocklist-store";
import { SessionHistoryRecord } from "../sessions/session-store";
import { UserGamificationState } from "../gamification/types";

export type { UserGamificationState };

export interface SerializedShortcut {
  actionType: string;
  keys: string[];
}

export interface UserSettingsPayload {
  deepFocusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakCadence: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  strictBlocking: "STRICT" | "SUSPEND";
  acousticPreset: string;
  bgAmbienceVolume: number;
  completionChime: boolean;
  theme: "LIGHT" | "DARK" | "SYSTEM";
}

export interface TimerPresetPayload {
  name: string;
  focusMinutes: number;
  shortBreak: number;
  longBreak: number;
  cycles: number;
  isDefault?: boolean;
}

export interface UserStreakPayload {
  currentStreak: number;
  longestStreak: number;
  totalFocusHours: number;
  lastActiveDate?: string | null;
}

export interface DeflectionLogPayload {
  id: string;
  domain: string;
  url?: string;
  timestamp: number;
}

export interface SyncPayload {
  blocklist: BlocklistEndpoint[];
  shortcuts: SerializedShortcut[];
  settings?: Partial<UserSettingsPayload>;
  presets?: TimerPresetPayload[];
  streak?: Partial<UserStreakPayload>;
  sessions?: SessionHistoryRecord[];
  gamification?: Partial<UserGamificationState>;
  primaryAnchor?: string;
  sessionIntent?: string;
  visualMode?: string;
  shortcutsEnabled?: boolean;
  deflectionLogs?: DeflectionLogPayload[];
  exportedAt?: string;
  version?: string;
}

export type StorageMode = "local" | "cloud";

export type SyncState = "idle" | "syncing" | "synced" | "offline" | "error";

export interface SyncStatus {
  mode: StorageMode;
  state: SyncState;
  lastSyncedAt: string | null;
  error?: string | null;
  user?: {
    id: string;
    email: string | null;
    name: string | null;
    avatarUrl?: string | null;
  } | null;
}
