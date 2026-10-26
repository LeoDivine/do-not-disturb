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

  constructor() {
    if (typeof window !== "undefined") {
      this.init();
    }
  }

  private init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Listen for response messages posted back from content.js
    window.addEventListener("message", (event) => {
      if (event.source !== window) return;
      const data = event.data;
      if (!data || data.source !== "dnd-extension" || !data.requestId) return;

      const pending = this.pendingRequests.get(data.requestId);
      if (pending) {
        clearTimeout(pending.timeoutId);
        this.pendingRequests.delete(data.requestId);
        if (data.response && data.response.error) {
          pending.reject(new Error(data.response.error));
        } else {
          pending.resolve(data.response);
        }
      }
    });

    // Listen for content script announcement
    window.addEventListener("dnd-extension-ready", () => {
      this.checkStatus();
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
  public async sendMessage<T = any>(message: WebToExtensionMessage, timeoutMs = 2500): Promise<T> {
    if (typeof window === "undefined") {
      throw new Error("Cannot send extension message during SSR");
    }

    const requestId = message.requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullMessage = { ...message, requestId };

    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        // If we timed out, extension is likely not installed or disconnected
        if (this.connectionState !== "disconnected") {
          this.connectionState = "disconnected";
          this.notify();
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
  public async checkStatus(): Promise<ExtensionStatusResponse | null> {
    try {
      const res = await this.sendMessage<ExtensionStatusResponse>({
        type: "DND_GET_STATUS",
        requestId: `status_${Date.now()}`,
      });

      if (res && res.isInstalled) {
        this.connectionState = "connected";
        this.latestStatus = res;
        this.notify();
        return res;
      }
    } catch {
      // Expected if extension is not yet loaded in browser
    }

    // Check if DOM attribute was set by content script
    if (typeof document !== "undefined" && document.documentElement.dataset.dndExtensionInstalled === "true") {
      this.connectionState = "connected";
    } else {
      this.connectionState = "disconnected";
    }

    this.latestStatus = null;
    this.notify();
    return null;
  }

  /**
   * Synchronize the current session state with the extension
   */
  public async syncSession(
    session: ActiveSessionPayload,
    domains: BlockTarget[],
    redirectUrl?: string,
    explicitAction = false
  ): Promise<ExtensionAckResponse> {
    try {
      const ack = await this.sendMessage<ExtensionAckResponse>({
        type: "DND_SYNC_SESSION",
        requestId: `sync_${Date.now()}`,
        session,
        domains,
        redirectUrl,
        explicitAction,
      });
      await this.checkStatus();
      return ack;
    } catch (err: any) {
      console.warn("[DND Client] syncSession failed (extension may be disabled or uninstalled):", err.message);
      return {
        type: "DND_ACK",
        requestId: "err",
        success: false,
        appliedRulesCount: 0,
        error: err.message,
      };
    }
  }

  /**
   * Stop session blocking
   */
  public async stopSession(): Promise<ExtensionAckResponse> {
    try {
      const ack = await this.sendMessage<ExtensionAckResponse>({
        type: "DND_STOP_SESSION",
        requestId: `stop_${Date.now()}`,
      });
      await this.checkStatus();
      return ack;
    } catch (err: any) {
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
