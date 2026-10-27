# User Guide & Feature Manual

Welcome to **Do Not Disturb** — your intentional focus sanctuary designed to protect deep work, reduce context-switching, and deflect digital distractions.

---

## 1. The Core Philosophy

Modern work environments are filled with notification pings, algorithmic recommendations, and infinite scrolling feeds that erode concentration. **Do Not Disturb** is designed to reclaim cognitive autonomy through:

1. **Structured Time Boxing**: Applying Pomodoro and Ultradian rhythm cycles.
2. **Deflection, Not Willpower**: Enforcing real browser-level redirects away from distracting domains back to your focus intention.
3. **Calm Sensory Environment**: Ambient procedural soundscapes that drown out environmental distractions without distracting lyrics or ads.
4. **Complete Privacy**: Full functionality works without requiring an account or sharing browsing behavior with third parties.

---

## 2. Using the Focus Timer

The central dashboard (`/`) provides an intuitive circular timer and session control panel.

### 2.1 Timer Modes

- **Deep Focus** (Default: 25 minutes): The core interval for concentrated, single-task work.
- **Short Break** (Default: 5 minutes): A brief interval to rest your eyes, hydrate, and stretch.
- **Long Break** (Default: 15 minutes): An extended recovery period triggered after completing a cycle of focus sessions (typically 4 sessions).

### 2.2 Starting and Managing a Session

1. **Set an Intent (Optional)**: Type what you are focusing on into the session intent input (e.g., *"Finish Q4 financial summary"*).
2. **Start the Timer**: Click **Start Focus** or press `Space`.
3. **Controls**:
   - **Pause / Resume**: Temporarily suspend the countdown. Depending on your settings, blocking will remain enforced or suspend.
   - **Skip**: Advance directly to the next phase (e.g., finish early and move to Short Break).
   - **Reset**: Return the active mode to its initial full duration.

### 2.3 Automatic Phase Transitions

In **Settings** (`/settings`), you can enable:
- **Auto-Start Breaks**: Automatically transitions into a break as soon as your focus interval finishes.
- **Auto-Start Focus**: Starts the subsequent focus block when your break expires.

---

## 3. Website Blocking & Deflection

Do Not Disturb pairs with the **Focus Guard Companion Browser Extension** to intercept distractions before they consume your attention.

### 3.1 Managing Your Blocklist

Visit `/blocklist` to configure sites to guard against:
1. **Add a Domain**: Enter any website address (e.g., `reddit.com`, `youtube.com`, `x.com`, `instagram.com`). You do not need to include `https://` or `www.`.
2. **Subdomain Protection**: Blocking `youtube.com` automatically guards `www.youtube.com`, `m.youtube.com`, and specific paths like `/shorts`.
3. **Toggling Sites**: Use the toggle switch next to any domain to temporarily enable or disable blocking without deleting the entry.

### 3.2 The Zen Deflection Experience

When a focus session is active and you attempt to navigate to a blocked site:
1. The browser instantly intercepts the request.
2. You are redirected to the mindful `/blocked` page.
3. The page displays:
   - The blocked site you tried to access.
   - Your remaining focus countdown.
   - Your primary session intent.
   - A guided breathing animation to recenter your focus.
4. Each deflected attempt is recorded in your deflection metrics.

---

## 4. Ambient Soundscapes & Chimes

Do Not Disturb features an offline-capable, procedural sound generator that runs directly in your browser using the Web Audio API (`/` dashboard and `/settings`).

### 4.1 Ambient Presets

- **Gentle Rain**: Procedurally generated pink noise filtered with natural dynamic modulation, creating the soothing sensation of rain against a window.
- **Focus Beats (Binaural 40Hz)**: Pure sinusoidal tones offset by 40 Hz between stereo channels to stimulate gamma brainwave entrainment. *(Best experienced with headphones).*
- **Deep Space**: Low-frequency resonant drone that effectively masks background room chatter, traffic, and office noise.

### 4.2 Completion Chime

When a focus or break interval reaches zero, Do Not Disturb sounds an acoustic meditation chime (modeled after a traditional Tibetan singing bowl). You can toggle this on or off in `/settings`.

---

## 5. Keyboard Shortcuts

Do Not Disturb can be navigated entirely without a mouse using keyboard shortcuts:

| Default Shortcut | Action |
| :--- | :--- |
| `Space` | Start / Pause Timer |
| `R` | Reset Timer |
| `S` | Skip to Next Mode |
| `1` | Switch to Deep Focus |
| `2` | Switch to Short Break |
| `3` | Switch to Long Break |
| `M` | Mute / Unmute Ambient Sound |
| `B` | Open Website Blocklist |
| `?` | View Keyboard Shortcuts Help |

> **Customizing Shortcuts:** Visit `/shortcuts` to rebind any shortcut to your preferred key combinations.

---

## 6. Analytics & Streak Tracking

Visit `/statistics` or `/analytics` to inspect your productivity trends:

- **Total Focus Time**: Cumulative focused minutes and hours across days, weeks, and months.
- **Distraction Deflections**: The total number of distracted browsing impulses successfully thwarted by the extension.
- **Current & Longest Streaks**: Number of consecutive days you have achieved at least one completed focus session.
- **Session History Log**: Detailed ledger of previous sessions, timestamps, durations, and completion status.

---

## 7. Account Synchronization (Local-First vs Cloud)

### 7.1 Guest Mode (Default)
When you first open Do Not Disturb, you can use all features immediately with zero setup:
- Data is stored locally in your browser (`localStorage`).
- Complete privacy: no user accounts, telemetry, or remote tracking.

### 7.2 Cloud Account Sync
If you work across multiple devices (e.g. laptop and desktop):
1. Click **Sign In / Sync** in the top navigation bar.
2. Enter your email and password to create an account.
3. Your existing local blocklists, shortcuts, settings, and session logs will automatically be uploaded and preserved.
4. Log into any other browser to access your synced preferences and blocklists.
