# Do Not Disturb — Companion Browser Extension

This Chromium browser extension (Manifest V3) enables real browser-level website blocking during focus sessions in **Do Not Disturb**.

## How It Works

1. **Declarative Network Request (`chrome.declarativeNetRequest`):** When you start a focus session in the web app, the extension creates dynamic redirection rules for your active blocklist.
2. **Deflection to Zen Sanctuary:** Navigations to blocked sites (e.g. `youtube.com`) are redirected to the sanctuary page (`https://www.donotdistrb.com/blocked?blocked=youtube.com` or local equivalent) or the bundled offline `blocked.html`.
3. **Automatic Session Alarms:** The extension uses `chrome.alarms` with your timer's end time, ensuring websites are unblocked automatically even if you close the web app tab.
4. **Seamless Content Bridge:** The extension injects an automatic bridge on production (`https://www.donotdistrb.com/*`) and development origins that connects automatically with no manual configuration or extension ID copying required.
5. **Instant Active Tab Deflection:** If you start a focus session while distracting tabs (like a playing YouTube video) are already open, the background service worker immediately detects and redirects them without needing a page refresh.

---

## 30-Second Installation in Chrome, Edge, or Brave

1. Open **`chrome://extensions`** (or `edge://extensions` / `brave://extensions`) in your browser.
2. Turn ON the **Developer mode** toggle switch in the top-right corner.
3. Click the **Load unpacked** button in the top-left corner.
4. Select the `extension` directory (or unzipped package).
5. Return to the Do Not Disturb app at `https://www.donotdistrb.com` (or `http://localhost:3000/blocklist` locally).
6. The status banner will instantly switch to **"Browser Extension Connected"**!

> **Updating an existing installation:** Because Developer Mode extensions do not auto-update, whenever an update is released, replace your folder files and click the circular **Reload** (🔄) button on the extension card in `chrome://extensions`.

---

## Testing Website Blocking

1. In the web app, go to `/blocklist` and make sure your target site (e.g. `youtube.com` or `reddit.com`) is active.
2. Go to the dashboard `/` and click **Start Focus** on the timer.
3. Open a new browser tab and navigate to `https://www.youtube.com`.
4. The browser will deflect and display the calming `/blocked` page with your active focus countdown.
5. Pause or stop the timer, and reload the blocked site — access is immediately restored.
