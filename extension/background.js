/**
 * Do Not Disturb — Background Service Worker (Manifest V3)
 * Manages declarativeNetRequest dynamic rules and session timers.
 */

const RULE_BASE_ID = 1000;
const SESSION_ALARM = "dnd_session_expiry";
const DEFAULT_REDIRECT = "http://localhost:3000/blocked";

// State cache
let currentState = {
  isBlockingActive: false,
  activeSession: null,
  ruleCount: 0,
  blockedDomains: [],
  redirectUrl: DEFAULT_REDIRECT,
};

// Initialize from storage on startup
async function init() {
  try {
    const data = await chrome.storage.local.get(["dnd_session", "dnd_blocking", "dnd_domains", "dnd_redirect"]);
    const session = data.dnd_session;
    const now = Date.now();
    const isRunning = session && session.status === "running" && session.endsAt && session.endsAt > now;

    if (!isRunning) {
      console.log("[DND Extension] No running session active on init. Purging all blocking rules.");
      await clearBlockingRules();
    } else {
      currentState.activeSession = session;
      currentState.isBlockingActive = true;
      currentState.blockedDomains = data.dnd_domains || [];
      currentState.redirectUrl = data.dnd_redirect || DEFAULT_REDIRECT;
      
      // Re-set alarm if still running
      const delayInMinutes = Math.max(0.05, (session.endsAt - now) / 60000);
      chrome.alarms.create(SESSION_ALARM, { delayInMinutes });
    }
  } catch (err) {
    console.error("[DND Extension] Initialization error:", err);
  }
}

// Clear all active blocking rules
async function clearBlockingRules() {
  try {
    // 1. Remove all dynamic rules
    const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
    const ruleIdsToRemove = currentRules.map((r) => r.id);

    if (ruleIdsToRemove.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIdsToRemove,
        addRules: [],
      });
    }

    // 2. Remove all session rules if supported
    if (chrome.declarativeNetRequest.getSessionRules) {
      try {
        const sessionRules = await chrome.declarativeNetRequest.getSessionRules();
        if (sessionRules && sessionRules.length > 0) {
          await chrome.declarativeNetRequest.updateSessionRules({
            removeRuleIds: sessionRules.map((r) => r.id),
          });
        }
      } catch {}
    }

    currentState.isBlockingActive = false;
    currentState.ruleCount = 0;
    currentState.activeSession = null;
    currentState.blockedDomains = [];

    await chrome.alarms.clear(SESSION_ALARM);
    await chrome.storage.local.set({
      dnd_blocking: false,
      dnd_session: null,
      dnd_domains: [],
    });

    console.log("[DND Extension] Blocking rules removed successfully.");
    return { success: true, count: 0 };
  } catch (err) {
    console.error("[DND Extension] Failed to clear rules:", err);
    return { success: false, error: err.message };
  }
}

// Apply dynamic blocking rules based on domains list
async function applyBlockingRules(domains, redirectUrl = DEFAULT_REDIRECT) {
  try {
    // 1. Get existing rules to remove
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules
      .filter((r) => r.id >= RULE_BASE_ID)
      .map((r) => r.id);

    // 2. Filter valid active domains
    const activeTargets = domains.filter((d) => d.enabled !== false && d.hostname);

    // 3. Construct new declarativeNetRequest rules
    const addRules = [];
    const destinationUrl = redirectUrl || chrome.runtime.getURL("blocked.html");

    activeTargets.forEach((target, index) => {
      const hostname = target.hostname.toLowerCase().trim().replace(/^www\./, "");
      const ruleId = RULE_BASE_ID + index;

      addRules.push({
        id: ruleId,
        priority: 1,
        action: {
          type: "redirect",
          redirect: {
            url: `${destinationUrl}?blocked=${encodeURIComponent(hostname)}`,
          },
        },
        condition: {
          urlFilter: `||${hostname}^`,
          resourceTypes: ["main_frame"],
        },
      });
    });

    // 4. Update dynamic rules atomically
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules,
    });

    currentState.isBlockingActive = addRules.length > 0;
    currentState.ruleCount = addRules.length;
    currentState.blockedDomains = activeTargets.map((d) => d.hostname);
    currentState.redirectUrl = destinationUrl;

    await chrome.storage.local.set({
      dnd_blocking: currentState.isBlockingActive,
      dnd_domains: currentState.blockedDomains,
      dnd_redirect: destinationUrl,
    });

    console.log(`[DND Extension] Applied ${addRules.length} blocking rules.`);
    return { success: true, count: addRules.length };
  } catch (err) {
    console.error("[DND Extension] Failed to apply rules:", err);
    return { success: false, error: err.message, count: 0 };
  }
}

// Sync focus session from web app
async function syncSession(session, domains, redirectUrl, isExplicitAction = false) {
  const now = Date.now();
  const shouldBlock =
    session &&
    session.status === "running" &&
    (session.mode === "focus" || Boolean(session.blockDuringBreaks)) &&
    session.endsAt &&
    session.endsAt > now;

  if (shouldBlock && domains && domains.length > 0) {
    currentState.activeSession = session;
    await chrome.storage.local.set({ dnd_session: session });

    const res = await applyBlockingRules(domains, redirectUrl);

    // Set expiry alarm if endsAt is provided
    if (session.endsAt && session.endsAt > now) {
      const delayInMinutes = Math.max(0.05, (session.endsAt - now) / 60000);
      chrome.alarms.create(SESSION_ALARM, { delayInMinutes });
    }

    return {
      success: res.success,
      appliedRulesCount: res.count || 0,
    };
  } else {
    // If session is paused, break, stopped, or not actively running -> unconditionally lift rules!
    currentState.activeSession = session;
    await chrome.storage.local.set({ dnd_session: session });

    const res = await clearBlockingRules();
    return {
      success: res.success,
      appliedRulesCount: 0,
    };
  }
}

// Get current extension status
function getStatus() {
  return {
    type: "DND_STATUS_RESPONSE",
    version: chrome.runtime.getManifest().version,
    isInstalled: true,
    isBlockingActive: currentState.isBlockingActive,
    activeSession: currentState.activeSession,
    ruleCount: currentState.ruleCount,
    blockedDomains: currentState.blockedDomains,
  };
}

// Message handler dispatcher
async function handleMessage(message, sender) {
  if (!message || !message.type) return null;

  switch (message.type) {
    case "DND_PING":
      return {
        type: "DND_PONG",
        requestId: message.requestId,
        version: chrome.runtime.getManifest().version,
      };

    case "DND_GET_STATUS":
      return {
        ...getStatus(),
        requestId: message.requestId,
      };

    case "DND_SYNC_SESSION": {
      const senderUrl = (message._senderUrl || sender.url || "").toLowerCase();
      // The /blocked deflection page must never alter active session blocking rules
      if (senderUrl.includes("/blocked")) {
        console.log("[DND Extension] Ignored sync session request originating from /blocked URL.");
        return {
          type: "DND_ACK",
          requestId: message.requestId,
          success: true,
          appliedRulesCount: currentState.ruleCount,
        };
      }

      const result = await syncSession(
        message.session,
        message.domains || [],
        message.redirectUrl || DEFAULT_REDIRECT,
        Boolean(message.explicitAction)
      );
      return {
        type: "DND_ACK",
        requestId: message.requestId,
        success: result.success,
        appliedRulesCount: result.appliedRulesCount,
      };
    }

    case "DND_STOP_SESSION": {
      const result = await clearBlockingRules();
      return {
        type: "DND_ACK",
        requestId: message.requestId,
        success: result.success,
        appliedRulesCount: 0,
      };
    }

    case "DND_UPDATE_BLOCKLIST": {
      if (currentState.isBlockingActive && message.domains) {
        const result = await applyBlockingRules(message.domains, currentState.redirectUrl);
        return {
          type: "DND_ACK",
          requestId: message.requestId,
          success: result.success,
          appliedRulesCount: result.count,
        };
      }
      return {
        type: "DND_ACK",
        requestId: message.requestId,
        success: true,
        appliedRulesCount: 0,
      };
    }

    default:
      return null;
  }
}

// Listen to messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then((res) => {
    if (res) sendResponse(res);
  });
  return true; // Keep channel open for async response
});

// Listen to external messages from web application (externally_connectable)
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  console.log("[DND Extension] Received external message from:", sender.url, message);
  handleMessage(message, sender).then((res) => {
    if (res) sendResponse(res);
  });
  return true;
});

// Alarms listener for session expiry
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === SESSION_ALARM) {
    console.log("[DND Extension] Focus session timer reached 0:00. Automatically unblocking.");
    await clearBlockingRules();
  }
});

// Browser startup listener
chrome.runtime.onStartup.addListener(() => {
  init();
});

// Installed / Updated listener
chrome.runtime.onInstalled.addListener(() => {
  init();
});

// Run init immediately
init();
