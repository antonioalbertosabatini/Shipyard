# Shipyard — Guide for AI Agents

This document is the source of truth for any AI agent (or human) working on this codebase.
Read it fully before making changes.

## ⚠️ Mandatory rules

1. **Keep this document up to date.** Every development (new feature, refactor, dependency change, new convention, bug fix revealing a gotcha) must update the relevant sections of `AGENTS.md` in the same change. Also update `README.md` when user-facing features, scripts or setup change. A task is not complete until the documentation reflects it.
2. **Code comments must be short and in English.** One line is preferred. Explain *why*, not *what*. No commented-out code, no long prose blocks.
3. All code, identifiers, commit messages and documentation are in **English**. UI strings live in i18n files (never hard-code user-visible text).
4. Before finishing a task run: `npm run typecheck && npm run lint && npm test` (and `npm run build` for build-related changes). All must pass.

---

## 1. Product overview (functional)

Shipyard is a project tracker for developers who manage several web projects (mostly personal, but not only). It is **desktop-first**, and must later be installable on **desktop (Electron)**, **Android and iOS (Capacitor)**.

Current state: an **offline-first web app** (runs with `npm run dev`). Data always lives in **IndexedDB**; when Supabase is configured, signed-in users get **cloud sync** across devices (Supabase Postgres + Auth + Realtime). Without the Supabase environment variables the app runs in **local-only mode**, exactly as before.

### Entities

- **Project**: name, optional description, color (from a fixed palette), optional `icon`, optional repository URL and live URL, archived flag.
- **Task** (belongs to a project):
 - `title`, optional `description`
 - `type`: `feature | bugfix | improvement | chore | other`
 - `status` (fixed kanban workflow): `backlog → todo → in_progress → done`
 - `priority`: `low | medium | high | critical`
 - optional `effort` (t-shirt sizes): `xs | s | m | l | xl`
 - optional `icon`
 - optional `dueDate` (calendar date)
  - `order` (position within its status column)
  - `completedAt` (set automatically when the task enters `done`, cleared when it leaves)
- Both carry `createdAt`, `updatedAt` (the version used for conflict resolution) and `deletedAt` (soft delete, synced as a tombstone).

### Screens and routes

| Route | Screen | Features |
| --- | --- | --- |
| `/` | Dashboard | Stat tiles (active projects, open tasks, in progress, overdue), project cards with progress, upcoming deadlines (overdue + due within 7 days). Only non-archived projects count. |
| `/projects` | Projects | Active/Archived toggle, project cards, create project. |
| `/projects/:projectId` | Project | Header (links, actions menu, progress bar), **Board** (kanban with drag & drop) or **List** (sortable table) view, filters (text, type, priority), create/edit/delete tasks. View and filters are stored in URL search params (`view`, `q`, `type`, `priority`). |
| `/settings` | Settings | Account & sync card (sign in / sign up, or status + manage account + sign out), theme (system/light/dark), export JSON backup, import JSON backup (merge or replace), delete all data. |
| `/account` | Account (signed in only) | Email and member-since date, sync status (last sync, pending changes, "Sync now"), change password, link to sign out. |
| `/login` | Sign in (guests only) | Email + password, links to sign up, forgot password and "continue without an account". Honors `?redirect=`. |
| `/signup` | Sign up (guests only) | Email, password, confirmation. Shows "check your email" when Supabase requires email confirmation. |
| `/forgot-password` | Forgot password (guests only) | Sends the reset email. |
| `/reset-password` | Reset password | Target of the reset email link: new password + confirmation; invalid/expired link state. |
| `/logout` | Sign out | Confirmation, uploads pending changes first, then clears local data. |
| `*` | Not found | |

Auth routes render full screen (`AuthLayout`, outside the app shell). In local-only mode they show a "cloud sync is not configured" card.

### Behaviors to preserve

- Creating a project navigates to its page.
- New tasks are appended at the bottom of their status column.
- Editing a task and changing its status moves it to the bottom of the new column.
- Drag & drop works with mouse (5px activation distance), touch (200ms press-and-hold, so scrolling still works) and keyboard (Space to pick up/drop, Enter to open the task).
- Dragging works while filters are active: the position is mapped from the filtered board to the full column.
- `effort` and `icon` are optional: when unset (or when the stored icon key is unknown to this build) the UI renders exactly as it did before they existed — no badge, and the project keeps its plain color dot.
- Project icons appear on the project cards (dashboard and `/projects`), in the project header and in the sidebar, tinted with the project color. Task icons appear next to the title on the board and in the list.
- Overdue = open task with `dueDate` before today. Done tasks are never overdue.
- Deleting a project also deletes its tasks. Deletions ask for confirmation.
- Import **merge** upserts by id keeping the copy with the newer `updatedAt`; **replace** soft-deletes local rows missing from the backup and writes the backup rows with a fresh `updatedAt`, so the backup also wins on synced devices. Backups are validated (Zod) and tasks must reference projects contained in the file.
- **Delete all data** soft-deletes every row, so the reset propagates to the account and every synced device.
- The app is fully usable signed out. The **first sign-in uploads existing local data** to the account.
- **Sign-out** uploads pending changes (offering "try again" / "sign out anyway" if that fails), then removes local data from the device. Signing in with a different account than the local data's owner wipes that data first.
- Guest-only pages redirect signed-in users to `?redirect=` (same-app paths only) or `/`. `/account` redirects guests to `/login?redirect=/account`.
- Forgot password always shows the same confirmation (never reveals whether an account exists). Changing the password re-verifies the current one.
- Mobile (< 768px): bottom navigation, header (with sync status / sign-in button), horizontally scrolling snap columns on the board, forms open as bottom sheets. Desktop: sidebar with the list of active projects and an account/sync status footer, forms open as centered dialogs.

---

## 2. Tech stack

| Area | Library | Notes |
| --- | --- | --- |
| Build | Vite 8, TypeScript 6 (strict, `noUncheckedIndexedAccess`, `erasableSyntaxOnly`) | Static output in `dist/`, reusable by Electron/Capacitor. |
| UI | React 19 | Context is rendered as `<Context value>` (React 19 style). |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`), shadcn/ui (Radix, "radix-nova" style), `tw-animate-css`, Geist font | Theme tokens in `src/index.css`. |
| Class merging | `cn` package (official shadcn package replacing clsx + tailwind-merge) | Re-exported from `@/lib/utils`. |
| Icons | lucide-react v1 | Brand icons (e.g. GitHub) do not exist in v1; use generic ones (`GitBranch`). |
| Routing | React Router v8 | `RouterProvider` comes from `react-router/dom`, everything else from `react-router`. |
| Server state | TanStack Query v5 | All data access goes through query/mutation hooks. |
| Persistence | Dexie 4 (IndexedDB) | Behind repository interfaces; always the source for reads and writes. |
| Cloud backend | Supabase (`@supabase/supabase-js` v2) | Auth (email + password, PKCE), Postgres with RLS, Realtime. Optional. |
| Validation | Zod v4 | Domain schemas, forms, backup import, remote rows. |
| Forms | react-hook-form + `@hookform/resolvers/zod` | |
| Drag & drop | dnd-kit (`core`, `sortable`, `utilities`) | |
| i18n | i18next + react-i18next | English only for now, typed keys. |
| Dates | date-fns + `Intl.DateTimeFormat` | |
| Toasts | sonner | |
| Tests | Vitest 5 (jsdom), Testing Library, fake-indexeddb | |
| Lint / format | oxlint, Prettier (+ tailwind plugin) | No semicolons, single quotes, width 100. |

Node ≥ 22 is required (React Router v8).

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server on port 5173 |
| `npm run build` | `tsc -b` + `vite build` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | `tsc -b` |
| `npm run lint` | oxlint |
| `npm test` / `npm run test:watch` | Vitest |
| `npm run format` | Prettier |

### Environment

Copy `.env.example` to `.env.local` (git-ignored). All variables are optional and typed in `src/env.d.ts`.

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL. Cloud sync is disabled when missing. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable (or legacy anon) key. **Never** the secret/service_role key: it ends up in the bundle. |
| `VITE_AUTH_REDIRECT_URL` | Base URL for auth email links (defaults to `window.location.origin`). Needed for Electron/Capacitor. |
| `VITE_ROUTER_MODE` | `hash` for file-based shells; browser history by default. |

The database schema lives in `supabase/migrations/` (see §4 "Cloud sync"). Setup steps for a new Supabase project are in `README.md`.

---

## 3. Project structure

```
src/
  main.tsx                 # Entry: i18n, CSS, Supabase client, data layer, providers, router, storage.persist()
  index.css                # Tailwind + shadcn theme tokens (light/dark)
  env.d.ts                 # ImportMetaEnv (router mode, Supabase, auth redirect URL)
  app/
    providers.tsx          # Theme, repositories, QueryClient, auth, sync, tooltips, toaster
    router.tsx             # Route table (app shell + auth layout); browser or hash history
    AppLayout.tsx          # Sidebar (desktop), header + bottom nav (mobile), sync status indicator
    ThemeProvider.tsx      # system/light/dark theme, persisted in localStorage
    NotFoundPage.tsx, RouteError.tsx
  components/
    ui/                    # shadcn generated components (see §7)
    Brand.tsx              # Logo link
    LoadingState.tsx       # Centered spinner with accessible label
    PageHeader.tsx         # Title, description, actions
    ConfirmDialog.tsx      # Destructive confirmation (AlertDialog)
    ResponsiveDialog.tsx   # Dialog on desktop, bottom Sheet on mobile
    icons.ts               # ENTITY_ICONS: curated lucide set for projects/tasks, ICON_REGISTRY
    EntityIcon.tsx         # Renders a stored icon key; nothing when unset or unknown
    IconPicker.tsx         # Radiogroup grid of ENTITY_ICONS with a "no icon" option
  domain/                  # Pure, framework-free model
    constants.ts           # Enums (types, statuses, priorities, efforts), colors, ORDER_STEP
    schemas.ts             # Zod schemas + inferred types (Project, Task, *Input)
    task.ts                # completedAtFor, placeAt, applyMove, isOverdue, sortByOrder
    backup.ts              # Backup schema/version, buildBackup, parseBackup
    sync.ts                # Last-write-wins rules: isNewer, nextTimestamp, latestTimestamp, normalizeTimestamp
  data/
    repositories.ts        # Storage-agnostic interfaces + EntityNotFoundError
    index.ts               # createDataLayer() — the backend switch point; createDexieRepositories()
    context.ts             # RepositoryContext + useRepositories()
    RepositoryProvider.tsx
    queryKeys.ts           # TanStack Query keys
    dexie/                 # IndexedDB implementation (db + outbox/meta, projectRepo, taskRepo, backupRepo)
    sync/
      types.ts             # SyncController / SyncState (what the UI sees)
      SyncEngine.ts        # Push outbox → pull by server cursor, realtime, retries
      remote.ts            # RemoteStore interface + RemoteSyncError
      supabaseRemote.ts    # RemoteStore on supabase-js
      mappers.ts           # camelCase entities ↔ snake_case rows (+ validation)
  features/
    auth/                  # AuthProvider/useAuth, guards (RequireAuth, GuestOnly), AuthLayout, AuthCard,
                           # AuthField, AuthAlert, authErrors.ts, schemas.ts, Login/Signup/ForgotPassword/
                           # ResetPassword/Account/Logout pages
    sync/                  # SyncProvider, useSyncController/useSyncState, syncStatus.ts,
                           # SyncStatusIcon, SyncStatusIndicator
    dashboard/             # stats.ts (pure), DashboardPage
    projects/              # hooks, ProjectsPage, ProjectPage, ProjectCard, ProjectFormDialog, ProjectActionsMenu,
                           # ProjectGlyph (icon tinted with the project color, or the color dot)
    tasks/                 # hooks, KanbanBoard, TaskCard, TaskList, TaskFormDialog, TaskFiltersBar,
                           # TaskBadges, taskStyles, filters.ts, boardUtils.ts, useProjectView
    settings/              # hooks, SettingsPage
  hooks/                   # use-media-query (useIsDesktop), use-theme
  i18n/                    # index.ts, i18next.d.ts (typed keys), locales/en.json
  lib/                     # id.ts (UUID), dates.ts, download.ts, supabase.ts (client, authRedirectUrl), utils.ts (cn)
  test/setup.ts            # fake-indexeddb, jest-dom matchers, Testing Library cleanup
supabase/
  migrations/              # SQL schema: tables, sync trigger, RLS policies, realtime publication
```

Import alias: `@/` → `src/`.

---

## 4. Architecture

### Layers and dependency direction

```
UI components ──> feature hooks (TanStack Query) ──> Repositories interfaces ──> Dexie implementation
      │                                                        │                        ▲
      │                                                        │                        │ outbox / apply pulls
      └──────────────> domain (pure logic, schemas) <──────────┘                  SyncEngine ──> RemoteStore (Supabase)
```

- **`domain/`** has no React, no Dexie. Pure functions, fully unit-tested.
- **`data/repositories.ts`** defines the contracts. **Components must never import Dexie, `data/dexie/*` or `data/sync/*` implementations** (types from `@/data` are fine).
- **Feature hooks** (`features/*/hooks.ts`) get repositories via `useRepositories()` and expose `useQuery`/`useMutation` hooks. Components only use these hooks.
- The UI reads and writes **only IndexedDB**. Sync is a background concern: `SyncEngine` moves data between Dexie and a `RemoteStore`, the UI observes it through `SyncController` (`useSyncState`, `useSyncController`).
- `createDataLayer(supabase)` in `src/data/index.ts` builds one `ShipyardDB`, the repositories and, when a Supabase client exists, the `SyncEngine`. Swap the `RemoteStore` there to use another backend.

### Data model rules

- IDs: UUID v4 via `createId()` (`lib/id.ts`), with a fallback for non-secure contexts (e.g. dev server opened from a phone over http).
- Timestamps: ISO strings in UTC `…Z` form (`createdAt`, `updatedAt`, `completedAt`, `deletedAt`). `dueDate` is `YYYY-MM-DD`.
- **Every new version of a row gets `updatedAt = nextTimestamp(previous.updatedAt)`** (or `nextTimestamp()` for new rows): the current time, but always at least 1 ms after the version it replaces.
- **Soft delete**: `remove()` and `backup.clearAll()` set `deletedAt`; every read filters with `isAlive`. The only hard delete is `SyncController.clearLocalData()` (sign-out / owner change).
- Optional fields are **absent** in storage, never `undefined`: rows pass through `compact()` before being written.
- Update methods take the **full input** (`ProjectInput` / `TaskInput`), not partial patches, so clearing an optional field is unambiguous. They destructure the input field by field, so **a new field must be added there too**, otherwise it can be set but never cleared.
- `icon` is validated as a **free string** (`iconNameSchema`), not as an enum: a key added to `ENTITY_ICONS` in a newer build must not make older clients reject the whole synced row. Unknown keys simply render nothing.
- Repository methods that write run inside a Dexie transaction **that includes `db.outbox`**, and call `markDirty(db, table, rows)` for every written row. A write path that skips `markDirty` is never uploaded.
- Dexie schema lives in `data/dexie/db.ts` (version 2: `outbox`, `meta`). Schema changes require a new `this.version(n)` with an upgrade function — never edit an existing version.

### Cloud sync

Strategy: **row-level last write wins on `updated_at`, with a server-assigned pull cursor.**

- **Server** (`supabase/migrations/*_initial_schema.sql`): `projects` and `tasks` with snake_case columns, primary key `(user_id, id)`, `user_id default auth.uid()`, RLS `user_id = auth.uid()`. Trigger `shipyard_sync_guard` runs before insert/update: it **skips updates whose `updated_at` is not newer** than the stored row (returns `NULL`), keeps `user_id` immutable and sets `synced_at = clock_timestamp()`. Both tables are in the `supabase_realtime` publication.
- **Outbox** (`db.outbox`, key `[table+id]`): `{ table, id, updatedAt }` of rows changed locally. The v1→v2 upgrade queues all pre-existing rows, so they upload on first sign-in.
- **Push** (projects before tasks, because of the FK; batches of `PUSH_BATCH_SIZE`): upsert the current rows, then delete outbox entries whose `updatedAt` still matches what was pushed (entries re-queued during the upload stay).
- **Pull** (projects then tasks): rows with `synced_at >= cursor − PULL_OVERLAP_MS` (60 s overlap for late commits), keyset-paginated on `synced_at`. Each row is validated (`rowToProject`/`rowToTask`; invalid rows are skipped with a warning) and applied only if `isNewer(remote, local)`; applied rows drop their outbox entries. The cursor (`meta` key `pullCursor:<table>`) is the raw `synced_at` of the latest row.
- **Why `synced_at`**: client clocks can be wrong; a server cursor guarantees no change is missed. `nextTimestamp` guarantees an edit still beats the version it was based on when another device's clock runs ahead.
- **Triggers**: `start(userId)`, `MutationCache.onSuccess` → `requestSync()` (1 s debounce), Realtime `postgres_changes` (and on re-subscribe), `online`, tab becoming visible, 60 s interval. Failures retry with exponential backoff (2 s → 60 s). `syncNow()` is single-flight; a request during a run schedules one more pass.
- **Ownership**: `meta.ownerId` stores the user whose data is local. `start()` wipes local data owned by someone else. `clearLocalData()` stops the engine and clears projects, tasks, outbox and meta.
- **Known limit**: concurrent edits to different fields of the same row are not merged; the newer row wins entirely.

### Auth

- `lib/supabase.ts` creates the client only when both env vars exist, with `flowType: 'pkce'` (email links return `?code=` in the query string, compatible with the hash router). `authRedirectUrl(path)` builds email link targets from `VITE_AUTH_REDIRECT_URL` or the current origin.
- `AuthProvider` exposes `isConfigured`, `isReady` (set on `INITIAL_SESSION`, after any `?code=` exchange), `user` and actions returning `{ error: AuthErrorKey | null }`. Errors are mapped by `authErrorKey` (`features/auth/authErrors.ts`) to `auth.errors.*` strings.
- `signOut` uses `scope: 'local'` (works offline, keeps other devices signed in). `changePassword` re-authenticates with `signInWithPassword` before `updateUser`.
- `SyncProvider` starts the engine while `user.id` is set and invalidates all queries on remote changes.
- Guards are layout routes: `RequireAuth` (app shell) and `GuestOnly` (auth layout). `safeRedirect` only allows same-app paths.
- The reset page does not depend on the `PASSWORD_RECOVERY` event (it can fire before React subscribes): it shows the form whenever a session exists after `isReady`.

### Kanban ordering

- `order` is a float. New/moved items get the midpoint between neighbours (`placeAt`); when the gap gets smaller than `1e-6`, the whole column is renumbered with `ORDER_STEP` (1000) spacing.
- `applyMove(tasks, taskId, status, index, now)` is the single source of truth for moves. `index` is the position in the target column **counted without the moved task**. It returns a new array where only changed tasks are new objects; `taskRepo.move` persists exactly those (with `now = nextTimestamp(latestTimestamp(column))`).
- The board (`KanbanBoard.tsx`) keeps a local preview of columns only while dragging (`drag` state + `dragRef`); otherwise columns are derived from props. On drop, `boardUtils.resolveMove` converts the visual position (possibly filtered) into `{ status, index }` for the full column, returning `null` for no-op drops.
- `useMoveTask` updates the query cache **synchronously** with `applyMove` before calling the mutation (avoids a flicker back to the old position), then invalidates on settle.

### TanStack Query conventions

- Keys in `data/queryKeys.ts`. Invalidate broad prefixes: `queryKeys.projects.all` / `queryKeys.tasks.all`. Import, clear and remote sync changes invalidate everything; sign-out clears the cache.
- Mutation errors are handled globally in `providers.tsx` (`MutationCache.onError` → console + generic toast). Components only show success toasts. `MutationCache.onSuccess` schedules a sync.
- `networkMode: 'always'` is intentional: queries and mutations hit IndexedDB, which works offline even with sync enabled.
- When the component may unmount before the mutation finishes (deleting, closing dialogs, navigating), use `mutateAsync(...).then(...).catch(() => {})` instead of per-call `onSuccess`, which does not fire after unmount.
- `useProject(id)` returns `null` (not `undefined`) for missing projects, because query functions cannot resolve `undefined`.

### Routing

- `VITE_ROUTER_MODE=hash` switches to hash history (needed for `file://` in Electron/Capacitor). Default is browser history.
- Two top-level branches: `/` with `AppLayout`, and a pathless `AuthLayout` route for `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/logout`.

### Theme

- Custom `ThemeProvider` (no `next-themes`: it injects a `<script>` React 19 warns about).
- Storage key `shipyard-theme`. An inline script in `index.html` applies the `dark` class before first paint and **must stay in sync** with `THEME_STORAGE_KEY` in `hooks/use-theme.ts`.

---

## 5. Coding conventions

- **Comments: short, English, explain intent.** JSDoc one-liners for exported functions/props when the name is not self-explanatory.
- TypeScript strict; avoid `any` and non-null assertions unless the invariant is obvious and local. `erasableSyntaxOnly` forbids enums and constructor parameter properties.
- Components: function components, named exports, one exported component per file (oxlint `react/only-export-components`). Small private sub-components in the same file are fine. Contexts and hooks live in a separate `context.ts`.
- Pure logic goes in `domain/` or in `*.ts` files next to the feature (`stats.ts`, `filters.ts`, `boardUtils.ts`, `syncStatus.ts`) with a colocated `*.test.ts`.
- Styling: Tailwind utility classes, `cn()` for conditional classes, theme tokens (`bg-muted`, `text-muted-foreground`, …) instead of raw colors, except for semantic accents defined in `features/tasks/taskStyles.ts` and the success variant of `AuthAlert`. Always provide `dark:` variants for custom colors.
- Icons in buttons use `data-icon="inline-start"` for correct spacing.
- Formatting: Prettier config (`.prettierrc.json`). Imports: external packages first, then `@/` aliases, then relative.

### Forms pattern

- The dialog component (`*FormDialog`) owns mutations and renders `ResponsiveDialog`.
- An inner `*Form` component owns `useForm`. Radix unmounts dialog content when closed, so the form re-initializes with fresh default values on every open.
- The submit button lives in the dialog footer and targets the form with `form={formId}` (`useId()`).
- Form schemas are built with `makeSchema(t)` so validation messages are translated. Form values use `''` for empty optional fields; a `toInput()` function converts them to domain input (`undefined`).
- Radix `Select` cannot hold an empty value, so an optional enum needs a sentinel option mapped back to `undefined` in `toInput()` (`NO_EFFORT` in `TaskFormDialog`).
- Pickers that are not inputs (colors, icons) use `role="radiogroup"` + `role="radio"` buttons driven by a `Controller`.
- **Never clear a field with `field.onChange(undefined)`**: react-hook-form reads values with `get(values, name, defaultValue)`, so `undefined` silently restores the default and the field looks unclearable. Use `''` (covered by `components/IconPicker.test.tsx`).
- URLs are validated with `webUrlSchema` (http/https only) to prevent unsafe `href`s, including on imported backups and pulled rows.
- Auth pages are not dialogs: `AuthCard` + `AuthField` (spread `register(name)` into it) + `AuthAlert` for form-level errors. Shared field schemas are in `features/auth/schemas.ts` (`emailSchema`, `passwordSchema` 8–72 chars, `passwordsMatch` + `passwordMismatch` refinement).

### i18n

- All user-visible strings are in `src/i18n/locales/en.json`. Keys are **type-checked** (`i18next.d.ts`), so a missing key fails `typecheck`.
- Dynamic keys use template literals with typed unions, e.g. ``t(`task.status.${status}`)``, ``t(`auth.errors.${key}`)``, ``t(`sync.status.${status}`)``.
- Avoid i18next plural suffixes for now (typed keys); phrase counts as "Label: {{count}}".
- When adding a language: add `locales/<lang>.json` with the same shape, register it in `i18n/index.ts`, and use `i18n.language` for date formatting (already done in components).

### Accessibility

- Icon-only buttons need `aria-label`. Radio-like pickers use `role="radiogroup"`/`role="radio"` + `aria-checked`. Dialogs without a description pass `aria-describedby={undefined}` (handled by `ResponsiveDialog`).
- Auth inputs set `type`, `autoComplete` (`email`, `current-password`, `new-password`) and `inputMode` so password managers and mobile keyboards work.

---

## 6. Testing

- Vitest with jsdom; `src/test/setup.ts` loads `fake-indexeddb/auto`, jest-dom matchers, and runs Testing Library `cleanup()` + `vi.restoreAllMocks()` after each test (Vitest runs without globals, so RTL cannot register cleanup itself).
- Repository tests create an isolated DB per test: `new ShipyardDB(\`test-${createId()}\`)`.
- Sync tests (`data/sync/SyncEngine.test.ts`) use an in-memory `FakeRemote` that mirrors the SQL trigger; simulate devices with separate DBs sharing one remote. Use long engine timers and drive syncs with `start`/`syncNow`/`flush` (no fake timers: they stall fake-indexeddb).
- Component tests render pages inside `<AuthContext value={fakeAuth}>` + `MemoryRouter` (see `features/auth/authPages.test.tsx`).
- Cover every new pure function and repository method. Existing suites: `domain/task.test.ts`, `domain/backup.test.ts`, `domain/sync.test.ts`, `data/dexie/repositories.test.ts`, `data/sync/mappers.test.ts`, `data/sync/SyncEngine.test.ts`, `features/dashboard/stats.test.ts`, `features/tasks/boardUtils.test.ts`, `features/tasks/filters.test.ts`, `components/IconPicker.test.tsx`, `features/auth/auth.test.ts`, `features/auth/authPages.test.tsx`, `features/sync/syncStatus.test.ts`.
- Manual UI check: `npm run dev`. In dev, sample data can be seeded from the browser console with `const { createDexieRepositories } = await import('/src/data/index.ts')`, then reload the page.
- Manual sync check: two browser profiles signed in to the same account; edits appear on the other within seconds (Realtime). Toggle DevTools offline to test the outbox.

---

## 7. Gotchas (learned the hard way)

- **Dexie renames errors whose `name` matches its own** (e.g. `NotFoundError`) and wraps them in `DexieError`. That is why the domain error is `EntityNotFoundError`. Avoid DOMException-like names for custom errors.
- **shadcn CLI** (`npx shadcn@latest add <component>`): generated files import `cn` from the `cn` package — this is legitimate, keep it. Files in `src/components/ui/` are excluded from Prettier and from the `only-export-components` lint rule. **`ui/sonner.tsx` was modified** to use our `useTheme` instead of `next-themes`; re-apply that change if the component is regenerated, and do not reinstall `next-themes`.
- Radix `DropdownMenu` that opens a dialog from a menu item uses `modal={false}` to avoid focus/pointer-events lock issues.
- Avoid very recent JS APIs not available in older iOS WebViews (e.g. `Map.groupBy`), since the app will run in Capacitor.
- `navigator.storage.persist()` is requested at startup to reduce IndexedDB eviction.
- Radix Select keyboard interaction needs a short delay after opening in automated browser tests; screenshots may lag behind DOM state during dialog animations — verify with DOM queries.
- **Never compare timestamps as strings** across sources: Postgres returns `2026-09-15T10:00:00.123456+00:00`. Use `isNewer`/`toMillis` (which also trims microseconds that some WebViews cannot parse) and `normalizeTimestamp` when storing remote values.
- **The sync trigger silently skips stale upserts** (a `BEFORE UPDATE` trigger returning `NULL`): no error is returned, the pull then brings the newer row. Do not "fix" this by forcing updates.
- New Supabase projects may not expose tables to the Data API automatically: the migration grants `select, insert, update, delete` to `authenticated` explicitly. Keep grants in future migrations.
- Realtime `postgres_changes` only fires for tables in the `supabase_realtime` publication and respects RLS.
- Do not `await` Supabase calls inside `onAuthStateChange` callbacks (auth-js can deadlock).
- The default Supabase email service is heavily rate limited: configure custom SMTP before relying on sign-up confirmations or password resets.

---

## 8. Roadmap and future constraints

- **Electron (desktop)**: load `dist/` with `VITE_ROUTER_MODE=hash`; replace `lib/download.ts` with a native save dialog; consider CSP (the theme inline script in `index.html` may need a hash/nonce; allow `connect-src` to the Supabase URL, `wss:` for Realtime). Auth email links need `VITE_AUTH_REDIRECT_URL` pointing to a handled URL/deep link.
- **Capacitor (Android/iOS)**: `webDir: dist`, hash router, safe-area insets are already handled (`env(safe-area-inset-*)`, `viewport-fit=cover`). iOS may evict WebView storage (sync restores data after sign-in). Auth sessions use `localStorage`; consider Capacitor Preferences storage and deep links for email flows.
- **Sync follow-ups**: tombstone garbage collection, field-level merge if row-level LWW proves too coarse, account deletion, a "delete from this device only" option.
- **Performance**: route-level code splitting (bundle is ~1010 kB).
- **i18n**: add Italian.

---

## 9. License

- The project is licensed under **PolyForm Strict License 1.0.0** (`LICENSE`, official text, keep it verbatim). It is not an open-source license: noncommercial use only, no distribution, no derivative works.
- `package.json` uses `"license": "SEE LICENSE IN LICENSE"` because PolyForm Strict has no SPDX identifier.
- Before adding a dependency, check that its license is compatible with proprietary/source-available distribution (MIT, Apache-2.0, BSD, ISC are fine; avoid GPL/AGPL). `@supabase/supabase-js` is MIT.

## 10. Changelog of this document

Add a line for every change that updates this guide (newest first).

- 2026-09-16 — Optional task `effort` (t-shirt sizes XS–XL, sortable in the list) and optional `icon` on projects and tasks (curated lucide set, `IconPicker`, `EntityIcon`, `ProjectGlyph`), with the matching Supabase migration.
- 2026-09-15 — Supabase cloud sync (outbox, LWW with server cursor, realtime), email/password auth pages (login, signup, forgot/reset password, account with password change, logout), environment variables, SQL migration.
- 2026-09-15 — Added PolyForm Strict License 1.0.0 and the license section.
- 2026-09-15 — Initial version: MVP (projects, tasks, kanban, list, filters, dashboard, backup, theme, responsive layout).
