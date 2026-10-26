"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  StorageMode,
  SyncState,
  SyncPayload,
} from "../lib/sync/sync-types";
import {
  gatherLocalState,
  applyStateToDevice,
  exportDataAsJSON,
  importDataFromJSON,
} from "../lib/sync/sync-service";

interface UserProfile {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl?: string | null;
}

interface SyncContextType {
  user: UserProfile | null;
  storageMode: StorageMode;
  syncState: SyncState;
  lastSyncedAt: string | null;
  isModalOpen: boolean;
  openSyncModal: () => void;
  closeSyncModal: () => void;
  syncNow: () => Promise<boolean>;
  login: (email: string, password: string, mergeLocal?: boolean) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  exportBackup: () => void;
  importBackup: (file: File) => Promise<boolean>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const storageMode: StorageMode = user ? "cloud" : "local";

  // Check auth status on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setUser(data.user);
            // Auto sync on mount if authenticated
            pullCloudData();
          }
        }
      } catch (err) {
        console.warn("Could not check auth status", err);
      }
    }
    checkAuth();
  }, []);

  const pullCloudData = useCallback(async () => {
    try {
      setSyncState("syncing");
      const res = await fetch("/api/sync");
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          applyStateToDevice(json.data);
          const now = new Date().toISOString();
          setLastSyncedAt(now);
          setSyncState("synced");
          return true;
        }
      }
      setSyncState("error");
      return false;
    } catch {
      setSyncState("offline");
      return false;
    }
  }, []);

  const syncNow = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    setSyncState("syncing");
    try {
      const local = gatherLocalState();
      // Push local state
      const pushRes = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(local),
      });

      if (!pushRes.ok) {
        setSyncState("error");
        return false;
      }

      // Pull latest state
      const pullSuccess = await pullCloudData();
      return pullSuccess;
    } catch {
      setSyncState("error");
      return false;
    }
  }, [user, pullCloudData]);

  const login = async (
    email: string,
    password: string,
    mergeLocal = true
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setSyncState("syncing");
      const payload: { email: string; password: string; mergePayload?: SyncPayload } = {
        email,
        password,
      };

      if (mergeLocal) {
        payload.mergePayload = gatherLocalState();
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setSyncState("idle");
        return { success: false, error: data.error || "Failed to sign in." };
      }

      setUser(data.user);
      await pullCloudData();
      return { success: true };
    } catch {
      setSyncState("error");
      return { success: false, error: "Network error occurred." };
    }
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setSyncState("syncing");
      const local = gatherLocalState();
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mergePayload: local }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSyncState("idle");
        return { success: false, error: data.error || "Failed to sign in with Google." };
      }

      setUser(data.user);
      await pullCloudData();
      return { success: true };
    } catch {
      setSyncState("error");
      return { success: false, error: "Network error occurred." };
    }
  };

  const register = async (
    email: string,
    password: string,
    name?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setSyncState("syncing");
      const initialPayload = gatherLocalState();

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, initialPayload }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSyncState("idle");
        return { success: false, error: data.error || "Failed to register." };
      }

      setUser(data.user);
      setLastSyncedAt(new Date().toISOString());
      setSyncState("synced");
      return { success: true };
    } catch {
      setSyncState("error");
      return { success: false, error: "Network error occurred." };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.warn("Logout error:", e);
    }
    setUser(null);
    setSyncState("idle");
  };

  return (
    <SyncContext.Provider
      value={{
        user,
        storageMode,
        syncState,
        lastSyncedAt,
        isModalOpen,
        openSyncModal: () => setIsModalOpen(true),
        closeSyncModal: () => setIsModalOpen(false),
        syncNow,
        login,
        loginWithGoogle,
        register,
        logout,
        exportBackup: exportDataAsJSON,
        importBackup: importDataFromJSON,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSync must be used within a SyncProvider");
  }
  return context;
}
