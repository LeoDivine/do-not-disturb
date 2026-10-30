"use client";

import { useEffect, useState } from "react";
import { extensionClient, ConnectionState } from "./extension-client";
import { ExtensionStatusResponse } from "./extension-protocol";

export function useExtensionStatus() {
  const [isMounted, setIsMounted] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>("detecting");
  const [status, setStatus] = useState<ExtensionStatusResponse | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);

  useEffect(() => {
    setIsMounted(true);
    setConnectionState(extensionClient.getConnectionState());
    setStatus(extensionClient.getLatestStatus());

    const unsubscribe = extensionClient.subscribe((latestStatus, state) => {
      setStatus(latestStatus);
      setConnectionState(state);
      setLastCheckedAt(new Date());
    });

    // Check again when window gains focus or tab becomes visible
    const handleActive = () => {
      extensionClient.checkStatus();
    };

    window.addEventListener("focus", handleActive);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        handleActive();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Periodic ping when connected so uninstalls are caught even without tab switches
    const interval = setInterval(() => {
      if (extensionClient.getConnectionState() === "connected") {
        extensionClient.checkStatus();
      }
    }, 4000);

    return () => {
      unsubscribe();
      window.removeEventListener("focus", handleActive);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, []);

  const isBridgePresent = isMounted && extensionClient.isDomBridgePresent();
  const effectiveInstalled =
    isMounted && (connectionState === "connected" || isBridgePresent);

  return {
    connectionState: isMounted ? connectionState : "detecting",
    isInstalled: effectiveInstalled,
    isBlockingActive: isMounted ? Boolean(status?.isBlockingActive) : false,
    ruleCount: isMounted ? status?.ruleCount || 0 : 0,
    version: isMounted ? status?.version || null : null,
    blockedDomains: isMounted ? status?.blockedDomains || [] : [],
    lastCheckedAt,
    refresh: () => extensionClient.checkStatus(),
  };
}
