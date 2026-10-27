# Do Not Disturb — Documentation Hub

Welcome to the official documentation for **Do Not Disturb**, a modern, privacy-first focus and productivity platform combining a Next.js 16 web application with a Chromium Manifest V3 browser extension, procedural ambient sound synthesizer, and local-first cloud synchronization.

---

## 📚 Documentation Index

Explore the detailed documentation guides below:

| Document | Description |
| :--- | :--- |
| **[Architecture Guide](architecture.md)** | Technical architecture, data flow, Web Audio synthesis engine, extension bridge, and state synchronization. |
| **[Companion Extension Guide](extension-guide.md)** | Browser extension architecture, `declarativeNetRequest` rules engine, content script bridge, installation, and debugging. |
| **[API Reference](api-reference.md)** | Full specification of REST API endpoints for authentication, bi-directional data synchronization, and assets. |
| **[Database Schema](database-schema.md)** | Comprehensive Prisma ORM 7 schema documentation, PostgreSQL models, relations, indexes, and migrations. |
| **[User Guide](user-guide.md)** | End-user manual covering the Pomodoro timer, website deflection, soundscapes, analytics, and shortcuts. |
| **[Development & Deployment Guide](development-guide.md)** | Developer onboarding, local environment setup, PostgreSQL configuration, extension testing, and deployment. |
| **[Design System Tokens](design.md)** | Palette definitions, typography scales, elevation levels, and design tokens for the Serene Focus theme. |
| **[Technical Implementation Plan](do-not-disturb-technical-implementation-plan.md)** | Original architectural blueprint, feature specifications, and implementation phases. |

---

## 🌟 System Overview

Do Not Disturb is designed around three core principles:

1. **Uncompromising Focus**: A customizable Pomodoro-style timer with automatic break sequencing, cycle management, and distraction deflection.
2. **True Browser-Level Blocking**: Unlike traditional web timers that only run in a tab, the companion Chromium extension enforces strict website blocking at the network request level using `chrome.declarativeNetRequest`, deflecting distractions back to your focus zone.
3. **Local-First with Seamless Cloud Sync**: Full functionality works 100% offline without requiring an account. When users sign in, their settings, blocklists, shortcuts, and session histories seamlessly merge and sync to PostgreSQL.

---

## 🛠️ Technology Stack

- **Web Framework**: Next.js 16 (App Router, Server Components & Route Handlers)
- **Frontend & UI**: React 19, Tailwind CSS v4, Lucide React icons
- **Database & ORM**: PostgreSQL with Prisma ORM 7 (`@prisma/adapter-pg` driver adapter)
- **Browser Extension**: Chromium Manifest V3 (`declarativeNetRequest`, `alarms`, `storage`, content bridge)
- **Audio Synthesis**: Procedural Web Audio API soundscapes (Gentle Rain, Focus Beats, Deep Space, Tibetan Chime)
- **Authentication**: Stateless HMAC-SHA256 signed session tokens with `scrypt` password hashing and HTTP-only cookies
- **Package Manager**: pnpm

---

## 🚀 Quick Navigation

- **Want to run the project locally?** Head to the [Development Guide](development-guide.md).
- **Want to understand how website blocking works?** Read the [Companion Extension Guide](extension-guide.md).
- **Want to see how data models and sessions are stored?** View the [Database Schema](database-schema.md).
- **Integrating or extending the API?** Consult the [API Reference](api-reference.md).
