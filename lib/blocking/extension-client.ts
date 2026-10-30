/**
 * Client library for communicating with the Do Not Disturb Companion Extension.
 * Handles automatic discovery via the injected content bridge or direct chrome.runtime.
 */

import {
  ActiveSessionPayload,
  BlockTarget,
  ExtensionAckResponse,
  ExtensionStatusResponse,
  WebToExtensionMessage,
} from "./extension-protocol";

export type ConnectionState = "detecting" | "connected" | "disconnected";

type StatusListener = (status: ExtensionStatusResponse | null, state: ConnectionState) => void;

class ExtensionClient {
  private connectionState: ConnectionState = "detecting";
  private latestStatus: ExtensionStatusResponse | null = null;
  private listeners: Set<StatusListener> = new Set();
  private pendingRequests: Map<string, { resolve: (val: any) => void; reject: (err: any) => void; timeoutId: any }> = new Map();
  private isInitialized = false;
  private syncQueue: Promise<any> = Promise.resolve();

  constructor() {
    if (typeof window !== "undefined") {
      // Immediate synchronous detection if content script already stamped the DOM
      if (this.isDomBridgePresent() || this.hasSessionCachedInstallation()) {
        this.connectionState = "connected";
      }
      this.init();
    }
  }

  /**
   * Fast synchronous check if extension content script is present in the DOM
   */
  public isDomBridgePresent(): boolean {
    if (typeof document === "undefined") return false;
    return (
      document.documentElement.dataset.dndExtensionInstalled === "true" ||
      document.documentElement.getAttribute("data-dnd-extension-installed") === "true"
    );
  }

  private hasSessionCachedInstallation(): boolean {
    try {
      return sessionStorage.getItem("dnd_extension_installed") === "true";
    } catch {
      return false;
    }
  }

  private markInstallationConfirmed() {
    this.connectionState = "connected";
    try {
      sessionStorage.setItem("dnd_extension_installed", "true");
    } catch {}
  }

  public markInstallationDisconnected() {
    if (this.isDomBridgePresent()) {
      // Content bridge is still present in DOM; do not force disconnected state
      this.connectionState = "connected";
      this.notify();
      return;
    }

    this.connectionState = "disconnected";
    this.latestStatus = null;

    try {
      sessionStorage.removeItem("dnd_extension_installed");
    } catch {}

    if (this.pendingRequests.size > 0) {
      for (const [, pending] of this.pendingRequests.entries()) {
        clearTimeout(pending.timeoutId);
        pending.reject(new Error("Extension context invalidated or disconnected"));
      }
      this.pendingRequests.clear();
    }

    this.notify();
  }

  private init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Listen for response messages posted back from content.js
    window.addEventListener("message", (event) => {
      if (event.source !== window) return;
      const data = event.data;
      if (!data || data.source !== "dnd-extension") return;

      if (data.type === "DND_EXTENSION_UNINSTALLED") {
        this.markInstallationDisconnected();
        return;
      }

      if (!data.requestId) return;

      const pending = this.pendingRequests.get(data.requestId);
      if (pending) {
        clearTimeout(pending.timeoutId);
        this.pendingRequests.delete(data.requestId);
        if (data.response && data.response.error) {
          const errMsg = String(data.response.error);
          if (errMsg.includes("invalidated") || errMsg.includes("uninstalled")) {
            this.markInstallationDisconnected();
          }
          pending.reject(new Error(data.response.error));
        } else {
          // If we received any valid message from the extension, connection is verified
          this.markInstallationConfirmed();
          if (data.response && data.response.type === "DND_STATUS_RESPONSE" && data.response.isInstalled) {
            this.latestStatus = data.response;
          }
          this.notify();
          pending.resolve(data.response);
        }
      }
    });

    // Listen for content script announcement event
    window.addEventListener("dnd-extension-ready", () => {
      this.markInstallationConfirmed();
      this.notify();
      this.checkStatus();
    });

    // Listen for content script uninstalled event
    window.addEventListener("dnd-extension-uninstalled", () => {
      this.markInstallationDisconnected();
    });

    // Initial check
    this.checkStatus();
  }

  /**
   * Subscribe to connection state changes
   */
  public subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    listener(this.latestStatus, this.connectionState);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.latestStatus, this.connectionState));
  }

  /**
   * Send a message to the extension
   */
  public async sendMessage<T = any>(message: WebToExtensionMessage, timeoutMs = 3500): Promise<T> {
    if (typeof window === "undefined") {
      throw new Error("Cannot send extension message during SSR");
    }

    const requestId = message.requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullMessage = { ...message, requestId };

    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(requestId);

        // Only mark disconnected if the DOM bridge is also not found
        if (!this.isDomBridgePresent()) {
          this.markInstallationDisconnected();
        }

        reject(new Error("Extension did not respond (timeout)"));
      }, timeoutMs);

      this.pendingRequests.set(requestId, { resolve, reject, timeoutId });

      // Post to content bridge
      window.postMessage(
        {
          source: "dnd-web-app",
          payload: fullMessage,
        },
        window.location.origin
      );
    });
  }

  /**
   * Ping and fetch extension status
   */
  public async checkStatus(timeoutMs = 3000): Promise<ExtensionStatusResponse | null> {
    try {
      const res = await this.sendMessage<ExtensionStatusResponse>(
        {
          type: "DND_GET_STATUS",
          requestId: `status_${Date.now()}`,
        },
        timeoutMs
      );

      if (res && res.isInstalled) {
        this.markInstallationConfirmed();
        this.latestStatus = res;
        this.notify();
        return res;
      }
    } catch {
      // Background worker might be idle/waking up
    }

    // If DOM bridge or session cache confirms extension presence, keep confirmed status
    if (this.isDomBridgePresent() || this.hasSessionCachedInstallation()) {
      this.markInstallationConfirmed();
      const fallback: ExtensionStatusResponse = {
        type: "DND_STATUS_RESPONSE",
        requestId: `status_${Date.now()}`,
        version: "1.0.0",
        isInstalled: true,
        isBlockingActive: false,
        activeSession: null,
        ruleCount: 0,
        blockedDomains: [],
      };
      this.latestStatus = fallback;
      this.notify();
      return fallback;
    }

    this.markInstallationDisconnected();
    return null;
  }

  /**
   * Synchronize the current session state with the extension.
   * Serialized via internal queue to avoid concurrent declarativeNetRequest collisions.
   */
  public async syncSession(
    session: ActiveSessionPayload,
    domains: BlockTarget[],
    redirectUrl?: string,
    explicitAction = false
  ): Promise<ExtensionAckResponse> {
    if (this.connectionState === "disconnected") {
      return {
        type: "DND_ACK",
        requestId: "err",
        success: false,
        appliedRulesCount: 0,
        error: "Extension is not connected",
      };
    }

    const runSync = async (): Promise<ExtensionAckResponse> => {
      try {
        const ack = await this.sendMessage<ExtensionAckResponse>(
          {
            type: "DND_SYNC_SESSION",
            requestId: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            session,
            domains,
            redirectUrl,
            explicitAction,
          },
          3000
        );

        // Keep status fresh in background without blocking sync return
        this.checkStatus().catch(() => {});
        return ack;
      } catch (err: any) {
        console.warn("[DND Client] syncSession failed (extension may be busy or inactive):", err.message);
        this.markInstallationDisconnected();
        return {
          type: "DND_ACK",
          requestId: "err",
          success: false,
          appliedRulesCount: 0,
          error: err.message,
        };
      }
    };

    const task = this.syncQueue.then(runSync, runSync);
    this.syncQueue = task.catch(() => {});
    return task;
  }

  /**
   * Stop session blocking
   */
  public async stopSession(): Promise<ExtensionAckResponse> {
    try {
      const ack = await this.sendMessage<ExtensionAckResponse>(
        {
          type: "DND_STOP_SESSION",
          requestId: `stop_${Date.now()}`,
        },
        3000
      );
      this.checkStatus().catch(() => {});
      return ack;
    } catch (err: any) {
      this.markInstallationDisconnected();
      return {
        type: "DND_ACK",
        requestId: "err",
        success: false,
        appliedRulesCount: 0,
        error: err.message,
      };
    }
  }

  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  public getLatestStatus(): ExtensionStatusResponse | null {
    return this.latestStatus;
  }
}

export const extensionClient = new ExtensionClient();
