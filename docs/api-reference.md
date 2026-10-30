# REST API Reference

This document provides a complete specification for all HTTP Route Handlers available in the **Do Not Disturb** Next.js application.

---

## 1. Authentication & Conventions

### 1.1 Base URL
All API endpoints are hosted under `/api` on the application domain:
- Local development: `http://localhost:3000/api`
- Production: `https://your-domain.com/api`

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
  "sessions": []
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
