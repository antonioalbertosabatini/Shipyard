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

Current state: a **local-first web app** (runs with `npm run dev`), data stored in **IndexedDB**. A remote database may replace or complement it in the future.

### Entities

- **Project**: name, optional description, color (from a fixed palette), optional repository URL and live URL, archived flag.
- **Task** (belongs to a project):
  - `title`, optional `description`
  - `type`: `feature | bugfix | improvement | chore | other`
  - `status` (fixed kanban workflow): `backlog → todo → in_progress → done`
  - `priority`: `low | medium | high | critical`
  - optional `dueDate` (calendar date)
  - `order` (position within its status column)
  - `completedAt` (set automatically when the task enters `done`, cleared when it leaves)

### Screens and routes

| Route | Screen | Features |
| --- | --- | --- |
| `/` | Dashboard | Stat tiles (active projects, open tasks, in progress, overdue), project cards with progress, upcoming deadlines (overdue + due within 7 days). Only non-archived projects count. |
| `/projects` | Projects | Active/Archived toggle, project cards, create project. |
| `/projects/:projectId` | Project | Header (links, actions menu, progress bar), **Board** (kanban with drag & drop) or **List** (sortable table) view, filters (text, type, priority), create/edit/delete tasks. View and filters are stored in URL search params (`view`, `q`, `type`, `priority`). |
| `/settings` | Settings | Theme (system/light/dark), export JSON backup, import JSON backup (merge or replace), delete all data. |
| `*` | Not found | |

### Behaviors to preserve

- Creating a project navigates to its page.
- New tasks are appended at the bottom of their status column.
- Editing a task and changing its status moves it to the bottom of the new column.
- Drag & drop works with mouse (5px activation distance), touch (200ms press-and-hold, so scrolling still works) and keyboard (Space to pick up/drop, Enter to open the task).
- Dragging works while filters are active: the position is mapped from the filtered board to the full column.
- Overdue = open task with `dueDate` before today. Done tasks are never overdue.
- Deleting a project also deletes its tasks. Deletions ask for confirmation.
- Import **merge** upserts by id keeping the copy with the newer `updatedAt`; **replace** wipes local data first. Backups are validated (Zod) and tasks must reference projects contained in the file.
- Mobile (< 768px): bottom navigation, header, horizontally scrolling snap columns on the board, forms open as bottom sheets. Desktop: sidebar with the list of active projects, forms open as centered dialogs.

---

## 2. Tech stack

| Area | Library | Notes |
| --- | --- | --- |
| Build | Vite 8, TypeScript 6 (strict, `noUncheckedIndexedAccess`) | Static output in `dist/`, reusable by Electron/Capacitor. |
| UI | React 19 | Context is rendered as `<Context value>` (React 19 style). |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`), shadcn/ui (Radix, "radix-nova" style), `tw-animate-css`, Geist font | Theme tokens in `src/index.css`. |
| Class merging | `cn` package (official shadcn package replacing clsx + tailwind-merge) | Re-exported from `@/lib/utils`. |
| Icons | lucide-react v1 | Brand icons (e.g. GitHub) do not exist in v1; use generic ones (`GitBranch`). |
| Routing | React Router v8 | `RouterProvider` comes from `react-router/dom`, everything else from `react-router`. |
| Server state | TanStack Query v5 | All data access goes through query/mutation hooks. |
| Persistence | Dexie 4 (IndexedDB) | Behind repository interfaces. |
| Validation | Zod v4 | Domain schemas, forms, backup import. |
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

---

## 3. Project structure

```
src/
  main.tsx                 # Entry: i18n, CSS, providers, router, storage.persist()
  index.css                # Tailwind + shadcn theme tokens (light/dark)
  env.d.ts                 # ImportMetaEnv (VITE_ROUTER_MODE)
  app/
    providers.tsx          # Theme, repositories, QueryClient, tooltips, toaster
    router.tsx             # Route table; browser or hash history
    AppLayout.tsx          # Sidebar (desktop), header + bottom nav (mobile)
    ThemeProvider.tsx      # system/light/dark theme, persisted in localStorage
    NotFoundPage.tsx, RouteError.tsx
  components/
    ui/                    # shadcn generated components (see §7)
    PageHeader.tsx         # Title, description, actions
    ConfirmDialog.tsx      # Destructive confirmation (AlertDialog)
    ResponsiveDialog.tsx   # Dialog on desktop, bottom Sheet on mobile
  domain/                  # Pure, framework-free model
    constants.ts           # Enums (types, statuses, priorities), colors, ORDER_STEP
    schemas.ts             # Zod schemas + inferred types (Project, Task, *Input)
    task.ts                # completedAtFor, placeAt, applyMove, isOverdue, sortByOrder
    backup.ts              # Backup schema/version, buildBackup, parseBackup
  data/
    repositories.ts        # Storage-agnostic interfaces + EntityNotFoundError
    index.ts               # createRepositories() — the backend switch point
    context.ts             # RepositoryContext + useRepositories()
    RepositoryProvider.tsx
    queryKeys.ts           # TanStack Query keys
    dexie/                 # IndexedDB implementation (db, projectRepo, taskRepo, backupRepo)
  features/
    dashboard/             # stats.ts (pure), DashboardPage
    projects/              # hooks, ProjectsPage, ProjectPage, ProjectCard, ProjectFormDialog, ProjectActionsMenu
    tasks/                 # hooks, KanbanBoard, TaskCard, TaskList, TaskFormDialog, TaskFiltersBar,
                           # TaskBadges, taskStyles, filters.ts, boardUtils.ts, useProjectView
    settings/              # hooks, SettingsPage
  hooks/                   # use-media-query (useIsDesktop), use-theme
  i18n/                    # index.ts, i18next.d.ts (typed keys), locales/en.json
  lib/                     # id.ts (UUID), dates.ts, download.ts, utils.ts (cn)
  test/setup.ts            # fake-indexeddb + jest-dom matchers
```

Import alias: `@/` → `src/`.

---

## 4. Architecture

### Layers and dependency direction

```
UI components ──> feature hooks (TanStack Query) ──> Repositories interfaces ──> Dexie implementation
      │                                                        │
      └──────────────> domain (pure logic, schemas) <──────────┘
```

- **`domain/`** has no React, no Dexie. Pure functions, fully unit-tested.
- **`data/repositories.ts`** defines the contracts. **Components must never import Dexie or `data/dexie/*`.**
- **Feature hooks** (`features/*/hooks.ts`) get repositories via `useRepositories()` and expose `useQuery`/`useMutation` hooks. Components only use these hooks.
- To add a remote backend: implement `ProjectRepository`, `TaskRepository`, `BackupRepository` and return them from `createRepositories()` in `src/data/index.ts`. Also revisit `networkMode: 'always'` in `providers.tsx` (set because local storage works offline).

### Data model rules

- IDs: UUID v4 via `createId()` (`lib/id.ts`), with a fallback for non-secure contexts (e.g. dev server opened from a phone over http).
- Timestamps: ISO strings (`createdAt`, `updatedAt`, `completedAt`, `deletedAt`). `dueDate` is `YYYY-MM-DD`.
- **Soft delete**: `remove()` sets `deletedAt`; every read filters with `isAlive`. `backup.clearAll()` is the only hard delete.
- Optional fields are **absent** in storage, never `undefined`: rows pass through `compact()` before being written.
- Update methods take the **full input** (`ProjectInput` / `TaskInput`), not partial patches, so clearing an optional field is unambiguous.
- Repository methods that read-then-write run inside a Dexie transaction.
- Dexie schema lives in `data/dexie/db.ts` (version 1). Schema changes require a new `this.version(n)` with an upgrade function — never edit an existing version.

### Kanban ordering

- `order` is a float. New/moved items get the midpoint between neighbours (`placeAt`); when the gap gets smaller than `1e-6`, the whole column is renumbered with `ORDER_STEP` (1000) spacing.
- `applyMove(tasks, taskId, status, index, now)` is the single source of truth for moves. `index` is the position in the target column **counted without the moved task**. It returns a new array where only changed tasks are new objects; `taskRepo.move` persists exactly those.
- The board (`KanbanBoard.tsx`) keeps a local preview of columns only while dragging (`drag` state + `dragRef`); otherwise columns are derived from props. On drop, `boardUtils.resolveMove` converts the visual position (possibly filtered) into `{ status, index }` for the full column, returning `null` for no-op drops.
- `useMoveTask` updates the query cache **synchronously** with `applyMove` before calling the mutation (avoids a flicker back to the old position), then invalidates on settle.

### TanStack Query conventions

- Keys in `data/queryKeys.ts`. Invalidate broad prefixes: `queryKeys.projects.all` / `queryKeys.tasks.all`. Import and clear invalidate everything.
- Mutation errors are handled globally in `providers.tsx` (`MutationCache.onError` → console + generic toast). Components only show success toasts.
- When the component may unmount before the mutation finishes (deleting, closing dialogs, navigating), use `mutateAsync(...).then(...).catch(() => {})` instead of per-call `onSuccess`, which does not fire after unmount.
- `useProject(id)` returns `null` (not `undefined`) for missing projects, because query functions cannot resolve `undefined`.

### Routing

- `VITE_ROUTER_MODE=hash` switches to hash history (needed for `file://` in Electron/Capacitor). Default is browser history.

### Theme

- Custom `ThemeProvider` (no `next-themes`: it injects a `<script>` React 19 warns about).
- Storage key `shipyard-theme`. An inline script in `index.html` applies the `dark` class before first paint and **must stay in sync** with `THEME_STORAGE_KEY` in `hooks/use-theme.ts`.

---

## 5. Coding conventions

- **Comments: short, English, explain intent.** JSDoc one-liners for exported functions/props when the name is not self-explanatory.
- TypeScript strict; avoid `any` and non-null assertions unless the invariant is obvious and local.
- Components: function components, named exports, one exported component per file (oxlint `react/only-export-components`). Small private sub-components in the same file are fine.
- Pure logic goes in `domain/` or in `*.ts` files next to the feature (`stats.ts`, `filters.ts`, `boardUtils.ts`) with a colocated `*.test.ts`.
- Styling: Tailwind utility classes, `cn()` for conditional classes, theme tokens (`bg-muted`, `text-muted-foreground`, …) instead of raw colors, except for semantic accents defined in `features/tasks/taskStyles.ts`. Always provide `dark:` variants for custom colors.
- Icons in buttons use `data-icon="inline-start"` for correct spacing.
- Formatting: Prettier config (`.prettierrc.json`). Imports: external packages first, then `@/` aliases, then relative.

### Forms pattern

- The dialog component (`*FormDialog`) owns mutations and renders `ResponsiveDialog`.
- An inner `*Form` component owns `useForm`. Radix unmounts dialog content when closed, so the form re-initializes with fresh default values on every open.
- The submit button lives in the dialog footer and targets the form with `form={formId}` (`useId()`).
- Form schemas are built with `makeSchema(t)` so validation messages are translated. Form values use `''` for empty optional fields; a `toInput()` function converts them to domain input (`undefined`).
- URLs are validated with `webUrlSchema` (http/https only) to prevent unsafe `href`s, including on imported backups.

### i18n

- All user-visible strings are in `src/i18n/locales/en.json`. Keys are **type-checked** (`i18next.d.ts`), so a missing key fails `typecheck`.
- Dynamic keys use template literals with typed unions, e.g. ``t(`task.status.${status}`)``.
- When adding a language: add `locales/<lang>.json` with the same shape, register it in `i18n/index.ts`, and use `i18n.language` for date formatting (already done in components).

### Accessibility

- Icon-only buttons need `aria-label`. Radio-like pickers use `role="radiogroup"`/`role="radio"` + `aria-checked`. Dialogs without a description pass `aria-describedby={undefined}` (handled by `ResponsiveDialog`).

---

## 6. Testing

- Vitest with jsdom; `src/test/setup.ts` loads `fake-indexeddb/auto` and jest-dom matchers.
- Repository tests create an isolated DB per test: `new ShipyardDB(\`test-${createId()}\`)`.
- Cover every new pure function and repository method. Existing suites: `domain/task.test.ts`, `domain/backup.test.ts`, `data/dexie/repositories.test.ts`, `features/dashboard/stats.test.ts`, `features/tasks/boardUtils.test.ts`.
- Manual UI check: `npm run dev`. In dev, sample data can be seeded from the browser console with `const { createRepositories } = await import('/src/data/index.ts')`, then reload the page.

---

## 7. Gotchas (learned the hard way)

- **Dexie renames errors whose `name` matches its own** (e.g. `NotFoundError`) and wraps them in `DexieError`. That is why the domain error is `EntityNotFoundError`. Avoid DOMException-like names for custom errors.
- **shadcn CLI** (`npx shadcn@latest add <component>`): generated files import `cn` from the `cn` package — this is legitimate, keep it. Files in `src/components/ui/` are excluded from Prettier and from the `only-export-components` lint rule. **`ui/sonner.tsx` was modified** to use our `useTheme` instead of `next-themes`; re-apply that change if the component is regenerated, and do not reinstall `next-themes`.
- Radix `DropdownMenu` that opens a dialog from a menu item uses `modal={false}` to avoid focus/pointer-events lock issues.
- Avoid very recent JS APIs not available in older iOS WebViews (e.g. `Map.groupBy`), since the app will run in Capacitor.
- `navigator.storage.persist()` is requested at startup to reduce IndexedDB eviction.
- Radix Select keyboard interaction needs a short delay after opening in automated browser tests; screenshots may lag behind DOM state during dialog animations — verify with DOM queries.

---

## 8. Roadmap and future constraints

- **Electron (desktop)**: load `dist/` with `VITE_ROUTER_MODE=hash`; replace `lib/download.ts` with a native save dialog; consider CSP (the theme inline script in `index.html` may need a hash/nonce).
- **Capacitor (Android/iOS)**: `webDir: dist`, hash router, safe-area insets are already handled (`env(safe-area-inset-*)`, `viewport-fit=cover`). iOS may evict WebView storage: consider a SQLite repository or remote sync.
- **Remote database**: new repository implementation (e.g. Supabase/Postgres or custom API), Dexie as offline cache, sync based on `updatedAt`/`deletedAt`.
- **Performance**: route-level code splitting (bundle is ~970 kB).
- **i18n**: add Italian.

---

## 9. Changelog of this document

Add a line for every change that updates this guide (newest first).

- 2026-09-15 — Initial version: MVP (projects, tasks, kanban, list, filters, dashboard, backup, theme, responsive layout).
