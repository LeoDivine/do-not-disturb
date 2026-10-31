# Do Not Disturb (DND)

> A modern, privacy-first focus and productivity platform combining a Next.js 16 web application, a Chromium Manifest V3 browser extension for network-level distraction deflection, procedural Web Audio soundscapes, and local-first cloud synchronization.

---

## 📖 Documentation

Comprehensive documentation is available in the [`docs/`](docs/) directory:

- **[Documentation Hub](docs/README.md)**: Main documentation index and navigation guide.
- **[System Architecture](docs/architecture.md)**: Technical architecture, component interactions, Web Audio synthesis, and state synchronization.
- **[Companion Extension Guide](docs/extension-guide.md)**: Chromium MV3 extension architecture, `declarativeNetRequest` rules engine, installation, and debugging.
- **[REST API Reference](docs/api-reference.md)**: Full API specifications for authentication, data synchronization, and assets.
- **[Database Schema & Models](docs/database-schema.md)**: PostgreSQL models, relations, enums, indexes, and migrations with Prisma ORM 7.
- **[User Guide & Feature Manual](docs/user-guide.md)**: Guide to timer workflows, website deflection, soundscapes, analytics, and shortcuts.
- **[Development & Deployment Guide](docs/development-guide.md)**: Local development setup, environment variables, database commands, and deployment.
- **[Design System Tokens](docs/design.md)**: Serene Focus design tokens, palette, and typography.
- **[Technical Implementation Plan](docs/do-not-disturb-technical-implementation-plan.md)**: Original technical specification and architectural plan.

---

## ⚡ Quick Start

### 1. Prerequisites
- Node.js 20+
- pnpm 10+
- PostgreSQL 14+

### 2. Install & Configure
```bash
# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env # or configure DATABASE_URL and AUTH_SECRET in .env

# Generate Prisma Client & run migrations
pnpm prisma:generate
pnpm prisma:migrate
```

### 3. Run Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Install Companion Browser Extension
1. Open `chrome://extensions` (or `edge://extensions` / `brave://extensions`).
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked** and select the [`extension/`](extension/) directory (or unzipped package).
4. Visit `https://www.donotdistrb.com` (or `http://localhost:3000/blocklist` locally) to confirm the extension is connected!

---

## 📜 License

Private & Personal Project.
