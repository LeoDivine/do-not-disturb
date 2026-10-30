/**
 * Do Not Disturb — Extension Popup Controller
 * Renders real-time timer countdown, cycle, focus goal anchor, and website shield status.
 */

document.addEventListener("DOMContentLoaded", async () => {
  const shieldBadge = document.getElementById("shieldBadge");
  const shieldDot = document.getElementById("shieldDot");
  const shieldStatusText = document.getElementById("shieldStatusText");
  const modeTag = document.getElementById("modeTag");
  const cycleTag = document.getElementById("cycleTag");
  const anchorBox = document.getElementById("anchorBox");
  const anchorText = document.getElementById("anchorText");
  const countdownDigits = document.getElementById("countdownDigits");
  const countdownState = document.getElementById("countdownState");
  const progressFill = document.getElementById("progressFill");
  const shieldDetails = document.getElementById("shieldDetails");
  const shieldStateTag = document.getElementById("shieldStateTag");
  const openDashboardBtn = document.getElementById("openDashboardBtn");
  const emergencyBtn = document.getElementById("emergencyUnblockBtn");
  const popOutBtn = document.getElementById("popOutBtn");

  // Detached mini window support: keeps popup open when switching websites
  const isDetached = window.location.search.includes("detached=true");
  if (isDetached) {
    if (popOutBtn) popOutBtn.style.display = "none";
  } else {
    popOutBtn?.addEventListener("click", async () => {
      try {
        await chrome.windows.create({
          url: chrome.runtime.getURL("popup.html?detached=true"),
          type: "popup",
          width: 320,
          height: 290,
          focused: true,
        });
        window.close();
      } catch (err) {
        console.warn("[DND Extension] Failed to pop out window:", err);
      }
    });
  }

  let tickInterval = null;

  function formatTime(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  async function loadState() {
    try {
      // 1. Get status from background worker
      const response = await chrome.runtime.sendMessage({
        type: "DND_GET_STATUS",
        requestId: `popup-${Date.now()}`,
      });

      // 2. Also check local storage for persisted session details
      const localData = await chrome.storage.local.get(["dnd_session", "dnd_blocking", "dnd_domains"]);
      const session = response?.activeSession || localData?.dnd_session || null;
      const isBlocking = Boolean(response?.isBlockingActive ?? localData?.dnd_blocking);
      const ruleCount = response?.ruleCount || localData?.dnd_domains?.length || 0;

      // Update Shield Information
      if (isBlocking) {
        shieldBadge.classList.add("active");
        shieldStatusText.innerText = "Shield Active";
        shieldDetails.innerText = `${ruleCount} site${ruleCount === 1 ? "" : "s"} guarded`;
        shieldStateTag.innerText = "Active";
        shieldStateTag.classList.add("active");
        emergencyBtn.style.display = "block";
      } else {
        shieldBadge.classList.remove("active");
        shieldStatusText.innerText = "Ready";
        shieldDetails.innerText = ruleCount > 0 ? `${ruleCount} site${ruleCount === 1 ? "" : "s"} configured` : "0 sites blocked";
        shieldStateTag.innerText = "Standby";
        shieldStateTag.classList.remove("active");
        emergencyBtn.style.display = "none";
      }

      // Update Session & Timer Information
      if (session) {
        // Mode & Colors
        const mode = session.mode || "focus";
        const isBreak = mode === "shortBreak" || mode === "longBreak";
        modeTag.innerText = mode === "focus" ? "Focus Sprint" : mode === "shortBreak" ? "Short Break" : "Long Break";
        modeTag.style.color = isBreak ? "var(--break-accent)" : "var(--primary)";
        progressFill.style.backgroundColor = isBreak ? "var(--break-accent)" : "var(--primary)";

        if (openDashboardBtn) {
          if (mode === "shortBreak") {
            openDashboardBtn.style.backgroundColor = "var(--break-accent)";
            openDashboardBtn.style.color = "#082f49";
          } else if (mode === "longBreak") {
            openDashboardBtn.style.backgroundColor = "#fb923c";
            openDashboardBtn.style.color = "#431407";
          } else {
            openDashboardBtn.style.backgroundColor = "var(--primary)";
            openDashboardBtn.style.color = "#00201d";
          }
        }

        // Cycle Info
        const cycle = session.cycle || 1;
        const totalCycles = session.totalCycles || 4;
        cycleTag.innerText = `Cycle ${cycle} of ${totalCycles}`;

        // Anchor Goal
        if (session.anchor) {
          anchorText.innerText = session.anchor;
          anchorBox.style.display = "flex";
        } else {
          anchorBox.style.display = "none";
        }

        // Live Ticking Countdown
        if (tickInterval) clearInterval(tickInterval);

        const totalDuration = session.totalDuration || 25 * 60;

        const updateTick = () => {
          let remaining = session.secondsRemaining || 0;
          if (session.status === "running" && session.endsAt) {
            remaining = Math.max(0, Math.round((session.endsAt - Date.now()) / 1000));
          }

          countdownDigits.innerText = formatTime(remaining);

          const progress = totalDuration > 0 ? Math.min(100, Math.max(0, Math.round(((totalDuration - remaining) / totalDuration) * 100))) : 0;
          progressFill.style.width = `${progress}%`;

          if (session.status === "running") {
            if (remaining > 0) {
              countdownState.innerText = mode === "focus" ? "In deep focus flow" : "Resting on a break";
              countdownState.style.color = isBreak ? "var(--break-accent)" : "var(--primary)";
            } else {
              countdownState.innerText = "Session complete!";
              countdownState.style.color = "var(--primary)";
            }
          } else if (session.status === "paused") {
            countdownState.innerText = "Session paused";
            countdownState.style.color = "var(--text-muted)";
          } else {
            countdownState.innerText = "Standby";
            countdownState.style.color = "var(--text-muted)";
          }
        };

        updateTick();
        if (session.status === "running") {
          tickInterval = setInterval(updateTick, 1000);
        }
      } else {
        // Standby State
        modeTag.innerText = "Focus Sprint";
        modeTag.style.color = "var(--primary)";
        cycleTag.innerText = "Cycle 1 of 4";
        anchorBox.style.display = "none";
        countdownDigits.innerText = "25:00";
        countdownState.innerText = "Ready to start";
        countdownState.style.color = "var(--text-muted)";
        progressFill.style.width = "0%";
        if (openDashboardBtn) {
          openDashboardBtn.style.backgroundColor = "var(--primary)";
          openDashboardBtn.style.color = "#00201d";
        }
      }
    } catch (err) {
      console.warn("[DND Extension Popup] Error loading status:", err);
    }
  }

  await loadState();

  // Open App Button: Focus existing tab or open new
  const openDashboard = async () => {
    try {
      const storage = await chrome.storage.local.get(["dnd_redirect"]);
      let targetOrigin = "http://localhost:3000";
      if (storage?.dnd_redirect) {
        try {
          const parsed = new URL(storage.dnd_redirect);
          if (parsed.protocol === "http:" || parsed.protocol === "https:") {
            targetOrigin = parsed.origin;
          }
        } catch {}
      }

      const queryUrls = [`${targetOrigin}/*`, "*://localhost:3000/*", "*://127.0.0.1:3000/*"];
      const tabs = await chrome.tabs.query({ url: queryUrls });
      if (tabs && tabs.length > 0) {
        const tab = tabs[0];
        if (tab.id) {
          await chrome.tabs.update(tab.id, { active: true });
        }
        if (tab.windowId) {
          await chrome.windows.update(tab.windowId, { focused: true });
        }
        window.close();
        return;
      }
      await chrome.tabs.create({ url: targetOrigin });
      window.close();
    } catch {
      window.open("http://localhost:3000", "_blank");
    }
  };

  openDashboardBtn?.addEventListener("click", openDashboard);

  const brandLink = document.getElementById("brandLink");
  brandLink?.addEventListener("click", (e) => {
    e.preventDefault();
    openDashboard();
  });

  // Emergency Pause Button
  emergencyBtn?.addEventListener("click", async () => {
    if (confirm("Pause website blocking?")) {
      await chrome.runtime.sendMessage({
        type: "DND_STOP_SESSION",
        requestId: `popup-stop-${Date.now()}`,
      });
      await loadState();
    }
  });
});
