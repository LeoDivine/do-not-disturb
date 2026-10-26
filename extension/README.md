# Do Not Disturb — Companion Browser Extension

This Chromium browser extension (Manifest V3) enables real browser-level website blocking during focus sessions in **Do Not Disturb**.

## How It Works

1. **Declarative Network Request (`chrome.declarativeNetRequest`):** When you start a focus session in the web app, the extension creates dynamic redirection rules for your active blocklist.
2. **Deflection to Zen Sanctuary:** Navigations to blocked sites (e.g. `youtube.com`) are redirected to the local `/blocked` page (`http://localhost:3000/blocked?blocked=youtube.com`) or the bundled offline `blocked.html`.
3. **Automatic Session Alarms:** The extension uses `chrome.alarms` with your timer's end time, ensuring websites are unblocked automatically even if you close the web app tab.
4. **Seamless Content Bridge:** The extension injects a bridge on `http://localhost:3000/*` that connects automatically with no manual configuration or extension ID copying required.

---

## 30-Second Installation in Chrome, Edge, or Brave

1. Open **`chrome://extensions`** (or `edge://extensions` / `brave://extensions`) in your browser.
2. Turn ON the **Developer mode** toggle switch in the top-right corner.
3. Click the **Load unpacked** button in the top-left corner.
4. Select the `extension` directory located inside this project:
   ```
   c:\Users\USER\Documents\Projects\[frontend]\Personal\do-not-disturb\extension
   ```
5. Return to the Do Not Disturb app at [http://localhost:3000/blocklist](http://localhost:3000/blocklist).
6. The status banner will instantly switch to **"Browser Extension Connected"**!

> **Note on updating the extension:** Whenever changes are made to files in `extension/`, click the small **Reload** (circular arrow) icon on the extension card in `chrome://extensions` to reload the updated extension files into your browser.

---

## Testing Website Blocking

1. In the web app, go to `/blocklist` and make sure your target site (e.g. `youtube.com` or `reddit.com`) is active.
2. Go to the dashboard `/` and click **Start Focus** on the timer.
3. Open a new browser tab and navigate to `https://www.youtube.com`.
4. The browser will deflect and display the calming `/blocked` page with your active focus countdown.
5. Pause or stop the timer, and reload the blocked site — access is immediately restored.
