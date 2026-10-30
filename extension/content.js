/**
 * Do Not Disturb — Content Script
 * Injected into approved origins (e.g. localhost:3000)
 * Acts as a bidirectional bridge between the web application and the background extension.
 */

(() => {
  // 1. Mark presence in DOM
  document.documentElement.dataset.dndExtensionInstalled = "true";
  document.documentElement.dataset.dndExtensionVersion = "1.0.0";
  document.documentElement.setAttribute("data-dnd-extension-installed", "true");
  document.documentElement.setAttribute("data-dnd-extension-version", "1.0.0");
  try {
    sessionStorage.setItem("dnd_extension_installed", "true");
  } catch {}
  window.dispatchEvent(new CustomEvent("dnd-extension-ready", { detail: { version: "1.0.0" } }));

  let isCleanedUp = false;

  const cleanupExtensionPresence = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;

    try {
      delete document.documentElement.dataset.dndExtensionInstalled;
      delete document.documentElement.dataset.dndExtensionVersion;
      document.documentElement.removeAttribute("data-dnd-extension-installed");
      document.documentElement.removeAttribute("data-dnd-extension-version");
    } catch {}

    try {
      sessionStorage.removeItem("dnd_extension_installed");
    } catch {}

    try {
      window.dispatchEvent(new CustomEvent("dnd-extension-uninstalled"));
      window.postMessage(
        {
          source: "dnd-extension",
          type: "DND_EXTENSION_UNINSTALLED",
        },
        window.location.origin
      );
    } catch {}
  };

  const isExtensionAlive = () => {
    if (isCleanedUp) return false;
    try {
      if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.id) {
        cleanupExtensionPresence();
        return false;
      }
      return true;
    } catch {
      cleanupExtensionPresence();
      return false;
    }
  };

  // Heartbeat to detect uninstallation/invalidation without waiting for user action
  const healthInterval = setInterval(() => {
    if (!isExtensionAlive()) {
      clearInterval(healthInterval);
    }
  }, 2000);

  window.addEventListener("focus", () => {
    isExtensionAlive();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      isExtensionAlive();
    }
  });

  // 2. Listen for messages from the web page
  window.addEventListener("message", (event) => {
    // Only accept messages from same window and tagged for this bridge
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.source !== "dnd-web-app" || !data.payload) return;

    // Check if extension was uninstalled or context invalidated
    if (!isExtensionAlive()) {
      window.postMessage(
        {
          source: "dnd-extension",
          requestId: data.payload.requestId,
          response: { error: "Extension context invalidated (uninstalled or disabled)" },
        },
        window.location.origin
      );
      return;
    }

    // Fast reply for PING directly from content script
    if (data.payload.type === "DND_PING") {
      window.postMessage(
        {
          source: "dnd-extension",
          requestId: data.payload.requestId,
          response: {
            type: "DND_PONG",
            requestId: data.payload.requestId,
            version: "1.0.0",
          },
        },
        window.location.origin
      );
      return;
    }

    // Guard: Prevent the /blocked page from accidentally starting, updating, or clearing session rules via background sync
    if (window.location.pathname.startsWith("/blocked") && data.payload.type === "DND_SYNC_SESSION") {
      console.log("[DND Extension] Content bridge: ignored sync request originating from /blocked page.");
      window.postMessage(
        {
          source: "dnd-extension",
          requestId: data.payload.requestId,
          response: { type: "DND_ACK", requestId: data.payload.requestId, success: true, appliedRulesCount: 0 },
        },
        window.location.origin
      );
      return;
    }

    const payloadWithOrigin = {
      ...data.payload,
      _senderUrl: window.location.href,
    };

    // Forward to background service worker
    try {
      chrome.runtime.sendMessage(payloadWithOrigin, (response) => {
        const lastError = chrome.runtime.lastError;
        if (lastError) {
          const errMsg = lastError.message || "";
          // Only truly fatal context invalidations should clean up presence
          if (errMsg.includes("invalidated")) {
            cleanupExtensionPresence();
          }

          // If background worker was dormant during status check, still acknowledge presence!
          if (data.payload.type === "DND_GET_STATUS") {
            window.postMessage(
              {
                source: "dnd-extension",
                requestId: data.payload.requestId,
                response: {
                  type: "DND_STATUS_RESPONSE",
                  version: "1.0.0",
                  isInstalled: true,
                  isBlockingActive: false,
                  ruleCount: 0,
                  blockedDomains: [],
                  dormant: true,
                },
              },
              window.location.origin
            );
            return;
          }
        }

        // Reply back to web app
        window.postMessage(
          {
            source: "dnd-extension",
            requestId: data.payload.requestId,
            response: lastError ? { error: lastError.message } : response,
          },
          window.location.origin
        );
      });
    } catch (err) {
      if (String(err?.message || "").includes("invalidated")) {
        cleanupExtensionPresence();
      }
      window.postMessage(
        {
          source: "dnd-extension",
          requestId: data.payload.requestId,
          response: { error: err.message },
        },
        window.location.origin
      );
    }
  });

  console.log("[DND Extension] Content bridge active on", window.location.origin);
})();
