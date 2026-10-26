"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useTheme } from "./theme-context";
import { extensionClient } from "../lib/blocking/extension-client";
import { getStoredBlocklist } from "../lib/blocking/blocklist-store";
import { recordCompletedSession } from "../lib/sessions/session-store";
import { getSoundSynth } from "../lib/sound/sound-synth";
import {
  getStoredSettings,
  subscribeToSettings,
  UserSettingsPayload,
  DEFAULT_SETTINGS,
} from "../lib/settings/settings-store";

export type SessionMode = "focus" | "shortBreak" | "longBreak";

export interface ModeColorConfig {
  mode: SessionMode;
  name: string;
  badgeLabel: string;
  statusText: string;
  subStatus: string;
  // Color hexes
  primary: string;           // Active accent (light mode)
  primaryDark: string;       // Active accent (dark mode)
  glow: string;              // Glow color (light mode)
  glowDark: string;          // Glow color (dark mode)
  container: string;         // Container bg (light mode)
  containerDark: string;     // Container bg (dark mode)
  border: string;            // Border (light mode)
  borderDark: string;        // Border (dark mode)
  text: string;              // Text accent (light mode)
  textDark: string;          // Text accent (dark mode)
  // Dynamic CSS classes
  badgeClass: string;
  btnPrimaryClass: string;
  ringClass: string;
  borderClass: string;
  dotClass: string;
}

export const MODE_COLORS: Record<SessionMode, ModeColorConfig> = {
  focus: {
    mode: "focus",
    name: "Focus Session",
    badgeLabel: "FOCUS TIME",
    statusText: "",
    subStatus: "Stay in the zone",
    primary: "#0f766e",        // Darker variant of #64ffda for light mode
    primaryDark: "#64ffda",    // Serene Focus electric teal for dark mode
    glow: "#2dd4bf",
    glowDark: "#6bd8cb",
    container: "#ccfbf1",
    containerDark: "#004d40",
    border: "#99f6e4",
    borderDark: "#00bfa5",
    text: "#0f766e",
    textDark: "#80cbc4",
    badgeClass: "bg-teal-500/10 text-[#0f766e] dark:bg-[#004d40] dark:text-[#80cbc4] border-teal-200 dark:border-teal-800/40",
    btnPrimaryClass: "bg-[#0f766e] hover:bg-[#115e59] text-white dark:bg-[#004d40] dark:hover:bg-[#005a4b] dark:text-[#64ffda] border-teal-700/30",
    ringClass: "focus-visible:ring-[#0f766e] dark:focus-visible:ring-[#64ffda]",
    borderClass: "border-teal-700/30 dark:border-teal-500/40",
    dotClass: "bg-[#0f766e] dark:bg-[#64ffda]",
  },
  shortBreak: {
    mode: "shortBreak",
    name: "Short Break",
    badgeLabel: "SHORT BREAK",
    statusText: "Rest & Recharge",
    subStatus: "Free to browse",
    primary: "#0284c7",
    primaryDark: "#38bdf8",
    glow: "#7dd3fc",
    glowDark: "#38bdf8",
    container: "#e0f2fe",
    containerDark: "#0c4a6e",
    border: "#bae6fd",
    borderDark: "#0284c7",
    text: "#0369a1",
    textDark: "#bae6fd",
    badgeClass: "bg-sky-500/10 text-sky-600 dark:bg-[#0c4a6e] dark:text-[#7dd3fc] border-sky-200 dark:border-sky-800/40",
    btnPrimaryClass: "bg-[#0284c7] hover:bg-[#0369a1] text-white dark:bg-[#0c4a6e] dark:hover:bg-[#075985] dark:text-[#38bdf8] border-sky-600/30",
    ringClass: "focus-visible:ring-[#0284c7] dark:focus-visible:ring-[#38bdf8]",
    borderClass: "border-sky-500/30 dark:border-sky-500/40",
    dotClass: "bg-[#0284c7] dark:bg-[#38bdf8]",
  },
  longBreak: {
    mode: "longBreak",
    name: "Long Break",
    badgeLabel: "LONG BREAK",
    statusText: "Time to Recharge",
    subStatus: "Free to browse",
    primary: "#ea580c",
    primaryDark: "#fb923c",
    glow: "#fed7aa",
    glowDark: "#ffb59a",
    container: "#ffedd5",
    containerDark: "#7c2d12",
    border: "#fed7aa",
    borderDark: "#ea580c",
    text: "#c2410c",
    textDark: "#ffedd5",
    badgeClass: "bg-orange-500/10 text-orange-600 dark:bg-[#7c2d12] dark:text-[#ffedd5] border-orange-200 dark:border-orange-800/40",
    btnPrimaryClass: "bg-[#ea580c] hover:bg-[#c2410c] text-white dark:bg-[#7c2d12] dark:hover:bg-[#9a3412] dark:text-[#fb923c] border-orange-600/30",
    ringClass: "focus-visible:ring-[#ea580c] dark:focus-visible:ring-[#fb923c]",
    borderClass: "border-orange-500/30 dark:border-orange-500/40",
    dotClass: "bg-[#ea580c] dark:bg-[#fb923c]",
  },
};

export const getModeDurations = (s?: UserSettingsPayload): Record<SessionMode, number> => {
  const settings = s || DEFAULT_SETTINGS;
  return {
    focus: (settings.deepFocusMinutes || 25) * 60,
    shortBreak: (settings.shortBreakMinutes || 5) * 60,
    longBreak: (settings.longBreakMinutes || 15) * 60,
  };
};

export const MODE_DEFAULT_DURATIONS: Record<SessionMode, number> = getModeDurations(DEFAULT_SETTINGS);

interface TimerContextType {
  mode: SessionMode;
  setMode: (mode: SessionMode) => void;
  secondsLeft: number;
  totalSeconds: number;
  isRunning: boolean;
  cycle: number;
  totalCycles: number;
  startTimer: () => void;
  pauseTimer: () => void;
  toggleTimer: () => void;
  resetTimer: () => void;
  skipTimer: () => void;
  formatTime: (secs?: number) => string;
  toggleMiniWindow: () => void;
  isMiniWindowActive: boolean;
  setIsMiniWindowActive: (active: boolean) => void;
  registerMiniWindow: (toggleFn: () => void) => void;
  activeColor: string; // Resolves according to light/dark
  activeGlow: string;
  activeContainer: string;
  activeBorder: string;
  activeText: string;
  colors: ModeColorConfig;
  allModeColors: Record<SessionMode, ModeColorConfig>;
  settings: UserSettingsPayload;
  durations: Record<SessionMode, number>;
}

const TimerContext = createContext<TimerContextType | null>(null);

const TIMER_STORAGE_KEY = "dnd-active-timer-state";

interface PersistedTimerState {
  mode: SessionMode;
  secondsLeft: number;
  totalSeconds: number;
  isRunning: boolean;
  endsAt: number | null;
  cycle: number;
  sessionId: string | null;
  updatedAt?: number;
}

function getInitialTimerState(): PersistedTimerState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return null;
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const { isDark } = useTheme();

  // Settings state and ref
  const [settings, setSettings] = useState<UserSettingsPayload>(() => getStoredSettings());
  const settingsRef = useRef<UserSettingsPayload>(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const durations = useMemo(() => getModeDurations(settings), [settings]);
  const durationsRef = useRef(durations);
  useEffect(() => {
    durationsRef.current = durations;
  }, [durations]);

  const totalCycles = settings.longBreakCadence || 4;
  const totalCyclesRef = useRef(totalCycles);
  useEffect(() => {
    totalCyclesRef.current = totalCycles;
  }, [totalCycles]);

  const [initialState] = useState(() => getInitialTimerState());

  const [mode, setModeState] = useState<SessionMode>(() => initialState?.mode || "focus");
  const modeRef = useRef<SessionMode>(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const s = getStoredSettings();
    const d = getModeDurations(s);
    if (initialState) {
      const now = Date.now();
      if (initialState.isRunning && initialState.endsAt && initialState.endsAt > now) {
        return Math.max(0, Math.ceil((initialState.endsAt - now) / 1000));
      }
      return initialState.secondsLeft ?? d[initialState.mode || "focus"];
    }
    return d.focus;
  });
  const secondsLeftRef = useRef<number>(secondsLeft);
  useEffect(() => {
    secondsLeftRef.current = secondsLeft;
  }, [secondsLeft]);

  const [totalSeconds, setTotalSeconds] = useState<number>(() => {
    const s = getStoredSettings();
    const d = getModeDurations(s);
    return initialState?.totalSeconds || d[initialState?.mode || "focus"];
  });

  const [isRunning, setIsRunning] = useState<boolean>(() => {
    if (initialState) {
      const now = Date.now();
      return Boolean(initialState.isRunning && initialState.endsAt && initialState.endsAt > now);
    }
    return false;
  });
  const isRunningRef = useRef<boolean>(isRunning);
  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  const [cycle, setCycle] = useState<number>(() => initialState?.cycle || 1);
  const cycleRef = useRef<number>(cycle);
  useEffect(() => {
    cycleRef.current = cycle;
  }, [cycle]);

  const endsAtRef = useRef<number | null>(initialState?.endsAt || null);
  const sessionIdRef = useRef<string | null>(initialState?.sessionId || null);

  // Sync mode to document element data attribute
  const applyModeAttribute = (m: SessionMode) => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-mode", m);
    }
  };

  useEffect(() => {
    applyModeAttribute(mode);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("dnd-session-mode", mode);
      } catch {}
    }
  }, [mode]);

  // Helper to persist state and broadcast to all open tabs
  const persistAndBroadcast = useCallback((newState: PersistedTimerState) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({ ...newState, updatedAt: Date.now() }));
      localStorage.setItem("dnd-session-mode", newState.mode);

      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel("dnd-timer-channel");
        bc.postMessage({ type: "TIMER_SYNC", state: newState });
        bc.close();
      }
    } catch {}
  }, []);

  // Helper to safely sync with browser extension
  const dispatchExtensionSync = useCallback(
    (running: boolean, currentMode: SessionMode, endsAt: number | null, remaining: number) => {
      if (typeof window === "undefined") return;
      // Prevent /blocked page from starting new active focus blocking sessions,
      // but explicitly allow pausing and stopping so rules are cleared when paused from /blocked!
      if (window.location.pathname.startsWith("/blocked") && running) {
        return;
      }

      if (!sessionIdRef.current) {
        sessionIdRef.current = `sess_${Date.now()}`;
      }

      const endpoints = getStoredBlocklist();
      const activeDomains = endpoints
        .filter((e) => e.active)
        .map((e) => ({
          id: e.id,
          hostname: e.domain,
          includeSubdomains: Boolean(e.subdomainNote),
          category: e.category,
          enabled: e.active,
        }));

      const redirectUrl = `${window.location.origin}/blocked`;
      const isStrict = settingsRef.current.strictBlocking === "STRICT";

      // Focus mode blocking behavior:
      // When running -> block active domains
      // When paused -> if STRICT, continue blocking active domains; if SUSPEND, remove blocking
      const shouldBlock = currentMode === "focus" && (running || isStrict);

      if (shouldBlock) {
        extensionClient.syncSession(
          {
            id: sessionIdRef.current,
            status: running ? "running" : "paused",
            mode: "focus",
            secondsRemaining: remaining,
            endsAt,
          },
          activeDomains,
          redirectUrl,
          true
        );
      } else {
        extensionClient.syncSession(
          {
            id: sessionIdRef.current,
            status: running ? "running" : "paused",
            mode: currentMode,
            secondsRemaining: remaining,
            endsAt,
          },
          [],
          redirectUrl,
          true
        );
      }
    },
    []
  );

  // Cross-platform & cross-tab settings subscription
  useEffect(() => {
    const unsubscribe = subscribeToSettings((newSettings) => {
      setSettings(newSettings);
      const newDurations = getModeDurations(newSettings);

      // If timer is not currently running, immediately update duration to reflect the new setting
      if (!isRunningRef.current) {
        const curMode = modeRef.current;
        const newDur = newDurations[curMode];
        setTotalSeconds(newDur);
        setSecondsLeft(newDur);

        persistAndBroadcast({
          mode: curMode,
          secondsLeft: newDur,
          totalSeconds: newDur,
          isRunning: false,
          endsAt: null,
          cycle: cycleRef.current,
          sessionId: sessionIdRef.current,
        });
      }

      // If in focus mode and paused, strictBlocking setting may have been toggled
      if (modeRef.current === "focus" && !isRunningRef.current) {
        dispatchExtensionSync(false, "focus", null, secondsLeftRef.current);
      }
    });

    return unsubscribe;
  }, [persistAndBroadcast, dispatchExtensionSync]);

  // Initialize from storage & listen for cross-tab updates
  useEffect(() => {
    if (typeof window === "undefined") return;

    const applyState = (saved: PersistedTimerState) => {
      const now = Date.now();
      const currentDurations = durationsRef.current;
      const targetMode = saved.mode || "focus";
      const fallbackDuration = currentDurations[targetMode] || 25 * 60;

      if (saved.isRunning && saved.endsAt && saved.endsAt > now) {
        const remaining = Math.max(0, Math.ceil((saved.endsAt - now) / 1000));
        setModeState(targetMode);
        setTotalSeconds(saved.totalSeconds || fallbackDuration);
        setSecondsLeft(remaining);
        setIsRunning(true);
        endsAtRef.current = saved.endsAt;
        sessionIdRef.current = saved.sessionId || `sess_${now}`;
        setCycle(saved.cycle || 1);
        applyModeAttribute(targetMode);
      } else {
        setModeState(targetMode);
        setTotalSeconds(saved.totalSeconds || fallbackDuration);
        setSecondsLeft(saved.secondsLeft ?? fallbackDuration);
        setIsRunning(false);
        endsAtRef.current = null;
        sessionIdRef.current = saved.sessionId;
        setCycle(saved.cycle || 1);
        applyModeAttribute(targetMode);
      }
    };

    try {
      const raw = localStorage.getItem(TIMER_STORAGE_KEY);
      if (raw) {
        applyState(JSON.parse(raw));
      } else {
        applyModeAttribute("focus");
      }
    } catch {
      applyModeAttribute("focus");
    }

    // Cross-tab broadcast listener
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      bc = new BroadcastChannel("dnd-timer-channel");
      bc.onmessage = (ev) => {
        if (ev.data?.type === "TIMER_SYNC" && ev.data.state) {
          applyState(ev.data.state);
        }
      };
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key === TIMER_STORAGE_KEY && e.newValue) {
        try {
          applyState(JSON.parse(e.newValue));
        } catch {}
      }
    };

    window.addEventListener("storage", onStorage);
    return () => {
      bc?.close();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setMode = useCallback(
    (newMode: SessionMode) => {
      setModeState(newMode);
      setIsRunning(false);
      endsAtRef.current = null;
      const duration = durationsRef.current[newMode];
      setTotalSeconds(duration);
      setSecondsLeft(duration);
      applyModeAttribute(newMode);

      const newState: PersistedTimerState = {
        mode: newMode,
        secondsLeft: duration,
        totalSeconds: duration,
        isRunning: false,
        endsAt: null,
        cycle,
        sessionId: sessionIdRef.current,
      };
      persistAndBroadcast(newState);
      dispatchExtensionSync(false, newMode, null, duration);
    },
    [cycle, persistAndBroadcast, dispatchExtensionSync]
  );

  // Accurate countdown timer loop with timestamp reconciliation & automation support
  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const interval = setInterval(() => {
      if (!endsAtRef.current) return;
      const remainingMs = Math.max(0, endsAtRef.current - Date.now());
      const remainingSecs = Math.ceil(remainingMs / 1000);

      if (remainingSecs <= 0) {
        // Save real session history record
        try {
          recordCompletedSession({
            mode,
            plannedSeconds: totalSeconds,
            actualSeconds: totalSeconds,
          });
        } catch (e) {
          console.error("Failed to record completed session", e);
        }

        // Play completion chime if enabled in user settings
        if (typeof window !== "undefined" && settingsRef.current.completionChime) {
          try {
            getSoundSynth().playChime(settingsRef.current.bgAmbienceVolume);
          } catch (e) {
            console.warn("Could not play completion chime", e);
          }
        }

        // Determine next mode and whether to auto-start
        let nextMode: SessionMode;
        let nextCycle = cycle;
        let shouldAutoStart = false;

        if (mode === "focus") {
          if (cycle >= totalCyclesRef.current) {
            nextMode = "longBreak";
            nextCycle = 1;
          } else {
            nextMode = "shortBreak";
            nextCycle = cycle + 1;
          }
          shouldAutoStart = Boolean(settingsRef.current.autoStartBreaks);
        } else {
          nextMode = "focus";
          shouldAutoStart = Boolean(settingsRef.current.autoStartFocus);
        }

        const nextDuration = durationsRef.current[nextMode];
        setCycle(nextCycle);
        setModeState(nextMode);
        applyModeAttribute(nextMode);
        setTotalSeconds(nextDuration);

        if (shouldAutoStart) {
          const newEndsAt = Date.now() + nextDuration * 1000;
          const newSessionId = `sess_${Date.now()}`;
          endsAtRef.current = newEndsAt;
          sessionIdRef.current = newSessionId;
          setSecondsLeft(nextDuration);
          setIsRunning(true);

          const newState: PersistedTimerState = {
            mode: nextMode,
            secondsLeft: nextDuration,
            totalSeconds: nextDuration,
            isRunning: true,
            endsAt: newEndsAt,
            cycle: nextCycle,
            sessionId: newSessionId,
          };
          persistAndBroadcast(newState);
          dispatchExtensionSync(true, nextMode, newEndsAt, nextDuration);
        } else {
          endsAtRef.current = null;
          sessionIdRef.current = null;
          setIsRunning(false);
          setSecondsLeft(nextDuration);

          const newState: PersistedTimerState = {
            mode: nextMode,
            secondsLeft: nextDuration,
            totalSeconds: nextDuration,
            isRunning: false,
            endsAt: null,
            cycle: nextCycle,
            sessionId: null,
          };
          persistAndBroadcast(newState);
          if (typeof window !== "undefined") {
            extensionClient.stopSession();
          }
          dispatchExtensionSync(false, nextMode, null, nextDuration);
        }
      } else {
        setSecondsLeft(remainingSecs);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isRunning, mode, cycle, totalSeconds, persistAndBroadcast, dispatchExtensionSync]);

  const startTimer = useCallback(() => {
    const newEndsAt = Date.now() + secondsLeftRef.current * 1000;
    if (!sessionIdRef.current) {
      sessionIdRef.current = `sess_${Date.now()}`;
    }
    endsAtRef.current = newEndsAt;
    setIsRunning(true);

    const newState: PersistedTimerState = {
      mode,
      secondsLeft: secondsLeftRef.current,
      totalSeconds,
      isRunning: true,
      endsAt: newEndsAt,
      cycle,
      sessionId: sessionIdRef.current,
    };
    persistAndBroadcast(newState);
    dispatchExtensionSync(true, mode, newEndsAt, secondsLeftRef.current);
  }, [mode, totalSeconds, cycle, persistAndBroadcast, dispatchExtensionSync]);

  const pauseTimer = useCallback(() => {
    let remainingSecs = secondsLeftRef.current;
    if (endsAtRef.current) {
      const remainingMs = Math.max(0, endsAtRef.current - Date.now());
      remainingSecs = Math.ceil(remainingMs / 1000);
      setSecondsLeft(remainingSecs);
      endsAtRef.current = null;
    }
    setIsRunning(false);

    const newState: PersistedTimerState = {
      mode,
      secondsLeft: remainingSecs,
      totalSeconds,
      isRunning: false,
      endsAt: null,
      cycle,
      sessionId: sessionIdRef.current,
    };
    persistAndBroadcast(newState);
    dispatchExtensionSync(false, mode, null, remainingSecs);
  }, [mode, totalSeconds, cycle, persistAndBroadcast, dispatchExtensionSync]);

  const toggleTimer = useCallback(() => {
    if (isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  }, [isRunning, pauseTimer, startTimer]);

  const resetTimer = useCallback(() => {
    const elapsed = totalSeconds - secondsLeftRef.current;
    if (isRunning && mode === "focus" && elapsed >= 60) {
      try {
        recordCompletedSession({
          mode: "focus",
          plannedSeconds: totalSeconds,
          actualSeconds: elapsed,
          endedEarly: true,
        });
      } catch {}
    }

    setIsRunning(false);
    endsAtRef.current = null;
    sessionIdRef.current = null;
    const duration = durationsRef.current[mode];
    setSecondsLeft(duration);
    setTotalSeconds(duration);

    persistAndBroadcast({
      mode,
      secondsLeft: duration,
      totalSeconds: duration,
      isRunning: false,
      endsAt: null,
      cycle,
      sessionId: null,
    });

    if (typeof window !== "undefined") {
      extensionClient.stopSession();
      dispatchExtensionSync(false, mode, null, duration);
    }
  }, [mode, totalSeconds, isRunning, cycle, persistAndBroadcast, dispatchExtensionSync]);

  const skipTimer = useCallback(() => {
    const elapsed = totalSeconds - secondsLeftRef.current;
    if (isRunning && mode === "focus" && elapsed >= 60) {
      try {
        recordCompletedSession({
          mode: "focus",
          plannedSeconds: totalSeconds,
          actualSeconds: elapsed,
          endedEarly: true,
        });
      } catch {}
    }

    setIsRunning(false);
    endsAtRef.current = null;
    sessionIdRef.current = null;

    const nextMode: SessionMode = mode === "focus" ? "shortBreak" : "focus";
    const nextDuration = durationsRef.current[nextMode];

    persistAndBroadcast({
      mode: nextMode,
      secondsLeft: nextDuration,
      totalSeconds: nextDuration,
      isRunning: false,
      endsAt: null,
      cycle,
      sessionId: null,
    });

    if (typeof window !== "undefined") {
      extensionClient.stopSession();
      dispatchExtensionSync(false, nextMode, null, nextDuration);
    }

    setMode(nextMode);
    setSecondsLeft(nextDuration);
    setTotalSeconds(nextDuration);
  }, [mode, totalSeconds, isRunning, cycle, setMode, persistAndBroadcast, dispatchExtensionSync]);

  const formatTime = useCallback((secs: number = secondsLeft) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, [secondsLeft]);

  // Mini Window / Browser PiP handlers
  const [isMiniWindowActive, setIsMiniWindowActive] = useState<boolean>(false);
  const miniWindowToggleRef = useRef<(() => void) | null>(null);

  const registerMiniWindow = useCallback((toggleFn: () => void) => {
    miniWindowToggleRef.current = toggleFn;
  }, []);

  const toggleMiniWindow = useCallback(() => {
    if (miniWindowToggleRef.current) {
      miniWindowToggleRef.current();
    }
  }, []);

  // Current active mode color configuration
  const currentConfig = MODE_COLORS[mode];

  // Active theme-dependent resolved colors
  const activeColor = isDark ? currentConfig.primaryDark : currentConfig.primary;
  const activeGlow = isDark ? currentConfig.glowDark : currentConfig.glow;
  const activeContainer = isDark ? currentConfig.containerDark : currentConfig.container;
  const activeBorder = isDark ? currentConfig.borderDark : currentConfig.border;
  const activeText = isDark ? currentConfig.textDark : currentConfig.text;

  const value = useMemo(
    () => ({
      mode,
      setMode,
      secondsLeft,
      totalSeconds,
      isRunning,
      cycle,
      totalCycles,
      startTimer,
      pauseTimer,
      toggleTimer,
      resetTimer,
      skipTimer,
      formatTime,
      toggleMiniWindow,
      isMiniWindowActive,
      setIsMiniWindowActive,
      registerMiniWindow,
      activeColor,
      activeGlow,
      activeContainer,
      activeBorder,
      activeText,
      colors: currentConfig,
      allModeColors: MODE_COLORS,
      settings,
      durations,
    }),
    [
      mode,
      setMode,
      secondsLeft,
      totalSeconds,
      isRunning,
      cycle,
      totalCycles,
      startTimer,
      pauseTimer,
      toggleTimer,
      resetTimer,
      skipTimer,
      formatTime,
      toggleMiniWindow,
      isMiniWindowActive,
      setIsMiniWindowActive,
      registerMiniWindow,
      activeColor,
      activeGlow,
      activeContainer,
      activeBorder,
      activeText,
      currentConfig,
      settings,
      durations,
    ]
  );

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error("useTimer must be used within a TimerProvider");
  }
  return context;
}
