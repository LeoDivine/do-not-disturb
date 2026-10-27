/**
 * Focus Session History & Analytics Store
 * Local-first storage for user focus sessions, daily rhythms, and habit streaks.
 */

import { getDeflectionLogs } from "../blocking/blocklist-store";

export interface SessionHistoryRecord {
  id: string;
  sessionCode: string;
  timeDisplay: string;
  startedAt: string; // ISO
  completedAt: string; // ISO
  mode: "focus" | "shortBreak" | "longBreak";
  protocol: string;
  target: string;
  targetAlert?: boolean;
  plannedSeconds: number;
  actualSeconds: number;
  blocks: string;
  blockColor: string;
  status: "Completed" | "Ended early";
  statusSuccess: boolean;
  deflectionsCount: number;
  goal?: string;
  intent?: string;
}

export interface DayFocusStat {
  day: string; // "Mon", "Tue", etc.
  shortDay: string; // "M", "T", etc.
  dayNumber: number; // 26
  dateFormatted: string; // "Oct 26"
  fullDate: string; // "Mon, Oct 26"
  dateStr: string; // YYYY-MM-DD
  hours: number;
  label: string;
  isToday: boolean;
  isPlaceholder?: boolean;
}

export interface SessionStats {
  totalFocusSeconds: number;
  totalFocusHours: string;
  weeklyFocusHours: string;
  todayFocusSeconds: number;
  todayFocusFormatted: string;
  completedCount: number;
  totalCount: number;
  completionRate: string;
  currentStreak: number;
  longestStreak: number;
  totalDeflections: number;
  weekDateRange: string;
  daysThisWeek: DayFocusStat[];
  peakWindow: {
    start: string;
    end: string;
    durationHours: string;
    description: string;
    confidenceText: string;
  } | null;
  distractionFreeRate: string;
}

export const EMPTY_SESSION_STATS: SessionStats = {
  totalFocusSeconds: 0,
  totalFocusHours: "0.0",
  weeklyFocusHours: "0.0",
  todayFocusSeconds: 0,
  todayFocusFormatted: "0m",
  completedCount: 0,
  totalCount: 0,
  completionRate: "0.0%",
  currentStreak: 0,
  longestStreak: 0,
  totalDeflections: 0,
  weekDateRange: "",
  daysThisWeek: [],
  peakWindow: null,
  distractionFreeRate: "100%",
};

const STORAGE_KEY = "dnd_focus_sessions";
const LEGACY_CLEANED_KEY = "dnd_cleaned_dummy_sessions_v1";

export const SESSIONS_UPDATED_EVENT = "dnd-sessions-updated";

/**
 * Clean up any legacy dummy sessions from initial development if present
 */
function cleanupLegacyDummyData(records: any[]): SessionHistoryRecord[] {
  if (typeof window === "undefined") return [];
  const dummyIds = new Set(["#SESS-4029", "#SESS-4028", "#SESS-4027", "#SESS-4026", "#SESS-4025"]);
  return records.filter((r) => r && !dummyIds.has(r.id) && !dummyIds.has(r.sessionCode));
}

export function getStoredSessions(): SessionHistoryRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Filter out dummy data
    const cleaned = cleanupLegacyDummyData(parsed);

    // De-duplicate any accidental duplicate records within 3.5s of each other
    const sanitized: SessionHistoryRecord[] = [];
    for (let i = 0; i < cleaned.length; i++) {
      const item = cleaned[i];
      if (!item || !item.startedAt) continue;
      if (sanitized.length > 0) {
        const prev = sanitized[sanitized.length - 1];
        const prevTime = new Date(prev.completedAt || prev.startedAt).getTime();
        const itemTime = new Date(item.completedAt || item.startedAt).getTime();
        if (prev.mode === item.mode && Math.abs(prevTime - itemTime) < 3500) {
          continue; // Skip duplicate adjacent entry
        }
      }
      sanitized.push(item);
    }

    return sanitized;
  } catch {
    return [];
  }
}

export function saveStoredSessions(sessions: SessionHistoryRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    window.dispatchEvent(new CustomEvent(SESSIONS_UPDATED_EVENT, { detail: sessions }));
  } catch (err) {
    console.error("Failed to save focus sessions:", err);
  }
}

export function clearStoredSessions(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(SESSIONS_UPDATED_EVENT, { detail: [] }));
  } catch (err) {
    console.error("Failed to clear sessions:", err);
  }
}

export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function formatTimeDisplay(date: Date): string {
  const now = new Date();
  const isToday = isSameDay(date, now);

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = isSameDay(date, yesterday);

  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) {
    return `Today, ${timeStr}`;
  }
  if (isYesterday) {
    return `Yesterday, ${timeStr}`;
  }

  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `${dateStr}, ${timeStr}`;
}

export function recordCompletedSession(params: {
  mode: "focus" | "shortBreak" | "longBreak";
  plannedSeconds: number;
  actualSeconds: number;
  deflectionsCount?: number;
  endedEarly?: boolean;
  goal?: string;
  intent?: string;
}): SessionHistoryRecord | null {
  // Only focus sessions are tracked as formal focus session history
  if (params.mode !== "focus") {
    return null;
  }

  const sessions = getStoredSessions();
  const now = Date.now();

  // Guard against duplicate session recording within 3.5s
  if (sessions.length > 0) {
    const recent = sessions[0];
    const recentTime = new Date(recent.completedAt || recent.startedAt).getTime();
    if (recent.mode === params.mode && Math.abs(now - recentTime) < 3500) {
      return recent;
    }
  }

  const count = sessions.length + 1;
  const sessionCode = `#SESS-${String(count).padStart(4, "0")}`;

  const startedAt = new Date(now - params.actualSeconds * 1000);
  const completedAt = new Date(now);

  const isSuccess = !params.endedEarly && params.actualSeconds >= params.plannedSeconds;

  // Accurately compute deflections that occurred during this specific session interval
  let deflections = params.deflectionsCount;
  if (deflections === undefined && typeof window !== "undefined") {
    try {
      const allLogs = getDeflectionLogs();
      const sStart = startedAt.getTime();
      const sEnd = completedAt.getTime();
      deflections = allLogs.filter((d) => d.timestamp >= sStart && d.timestamp <= sEnd).length;
    } catch {
      deflections = 0;
    }
  }
  if (deflections === undefined) {
    deflections = 0;
  }

  let blocksDesc = "";
  let blockColor = "text-[#64748b] dark:text-[#7e8c9f]";

  if (deflections === 0) {
    blocksDesc = "0 distractions (In the zone)";
    blockColor = "text-emerald-500 dark:text-emerald-400";
  } else {
    blocksDesc = `${deflections} distraction${deflections > 1 ? "s" : ""} prevented`;
    blockColor = "text-amber-500 dark:text-amber-400";
  }

  const plannedMins = Math.round(params.plannedSeconds / 60);
  const protocolName = `Deep Focus (${plannedMins}m)`;

  const formatSecs = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const targetStr = `${formatSecs(params.actualSeconds)} / ${formatSecs(params.plannedSeconds)}`;

  const newRecord: SessionHistoryRecord = {
    id: `sess_${now}`,
    sessionCode,
    timeDisplay: formatTimeDisplay(startedAt),
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    mode: params.mode,
    protocol: protocolName,
    target: targetStr,
    targetAlert: Boolean(params.endedEarly),
    plannedSeconds: params.plannedSeconds,
    actualSeconds: params.actualSeconds,
    blocks: blocksDesc,
    blockColor,
    status: isSuccess ? "Completed" : "Ended early",
    statusSuccess: isSuccess,
    deflectionsCount: deflections,
    goal: params.goal,
    intent: params.intent,
  };

  const updated = [newRecord, ...sessions];
  saveStoredSessions(updated);
  return newRecord;
}

/**
 * Calculates accurate statistics from real recorded sessions
 */
export function getSessionStats(): SessionStats {
  if (typeof window === "undefined") {
    return EMPTY_SESSION_STATS;
  }

  const sessions = getStoredSessions();
  const focusSessions = sessions.filter((s) => s.mode === "focus");

  let totalFocusSeconds = 0;
  let todayFocusSeconds = 0;
  let weeklyFocusSeconds = 0;
  let completedCount = 0;
  let totalDeflections = 0;

  const now = new Date();
  const todayDateStr = toLocalDateString(now);

  // Compute Monday of current week (ISO week: 1=Mon, ..., 0=Sun)
  const dayOfWeek = now.getDay();
  const distanceToMonday = (dayOfWeek + 6) % 7;
  // Use local noon to prevent any midnight UTC/DST boundary date shift
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday, 12, 0, 0);

  // Map of local date string YYYY-MM-DD -> focus seconds
  const dailyFocusSecondsMap: Record<string, number> = {};
  const hourCounts: Record<number, number> = {};

  // For streak calculation
  const activeDaysSet = new Set<string>();

  for (const s of focusSessions) {
    const start = new Date(s.startedAt);
    const dateStr = toLocalDateString(start);

    totalFocusSeconds += s.actualSeconds;
    totalDeflections += s.deflectionsCount || 0;

    if (s.statusSuccess) {
      completedCount++;
      activeDaysSet.add(dateStr);
    }

    if (dateStr === todayDateStr) {
      todayFocusSeconds += s.actualSeconds;
    }

    const weekStartMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday, 0, 0, 0);
    if (start >= weekStartMidnight) {
      weeklyFocusSeconds += s.actualSeconds;
    }

    dailyFocusSecondsMap[dateStr] = (dailyFocusSecondsMap[dateStr] || 0) + s.actualSeconds;

    // Peak window tracking
    const hour = start.getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  }

  // Calculate current streak
  let currentStreak = 0;
  let checkDate = new Date(now);

  // If no activity today, check if yesterday was active
  if (!activeDaysSet.has(todayDateStr)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (activeDaysSet.has(toLocalDateString(checkDate))) {
    currentStreak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Calculate longest streak
  const sortedActiveDays = Array.from(activeDaysSet).sort();
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  for (const dateStr of sortedActiveDays) {
    const [y, m, dNum] = dateStr.split("-").map(Number);
    const d = new Date(y, m - 1, dNum, 12, 0, 0);
    if (!prevDate) {
      tempStreak = 1;
    } else {
      const diffDays = Math.round((d.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    prevDate = d;
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
  }

  // Generate 7-day week breakdown (Mon - Sun)
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const shortNames = ["M", "T", "W", "T", "F", "S", "S"];
  const daysThisWeek: DayFocusStat[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i, 12, 0, 0);
    const dateStr = toLocalDateString(d);
    const secs = dailyFocusSecondsMap[dateStr] || 0;
    const hours = Number((secs / 3600).toFixed(1));
    const isToday = isSameDay(d, now);
    const dayNumber = d.getDate();
    const dateFormatted = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const fullDate = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

    daysThisWeek.push({
      day: dayNames[i],
      shortDay: shortNames[i],
      dayNumber,
      dateFormatted,
      fullDate,
      dateStr,
      hours,
      label: hours > 0 ? `${hours}h` : "",
      isToday,
      isPlaceholder: hours === 0 && d > now,
    });
  }

  // Week date range: e.g. "Oct 26 – Nov 1, 2026"
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const startMonth = monday.toLocaleDateString("en-US", { month: "short" });
  const endMonth = sunday.toLocaleDateString("en-US", { month: "short" });
  const weekDateRange =
    startMonth === endMonth
      ? `${startMonth} ${monday.getDate()} – ${sunday.getDate()}, ${sunday.getFullYear()}`
      : `${startMonth} ${monday.getDate()} – ${endMonth} ${sunday.getDate()}, ${sunday.getFullYear()}`;

  // Determine Peak Cognitive Window
  let peakWindow: SessionStats["peakWindow"] = null;
  if (focusSessions.length >= 3) {
    let bestHour = 9;
    let maxCount = -1;
    for (let h = 0; h < 24; h++) {
      const windowSum = (hourCounts[h] || 0) + (hourCounts[(h + 1) % 24] || 0) + (hourCounts[(h + 2) % 24] || 0);
      if (windowSum > maxCount) {
        maxCount = windowSum;
        bestHour = h;
      }
    }

    if (maxCount > 0) {
      const formatHour = (h: number) => {
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 === 0 ? 12 : h % 12;
        return `${String(h12).padStart(2, "0")}:00 ${ampm}`;
      };

      peakWindow = {
        start: formatHour(bestHour),
        end: formatHour((bestHour + 3) % 24),
        durationHours: "3.0h",
        description: "You consistently get into your best flow during this window with fewer distractions.",
        confidenceText: `Based on your ${focusSessions.length} recorded focus session${focusSessions.length > 1 ? "s" : ""}`,
      };
    }
  }

  // Distraction free sessions rate
  const distractionFreeCount = focusSessions.filter((s) => (s.deflectionsCount || 0) === 0).length;
  const distractionFreeRate =
    focusSessions.length > 0
      ? `${((distractionFreeCount / focusSessions.length) * 100).toFixed(1)}%`
      : "100%";

  // Formatted today focus string
  const todayMins = Math.round(todayFocusSeconds / 60);
  let todayFormatted = "0m";
  if (todayMins >= 60) {
    const h = Math.floor(todayMins / 60);
    const m = todayMins % 60;
    todayFormatted = m > 0 ? `${h}h ${m}m` : `${h}h`;
  } else if (todayMins > 0) {
    todayFormatted = `${todayMins}m`;
  }

  return {
    totalFocusSeconds,
    totalFocusHours: (totalFocusSeconds / 3600).toFixed(1),
    weeklyFocusHours: (weeklyFocusSeconds / 3600).toFixed(1),
    todayFocusSeconds,
    todayFocusFormatted: todayFormatted,
    completedCount,
    totalCount: focusSessions.length,
    completionRate:
      focusSessions.length > 0
        ? `${((completedCount / focusSessions.length) * 100).toFixed(1)}%`
        : "0.0%",
    currentStreak,
    longestStreak,
    totalDeflections,
    weekDateRange,
    daysThisWeek,
    peakWindow,
    distractionFreeRate,
  };
}
