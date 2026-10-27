/**
 * Protocol and types for communication between the Do Not Disturb web application
 * and the Chromium browser extension.
 */

export interface BlockTarget {
  id: string;
  hostname: string;
  includeSubdomains: boolean;
  category?: string;
  enabled: boolean;
}

export type FocusSessionMode = "focus" | "shortBreak" | "longBreak";

export interface ActiveSessionPayload {
  id: string;
  status: "running" | "paused" | "stopped" | "completed";
  mode: FocusSessionMode;
  secondsRemaining: number;
  endsAt: number | null; // Timestamp (Date.now() + remainingMs)
  blockDuringBreaks?: boolean;
  totalDuration?: number;
  cycle?: number;
  totalCycles?: number;
  anchor?: string;
  intent?: string;
}

export type ExtensionMessageType =
  | "DND_PING"
  | "DND_PONG"
  | "DND_GET_STATUS"
  | "DND_STATUS_RESPONSE"
  | "DND_SYNC_SESSION"
  | "DND_STOP_SESSION"
  | "DND_UPDATE_BLOCKLIST"
  | "DND_ACK";

export interface PingMessage {
  type: "DND_PING";
  requestId: string;
}

export interface GetStatusMessage {
  type: "DND_GET_STATUS";
  requestId: string;
}

export interface SyncSessionMessage {
  type: "DND_SYNC_SESSION";
  requestId: string;
  session: ActiveSessionPayload;
  domains: BlockTarget[];
  redirectUrl?: string;
  explicitAction?: boolean;
}

export interface StopSessionMessage {
  type: "DND_STOP_SESSION";
  requestId: string;
  sessionId?: string;
}

export interface UpdateBlocklistMessage {
  type: "DND_UPDATE_BLOCKLIST";
  requestId: string;
  domains: BlockTarget[];
}

export type WebToExtensionMessage =
  | PingMessage
  | GetStatusMessage
  | SyncSessionMessage
  | StopSessionMessage
  | UpdateBlocklistMessage;

export interface ExtensionStatusResponse {
  type: "DND_STATUS_RESPONSE";
  requestId: string;
  version: string;
  isInstalled: boolean;
  isBlockingActive: boolean;
  activeSession: ActiveSessionPayload | null;
  ruleCount: number;
  blockedDomains: string[];
}

export interface ExtensionAckResponse {
  type: "DND_ACK";
  requestId: string;
  success: boolean;
  appliedRulesCount: number;
  error?: string;
}

export type ExtensionToWebMessage =
  | ExtensionStatusResponse
  | ExtensionAckResponse;
