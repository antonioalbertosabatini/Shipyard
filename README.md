# Shipyard

A project tracker for developers: create projects, break them down into tasks (feature, bugfix, improvement, chore, other), organize them on a kanban board and follow their progress from a dashboard.

Shipyard is an **offline-first web app**: data is always stored in the browser (IndexedDB), and with a **Supabase** project configured you can sign in and **sync across devices**. It is designed to be packaged later with **Electron** (desktop) and **Capacitor** (Android/iOS).

> Working on this codebase with an AI agent? See [AGENTS.md](AGENTS.md).

## Quick start

Requirements: Node.js ≥ 22.

```bash
npm install
npm run dev        # http://localhost:5173
```

Without further configuration the app runs in **local-only mode** (no account, data stays in the browser).

| Script | Description |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Typecheck + static build in `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Unit tests (Vitest + fake-indexeddb) |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | Lint with oxlint |
| `npm run format` | Format with Prettier |

## Cloud sync with Supabase (optional)

1. **Create a project** on [supabase.com](https://supabase.com).
2. **Create the schema**: open *SQL Editor*, paste the content of [`supabase/migrations/20260915120000_initial_schema.sql`](supabase/migrations/20260915120000_initial_schema.sql) and run it. With the Supabase CLI you can instead run `supabase link --project-ref <ref>` and `supabase db push`.
3. **Configure auth URLs**: *Authentication → URL Configuration*
   - *Site URL*: `http://localhost:5173` (or your deployed URL).
   - *Redirect URLs*: add `http://localhost:5173/**` and your production URL (`https://your-domain/**`). They are used by sign-up confirmation and password reset emails.
4. **Email provider**: *Authentication → Sign In / Providers → Email* is enabled by default, with email confirmation on. The built-in email service is rate limited: set up custom SMTP (*Authentication → Emails → SMTP Settings*) for real use. For a personal instance you can create your user and then disable *Allow new users to sign up*.
5. **Environment**: copy the example file and fill it in with the values from *Project Settings → API Keys* (Project URL and **Publishable key**, never the secret key):

   ```bash
   cp .env.example .env.local
   ```

6. Restart `npm run dev` and open `/signup` or `/login` (also reachable from *Settings*).

Your existing local projects and tasks are uploaded on the first sign-in.

### How sync works

- The app always reads and writes the local database, so it stays fast and works offline. Local changes are queued and uploaded in the background.
- Conflicts are resolved per row with **last write wins** on `updated_at`: the server ignores an upload older than the stored version, and devices keep the newer copy when downloading.
- Downloads use a cursor assigned by the server (`synced_at`), so no change is missed even if a device clock is wrong.
- Changes reach other devices within seconds through **Supabase Realtime**, with a fallback sync every minute, when the app regains focus or the connection comes back.
- Deletions are synced as tombstones. *Delete all data* removes data from every synced device.
- Signing out uploads pending changes and then removes the data from that device.

## Features

- **Projects**: name, description, color, optional icon, repository and live site links; archive and delete.
- **Tasks**: type, status (Backlog → To do → In progress → Done), priority, optional effort (t-shirt sizes XS–XL), optional icon, due date, description.
- **Kanban board** with drag & drop (mouse, touch with press-and-hold, keyboard with Space) and a sortable **list view**.
- **Documentation** tab per project: an ordered list of links, terminal commands and notes, each with a short description, one click to copy or open.
- **Filters** by text, type and priority, kept in the URL.
- **Dashboard**: completion percentage, counts by status and type, overdue and upcoming tasks.
- **Accounts** (with Supabase): sign up, sign in, forgot/reset password, change password, sign out; sync status in the sidebar and header.
- **Sync** across devices, offline-first, with realtime updates.
- **Backup**: JSON export/import (*merge* or *replace*) and data reset. **Obsidian export**: ZIP of linked Markdown notes (one folder per project, one note per task); not a restore format.
- Light/dark/system theme, responsive layout (sidebar on desktop, bottom navigation on mobile), English UI with i18n ready for more languages.

## Tech stack

| Area | Technology |
| --- | --- |
| Build & UI | Vite, React 19, TypeScript (strict) |
| Styling | Tailwind CSS v4, shadcn/ui (Radix), lucide-react |
| Routing | React Router (browser or hash history) |
| Data | TanStack Query on top of storage-agnostic repositories; Dexie (IndexedDB) |
| Cloud | Supabase: Auth, Postgres with Row Level Security, Realtime |
| Forms & validation | react-hook-form, Zod |
| Drag & drop | dnd-kit |
| i18n | i18next, react-i18next |
| Testing & quality | Vitest, Testing Library, oxlint, Prettier |

## Architecture

```
src/
  app/          # entry, providers, router, layout, theme
  components/   # shared components (+ ui/ generated by shadcn)
  domain/       # model: constants, Zod schemas, pure logic (ordering, backup, Obsidian export, sync rules)
  data/         # repository interfaces, Dexie implementation, sync engine, query keys
  features/
    auth/       # auth provider, guards, sign-in/sign-up/password/account/sign-out pages
    sync/       # sync provider and status indicator
    dashboard/  # statistics (tested pure functions) and page
    projects/   # pages, form, card, TanStack Query hooks
    tasks/      # kanban board, list, filters, form, hooks
    docs/       # per-project documentation items: list, row, form, hooks
    settings/   # account, theme, JSON backup, Obsidian ZIP export, reset
  i18n/         # configuration and translations
  lib/          # utilities (id, dates, download, Supabase client)
supabase/
  migrations/   # database schema, sync trigger, RLS policies
```

Key principles:

- **The UI does not know about storage.** Components only use TanStack Query hooks, which receive the repositories (`src/data/repositories.ts`) through a React provider. `createDataLayer()` (`src/data/index.ts`) wires IndexedDB and, when configured, the sync engine.
- **Offline-first sync**: every local write is recorded in an outbox; the sync engine pushes it and pulls remote changes, resolving conflicts with last write wins.
- **Manual ordering** (kanban columns and documentation items) uses a fractional `order` with automatic renumbering when precision runs out (`src/domain/order.ts`).
- Pure logic (ordering, statistics, backup, sync rules, drag & drop position mapping) is separated from components and covered by unit tests.

See [AGENTS.md](AGENTS.md) for the detailed technical and functional documentation.

## Roadmap

- **Desktop (Electron)**: load `dist/` with `VITE_ROUTER_MODE=hash`; replace `src/lib/download.ts` with a native save dialog; set `VITE_AUTH_REDIRECT_URL` for auth emails.
- **Mobile (Capacitor)**: `npx cap add android` / `npx cap add ios` with `webDir: dist`; deep links for auth emails.
- Sync improvements: tombstone cleanup, account deletion.
- Route-level code splitting to reduce the initial bundle.
- Italian translation.

## License

Copyright © 2026 [antonioalbertosabatini](https://github.com/antonioalbertosabatini).

Shipyard is source-available under the [PolyForm Strict License 1.0.0](LICENSE). You may use it for noncommercial purposes only; distributing it or making changes or new works based on it is not permitted. For any other use, contact the author.
