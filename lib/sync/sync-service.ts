import { getStoredBlocklist, saveStoredBlocklist, BlocklistEndpoint } from "../blocking/blocklist-store";
import { getStoredShortcuts, saveStoredShortcuts, DEFAULT_SHORTCUTS, ShortcutDef } from "../shortcuts/shortcuts-store";
import { getStoredSessions, saveStoredSessions } from "../sessions/session-store";
import { getStoredSettings, saveStoredSettings } from "../settings/settings-store";
import { SyncPayload, SerializedShortcut, UserSettingsPayload } from "./sync-types";

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

  return {
    blocklist,
    shortcuts,
    settings,
    sessions: getStoredSessions(),
    exportedAt: new Date().toISOString(),
    version: "1.0.0",
  };
}

/**
 * Applies cloud payload onto the local device stores.
 */
export function applyStateToDevice(payload: Partial<SyncPayload>): void {
  if (typeof window === "undefined") return;

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

  // 3. Sessions
  if (Array.isArray(payload.sessions)) {
    saveStoredSessions(payload.sessions);
  }

  // 3. Settings
  if (payload.settings) {
    saveStoredSettings(payload.settings);
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

  return {
    blocklist: mergedBlocklist,
    shortcuts: mergedShortcuts,
    settings: { ...(cloud.settings || {}), ...(local.settings || {}) },
    presets: cloud.presets || local.presets || [],
    streak: cloud.streak || local.streak,
    sessions: mergedSessions,
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
