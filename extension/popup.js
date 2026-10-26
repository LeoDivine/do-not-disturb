/**
 * Do Not Disturb — Extension Popup Controller
 */

document.addEventListener("DOMContentLoaded", async () => {
  const shieldDot = document.getElementById("shieldDot");
  const shieldText = document.getElementById("shieldText");
  const blockedCount = document.getElementById("blockedCount");
  const sessionMode = document.getElementById("sessionMode");
  const emergencyBtn = document.getElementById("emergencyUnblockBtn");

  try {
    const response = await chrome.runtime.sendMessage({
      type: "DND_GET_STATUS",
      requestId: `popup-${Date.now()}`,
    });

    if (response) {
      if (response.isBlockingActive) {
        shieldDot.classList.add("active");
        shieldText.innerText = "Focus Active";
        shieldText.style.color = "var(--primary)";
        blockedCount.innerText = response.ruleCount || (response.blockedDomains?.length || 0);
        sessionMode.innerText = response.activeSession?.mode === "focus" ? "Focus" : response.activeSession?.mode === "shortBreak" ? "Break" : "Rest";
        emergencyBtn.style.display = "block";
      } else {
        shieldDot.classList.remove("active");
        shieldText.innerText = "Ready";
        shieldText.style.color = "var(--text-muted)";
        blockedCount.innerText = "0";
        sessionMode.innerText = "Standby";
        emergencyBtn.style.display = "none";
      }
    }
  } catch (err) {
    console.error("Popup status error:", err);
  }

  emergencyBtn?.addEventListener("click", async () => {
    if (confirm("Pause website blocking?")) {
      await chrome.runtime.sendMessage({
        type: "DND_STOP_SESSION",
        requestId: `popup-stop-${Date.now()}`,
      });
      window.location.reload();
    }
  });
});
