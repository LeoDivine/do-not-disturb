/**
 * Do Not Disturb — Content Script
 * Injected into approved origins (e.g. localhost:3000)
 * Acts as a bidirectional bridge between the web application and the background extension.
 */

(() => {
  // 1. Mark presence in DOM
  document.documentElement.dataset.dndExtensionInstalled = "true";
  document.documentElement.dataset.dndExtensionVersion = "1.0.0";
  window.dispatchEvent(new CustomEvent("dnd-extension-ready", { detail: { version: "1.0.0" } }));

  // 2. Listen for messages from the web page
  window.addEventListener("message", (event) => {
    // Only accept messages from same origin and tagged for this bridge
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.source !== "dnd-web-app" || !data.payload) return;

    // Guard: Prevent the /blocked page from accidentally starting or re-enabling a running session,
    // but permit explicit pause / stop actions so blocking rules are lifted when the user pauses.
    if (window.location.pathname.startsWith("/blocked") && data.payload.type === "DND_SYNC_SESSION" && data.payload.session?.status === "running") {
      console.log("[DND Extension] Content bridge: ignored start/run sync request originating from /blocked page.");
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
