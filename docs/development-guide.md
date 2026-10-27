# Development & Deployment Guide

This guide provides step-by-step instructions for setting up the **Do Not Disturb** development environment, running database migrations, loading the companion extension, and deploying to production.

---

## 1. Prerequisites

Ensure your development machine meets the following requirements:

- **Node.js**: v20.x or higher (LTS recommended)
- **Package Manager**: `pnpm` v10.x (`npm install -g pnpm`)
- **Database**: PostgreSQL 14+ instance (local PostgreSQL service, Docker container, or cloud provider like Supabase/Neon)
- **Browser**: Google Chrome, Brave, Microsoft Edge, or any Chromium-compatible browser

---

## 2. Environment Configuration

1. Locate or create the `.env` file in the project root directory:

```env
# PostgreSQL connection string
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/do_not_disturb?schema=public"

# Session encryption secret (generate a secure random 32+ char string in production)
AUTH_SECRET="dnd-development-secret-key-change-in-prod-focus-app-2026"

# Public application URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

> **Note:** If using a managed database provider requiring SSL, append `?sslmode=require` to `DATABASE_URL`.

---

## 3. Installation & Database Setup

### 3.1 Install Dependencies

Install all project dependencies with pnpm:

```bash
pnpm install
```

### 3.2 Initialize the Database with Prisma ORM 7

This project utilizes Prisma ORM 7 with the `@prisma/adapter-pg` driver adapter:

1. **Generate the Prisma Client**:
   ```bash
   pnpm prisma:generate
   ```
   *This compiles the type-safe client models into `lib/generated/prisma`.*

2. **Run Migrations**:
   ```bash
   pnpm prisma:migrate
   ```
   *Creates the required tables, relations, and indexes in your PostgreSQL database.*

3. **(Optional) Seed Initial Data**:
   ```bash
   npx tsx prisma/seed.ts
   ```

4. **Launch Prisma Studio (Database GUI)**:
   ```bash
   pnpm prisma:studio
   ```
   *Access the visual database inspector at `http://localhost:5555`.*

---

## 4. Running the Development Server

Start the Next.js development server with Turbopack:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The focus dashboard will be live and ready for use.

---

## 5. Setting Up the Companion Extension

To test browser-level website deflection on your local machine:

1. Open your browser and navigate to the extensions page:
   - **Chrome**: `chrome://extensions`
   - **Brave**: `brave://extensions`
   - **Edge**: `edge://extensions`
2. Toggle **Developer mode** to **ON** in the top-right corner.
3. Click the **Load unpacked** button.
4. Select the `extension/` folder in the project directory.
5. In the web application at `http://localhost:3000/blocklist`, verify that the banner shows **"Browser Extension Connected"**.

### Reloading Extension Code Changes
Whenever you modify files in `extension/` (`background.js`, `content.js`, `manifest.json`, etc.):
1. Return to `chrome://extensions`.
2. Click the circular **Reload** icon on the Do Not Disturb card.
3. Refresh your web app tab.

---

## 6. Repository Layout & Scripts

### 6.1 Key Directory Map

```text
do-not-disturb/
├── app/                  # Next.js 16 App Router pages & API routes
│   ├── (routes)/         # UI routes: page.tsx, blocklist, statistics, settings, blocked
│   └── api/              # Backend endpoints: /api/auth/*, /api/sync/*, /api/extension/*
├── components/           # Reusable UI components & navigation
├── context/              # React Context stores (timer, sync, theme)
├── docs/                 # Complete system documentation
├── extension/            # Companion browser extension (MV3)
├── lib/                  # Shared domain utilities, stores, Web Audio synth, auth
│   ├── blocking/         # Blocklist store, extension protocol & client bridge
│   ├── generated/prisma/ # Prisma 7 generated client output
│   ├── sessions/         # Session store & history logging
│   ├── settings/         # User preferences store
│   ├── shortcuts/        # Keyboard shortcut manager
│   ├── sound/            # Procedural Web Audio synthesizer
│   ├── sync/             # Local-first synchronization engine
│   └── prisma.ts         # Prisma singleton client instance
├── prisma/               # Prisma schema and seed scripts
└── public/               # Static assets & pre-packaged extension zip
```

### 6.2 Available Scripts

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `dev` | `pnpm dev` | Starts Next.js development server on port 3000. |
| `build` | `pnpm build` | Compiles production Next.js application bundle. |
| `start` | `pnpm start` | Runs the compiled production server. |
| `lint` | `pnpm lint` | Executes ESLint code quality checks. |
| `prisma:generate` | `pnpm prisma:generate` | Generates type-safe Prisma Client. |
| `prisma:migrate` | `pnpm prisma:migrate` | Applies migrations in development. |
| `prisma:deploy` | `pnpm prisma:deploy` | Executes migrations in CI/CD or production. |
| `prisma:studio` | `pnpm prisma:studio` | Opens visual database inspector. |

---

## 7. Packaging the Extension

To regenerate `public/do-not-disturb-extension.zip` for user downloads:

**Windows (PowerShell):**
```powershell
Compress-Archive -Path .\extension\* -DestinationPath .\public\do-not-disturb-extension.zip -Force
```

**macOS / Linux:**
```bash
cd extension && zip -r ../public/do-not-disturb-extension.zip . && cd ..
```

---

## 8. Production Deployment

### 8.1 Database Deployment
Ensure your production PostgreSQL instance is configured with proper connection pooling (e.g., PgBouncer or Supabase connection pooling) and SSL enabled.

Run migrations against production:
```bash
pnpm prisma:deploy
```

### 8.2 Web Application Deployment (Vercel)
1. Push your code to GitHub / GitLab.
2. Import the repository into [Vercel](https://vercel.com).
3. Add environment variables:
   - `DATABASE_URL`: Production PostgreSQL connection string.
   - `AUTH_SECRET`: Strong 64-character random string.
   - `NEXT_PUBLIC_APP_URL`: Production canonical domain (e.g., `https://donotdisturb.app`).
4. Set build command: `pnpm prisma:generate && next build`.
5. Deploy.

---

## 9. Troubleshooting Common Issues

### Issue 1: Prisma Client Module Not Found
- **Symptom**: `Cannot find module '../lib/generated/prisma'`
- **Fix**: Run `pnpm prisma:generate` to generate the client models into `lib/generated/prisma`.

### Issue 2: Extension Shows "Disconnected" in Web App
- **Symptom**: The banner on `/blocklist` displays "Extension not detected".
- **Checks**:
  1. Confirm that `extension/manifest.json` includes `http://localhost:3000/*` in both `content_scripts` and `externally_connectable`.
  2. Verify the extension is enabled in `chrome://extensions`.
  3. Hard refresh the web app page (`Ctrl + F5` or `Cmd + Shift + R`).

### Issue 3: EPERM or Permission Errors on Windows
- **Symptom**: Temporary file lock during build or generation.
- **Fix**: Close any active Next.js dev server or IDE process holding file handles and rerun the command.
