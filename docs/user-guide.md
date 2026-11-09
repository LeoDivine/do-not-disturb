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

### 2.4 Focus Cycles & Daily Rhythm

Do Not Disturb organizes your work into cyclical Pomodoro intervals displayed in the central dashboard, the top navigation tracker, and the companion extension popup (e.g., *Cycle 1 of 4*):
- **Interval Sequencing**: Completing a focus sprint advances your cycle counter. After completing the configured target cycles (default: 4, customizable in Settings as **Long Break Cadence**), the timer sequences into an extended **Long Break**, after which the cycle resets back to 1.
- **Automatic Daily Reset**: The cycle counter **automatically resets back to 1 every calendar day**. When you begin work on a new day or leave the dashboard open overnight, the application detects the date rollover at midnight and resets the cycle to 1 so each morning starts with a clean rhythm.
- **Manual Reset**: The cycle can also be reset at any time programmatically or via `resetCycle` in the timer context.

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

> **Instant Tab Protection**: If you already have a blocked website open in another tab (such as a playing YouTube video) when you click **Start Focus**, the companion extension automatically deflects that open tab immediately — no manual page refresh required.

---

## 4. Ambient Soundscapes & Chimes

Do Not Disturb features an offline-capable, procedural sound generator that runs directly in your browser using the Web Audio API (`/` dashboard and `/settings`).

### 4.1 Ambient Presets

- **Gentle Rain**: Procedurally generated pink noise filtered with natural dynamic modulation, creating the soothing sensation of rain against a window.
- **Focus Beats (Binaural 40Hz)**: Pure sinusoidal tones offset by 40 Hz between stereo channels to stimulate gamma brainwave entrainment. *(Best experienced with headphones).*
- **Deep Space**: Low-frequency resonant drone that effectively masks background room chatter, traffic, and office noise.

### 4.2 Completion Chime

When a focus or break interval reaches zero, Do Not Disturb sounds an acoustic meditation chime (modeled after a traditional Tibetan singing bowl). You can toggle this on or off in `/settings`.

### 4.3 Spotify Focus Music, Playlists & Two-Way App Sync

In addition to procedural ambient sounds, you can play focus music from Spotify using the **Focus Session Audio** card on the dashboard (`/`) or the floating **Spotify Focus Widget** button in the corner of your screen:

1. **Toggle Audio Source**: Click the **Spotify** tab in the *Focus Session Audio* selector on the dashboard (or select a track/playlist in the floating Spotify widget). Switching to Spotify automatically stops any playing ambient soundscape, and switching back to Ambient pauses Spotify.
2. **Floating Spotify Widget**: Drag the green Spotify button anywhere along the screen edge or tap it to open the compact popover controller. Switch between **Songs** and **Playlists**, drill into any playlist via **Songs ❯**, refresh your playlists via **↻**, or expand **Show full player ▼** to interact directly with the embedded player.
3. **Two-Way Sync with Your Spotify App (Spotify Connect)**:
   - When connected, Do Not Disturb registers as a live **Spotify Connect** device (`"Do Not Disturb Focus"`).
   - **See What's Playing in Your Spotify App**: Any song or playlist you start on the website appears immediately in your native Spotify desktop or mobile app.
   - **Change Songs From Either Place**: Skip tracks, pick a new song or playlist, or pause playback directly from your Spotify mobile/desktop app or from the website—both stay synchronized in real time.
   - **Quick Handoff (`Play here` / `Open App ↗`)**: Use the sync bar in the floating widget to transfer active playback from your phone/desktop app into the browser tab (`Play here`) or launch the current song/playlist directly in the native Spotify app (`Open App ↗`).
4. **Connect Your Spotify Account**: Click **Connect Spotify** in the widget or visit `/connected-apps` to authorize your personal library. Once connected, your personal playlists appear immediately on `/connected-apps`, in the floating widget's **Playlists** tab, in `/settings#sounds`, and in the Picture-in-Picture mini-timer.
5. **Import Any Playlist, Album, or Track by Link**: Paste any Spotify web link (`https://open.spotify.com/playlist/...`) or Spotify URI (`spotify:playlist:...`) into the input box in the floating widget, `/connected-apps`, or the `/settings#sounds` playlist selector. Do Not Disturb resolves the playlist's title, cover artwork, owner, and full track list and saves it to **Your Playlists**.
6. **Curated Focus Library**: Even without connecting an account, you can choose from five built-in focus playlists (*Deep Focus*, *Lo-Fi Beats*, *Peaceful Piano*, *Chill Lofi Study*, or *Coding Mode*) and curated instrumental focus tracks (*Weightless*, *Clair de Lune*, *Gymnopédie No. 1*, *Experience*, *Cornfield Chase*, and more).
7. **Session Continuity & Cloud Sync**: Pausing your timer or stepping away preserves your active track (`lastPlayedTrackUri`) without losing your selected playlist. Your Spotify preferences are also included in JSON settings backups and cloud synchronization.

### 4.4 Timer Playback Coordination & Picture-in-Picture

- **Auto-Play on Focus ("Play audio when timer starts")**: When enabled in `/settings`, starting a focus session automatically starts your selected Spotify playlist or ambient soundscape. This setting automatically synchronizes to your cloud profile across devices.
- **Auto-Pause on Breaks**: When your focus block ends or you pause the timer, music automatically pauses so you can rest.
- **Picture-in-Picture (PiP) Window**: Click the popout icon to open the floating mini timer window. The mini timer mirrors active Spotify album artwork, song titles, and artist names, and relays play/pause commands back to the main window.

---

## 5. Gamification, Flow Progression & Zen Sanctuary

Do Not Disturb provides an intrinsic, mindful progression system designed to celebrate deep work without anxiety or cluttered game elements.

### 5.1 Flow XP & Levels
- **Earning XP**: You earn $+10\text{ XP}$ per minute focused (including partial credit if you stop a session early after at least 1 minute). Completing a full focus sprint additionally awards $+50\text{ XP}$ for reaching your target, $+35\text{ XP}$ for zero-distraction sessions, $+15\text{ XP}$ per deflection absorbed, and streak cadence bonuses.
- **Level Titles**: Advance through calm flow tiers (e.g. *Level 1 Novice Focus*, *Level 2 Calm Observer*, *Level 3 Mindful Pacer*, up to *Level 30+ Zen Master*).
- **Post-Session Celebration**: Completing a full focus sprint brings up a gentle summary dialog showing your earned focus points, streak status, and newly unlocked milestones (sessions ended early quietly log partial time XP without interrupting you).

### 5.2 The Zen Bonsai Garden
On the main dashboard (`/`), you can toggle the visualizer between the **Arc View** and the **Zen Garden**:
- As you focus, a procedural Bonsai tree sprouts, grows branches, develops layered pine canopies, and flowers with sakura blossom petals.
- Reaching the end of your session brings the sanctuary into full golden-emerald bloom with a rotating protective Zen shield aura.

### 5.3 Compassionate Streaks & Rest Tokens
To prevent streak burnout:
- You receive **Rest Day tokens** (2 to start, plus 1 earned every 5 active focus days).
- If you take a rest day, your streak is automatically protected without resetting to zero.
- You can also view or use tokens manually from the level indicator in the navigation bar.

### 5.4 Soundscape Unlocks
Reaching specific level milestones unlocks new procedural Web Audio soundscapes in `/settings`:
- **Ocean Tides** (Unlocks at **Level 3**): Rhythmic rolling wave swells.
- **Zen Wind** (Unlocks at **Level 5**): Canopy breeze with soft harmonic overtones.

### 5.5 Focus Milestones & Badges
Visit `/statistics#achievements` to track 15 milestones across Focus, Deflection, Daily Habits, and Lifetime Mastery.

### 5.6 Cloud Synchronization for Flow XP & Sanctuary State
When signed in, all gamification state—including your current Level, Flow XP, Rest Day tokens, deflection shields absorbed, and unlocked achievement badges—automatically syncs to PostgreSQL through the `/api/sync` service. If you work on multiple computers, your progress reconciles automatically without ever losing XP.

---

## 6. Keyboard Shortcuts

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

## 7. Analytics & Milestones

Visit `/statistics` to inspect your productivity trends:

- **Total Focus Time**: Cumulative focused minutes and hours across days, weeks, and months.
- **Distraction Deflections**: The total number of distracted browsing impulses successfully thwarted by the extension.
- **Current & Longest Streaks**: Number of consecutive days you have achieved at least one completed focus session.
- **Focus Milestones**: Track locked and unlocked achievement badges with live progress bars.
- **Session History Log**: Detailed ledger of previous sessions, timestamps, durations, and completion status.

---

## 8. Account Synchronization (Local-First vs Cloud)

### 8.1 Guest Mode (Default)
When you first open Do Not Disturb, you can use all features immediately with zero setup:
- Data is stored locally in your browser (`localStorage`).
- Complete privacy: no user accounts, telemetry, or remote tracking.

### 8.2 Cloud Account Sync
If you work across multiple devices (e.g. laptop and desktop):
1. Click **Sign In / Sync** in the top navigation bar.
2. Enter your email and password to create an account.
3. Your existing local blocklists, custom timer presets, shortcuts and shortcut toggles, visual themes, active focus anchors, session histories (with goals and notes), granular deflection event logs, Flow XP, and unlocked achievements will automatically be uploaded and preserved.
4. Log into any other browser to access your synced preferences, blocklists, and flow progression.

### 8.3 Signing Out & Shared Computers
When you click **Sign out** in the user navigation menu:
- A confirmation dialog informs you that your cloud data is safely saved in PostgreSQL.
- **Personal Laptops**: Choose **Sign out (Keep Local Copy)** to retain your cached sessions, settings, and presets for offline guest use.
- **Shared / Public Computers**: Choose **Sign out & Clear Device** to wipe all local browser cache, deflection logs, and focus sprint records from that computer before leaving.

---

## 9. Platform Tour for First-Time Users

When opening Do Not Disturb for the first time, a gentle, minimalist walkthrough welcomes you to the platform:
- **First-Timer Tracking**: Your tour status is tracked completely offline in `localStorage` (`dnd_platform_tour_seen`), ensuring returning users are never repeatedly interrupted.
- **Serene Minimalism**: Designed strictly without loud badges, pills, or gamified banners, adhering to the Serene Focus aesthetic.
- **Step-by-Step Overview**: Explains focus rhythms, acoustic soundscapes, distraction deflection shields, and mindful streak momentum.
- **Replay Anytime**: You can restart or review the tour at any point by clicking **Platform Tour** in the footer, opening the user menu, or choosing **Take Platform Tour** in **Settings** (`/settings`).
