"use client";

import { useEffect, useState } from "react";
import { extensionClient, ConnectionState } from "./extension-client";
import { ExtensionStatusResponse } from "./extension-protocol";

export function useExtensionStatus() {
  const [connectionState, setConnectionState] = useState<ConnectionState>("detecting");
  const [status, setStatus] = useState<ExtensionStatusResponse | null>(null);

  useEffect(() => {
    const unsubscribe = extensionClient.subscribe((latestStatus, state) => {
      setStatus(latestStatus);
      setConnectionState(state);
    });

    // Check again when window gains focus
    const handleFocus = () => {
      extensionClient.checkStatus();
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      unsubscribe();
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return {
    connectionState,
    isInstalled: connectionState === "connected",
    isBlockingActive: Boolean(status?.isBlockingActive),
    ruleCount: status?.ruleCount || 0,
    version: status?.version || null,
    refresh: () => extensionClient.checkStatus(),
  };
}
