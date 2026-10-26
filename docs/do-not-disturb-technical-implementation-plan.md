# Do Not Disturb — Technical Implementation Plan

**Project name:** Do Not Disturb (working name)  
**Document version:** 1.0  
**Status:** Implementation planning  
**Product type:** Next.js web application + Chromium browser extension  
**Primary stack:** Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Chrome Extension Manifest V3

---

## 1. Project Folder Structure

### 1.1 Recommended repository layout

Use a single repository with separate web-app and extension applications. This keeps shared contracts and domain logic together without requiring Turborepo.

```text
do-not-disturb/
├── apps/
│   ├── web/
│   │   ├── public/
│   │   │   ├── sounds/
│   │   │   └── icons/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (workspace)/
│   │   │   │   │   ├── page.tsx                 # Focus dashboard
│   │   │   │   │   ├── blocklist/page.tsx        # Website management
│   │   │   │   │   ├── statistics/page.tsx       # Session history/stats
│   │   │   │   │   └── settings/page.tsx         # Preferences
│   │   │   │   ├── blocked/page.tsx              # Web fallback/help page
│   │   │   │   ├── layout.tsx
│   │   │   │   └── globals.css
│   │   │   ├── components/
│   │   │   │   ├── layout/
│   │   │   │   │   ├── app-shell.tsx
│   │   │   │   │   ├── app-sidebar.tsx
│   │   │   │   │   └── app-header.tsx
│   │   │   │   ├── timer/
│   │   │   │   │   ├── timer-display.tsx
│   │   │   │   │   ├── timer-controls.tsx
│   │   │   │   │   ├── session-progress.tsx
│   │   │   │   │   ├── session-mode-tabs.tsx
│   │   │   │   │   └── compact-timer.tsx
│   │   │   │   ├── blocking/
│   │   │   │   │   ├── blocking-status.tsx
│   │   │   │   │   ├── domain-form.tsx
│   │   │   │   │   ├── domain-list.tsx
│   │   │   │   │   └── extension-connection.tsx
│   │   │   │   ├── audio/
│   │   │   │   │   ├── audio-player.tsx
│   │   │   │   │   ├── sound-picker.tsx
│   │   │   │   │   └── volume-control.tsx
│   │   │   │   ├── statistics/
│   │   │   │   │   ├── focus-summary.tsx
│   │   │   │   │   └── session-history.tsx
│   │   │   │   └── ui/                            # shadcn/ui components
│   │   │   ├── features/
│   │   │   │   ├── timer/
│   │   │   │   │   ├── timer-engine.ts
│   │   │   │   │   ├── timer-machine.ts
│   │   │   │   │   ├── timer-store.ts
│   │   │   │   │   └── timer-selectors.ts
│   │   │   │   ├── blocking/
│   │   │   │   │   ├── extension-client.ts
│   │   │   │   │   ├── blocking-service.ts
│   │   │   │   │   └── domain-utils.ts
│   │   │   │   ├── audio/
│   │   │   │   │   ├── audio-engine.ts
│   │   │   │   │   └── sound-catalog.ts
│   │   │   │   ├── statistics/
│   │   │   │   │   └── statistics-service.ts
│   │   │   │   └── preferences/
│   │   │   │       ├── preferences-store.ts
│   │   │   │       └── preferences-schema.ts
│   │   │   ├── hooks/
│   │   │   │   ├── use-timer.ts
│   │   │   │   ├── use-audio.ts
│   │   │   │   └── use-extension-status.ts
│   │   │   ├── lib/
│   │   │   │   ├── storage/
│   │   │   │   │   ├── storage-adapter.ts
│   │   │   │   │   └── indexeddb.ts
│   │   │   │   ├── notifications.ts
│   │   │   │   ├── date-time.ts
│   │   │   │   └── utils.ts
│   │   │   ├── schemas/
│   │   │   │   ├── domain.schema.ts
│   │   │   │   ├── preferences.schema.ts
│   │   │   │   └── extension-message.schema.ts
│   │   │   └── types/
│   │   │       ├── timer.ts
│   │   │       ├── preferences.ts
│   │   │       └── blocking.ts
│   │   ├── next.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── extension/
│       ├── public/
│       │   ├── icons/
│       │   └── blocked.html
│       ├── src/
│       │   ├── background/
│       │   │   ├── service-worker.ts
│       │   │   ├── session-controller.ts
│       │   │   ├── rules-manager.ts
│       │   │   └── recovery.ts
│       │   ├── content/
│       │   │   └── blocked-page.ts
│       │   ├── popup/
│       │   │   ├── popup.html
│       │   │   ├── popup.ts
│       │   │   └── popup.css
│       │   ├── shared/
│       │   │   ├── messages.ts
│       │   │   ├── schemas.ts
│       │   │   └── domain-utils.ts
│       │   └── manifest.ts
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── contracts/
│       │   │   ├── extension-messages.ts
│       │   │   └── focus-session.ts
│       │   ├── domain/
│       │   │   ├── timer.ts
│       │   │   └── domains.ts
│       │   └── index.ts
│       └── package.json
│
├── docs/
│   ├── PRD.md
│   ├── TECHNICAL-IMPLEMENTATION-PLAN.md
│   └── extension-permissions.md
├── package.json
├── pnpm-workspace.yaml
├── .gitignore
└── README.md
```

### 1.2 Structure decisions

- **No Turborepo is required.** A pnpm workspace is sufficient for two apps and a small shared package.
- Keep timer calculations in framework-independent TypeScript so they can be tested without rendering React.
- Keep browser-specific APIs inside the extension app. The Next.js app should not directly import Chrome extension APIs.
- Share message types and pure domain utilities through `packages/shared`.
- Keep persisted data behind storage adapters so IndexedDB or local storage can be changed without rewriting features.
- Use client components only where browser APIs, React state, audio, or user interaction require them.

### 1.3 Suggested package responsibilities

**Web app:** dashboard, timer interface, settings, audio, local statistics, extension connection.

**Extension:** enforce navigation restrictions, manage active rules, expose status, recover from stale sessions.

**Shared package:** typed message contracts, timer data types, domain normalization and matching helpers.

---

## 2. Timer State Machine and Persistence Strategy

### 2.1 State model

Use a single authoritative timer state machine. UI components should dispatch actions rather than independently manipulating countdown values.

```ts
export type SessionType = "focus" | "shortBreak" | "longBreak";

export type TimerStatus =
  | "idle"
  | "running"
  | "paused"
  | "completed"
  | "stopped";

export interface TimerSession {
  id: string;
  type: SessionType;
  status: TimerStatus;
  plannedDurationMs: number;
  startedAt: number | null;
  endsAt: number | null;
  remainingMs: number;
  pausedAt: number | null;
  completedAt: number | null;
  completedFocusSessions: number;
}
```

Keep configuration separate from the active session:

```ts
export interface TimerSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakEvery: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
}
```

`completedFocusSessions` may ultimately belong in a separate cycle/progress record rather than the active session object. Keep the model normalized if the implementation grows.

### 2.2 State transitions

| Current state | Action | Next state | Required behavior |
|---|---|---|---|
| idle | START | running | Set start and end timestamps |
| running | PAUSE | paused | Calculate and save remaining time |
| paused | RESUME | running | Set a new end timestamp |
| running | TICK / RECONCILE | running or completed | Recalculate from timestamps |
| running | STOP | stopped | Clear active blocking state |
| paused | STOP | stopped | Clear active blocking state |
| running | SKIP | completed or next session | Finalize according to skip policy |
| completed | START_NEXT | running | Initialize next configured session |
| stopped | START | running | Create a new session identifier |

Implement and test explicit rules for skip behavior. A skipped focus session should not be recorded as successfully completed unless the product intentionally defines a different policy.

### 2.3 Accurate countdown logic

Do not decrement a stored number every second. Background tabs may be throttled, suspended, or discarded.

Use timestamps:

```ts
export function getRemainingMs(
  endsAt: number,
  now = Date.now(),
): number {
  return Math.max(0, endsAt - now);
}
```

When starting a session:

```ts
const now = Date.now();

const session = {
  // other session properties...
  status: "running" as const,
  startedAt: now,
  endsAt: now + durationMs,
  remainingMs: durationMs,
};
```

When pausing:

```ts
const remainingMs = Math.max(0, session.endsAt! - Date.now());

const pausedSession = {
  ...session,
  status: "paused" as const,
  remainingMs,
  endsAt: null,
  pausedAt: Date.now(),
};
```

When resuming, set `endsAt = Date.now() + remainingMs`. On every render refresh, visibility change, page restoration, and extension reconnect, reconcile the displayed state against the persisted timestamps.

The code above illustrates the calculation pattern; production code should validate nullable fields and centralize all transitions in the timer engine.

### 2.4 Persistence approach

Use two persistence layers with different responsibilities.

**IndexedDB — durable application data**
- Preferences
- Blocklist
- Completed session history
- Current session snapshot, if needed

**Extension `chrome.storage` — extension authority**
- Last accepted session state
- Current blocking policy
- Blocklist or active rules needed by the extension
- Session expiry and last synchronization time

The extension must not depend on the web page being open to keep enforcing an active policy.

Use a versioned storage schema so future changes can migrate saved settings and session records safely.

### 2.5 Recovery rules

On application startup:
1. Load preferences and the latest session snapshot.
2. If a session is running, calculate remaining time from `endsAt`.
3. If `endsAt` has passed, finalize the session once and apply the configured transition policy.
4. If paused, restore the saved remaining duration without advancing it.
5. Reconcile extension state and show the current connection status.

On extension startup:
1. Load its last accepted session and blocking policy.
2. Validate the session identifier, status, timestamps, and expiry.
3. Rebuild or remove temporary rules based on the documented recovery policy.
4. Report status to the web app when communication is available.

**Recommended default:** expire temporary blocking state at the end of the focus session. If the browser or device restarts, recover only when the stored session is valid and has not expired. Provide a visible emergency stop/unblock action and never leave stale temporary rules active indefinitely.

### 2.6 Completion and exactly-once recording

- Assign every session a unique ID.
- Make completion idempotent: receiving the same completion event twice must not create duplicate history records.
- Record only completed focus sessions in completed-focus totals.
- Store start/end timestamps and planned duration.
- Decide explicitly whether a session that reaches zero while the page is suspended automatically advances to the next session or waits for user confirmation.

**Recommended MVP behavior:** finalize at zero, show a completion notification when possible, and require user confirmation for the next session unless auto-start is enabled.

### 2.7 Timer testing requirements

Test at minimum:
- Start, pause, resume, stop, and skip.
- Page refresh during a running and paused session.
- Tab suspension and return.
- Device sleep and wake.
- Timer reaching zero while the page is inactive.
- Duplicate completion messages.
- Invalid or expired stored session data.
- Changes to timer settings during an active session.

---

## 3. Browser Extension Permissions and Website-Blocking Flow

### 3.1 Recommended permission strategy

Use Chrome Extension Manifest V3. Keep permissions narrow and explain each permission to the user.

Potential permissions, subject to implementation and browser review:

- `storage`: persist extension session and blocking state.
- `declarativeNetRequest`: apply supported navigation blocking or redirect rules.
- `alarms`: schedule recovery/expiry checks when needed.
- `tabs`: only if the implementation genuinely needs tab metadata or navigation coordination.
- Host permissions: request only the domains and app origins required by the chosen design.

Do not request broad access to every website by default unless required for the feature and clearly explained. The exact host permissions depend on whether rules are managed through dynamic rules, static rules, or a different extension design.

### 3.2 Blocking implementation

Prefer `declarativeNetRequest` for rule-based blocking where it supports the required behavior. It allows the extension to apply declarative rules without requiring a persistent background page.

Implementation considerations:
- Use dynamic rules for the user's configurable blocklist where suitable.
- Normalize domains before creating rules.
- Avoid broad wildcard rules that block unrelated sites.
- Test root domains, subdomains, URL schemes, and common URL variants.
- Keep user-configured permanent domains separate from session-active rules.
- Remove only rules owned by the application's session-blocking feature.
- Keep rule IDs deterministic or persist a mapping so updates and removals are reliable.
- Verify limits and redirect behavior against the target browser's current extension APIs.

Do not use `webRequest` blocking as the default architecture for a Manifest V3 extension; blocking behavior is restricted compared with older extension versions.

### 3.3 Domain normalization

Accept user entries such as:
- `youtube.com`
- `www.youtube.com`
- `https://www.reddit.com/`

Normalize them to a hostname and validate them before storing. Reject malformed entries, unsupported URL schemes, credentials in URLs, IP addresses if unsupported by the product policy, and public-suffix-only entries such as `com`.

Store whether the entry should match subdomains. Use proper hostname-boundary matching so a rule for `youtube.com` does not accidentally match `notyoutube.com`.

### 3.4 Extension ↔ Web app communication

Use a documented message protocol with schema validation.

Example message types:

```ts
type FocusMessage =
  | {
      type: "GET_EXTENSION_STATUS";
      requestId: string;
    }
  | {
      type: "SYNC_FOCUS_SESSION";
      requestId: string;
      session: {
        id: string;
        status: "running" | "paused" | "completed" | "stopped";
        type: "focus" | "shortBreak" | "longBreak";
        endsAt: number | null;
        blockDuringBreaks: boolean;
      };
      domains: Array<{
        hostname: string;
        includeSubdomains: boolean;
        enabled: boolean;
      }>;
    }
  | {
      type: "STOP_FOCUS_SESSION";
      requestId: string;
      sessionId: string;
    };
```

This is an illustrative contract; the production contract should live in the shared package and be validated at runtime.

The web app must not assume that a message was applied just because it was sent. Wait for an acknowledgement and surface errors in the interface.

### 3.5 Establishing a connection

A normal web page cannot automatically message any installed extension. Choose and document a connection strategy.

Possible approach:
1. Publish or configure the extension ID.
2. Allow the extension to recognize the approved web-app origin.
3. Use the supported external messaging mechanism with an explicit allowlist.
4. Validate every incoming message.
5. Return an acknowledgement containing the request ID and applied state.

For local development, support a separate development origin and extension configuration. Do not accept arbitrary origins in production.

### 3.6 Blocking flow

**When a focus session starts**
1. The timer engine creates a session ID and timestamps.
2. The web app sends a validated session-sync message.
3. The extension checks the session state and current blocklist.
4. The extension creates or updates temporary blocking rules.
5. The extension acknowledges the applied rule count and active session ID.
6. The dashboard shows blocking as active only after confirmation.

**When a focus session pauses**
1. The web app synchronizes the paused state.
2. The extension applies the documented pause policy.
3. The dashboard updates its status after acknowledgement.

Recommended policy: suspend session-based blocking during a paused session, unless the user explicitly enables strict pause behavior.

**When a focus session ends**
1. The web app sends a stop or completion message.
2. The extension validates the session ID.
3. The extension removes that session's temporary rules.
4. The extension retains the permanent blocklist.
5. The extension acknowledges cleanup.

**When communication is lost**
- Keep the last valid policy only until its defined expiry.
- Use an expiry timestamp and recovery checks.
- Never treat an unacknowledged sync as successful.
- Show the user that blocking status cannot currently be confirmed.

### 3.7 Blocked-page experience

The blocked page should show:
- “This website is blocked during your focus session.”
- Session status, if it can be retrieved safely.
- Remaining time only when the extension has a valid session end timestamp.
- A short explanation of the user's configured policy.
- A route back to the focus dashboard.
- A clear emergency stop/unblock path, subject to the product's chosen policy.

The blocked page must not claim a session is active based on stale information.

### 3.8 Browser support and limitations

- Launch with current desktop versions of Chrome and Edge.
- Test actual redirect and rule behavior in installed unpacked extensions before committing to a specific API flow.
- Do not promise blocking across other browsers, mobile apps, VPNs, or operating-system applications.
- A user can disable or uninstall the extension; this is a voluntary focus tool, not tamper-proof enforcement.
- Avoid claiming that a regular Next.js page can enforce browser-wide blocking without the extension.

### 3.9 Extension acceptance tests

- Configured domains are blocked only when the selected policy is active.
- Unconfigured domains remain accessible.
- Subdomain matching follows the user's setting.
- Stopping a session removes temporary rules.
- Permanent blocklist entries remain saved.
- A stale session expires according to policy.
- Duplicate sync messages do not create duplicate rules.
- Malformed external messages are rejected.
- An unapproved website origin cannot control the extension.
- Extension installation or communication failures are visible in the dashboard.

---

## 4. Component Breakdown and UI Screen Specifications

### 4.1 Application shell

**Components**
- `AppShell`
- `AppHeader`
- `AppSidebar`
- `ThemeToggle`
- `ExtensionConnectionIndicator`

**Responsibilities**
- Shared navigation and layout.
- Display extension connection status.
- Provide access to settings and statistics.
- Adapt layout to desktop and tablet widths.

### 4.2 Focus dashboard

**Route:** `/`

**Components**
- `SessionModeTabs`
- `TimerDisplay`
- `SessionProgress`
- `TimerControls`
- `FocusCycleIndicator`
- `BlockingStatus`
- `AudioPlayer`
- `DailyFocusSummary`

**Primary content**
- Current session type.
- Large countdown.
- Start, pause/resume, skip, and stop actions.
- Session progress indicator.
- Website-blocking status and extension connection.
- Current ambient sound and volume.
- Today's completed sessions and focus time.

**Interactions**
- Start begins the configured focus session.
- Pause freezes remaining time and applies the pause policy to blocking.
- Resume restarts the countdown from saved remaining time.
- Stop ends the session and triggers extension cleanup.
- Compact mode hides secondary panels while retaining the essential timer controls.

**Empty state**
- No active session: show the default duration and a clear Start action.
- Extension not installed: show blocking as unavailable and link to installation instructions.
- No audio selected: show a prompt to choose a sound.

### 4.3 Compact timer

**Mode:** In-page compact view, not a separate desktop window.

**Components**
- `CompactTimer`
- `CompactTimerControls`
- `CompactSessionStatus`
- `RestoreDashboardButton`

**Display**
- Countdown.
- Focus/break label.
- Pause/resume.
- Stop or expand control.

**Behavior**
- Preserve the active timer session when entering or leaving compact mode.
- Use a narrow, uncluttered layout.
- Maintain keyboard accessibility.
- Do not claim to float above other applications.

A future Tauri or Electron desktop app can reuse timer-domain logic but will require a separate native window implementation for always-on-top behavior.

### 4.4 Website blocklist

**Route:** `/blocklist`

**Components**
- `DomainForm`
- `DomainList`
- `DomainListItem`
- `SubdomainToggle`
- `BlockingStatus`
- `ExtensionConnectionCard`

**Requirements**
- Add a hostname.
- Validate and normalize the entry.
- Enable or disable a domain.
- Configure subdomain matching.
- Remove an entry with confirmation if appropriate.
- Display whether the extension is connected and whether active rules have been acknowledged.
- Explain that changes may require synchronization with the extension.

**Validation**
- Reject invalid hostnames.
- Prevent duplicate normalized entries.
- Clearly explain unsupported entries.
- Avoid silently accepting full URLs as separate duplicate domains.

### 4.5 Audio player

**Components**
- `SoundPicker`
- `AudioPlayButton`
- `VolumeControl`
- `MuteToggle`
- `AudioStatus`

**Requirements**
- Group sounds by type: noise and nature/ambience.
- Display the selected sound.
- Support play, pause, mute, and volume.
- Persist preferences.
- Provide loading or error feedback for audio assets.
- Avoid starting playback without user interaction.

### 4.6 Settings

**Route:** `/settings`

**Sections**
1. Timer durations.
2. Session transition preferences.
3. Blocking behavior during focus, pause, and breaks.
4. Notification preferences.
5. Default audio and volume.
6. Appearance.
7. Local data management.

**Requirements**
- Validate duration values and enforce sensible limits.
- Clearly distinguish changes that affect the next session from changes that affect the current session.
- Confirm destructive actions such as clearing history.
- Keep settings usable with keyboard navigation.

### 4.7 Statistics

**Route:** `/statistics`

**Components**
- `FocusSummary`
- `DailyFocusChart` (optional for initial MVP)
- `SessionHistory`
- `ClearHistoryDialog`

**Display**
- Total focus time today.
- Completed focus sessions today.
- Recent sessions with type, duration, and completion status.
- Daily summaries based on the user's local time zone.

**Requirements**
- Empty state for new users.
- Avoid counting breaks as focus time.
- Prevent duplicate session records.
- Allow local history to be cleared.

### 4.8 Blocked website page

**Implementation:** Extension-owned HTML or another extension-supported page, not only a Next.js route.

**Display**
- Clear blocked-site message.
- Current session status and valid remaining time, if available.
- Link or button to return to the dashboard.
- A documented stop/unblock option.

**Requirements**
- Work when the web application tab is closed.
- Avoid relying on a web-app API call to render the basic blocked message.
- Do not expose browsing history to the web application.
- Handle expired sessions by refreshing state and restoring access where appropriate.

### 4.9 Shared design system

Use shadcn/ui for buttons, cards, dialogs, tooltips, inputs, sliders, switches, and navigation primitives.

Create reusable feature-level components for timer controls, status labels, audio selection, and domain management. Keep business logic in feature modules rather than embedding it in visual components.

### 4.10 Responsive behavior

**Desktop:** Full dashboard with timer centered and secondary panels arranged alongside or below it.

**Tablet:** Timer remains primary; secondary panels can stack.

**Narrow browser window:** Collapse navigation and secondary panels; preserve access to timer controls and extension status.

**Accessibility:** Keyboard operation, visible focus, sufficient contrast, semantic labels, reduced motion, and status announcements that do not overwhelm screen-reader users.

---

## 5. Recommended Implementation Order

1. Create the pnpm workspace and app shells.
2. Define shared types and runtime schemas.
3. Implement and test the pure timer engine.
4. Build the dashboard and timer controls.
5. Add local preferences and session history.
6. Implement ambient audio and sound selection.
7. Build the extension skeleton and permission model.
8. Implement domain normalization and blocking rules.
9. Add web-app/extension messaging with acknowledgements.
10. Implement session expiry and recovery.
11. Build the blocklist screen and blocked-page experience.
12. Add compact mode, settings, and statistics.
13. Run integration, browser, accessibility, and end-to-end tests.
14. Document extension installation and known limitations.

## 6. Key Architecture Decisions to Confirm

Before implementation begins, decide:
- Whether pausing suspends website blocking or keeps it active.
- Whether breaks permit blocked websites by default.
- Whether finishing a session automatically starts the next one.
- Whether the emergency unblock action is always available.
- Which ambient audio assets are licensed and included.
- Whether local-only storage is sufficient for the first release.
- Whether the always-on-top desktop timer is a later milestone or a launch requirement.

**Recommended defaults:** suspend blocking during pause, keep blocking active during breaks only if the user opts in, require confirmation before the next session unless auto-start is enabled, retain an emergency stop, use local-first storage, and defer the native floating window until the core web-plus-extension experience is stable.
