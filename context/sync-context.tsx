"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
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
  clearAllLocalDeviceData,
} from "../lib/sync/sync-service";
import { promptGoogleSignIn } from "../lib/auth/google-client";
import { signIn, signOut, getSession } from "next-auth/react";

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
  logout: (clearLocalDevice?: boolean) => Promise<void>;
  exportBackup: () => void;
  importBackup: (file: File) => Promise<boolean>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const userRef = useRef<UserProfile | null>(null);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const storageMode: StorageMode = user ? "cloud" : "local";

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

  // Check auth status on mount and handle redirect auth callbacks
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setUser(data.user);
            userRef.current = data.user;
            // Auto sync on mount if authenticated
            pullCloudData();
            return;
          }
        }

        // Fallback to Auth.js getSession
        const session = await getSession();
        if (session?.user) {
          const profile: UserProfile = {
            id: (session.user as any).id || "",
            email: session.user.email || null,
            name: session.user.name || null,
            avatarUrl: session.user.image || null,
          };
          setUser(profile);
          userRef.current = profile;
          pullCloudData();
        }
      } catch (err) {
        console.warn("Could not check auth status", err);
      }
    }
    checkAuth();

    if (typeof window !== "undefined" && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      if (params.has("auth") || params.has("auth_error")) {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, "", cleanUrl);
      }
    }
  }, [pullCloudData]);

  const syncNow = useCallback(async (): Promise<boolean> => {
    if (!userRef.current) return false;
    setSyncState("syncing");
    try {
      const local = gatherLocalState();
      // Push local state and receive latest consolidated state in one single roundtrip
      const pushRes = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(local),
      });

      if (!pushRes.ok) {
        setSyncState("error");
        return false;
      }

      const json = await pushRes.json();
      if (json.data) {
        applyStateToDevice(json.data);
        const now = json.syncedAt || new Date().toISOString();
        setLastSyncedAt(now);
        setSyncState("synced");
        return true;
      }

      // Fallback to separate pull if response didn't include data
      const pullSuccess = await pullCloudData();
      return pullSuccess;
    } catch {
      setSyncState("error");
      return false;
    }
  }, [pullCloudData]);

  const login = async (
    email: string,
    password: string,
    mergeLocal = true
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setSyncState("syncing");

      // 1. Authenticate via Auth.js Credentials provider
      const signInRes = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (signInRes?.error) {
        setSyncState("idle");
        return { success: false, error: "Invalid email or password." };
      }

      // 2. Fetch authenticated user profile
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          userRef.current = data.user;

          if (mergeLocal) {
            await syncNow();
          } else {
            await pullCloudData();
          }
          return { success: true };
        }
      }

      const session = await getSession();
      if (session?.user) {
        const profile: UserProfile = {
          id: (session.user as any).id || "",
          email: session.user.email || null,
          name: session.user.name || null,
          avatarUrl: session.user.image || null,
        };
        setUser(profile);
        userRef.current = profile;

        if (mergeLocal) {
          await syncNow();
        } else {
          await pullCloudData();
        }
        return { success: true };
      }

      setSyncState("idle");
      return { success: false, error: "Unable to retrieve session." };
    } catch {
      setSyncState("error");
      return { success: false, error: "Network error occurred." };
    }
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setSyncState("syncing");

      // Try Auth.js Google Provider first if configured for OAuth redirect
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId) {
        // Trigger Auth.js standard signIn
        await signIn("google", { callbackUrl: "/?auth=success" });
        return { success: true };
      }

      // If GIS popup token client is active, handle via popup and establish session
      try {
        const { accessToken } = await promptGoogleSignIn();
        const local = gatherLocalState();

        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessToken,
            mergePayload: local,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setSyncState("idle");
          return { success: false, error: data.error || "Failed to sign in with Google." };
        }

        setUser(data.user);
        userRef.current = data.user;
        setLastSyncedAt(new Date().toISOString());
        setSyncState("synced");

        await pullCloudData();
        return { success: true };
      } catch (popupErr: any) {
        // Fallback to Auth.js standard Google OAuth redirect
        await signIn("google", { callbackUrl: "/?auth=success" });
        return { success: true };
      }
    } catch (err: any) {
      setSyncState("idle");
      const errorMsg = err?.message || "Failed to sign in with Google.";
      return { success: false, error: errorMsg };
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

      // Automatically sign in via Auth.js
      await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      setUser(data.user);
      userRef.current = data.user;
      setLastSyncedAt(new Date().toISOString());
      setSyncState("synced");
      try {
        await pullCloudData();
      } catch {}
      return { success: true };
    } catch {
      setSyncState("error");
      return { success: false, error: "Network error occurred." };
    }
  };

  const logout = async (clearLocalDevice = false) => {
    try {
      await signOut({ redirect: false });
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.warn("Logout error:", e);
    }
    if (clearLocalDevice) {
      clearAllLocalDeviceData();
    }
    setUser(null);
    userRef.current = null;
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
