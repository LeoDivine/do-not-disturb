import {
  getStoredBlocklist,
  saveStoredBlocklist,
  BlocklistEndpoint,
  getDeflectionLogs,
  saveStoredDeflectionLogs,
} from "../blocking/blocklist-store";
import { getStoredShortcuts, saveStoredShortcuts, DEFAULT_SHORTCUTS, ShortcutDef } from "../shortcuts/shortcuts-store";
import { getStoredSessions, saveStoredSessions, getSessionStats } from "../sessions/session-store";
import { getStoredSettings, saveStoredSettings } from "../settings/settings-store";
import { getStoredGamification, saveStoredGamification } from "../gamification/gamification-store";
import {
  SyncPayload,
  SerializedShortcut,
  UserSettingsPayload,
  TimerPresetPayload,
  UserStreakPayload,
  DeflectionLogPayload,
  UserGamificationState,
} from "./sync-types";

const LAST_SYNC_KEY = "dnd_last_sync_timestamp";

/**
 * Gathers all data stored on this device.
 */
export function gatherLocalState(): SyncPayload {
  const blocklist = getStoredBlocklist();
  const shortcuts = getStoredShortcuts().map((s) => ({
    actionType: s.actionType,
    keys: s.keys,
  }));

  const settings = getStoredSettings();
  const stats = typeof window !== "undefined" ? getSessionStats() : null;

  // Presets from local storage
  let presets: TimerPresetPayload[] = [];
  if (typeof window !== "undefined") {
    try {
      const rawPresets = localStorage.getItem("dnd_timer_presets");
      if (rawPresets) {
        const parsed = JSON.parse(rawPresets);
        if (Array.isArray(parsed)) presets = parsed;
      }
    } catch {}
  }

  const primaryAnchor = typeof window !== "undefined" ? localStorage.getItem("dnd_primary_anchor") || "" : "";
  const sessionIntent = typeof window !== "undefined" ? localStorage.getItem("dnd_session_intent") || "" : "";
  const visualMode = typeof window !== "undefined" ? localStorage.getItem("dnd_visual_mode") || "classic" : "classic";
  const shortcutsEnabled = typeof window !== "undefined" ? localStorage.getItem("dnd-shortcuts-enabled") !== "false" : true;
  const rawLogs = typeof window !== "undefined" ? getDeflectionLogs().slice(0, 100) : [];
  const deflectionLogs: DeflectionLogPayload[] = rawLogs.map((l) => ({
    id: l.id,
    domain: l.domain,
    url: l.url,
    timestamp: l.timestamp,
  }));

  return {
    blocklist,
    shortcuts,
    settings,
    presets,
    streak: stats
      ? {
          currentStreak: stats.currentStreak,
          longestStreak: stats.longestStreak,
          totalFocusHours: parseFloat(stats.totalFocusHours) || 0,
          lastActiveDate: new Date().toISOString(),
        }
      : undefined,
    sessions: getStoredSessions(),
    gamification: getStoredGamification(),
    primaryAnchor,
    sessionIntent,
    visualMode,
    shortcutsEnabled,
    deflectionLogs,
    exportedAt: new Date().toISOString(),
    version: "1.0.0",
  };
}

/**
 * Validates and sanitizes a sync payload before applying it.
 */
export function sanitizeSyncPayload(data: any): Partial<SyncPayload> {
  if (!data || typeof data !== "object") return {};
  const sanitized: Partial<SyncPayload> = {};

  if (Array.isArray(data.blocklist)) {
    sanitized.blocklist = data.blocklist
      .filter((b: any) => b && (typeof b.url === "string" || typeof b.domain === "string"))
      .map((b: any) => ({
        id: typeof b.id === "string" ? b.id : `b_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        url: String(b.url || b.domain).toLowerCase().trim(),
        domain: String(b.domain || b.url).toLowerCase().trim(),
        active: b.active !== false,
        deflections: typeof b.deflections === "number" ? Math.max(0, b.deflections) : 0,
        icon: typeof b.icon === "string" ? b.icon : "link",
      }));
  }

  if (Array.isArray(data.shortcuts)) {
    sanitized.shortcuts = data.shortcuts
      .filter((s: any) => s && typeof s.actionType === "string" && Array.isArray(s.keys))
      .map((s: any) => ({
        actionType: String(s.actionType).trim(),
        keys: s.keys.filter((k: any) => typeof k === "string"),
      }));
  }

  if (data.settings && typeof data.settings === "object") {
    sanitized.settings = {
      deepFocusMinutes: typeof data.settings.deepFocusMinutes === "number" ? data.settings.deepFocusMinutes : 25,
      shortBreakMinutes: typeof data.settings.shortBreakMinutes === "number" ? data.settings.shortBreakMinutes : 5,
      longBreakMinutes: typeof data.settings.longBreakMinutes === "number" ? data.settings.longBreakMinutes : 15,
      longBreakCadence: typeof data.settings.longBreakCadence === "number" ? data.settings.longBreakCadence : 4,
      autoStartBreaks: Boolean(data.settings.autoStartBreaks),
      autoStartFocus: Boolean(data.settings.autoStartFocus),
      strictBlocking: data.settings.strictBlocking === "SUSPEND" ? "SUSPEND" : "STRICT",
      acousticPreset: typeof data.settings.acousticPreset === "string" ? data.settings.acousticPreset : "rain",
      bgAmbienceVolume: typeof data.settings.bgAmbienceVolume === "number" ? Math.min(100, Math.max(0, data.settings.bgAmbienceVolume)) : 65,
      completionChime: Boolean(data.settings.completionChime),
    };
  }

  if (Array.isArray(data.presets)) {
    sanitized.presets = data.presets
      .filter((p: any) => p && typeof p.name === "string")
      .map((p: any) => ({
        name: String(p.name).trim(),
        focusMinutes: typeof p.focusMinutes === "number" ? p.focusMinutes : 25,
        shortBreak: typeof p.shortBreak === "number" ? p.shortBreak : 5,
        longBreak: typeof p.longBreak === "number" ? p.longBreak : 15,
        cycles: typeof p.cycles === "number" ? p.cycles : 4,
        isDefault: Boolean(p.isDefault),
      }));
  }

  if (Array.isArray(data.sessions)) {
    sanitized.sessions = data.sessions
      .filter((s: any) => s && s.startedAt && !isNaN(new Date(s.startedAt).getTime()))
      .map((s: any) => ({
        id: typeof s.id === "string" ? s.id : `sess_${Date.now()}`,
        sessionCode: typeof s.sessionCode === "string" ? s.sessionCode : undefined,
        timeDisplay: typeof s.timeDisplay === "string" ? s.timeDisplay : "",
        startedAt: new Date(s.startedAt).toISOString(),
        completedAt: s.completedAt ? new Date(s.completedAt).toISOString() : new Date(s.startedAt).toISOString(),
        mode: s.mode === "shortBreak" || s.mode === "longBreak" ? s.mode : "focus",
        protocol: typeof s.protocol === "string" ? s.protocol : "Deep Focus",
        target: typeof s.target === "string" ? s.target : "25:00 / 25:00",
        plannedSeconds: typeof s.plannedSeconds === "number" ? s.plannedSeconds : 1500,
        actualSeconds: typeof s.actualSeconds === "number" ? s.actualSeconds : 0,
        blocks: typeof s.blocks === "string" ? s.blocks : "0 distracted attempts",
        blockColor: typeof s.blockColor === "string" ? s.blockColor : "text-emerald-500",
        status: s.status === "Ended early" ? "Ended early" : "Completed",
        statusSuccess: s.statusSuccess !== false,
        deflectionsCount: typeof s.deflectionsCount === "number" ? s.deflectionsCount : 0,
        goal: typeof s.goal === "string" ? s.goal : undefined,
        intent: typeof s.intent === "string" ? s.intent : undefined,
        notes: typeof s.notes === "string" ? s.notes : undefined,
      }));
  }

  if (data.gamification && typeof data.gamification === "object") {
    sanitized.gamification = {
      level: typeof data.gamification.level === "number" ? Math.max(1, data.gamification.level) : 1,
      currentXp: typeof data.gamification.currentXp === "number" ? Math.max(0, data.gamification.currentXp) : 0,
      nextLevelXp: typeof data.gamification.nextLevelXp === "number" ? Math.max(1, data.gamification.nextLevelXp) : 300,
      totalXp: typeof data.gamification.totalXp === "number" ? Math.max(0, data.gamification.totalXp) : 0,
      streakTokens: typeof data.gamification.streakTokens === "number" ? Math.max(0, data.gamification.streakTokens) : 2,
      totalShieldsRepelled: typeof data.gamification.totalShieldsRepelled === "number" ? Math.max(0, data.gamification.totalShieldsRepelled) : 0,
      lastActiveDate: typeof data.gamification.lastActiveDate === "string" ? data.gamification.lastActiveDate : null,
      unlockedAchievementIds: Array.isArray(data.gamification.unlockedAchievementIds)
        ? data.gamification.unlockedAchievementIds.filter((id: any) => typeof id === "string")
        : [],
      unlockedAchievementDates:
        data.gamification.unlockedAchievementDates && typeof data.gamification.unlockedAchievementDates === "object"
          ? data.gamification.unlockedAchievementDates
          : {},
    };
  }

  if (typeof data.primaryAnchor === "string") sanitized.primaryAnchor = data.primaryAnchor;
  if (typeof data.sessionIntent === "string") sanitized.sessionIntent = data.sessionIntent;
  if (typeof data.visualMode === "string") sanitized.visualMode = data.visualMode;
  if (typeof data.shortcutsEnabled === "boolean") sanitized.shortcutsEnabled = data.shortcutsEnabled;

  return sanitized;
}

/**
 * Applies cloud payload onto the local device stores.
 */
export function applyStateToDevice(rawPayload: Partial<SyncPayload>): void {
  if (typeof window === "undefined") return;
  const payload = sanitizeSyncPayload(rawPayload);

  // 1. Blocklist
  if (Array.isArray(payload.blocklist)) {
    saveStoredBlocklist(payload.blocklist);
  }

  // 2. Shortcuts
  if (Array.isArray(payload.shortcuts)) {
    const fullDefs: ShortcutDef[] = DEFAULT_SHORTCUTS.map((def) => {
      const match = payload.shortcuts?.find((s) => s.actionType === def.actionType);
      return match ? { ...def, keys: match.keys } : def;
    });
    saveStoredShortcuts(fullDefs);
  }

  // 3. Sessions (Union merge: never delete local recorded sessions during cloud pull)
  if (Array.isArray(payload.sessions) && payload.sessions.length > 0) {
    const localSessions = getStoredSessions();
    const existingIds = new Set(localSessions.map((s) => s.id || `${s.startedAt}_${s.mode}`));
    const existingTimes = new Set(localSessions.map((s) => new Date(s.startedAt).getTime()));

    const merged = [...localSessions];
    for (const cloudSession of payload.sessions) {
      const idKey = cloudSession.id || `${cloudSession.startedAt}_${cloudSession.mode}`;
      const timeKey = new Date(cloudSession.startedAt).getTime();
      if (!existingIds.has(idKey) && !existingTimes.has(timeKey)) {
        merged.push(cloudSession);
        existingIds.add(idKey);
        existingTimes.add(timeKey);
      }
    }
    merged.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    saveStoredSessions(merged);
  }

  // 4. Settings
  if (payload.settings) {
    saveStoredSettings(payload.settings);
  }

  // 5. Presets
  if (Array.isArray(payload.presets) && payload.presets.length > 0) {
    try {
      localStorage.setItem("dnd_timer_presets", JSON.stringify(payload.presets));
      window.dispatchEvent(new CustomEvent("dnd-presets-updated"));
    } catch {}
  }

  // 6. Streak
  if (payload.streak) {
    try {
      const existingRaw = localStorage.getItem("dnd_synced_streak");
      const existing = existingRaw ? JSON.parse(existingRaw) : {};
      const mergedStreak = {
        currentStreak: Math.max(existing.currentStreak ?? 0, payload.streak.currentStreak ?? 0),
        longestStreak: Math.max(existing.longestStreak ?? 0, payload.streak.longestStreak ?? 0),
        totalFocusHours: Math.max(existing.totalFocusHours ?? 0, payload.streak.totalFocusHours ?? 0),
        lastActiveDate: payload.streak.lastActiveDate || existing.lastActiveDate || new Date().toISOString(),
      };
      localStorage.setItem("dnd_synced_streak", JSON.stringify(mergedStreak));
      window.dispatchEvent(new CustomEvent("dnd-sessions-updated"));
    } catch {}
  }

  // 7. Gamification & XP State
  if (payload.gamification) {
    const current = getStoredGamification();
    const targetTotalXp = Math.max(current.totalXp, payload.gamification.totalXp ?? 0);
    const targetLevel = Math.max(current.level, payload.gamification.level ?? 1);
    const targetTokens = Math.max(current.streakTokens, payload.gamification.streakTokens ?? 2);
    const targetShields = Math.max(current.totalShieldsRepelled, payload.gamification.totalShieldsRepelled ?? 0);

    const mergedAchievementIds = Array.from(
      new Set([
        ...current.unlockedAchievementIds,
        ...(payload.gamification.unlockedAchievementIds || []),
      ])
    );

    const mergedAchievementDates = {
      ...(current.unlockedAchievementDates || {}),
      ...(payload.gamification.unlockedAchievementDates || {}),
    };

    saveStoredGamification({
      ...current,
      ...payload.gamification,
      level: targetLevel,
      totalXp: targetTotalXp,
      streakTokens: targetTokens,
      totalShieldsRepelled: targetShields,
      unlockedAchievementIds: mergedAchievementIds,
      unlockedAchievementDates: mergedAchievementDates,
    });
  }

  // 8. Focus Goal & Session Intent
  if (typeof payload.primaryAnchor === "string" && payload.primaryAnchor.trim()) {
    const localAnchor = localStorage.getItem("dnd_primary_anchor") || "";
    if (!localAnchor.trim()) {
      localStorage.setItem("dnd_primary_anchor", payload.primaryAnchor);
      window.dispatchEvent(new CustomEvent("dnd-anchor-updated", { detail: payload.primaryAnchor }));
    }
  }
  if (typeof payload.sessionIntent === "string" && payload.sessionIntent.trim()) {
    const localIntent = localStorage.getItem("dnd_session_intent") || "";
    if (!localIntent.trim()) {
      localStorage.setItem("dnd_session_intent", payload.sessionIntent);
      window.dispatchEvent(new CustomEvent("dnd-intent-updated", { detail: payload.sessionIntent }));
    }
  }

  // 9. Visualizer Theme
  if (typeof payload.visualMode === "string" && payload.visualMode) {
    localStorage.setItem("dnd_visual_mode", payload.visualMode);
    window.dispatchEvent(new CustomEvent("dnd-visual-mode-updated", { detail: payload.visualMode }));
  }

  // 10. Master Shortcuts Toggle
  if (typeof payload.shortcutsEnabled === "boolean") {
    localStorage.setItem("dnd-shortcuts-enabled", String(payload.shortcutsEnabled));
    window.dispatchEvent(new CustomEvent("dnd-shortcuts-enabled-updated", { detail: payload.shortcutsEnabled }));
  }

  // 11. Deflection Logs History
  if (Array.isArray(payload.deflectionLogs) && payload.deflectionLogs.length > 0) {
    const existingLogs = getDeflectionLogs();
    const existingIds = new Set(existingLogs.map((l) => `${l.domain}_${l.timestamp}`));
    const mergedLogs = [...existingLogs];
    for (const log of payload.deflectionLogs) {
      const key = `${log.domain}_${log.timestamp}`;
      if (!existingIds.has(key)) {
        mergedLogs.push({
          id: log.id || `defl_${log.timestamp}_${Math.random().toString(36).slice(2, 6)}`,
          domain: log.domain,
          url: log.url,
          timestamp: log.timestamp,
        });
        existingIds.add(key);
      }
    }
    mergedLogs.sort((a, b) => b.timestamp - a.timestamp);
    saveStoredDeflectionLogs(mergedLogs.slice(0, 100));
  }

  localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
}

/**
 * Merges local device state into a cloud payload without duplicates.
 */
export function mergeLocalWithCloud(
  local: SyncPayload,
  cloud: Partial<SyncPayload>
): SyncPayload {
  // Merge blocklists by URL/domain
  const cloudEndpoints = cloud.blocklist || [];
  const existingUrls = new Set(
    cloudEndpoints.map((e) => (e.url || e.domain || "").toLowerCase())
  );
  const mergedBlocklist: BlocklistEndpoint[] = [...cloudEndpoints];

  for (const localEndpoint of local.blocklist) {
    const urlKey = (localEndpoint.url || localEndpoint.domain || "").toLowerCase();
    if (!existingUrls.has(urlKey)) {
      mergedBlocklist.push(localEndpoint);
      existingUrls.add(urlKey);
    }
  }

  // Merge shortcuts: local overrides take precedence if modified
  const cloudShortcuts = cloud.shortcuts || [];
  const mergedShortcuts: SerializedShortcut[] = [];
  const handledActions = new Set<string>();

  for (const s of local.shortcuts) {
    mergedShortcuts.push(s);
    handledActions.add(s.actionType);
  }
  for (const s of cloudShortcuts) {
    if (!handledActions.has(s.actionType)) {
      mergedShortcuts.push(s);
      handledActions.add(s.actionType);
    }
  }

  // Merge sessions without duplicates
  const cloudSessions = cloud.sessions || [];
  const existingSessionIds = new Set(cloudSessions.map((s) => s.id));
  const mergedSessions = [...cloudSessions];
  for (const s of local.sessions || []) {
    if (!existingSessionIds.has(s.id)) {
      mergedSessions.push(s);
      existingSessionIds.add(s.id);
    }
  }

  // Merge gamification (highest progress wins)
  let mergedGamification: Partial<UserGamificationState> | undefined = undefined;
  if (local.gamification || cloud.gamification) {
    const lg = local.gamification;
    const cg = cloud.gamification;
    const totalXp = Math.max(lg?.totalXp ?? 0, cg?.totalXp ?? 0);
    const level = Math.max(lg?.level ?? 1, cg?.level ?? 1);
    const streakTokens = Math.max(lg?.streakTokens ?? 2, cg?.streakTokens ?? 2);
    const totalShieldsRepelled = Math.max(lg?.totalShieldsRepelled ?? 0, cg?.totalShieldsRepelled ?? 0);

    const mergedUnlockedIds = Array.from(
      new Set([
        ...(lg?.unlockedAchievementIds || []),
        ...(cg?.unlockedAchievementIds || []),
      ])
    );

    const mergedDates = {
      ...(cg?.unlockedAchievementDates || {}),
      ...(lg?.unlockedAchievementDates || {}),
    };

    mergedGamification = {
      ...(cg || {}),
      ...(lg || {}),
      totalXp,
      level,
      streakTokens,
      totalShieldsRepelled,
      unlockedAchievementIds: mergedUnlockedIds,
      unlockedAchievementDates: mergedDates,
    };
  }

  // Merge presets
  const cloudPresets = cloud.presets || [];
  const existingPresetNames = new Set(cloudPresets.map((p) => p.name.toLowerCase()));
  const mergedPresets: TimerPresetPayload[] = [...cloudPresets];
  for (const p of local.presets || []) {
    if (!existingPresetNames.has(p.name.toLowerCase())) {
      mergedPresets.push(p);
      existingPresetNames.add(p.name.toLowerCase());
    }
  }

  // Merge streak: highest numbers win
  let mergedStreak: Partial<UserStreakPayload> | undefined = undefined;
  if (local.streak || cloud.streak) {
    const ls = local.streak;
    const cs = cloud.streak;
    mergedStreak = {
      currentStreak: Math.max(ls?.currentStreak ?? 0, cs?.currentStreak ?? 0),
      longestStreak: Math.max(ls?.longestStreak ?? 0, cs?.longestStreak ?? 0),
      totalFocusHours: Math.max(ls?.totalFocusHours ?? 0, cs?.totalFocusHours ?? 0),
      lastActiveDate: ls?.lastActiveDate || cs?.lastActiveDate || new Date().toISOString(),
    };
  }

  // Merge deflection logs (union of up to 100 recent)
  const existingLogKeys = new Set((cloud.deflectionLogs || []).map((l) => `${l.domain}_${l.timestamp}`));
  const mergedLogs: DeflectionLogPayload[] = [...(cloud.deflectionLogs || [])];
  for (const log of local.deflectionLogs || []) {
    const key = `${log.domain}_${log.timestamp}`;
    if (!existingLogKeys.has(key)) {
      mergedLogs.push(log);
      existingLogKeys.add(key);
    }
  }
  mergedLogs.sort((a, b) => b.timestamp - a.timestamp);

  return {
    blocklist: mergedBlocklist,
    shortcuts: mergedShortcuts,
    settings: { ...(cloud.settings || {}), ...(local.settings || {}) },
    presets: mergedPresets,
    streak: mergedStreak,
    sessions: mergedSessions,
    gamification: mergedGamification,
    primaryAnchor: local.primaryAnchor || cloud.primaryAnchor,
    sessionIntent: local.sessionIntent || cloud.sessionIntent,
    visualMode: local.visualMode || cloud.visualMode,
    shortcutsEnabled: local.shortcutsEnabled ?? cloud.shortcutsEnabled,
    deflectionLogs: mergedLogs.slice(0, 100),
    exportedAt: new Date().toISOString(),
    version: "1.0.0",
  };
}

/**
 * Downloads a complete JSON export file.
 */
export function exportDataAsJSON(): void {
  const data = gatherLocalState();
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dnd-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Imports a JSON file into this device.
 */
export async function importDataFromJSON(file: File): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (!parsed || typeof parsed !== "object") {
          throw new Error("Invalid backup format");
        }
        applyStateToDevice(parsed);
        resolve(true);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

/**
 * Wipes all Do Not Disturb local data and preferences from this device's storage.
 */
export function clearAllLocalDeviceData(): void {
  if (typeof window === "undefined") return;
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && (k.startsWith("dnd") || k.includes("timer") || k.includes("blocklist"))) {
      keysToRemove.push(k);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));

  // Dispatch change events so stores and listeners reset cleanly to initial states
  window.dispatchEvent(new CustomEvent("dnd-sessions-updated"));
  window.dispatchEvent(new CustomEvent("dnd-settings-updated"));
  window.dispatchEvent(new CustomEvent("dnd-blocklist-updated"));
  window.dispatchEvent(new CustomEvent("dnd-presets-updated"));
  window.dispatchEvent(new CustomEvent("dnd-gamification-updated"));
  window.dispatchEvent(new CustomEvent("dnd-shortcuts-updated"));
  window.dispatchEvent(new CustomEvent("dnd-visual-mode-updated", { detail: "classic" }));
  window.dispatchEvent(new CustomEvent("dnd-anchor-updated", { detail: "" }));
  window.dispatchEvent(new CustomEvent("dnd-intent-updated", { detail: "" }));
}
