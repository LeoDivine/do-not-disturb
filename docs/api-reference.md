# REST API Reference

This document provides a complete specification for all HTTP Route Handlers available in the **Do Not Disturb** Next.js application.

---

## 1. Authentication & Conventions

### 1.1 Base URL
All API endpoints are hosted under `/api` on the application domain:
- Local development: `http://localhost:3000/api`
- Production: `https://www.donotdistrb.com/api`

### 1.2 Session Handling
Authentication relies on an HTTP-only secure cookie named `dnd_session_token`:
- **Format**: Signed token in the format `<base64urlPayload>.<hmacSignature>`.
- **Payload**: `{ "userId": "<cuid>", "issuedAt": <timestamp> }`.
- **Transmission**: Automatically handled by the browser on same-site requests. Bearer authorization headers are not required for web app requests.

### 1.3 Response Standards
- Successful responses return standard JSON bodies with HTTP `200` or `201`.
- Error responses return JSON formatted as `{ "error": "<Human readable description>" }` with standard HTTP error codes (`400`, `401`, `404`, `409`, `500`).

---

## 2. Authentication Endpoints

### 2.1 Register New Account
Creates a new user profile, sets the session cookie, and automatically migrates all guest-mode local state provided in `initialPayload` (timer settings, custom presets, shortcuts, master toggles, visualizer themes, active focus anchors, blocklists, focus session histories with retrospective notes, granular deflection event logs, Flow XP, and achievements).

- **Method**: `POST`
- **Path**: `/api/auth/register`
- **Content-Type**: `application/json`

#### Request Body
```json
{
  "email": "user@example.com",
  "password": "strongPassword123",
  "name": "Alex Mercer",
  "initialPayload": {
    "blocklist": [],
    "shortcuts": [],
    "settings": {},
    "presets": [],
    "deflectionLogs": [],
    "primaryAnchor": "Write presentation slides",
    "sessionIntent": "Outline introduction",
    "visualMode": "garden",
    "shortcutsEnabled": true
  }
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "user": {
    "id": "cm4abc1230000xyz",
    "email": "user@example.com",
    "name": "Alex Mercer",
    "avatarUrl": null
  }
}
```

#### Error Codes
- `400 Bad Request`: Email missing/invalid or password shorter than 6 characters.
- `409 Conflict`: An account with the specified email already exists.

---

### 2.2 Login User
Authenticates user credentials and issues a signed session cookie.

- **Method**: `POST`
- **Path**: `/api/auth/login`
- **Content-Type**: `application/json`

#### Request Body
```json
{
  "email": "user@example.com",
  "password": "strongPassword123"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "user": {
    "id": "cm4abc1230000xyz",
    "email": "user@example.com",
    "name": "Alex Mercer",
    "avatarUrl": null
  }
}
```

#### Error Codes
- `400 Bad Request`: Email or password omitted.
- `401 Unauthorized`: Invalid email or password combination.

---

### 2.3 Logout User
Clears the session cookie and invalidates the browser session.

- **Method**: `POST`
- **Path**: `/api/auth/logout`

#### Response (200 OK)
```json
{
  "success": true
}
```

---

### 2.4 Get Current User Session
Returns the authenticated user details for the active session.

- **Method**: `GET`
- **Path**: `/api/auth/me`

#### Response (200 OK — Authenticated)
```json
{
  "authenticated": true,
  "user": {
    "id": "cm4abc1230000xyz",
    "email": "user@example.com",
    "name": "Alex Mercer",
    "avatarUrl": null
  }
}
```

#### Response (200 OK — Unauthenticated / Guest)
```json
{
  "authenticated": false,
  "user": null
}
```

---

### 2.5 Google OAuth Login
Endpoint for initiating or receiving Google OAuth authentication flows.

- **Method**: `POST`
- **Path**: `/api/auth/google`

---

## 3. Synchronization Endpoints

### 3.1 Fetch Cloud State
Fetches all user data from PostgreSQL, including blocklists, shortcuts, settings, presets, streak metrics, and recent sessions.

- **Method**: `GET`
- **Path**: `/api/sync`

#### Response (200 OK)
```json
{
  "blocklist": [
    {
      "id": "cm4def456",
      "url": "youtube.com",
      "domain": "youtube.com",
      "active": true,
      "deflections": 14,
      "icon": "video"
    }
  ],
  "shortcuts": [
    {
      "actionType": "toggleTimer",
      "keys": ["Space"]
    }
  ],
  "settings": {
    "deepFocusMinutes": 25,
    "shortBreakMinutes": 5,
    "longBreakMinutes": 15,
    "longBreakCadence": 4,
    "autoStartBreaks": true,
    "autoStartFocus": false,
    "strictBlocking": "STRICT",
    "acousticPreset": "rain",
    "bgAmbienceVolume": 65,
    "completionChime": true,
    "autoPlayAudio": true,
    "theme": "SYSTEM"
  },
  "presets": [
    {
      "name": "Deep Focus",
      "focusMinutes": 50,
      "shortBreak": 10,
      "longBreak": 20,
      "cycles": 4
    }
  ],
  "streak": {
    "currentStreak": 5,
    "longestStreak": 12,
    "totalFocusHours": 42.5,
    "lastActiveDate": "2026-10-27"
  },
  "spotifyPrefs": {
    "selectedPlaylistUri": "spotify:playlist:37i9dQZF1DWZeKCadgRdKQ",
    "selectedPlaylistName": "Deep Focus",
    "selectedPlaylistOwner": "Spotify Focus",
    "audioSource": "spotify",
    "autoPlayOnFocus": true,
    "pauseOnBreak": true,
    "lastPlayedTrackUri": null
  },
  "sessions": []
}
}
```

#### Error Codes
- `401 Unauthorized`: User is not authenticated.

---

### 3.2 Synchronize Full State
Uploads client-side state and reconciles it with PostgreSQL.

- **Method**: `POST`
- **Path**: `/api/sync`
- **Content-Type**: `application/json`

#### Request Body
Accepts a full or partial `SyncPayload`:
```json
{
  "blocklist": [
    {
      "url": "reddit.com",
      "active": true,
      "deflections": 3,
      "icon": "chat"
    }
  ],
  "shortcuts": [
    {
      "actionType": "toggleTimer",
      "keys": ["Space"]
    }
  ],
  "settings": {
    "deepFocusMinutes": 30
  },
  "sessions": []
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "syncedAt": "2026-10-27T20:50:00.000Z",
  "payload": { ... }
}
```

---

### 3.3 Synchronize Blocklist Only
Lightweight endpoint for updating only the blocked websites collection.

- **Method**: `POST`
- **Path**: `/api/sync/blocklist`
- **Content-Type**: `application/json`

#### Request Body
```json
{
  "blocklist": [
    {
      "url": "x.com",
      "active": true,
      "deflections": 8,
      "icon": "hash"
    }
  ]
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "count": 1
}
```

---

### 3.4 Synchronize Shortcuts Only
Updates user keyboard shortcuts bindings.

- **Method**: `POST`
- **Path**: `/api/sync/shortcuts`
- **Content-Type**: `application/json`

#### Request Body
```json
{
  "shortcuts": [
    {
      "actionType": "toggleTimer",
      "keys": ["Space"]
    },
    {
      "actionType": "resetTimer",
      "keys": ["R"]
    }
  ]
}
```

---

## 4. Extension Assets Endpoint

### 4.1 Download Packaged Extension
Streams the compiled browser extension archive as a downloadable attachment.

- **Method**: `GET`
- **Path**: `/api/extension/download`

#### Headers Returned
- `Content-Type`: `application/zip`
- `Content-Disposition`: `attachment; filename="do-not-disturb-extension.zip"`

#### Response
Binary ZIP stream of the `extension/` directory.

---

## 5. Live Timer Telemetry Endpoint

### 5.1 Report Active Timer Status
Reports real-time timer state transitions (`start`, `pause`, `heartbeat`, `stop`) for the Superadmin live feed. Supports both authenticated Cloud Sync users and zero-PII ephemeral local guest sessions (`ephemeralGuestId` scoped to `sessionStorage`). Raw focus goals/intent strings are never transmitted; only a boolean `hasAnchor` indicator is sent.

- **Method**: `POST`
- **Path**: `/api/timer/status`
- **Content-Type**: `application/json`

#### Request Body
```json
{
  "action": "start",
  "mode": "focus",
  "isRunning": true,
  "plannedSeconds": 1500,
  "remainingSeconds": 1485,
  "endsAt": 1762086000000,
  "cycle": 1,
  "totalCycles": 4,
  "hasAnchor": true,
  "ephemeralGuestId": "anon_8f3k9a1b"
}
```

#### Response (200 OK)
```json
{
  "ok": true,
  "synced": true,
  "active": true
}
```

---

## 6. Superadmin Telemetry & Maintenance Endpoints

All `/api/admin/*` endpoints require an authenticated session whose email matches `SUPERADMIN_EMAIL` or `SUPERADMIN_EMAILS` via `getSuperAdminUser()`.

### 6.1 Fetch Superadmin Platform Telemetry
Returns real-time active timer sessions (Signed-In + Local Guests), user growth & retention metrics (DAU/WAU/MAU, activation rate, 14-day trend), productivity health (protocols, 24h rhythm, completion rate), `k`-anonymized global blocker leaderboard, zero-PII sensory/visualizer adoption, storage hygiene counts, and the user directory.

- **Method**: `GET`
- **Path**: `/api/admin`

#### Error Codes
- `403 Forbidden`: Caller is not authenticated as a configured Superadmin.

---

### 6.2 Prune Orphaned & Stale Records
Deletes unlinked (`userId: null`) finished session records, unlinked deflection/blocklist rows, expired `RUNNING` sessions (>2 minutes past `endsAt`), and stale `PAUSED` timers (>1 hour untouched).

- **Method**: `POST`
- **Path**: `/api/admin`
- **Content-Type**: `application/json`

#### Request Body
```json
{
  "action": "prune_orphaned"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "prunedCount": 4
}
```

---

### 6.3 Delete User Account
Permanently deletes a non-superadmin user account and all associated focus sessions, blocklists, settings, shortcuts, streaks, and gamification records. Superadmin accounts are protected and cannot be deleted through this endpoint.

- **Method**: `DELETE`
- **Path**: `/api/admin/users/[id]`

#### Response (200 OK)
```json
{
  "success": true,
  "deletedUserId": "cm4abc1230000xyz"
}
```

#### Error Codes
- `400 Bad Request`: Attempted to delete own account or a protected Superadmin account.
- `403 Forbidden`: Caller is not a Superadmin.
- `404 Not Found`: Target user ID does not exist.

---

## 7. Spotify Integration Endpoints

All Spotify endpoints operate statelessly with token sessions encrypted in the `dnd_spotify_session` HTTP-only cookie. Tokens are refreshed silently in the background when expired.

### 7.1 Initiate Spotify Authorization
Generates a cryptographically secure CSRF state token, stores it in the `dnd_spotify_oauth_state` cookie (10-minute expiry), and redirects the user to the Spotify Accounts authorization portal. When invoked with `?format=json`, returns whether Spotify client credentials are configured.

- **Method**: `GET`
- **Path**: `/api/spotify/auth`
- **Query Parameters**:
  - `format` *(optional)*: `json` — returns configuration status instead of triggering redirect.

#### Response (`format=json`, 200 OK)
```json
{
  "configured": true,
  "redirectUri": "http://127.0.0.1:3000/callback"
}
```

#### Response (Standard browser navigation)
- HTTP `302 Redirect` to `https://accounts.spotify.com/authorize?response_type=code&client_id=...&scope=...&redirect_uri=...&state=...&show_dialog=true`
- Sets cookie: `dnd_spotify_oauth_state=<24-byte-hex-state>; HttpOnly; SameSite=Lax; Max-Age=600; Path=/`

---

### 7.2 Spotify OAuth Callback (Redirect Mode)
Target endpoint when `SPOTIFY_REDIRECT_URI` points directly to `/api/spotify/callback`. Verifies CSRF state, exchanges the authorization code for access and refresh tokens, fetches user profile information, seals the session with AES-256-GCM, and redirects to `/callback`.

- **Method**: `GET`
- **Path**: `/api/spotify/callback`
- **Query Parameters**:
  - `code` *(required on success)*: Single-use Spotify authorization code.
  - `state` *(required)*: CSRF state token to verify against `dnd_spotify_oauth_state` cookie.
  - `error` *(optional)*: Error code if authentication was denied or cancelled by the user.

#### Response (302 Redirect)
- Success: Redirects to `/callback?status=success&provider=spotify&account=<displayName>` with `dnd_spotify_session` cookie set.
- Error / Cancelled: Redirects to `/callback?status=error&provider=spotify&error=<errorCode>&message=<message>`.

---

### 7.3 Spotify OAuth Callback (Client Exchange Mode)
Used by `app/callback/page.tsx` when `SPOTIFY_REDIRECT_URI` points to the frontend page `/callback`. Enables frontend-mediated single-use authorization code exchange, protecting against React Strict Mode duplicate invocations via in-memory deduplication.

- **Method**: `POST`
- **Path**: `/api/spotify/callback`
- **Content-Type**: `application/json`

#### Request Body
```json
{
  "code": "AQB_1234567890_code",
  "state": "8a3d...csrf_state",
  "redirectUri": "http://127.0.0.1:3000/callback"
}
```

#### Response (200 OK)
```json
{
  "ok": true,
  "user": {
    "id": "spotify_user_id",
    "displayName": "Alex Mercer",
    "email": "alex@example.com",
    "avatarUrl": "https://i.scdn.co/image/ab6775700000ee85...",
    "product": "premium",
    "profileUrl": "https://open.spotify.com/user/spotify_user_id"
  }
}
```

#### Error Codes
- `400 Bad Request`: Code missing, invalid/expired code, or CSRF state mismatch.
- `500 Internal Server Error`: Spotify Accounts service unreachable.

---

### 7.4 Check Spotify Connection Status
Returns whether Spotify credentials are configured on the server, whether the current user has an active, authenticated Spotify session, and the associated profile details.

- **Method**: `GET`
- **Path**: `/api/spotify/status`

#### Response (Connected, 200 OK)
```json
{
  "configured": true,
  "connected": true,
  "redirectUri": "http://127.0.0.1:3000/callback",
  "user": {
    "id": "spotify_user_id",
    "displayName": "Alex Mercer",
    "email": "alex@example.com",
    "avatarUrl": "https://i.scdn.co/image/...",
    "product": "premium",
    "profileUrl": "https://open.spotify.com/user/spotify_user_id"
  }
}
```

#### Response (Disconnected, 200 OK)
```json
{
  "configured": true,
  "connected": false,
  "redirectUri": "http://127.0.0.1:3000/callback",
  "user": null
}
```

---

### 7.5 Disconnect Spotify Account
Disconnects Spotify by clearing the encrypted `dnd_spotify_session` session cookie.

- **Method**: `DELETE`
- **Path**: `/api/spotify/status`

#### Response (200 OK)
```json
{
  "success": true,
  "connected": false
}
```

---

### 7.6 Retrieve Spotify Playlists
Fetches the authenticated user's private and public playlists (up to 50 items) from the Spotify Web API. If unauthenticated, returns the built-in curated instrumental focus playlists.

- **Method**: `GET`
- **Path**: `/api/spotify/playlists`

#### Response (200 OK)
```json
{
  "connected": true,
  "user": {
    "displayName": "Alex Mercer"
  },
  "playlists": [
    {
      "id": "37i9dQZF1DWZeKCadgRdKQ",
      "uri": "spotify:playlist:37i9dQZF1DWZeKCadgRdKQ",
      "name": "Deep Focus",
      "description": "Keep calm and focus with ambient and post-rock textures.",
      "imageUrl": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=360&q=80",
      "tracksTotal": 185,
      "ownerName": "Spotify Focus",
      "externalUrl": "https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ",
      "isCurated": false
    }
  ],
  "curated": [
    {
      "id": "37i9dQZF1DWZeKCadgRdKQ",
      "uri": "spotify:playlist:37i9dQZF1DWZeKCadgRdKQ",
      "name": "Deep Focus",
      "description": "Keep calm and focus with ambient and post-rock textures.",
      "imageUrl": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=360&q=80",
      "tracksTotal": 185,
      "ownerName": "Spotify Focus",
      "externalUrl": "https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ",
      "isCurated": true
    }
  ]
}
```

---

### 7.7 Query Active or Specific Track Metadata
Fetches track details (name, artist, album, artwork URL) for a given Spotify track ID or URI, or queries the currently active playback session. Automatically falls back to Spotify's public oEmbed service if the user is unauthenticated or the Web API call fails.

- **Method**: `GET`
- **Path**: `/api/spotify/current-track`
- **Query Parameters**:
  - `uri` *(optional)*: Full track URI (e.g. `spotify:track:4cOdK2wGLETKBW3PvgPWqT`).
  - `id` *(optional)*: Alphanumeric Spotify track ID (e.g. `4cOdK2wGLETKBW3PvgPWqT`).

#### Response (Track Found, 200 OK)
```json
{
  "success": true,
  "title": "Time",
  "artist": "Hans Zimmer",
  "album": "Inception (Original Motion Picture Soundtrack)",
  "artworkUrl": "https://i.scdn.co/image/ab67616d0000b273...",
  "uri": "spotify:track:4cOdK2wGLETKBW3PvgPWqT",
  "isPlaying": true
}
```

#### Response (No Active Track Playing, 200 OK)
```json
{
  "success": true,
  "isPlaying": false,
  "title": "",
  "artist": ""
}
```
