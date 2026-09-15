# Shipyard

Tracker di progetti web per sviluppatori: crea progetti, suddividili in task (feature, bugfix, improvement, chore, other), organizzali su una board kanban e segui l'avanzamento dalla dashboard.

Oggi è una web app **local-first** (dati in IndexedDB). L'architettura è pensata per essere impacchettata in futuro con **Electron** (desktop) e **Capacitor** (Android/iOS) e per passare a un **database remoto** senza toccare la UI.

## Avvio rapido

Requisiti: Node.js ≥ 22.

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script | Descrizione |
| --- | --- |
| `npm run dev` | Dev server Vite con HMR |
| `npm run build` | Typecheck + build statica in `dist/` |
| `npm run preview` | Serve la build di produzione |
| `npm test` | Unit test (Vitest + fake-indexeddb) |
| `npm run typecheck` | Controllo tipi TypeScript |
| `npm run lint` | Lint con oxlint |
| `npm run format` | Formattazione con Prettier |

## Funzionalità

- **Progetti**: nome, descrizione, colore, link a repository e sito live; archiviazione ed eliminazione.
- **Task**: tipo, stato (Backlog → To do → In progress → Done), priorità, scadenza, descrizione.
- **Board kanban** con drag & drop (mouse, touch con pressione prolungata, tastiera con Spazio) e **vista lista** ordinabile.
- **Filtri** per testo, tipo e priorità, salvati nell'URL.
- **Dashboard**: percentuale di completamento, conteggi per stato e tipo, task scaduti e in scadenza.
- **Backup**: export/import JSON (modalità *merge* o *replace*) e cancellazione dei dati.
- Tema chiaro/scuro/sistema, layout responsive (sidebar su desktop, bottom nav su mobile), UI in inglese con i18n predisposta.

## Stack

| Area | Tecnologia |
| --- | --- |
| Build & UI | Vite, React 19, TypeScript (strict) |
| Stile | Tailwind CSS v4, shadcn/ui (Radix), lucide-react |
| Routing | React Router (browser o hash history) |
| Dati | TanStack Query sopra repository astratti; Dexie (IndexedDB) |
| Form & validazione | react-hook-form, Zod |
| Drag & drop | dnd-kit |
| i18n | i18next, react-i18next |
| Test & qualità | Vitest, Testing Library, oxlint, Prettier |

## Architettura

```
src/
  app/          # entry, provider, router, layout, tema
  components/   # componenti condivisi (+ ui/ generati da shadcn)
  domain/       # modello: costanti, schemi Zod, logica pura (ordinamento, backup)
  data/         # interfacce repository + implementazione Dexie, query keys
  features/
    dashboard/  # statistiche (funzioni pure testate) e pagina
    projects/   # pagine, form, card, hook TanStack Query
    tasks/      # board kanban, lista, filtri, form, hook
    settings/   # tema, export/import, reset
  i18n/         # configurazione e traduzioni
  lib/          # utility (id, date, download)
```

Principi chiave:

- **La UI non conosce lo storage.** I componenti usano solo hook di TanStack Query, che ricevono i repository (`ProjectRepository`, `TaskRepository`, `BackupRepository` in `src/data/repositories.ts`) tramite `RepositoryProvider`. L'unico punto da cambiare per un backend remoto è `createRepositories()` in `src/data/index.ts`.
- **Dati pronti per la sync**: ID UUID, timestamp `createdAt`/`updatedAt` ISO, soft delete con `deletedAt`.
- **Ordinamento kanban** con `order` frazionario (posizione a metà tra le card vicine) e rinumerazione automatica della colonna quando la precisione si esaurisce (`src/domain/task.ts`).
- La logica pura (ordinamento, statistiche, backup, calcolo delle posizioni di drag & drop) è separata dai componenti e coperta da unit test.

## Roadmap

- **Desktop (Electron)**: caricare `dist/` con `VITE_ROUTER_MODE=hash`; sostituire `src/lib/download.ts` con il dialog di salvataggio nativo.
- **Mobile (Capacitor)**: `npx cap add android` / `npx cap add ios` con `webDir: dist`. Su iOS lo storage della WebView può essere liberato dal sistema: valutare un repository SQLite o la sync remota.
- **Database remoto**: nuova implementazione dei repository (es. Supabase/Postgres o API propria) con Dexie come cache offline; rivedere `networkMode` in `src/app/providers.tsx`.
- Code splitting delle route per ridurre il bundle iniziale.
