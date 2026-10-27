/**
 * Blocklist storage and state manager for Do Not Disturb
 * Persists user's configured blocked website URLs in localStorage with sensible defaults.
 * Only the website URL is needed to block.
 */

import { normalizeDomain } from "./domain-utils";

export interface BlocklistEndpoint {
  id: string;
  url: string;
  domain: string; // hostname alias for display and network matching
  category?: string;
  deflections: number;
  active: boolean;
  icon: string;
  subdomainNote?: string;
  includeSubdomains?: boolean;
}

export interface DeflectionEventRecord {
  id: string;
  domain: string;
  url?: string;
  timestamp: number;
}

const STORAGE_KEY = "dnd_blocklist_endpoints";
const DEFLECTIONS_LOG_KEY = "dnd_deflection_events_log";
const LEGACY_CLEANED_FLAG = "dnd_cleaned_legacy_deflections_v1";

export const DEFLECTIONS_UPDATED_EVENT = "dnd-deflections-updated";

export const DEFAULT_ENDPOINTS: BlocklistEndpoint[] = [
  { id: "1", url: "youtube.com", domain: "youtube.com", deflections: 0, active: true, icon: "video" },
  { id: "2", url: "x.com", domain: "x.com", deflections: 0, active: true, icon: "hash" },
  { id: "3", url: "reddit.com", domain: "reddit.com", deflections: 0, active: true, icon: "chat" },
  { id: "4", url: "instagram.com", domain: "instagram.com", deflections: 0, active: true, icon: "camera" },
  { id: "5", url: "news.ycombinator.com", domain: "news.ycombinator.com", deflections: 0, active: true, icon: "news" },
  { id: "6", url: "netflix.com", domain: "netflix.com", deflections: 0, active: true, icon: "film" },
  { id: "7", url: "tiktok.com", domain: "tiktok.com", deflections: 0, active: true, icon: "music" },
  { id: "8", url: "discord.com", domain: "discord.com", deflections: 0, active: true, icon: "message" },
];

export function getStoredBlocklist(): BlocklistEndpoint[] {
  if (typeof window === "undefined") return DEFAULT_ENDPOINTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ENDPOINTS));
      return DEFAULT_ENDPOINTS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_ENDPOINTS;

    // Check if legacy dummy counts (312, 184, 147...) need cleanup
    if (!localStorage.getItem(LEGACY_CLEANED_FLAG)) {
      const dummyValues = new Set([312, 184, 147, 96, 58, 41, 23, 11]);
      const hasDummyDeflections = parsed.some((item) => dummyValues.has(item.deflections));
      if (hasDummyDeflections) {
        const sanitized = parsed.map((item) => ({
          ...item,
          deflections: dummyValues.has(item.deflections) ? 0 : item.deflections,
          url: item.url || item.domain,
          domain: item.domain || item.url,
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
        localStorage.setItem(LEGACY_CLEANED_FLAG, "true");
        return sanitized;
      }
      localStorage.setItem(LEGACY_CLEANED_FLAG, "true");
    }

    return parsed.map((item) => ({
      ...item,
      url: item.url || item.domain,
      domain: item.domain || item.url,
      deflections: typeof item.deflections === "number" ? item.deflections : 0,
    }));
  } catch {
    return DEFAULT_ENDPOINTS;
  }
}

export function saveStoredBlocklist(endpoints: BlocklistEndpoint[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(endpoints));
    // Trigger custom event so other components in the same window update immediately
    window.dispatchEvent(new CustomEvent("dnd-blocklist-updated", { detail: endpoints }));

    // Seamless background sync if authenticated
    if (typeof fetch !== "undefined" && navigator.onLine) {
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocklist: endpoints }),
      }).catch(() => {
        // Guest mode / offline: persists locally
      });
    }
  } catch (err) {
    console.error("Failed to persist blocklist:", err);
  }
}

export function addDomainToBlocklist(
  rawInput: string
): { success: boolean; error?: string; endpoint?: BlocklistEndpoint } {
  const normalized = normalizeDomain(rawInput);
  if (!normalized.isValid) {
    return { success: false, error: normalized.error };
  }

  const current = getStoredBlocklist();
  if (
    current.some(
      (item) =>
        (item.url || item.domain).toLowerCase() === normalized.hostname.toLowerCase()
    )
  ) {
    return { success: false, error: `'${normalized.hostname}' is already in your blocklist.` };
  }

  const newEndpoint: BlocklistEndpoint = {
    id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    url: normalized.hostname,
    domain: normalized.hostname,
    deflections: 0,
    active: true,
    icon: "link",
  };

  const updated = [newEndpoint, ...current];
  saveStoredBlocklist(updated);
  return { success: true, endpoint: newEndpoint };
}

export function toggleDomainActive(id: string): BlocklistEndpoint[] {
  const current = getStoredBlocklist();
  const updated = current.map((item) =>
    item.id === id ? { ...item, active: !item.active } : item
  );
  saveStoredBlocklist(updated);
  return updated;
}

export function removeDomainFromBlocklist(id: string): BlocklistEndpoint[] {
  const current = getStoredBlocklist();
  const updated = current.filter((item) => item.id !== id);
  saveStoredBlocklist(updated);
  return updated;
}

export function getDeflectionLogs(): DeflectionEventRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DEFLECTIONS_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordDeflectionEvent(domain: string, url?: string): void {
  if (typeof window === "undefined") return;
  try {
    const logs = getDeflectionLogs();
    const newLog: DeflectionEventRecord = {
      id: `defl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      domain,
      url,
      timestamp: Date.now(),
    };
    // Keep up to 100 recent deflection events
    const updated = [newLog, ...logs].slice(0, 100);
    localStorage.setItem(DEFLECTIONS_LOG_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(DEFLECTIONS_UPDATED_EVENT, { detail: updated }));
  } catch (err) {
    console.error("Failed to record deflection event:", err);
  }
}

export function incrementDeflection(urlOrDomain: string): void {
  const current = getStoredBlocklist();
  const lower = urlOrDomain.toLowerCase();
  let matched = false;

  const updated = current.map((item) => {
    const target = (item.url || item.domain).toLowerCase();
    if (lower.includes(target) || target.includes(lower)) {
      matched = true;
      return { ...item, deflections: (item.deflections || 0) + 1 };
    }
    return item;
  });

  saveStoredBlocklist(updated);
  recordDeflectionEvent(urlOrDomain);
}

export function getTotalDeflections(): number {
  const endpoints = getStoredBlocklist();
  return endpoints.reduce((sum, item) => sum + (item.deflections || 0), 0);
}

export function formatTimeAgo(timestamp: number): string {
  const diffSecs = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSecs < 60) return "Just now";
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function getRecentDeflections(limit = 4): { id: string; domain: string; timeAgo: string }[] {
  const logs = getDeflectionLogs();
  return logs.slice(0, limit).map((log) => ({
    id: log.id,
    domain: log.domain.replace(/^https?:\/\//i, ""),
    timeAgo: formatTimeAgo(log.timestamp),
  }));
}

export interface DeflectionDayStat {
  day: string; // "M", "T", etc.
  fullDay: string; // "Mon", "Tue"
  dayNumber: number; // 26
  dateFormatted: string; // "Oct 26"
  fullDate: string; // "Mon, Oct 26"
  dateStr: string; // "2026-10-26"
  count: number;
  h: number;
  isToday: boolean;
}

export function getDeflectionWeekDateRange(): string {
  if (typeof window === "undefined") return "";
  const now = new Date();
  const dayOfWeek = now.getDay();
  const distanceToMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday, 12, 0, 0);

  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 12, 0, 0);

  const startMonth = monday.toLocaleDateString("en-US", { month: "short" });
  const endMonth = sunday.toLocaleDateString("en-US", { month: "short" });

  return startMonth === endMonth
    ? `${startMonth} ${monday.getDate()} – ${sunday.getDate()}, ${sunday.getFullYear()}`
    : `${startMonth} ${monday.getDate()} – ${endMonth} ${sunday.getDate()}, ${sunday.getFullYear()}`;
}

export function getDeflectionsByDay(): DeflectionDayStat[] {
  if (typeof window === "undefined") return [];
  const logs = getDeflectionLogs();
  const now = new Date();

  const dayOfWeek = now.getDay();
  const distanceToMonday = (dayOfWeek + 6) % 7;
  // Use noon to avoid any midnight UTC/DST boundary shift
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday, 12, 0, 0);

  const counts: Record<string, number> = {};
  for (const log of logs) {
    const logDate = new Date(log.timestamp);
    const dateStr = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, "0")}-${String(logDate.getDate()).padStart(2, "0")}`;
    counts[dateStr] = (counts[dateStr] || 0) + 1;
  }

  const dayNames = ["M", "T", "W", "T", "F", "S", "S"];
  const fullDayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  let maxCount = 1;
  const rawList = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i, 12, 0, 0);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const count = counts[dateStr] || 0;
    if (count > maxCount) maxCount = count;

    const isToday =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();

    rawList.push({
      day: dayNames[i],
      fullDay: fullDayNames[i],
      dayNumber: d.getDate(),
      dateFormatted: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      fullDate: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      dateStr,
      count,
      isToday,
    });
  }

  return rawList.map((r) => ({
    ...r,
    h: r.count > 0 ? Math.max(15, Math.round((r.count / maxCount) * 100)) : 0,
  }));
}
