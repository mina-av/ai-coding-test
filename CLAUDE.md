# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This App Does

**BKI Kalkulation** — a German construction industry web app (invite-only, Supabase auth) that:
1. Accepts a PDF Leistungsverzeichnis (LV) upload
2. Extracts all LV positions via Claude AI (Haiku model)
3. Lets users edit positions and enter Einheitspreise
4. Optionally matches positions to BKI Baukosten 2023 reference prices (PDF stored in Supabase Storage)
5. Exports a finished Angebot as PDF

## Tech Stack

- **Framework:** Next.js 16 (App Router), TypeScript, React 19
- **Styling:** Tailwind CSS + shadcn/ui (components in `src/components/ui/`)
- **Auth:** Supabase Auth via `@supabase/ssr` — invite-only, no self-registration
- **AI:** Anthropic SDK — `claude-haiku-4-5-20251001` for both LV extraction and BKI matching
- **PDF generation:** `@react-pdf/renderer`
- **PDF parsing:** `pdf-parse` (server-side only, required in API routes via `require('pdf-parse/lib/pdf-parse')` — NOT the default import, due to Next.js bundling issues)

## Commands

```bash
npm run dev        # Development server (localhost:3000)
npm run build      # Production build
npm run lint       # ESLint
```

## Environment Variables

All required vars are documented in `.env.local.example`. Key ones:

| Variable | Where used |
|---|---|
| `ANTHROPIC_API_KEY` | `/api/extract`, `/api/bki/match` |
| `NEXT_PUBLIC_SUPABASE_URL` | All Supabase clients (browser + server) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser Supabase client, middleware |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only: invite API, BKI Storage download |
| `NEXT_PUBLIC_APP_URL` | Invite email redirect URL (must be prod URL in Vercel) |
| `EXTRACT_API_KEY` | Optional extra API key protection on `/api/extract` and `/api/bki/match` |

## Architecture

### User Flow

```
/login              → Supabase signInWithPassword → window.location.href = '/'
/                   → Project list (ProjekteContext, localStorage)
/upload             → PDF upload → POST /api/extract → creates project in ProjekteContext
/positionen         → View/edit extracted positions (LVContext)
/kalkulation        → Enter Einheitspreise, BKI matching, export PDF
/team               → Team member list + invite form (Teamleiter only)
```

### Authentication & Roles

- **Middleware** (`middleware.ts`): All routes protected. Unauthenticated users → `/login` redirect; unauthenticated API calls → 401. Only `/login/**` is public.
- **Supabase clients:**
  - Browser: `createClient()` from `src/lib/supabase.ts` — uses `createBrowserClient` from `@supabase/ssr`
  - Server (API routes): `createServerSupabaseClient()` from `src/lib/supabase-server.ts` — uses `createServerClient` with cookie handling
- **Roles** (`kalkulator` | `teamleiter`) are stored in `app_metadata` (set only via Admin API / Service Role Key — not user-writable). Read via `useUser()` hook (`src/hooks/use-user.ts`).
- **Invite flow:** Teamleiter POSTs to `/api/team/invite` → `adminClient.auth.admin.inviteUserByEmail` → user sets password via `/login/reset/confirm`.

### State Management

Two React Contexts, both mounted in `layout.tsx`:

**`ProjekteContext`** (`src/contexts/projekte-context.tsx`):
- Persists to `localStorage` under key `bki-projekte`
- Holds all projects (`Projekt[]`) with their embedded `positionen`
- Tracks `activeProjectId` via a `useRef` to avoid stale closures

**`LVContext`** (`src/contexts/lv-context.tsx`):
- Holds the currently-open project's `positionen` in memory
- Auto-saves to `ProjekteContext.updateActiveProject()` on every change (skips first render)
- `LVPosition` is the central type — defined here and re-exported

### API Routes

| Route | Purpose |
|---|---|
| `POST /api/extract` | PDF → Claude → `LVPosition[]`. PDFs ≤5 pages: sent as base64 document. PDFs >5 pages: text extracted by `pdf-parse`, split into 20k-char chunks with 2k overlap, processed in parallel, deduplicated by `positionsnummer`. |
| `POST /api/bki/match` | Matches `LVPosition[]` to BKI Baukosten 2023 prices. BKI PDF downloaded from Supabase Storage bucket `bki-assets` and cached in-process. Processed in batches of 30 with prompt caching. |
| `POST /api/team/invite` | Teamleiter-only invite. Uses Service Role Key Admin client. |
| `POST /api/migrate` | Stub — returns 503 until Supabase tables are populated (used by `MigrationBanner`). |

### Role-Based UI

`readOnly = rolle === 'teamleiter'` is applied in:
- `/positionen`: hides "LV hochladen" and "Position hinzufügen", passes `readOnly` to `PositionRow`
- `/kalkulation`: hides "Angebot exportieren", passes `readOnly` to `KalkulationsRow`
- `/`: shows "Alle Projekte" label, hides "Neues Projekt" button
- `/team`: redirects Kalkulatoren to `/`

### Calculation Logic (`src/lib/kalkulation.ts`)

- `parsePrice(str)` — handles German format (`1.234,56`) and English (`1234.56`)
- `calcGP(menge, ep)` — returns `null` for non-numeric Menge (e.g. "pauschal")
- `calcAngebotssumme(positionen)` — sums all GP values; MwSt 19% added in UI

## Key Conventions

- **Feature IDs:** PROJ-1 through PROJ-6 (see `features/INDEX.md`). Next: PROJ-7.
- **Commits:** `feat(PROJ-X): description` / `fix(PROJ-X): description`
- **shadcn/ui first:** Never create custom versions of components in `src/components/ui/`. Install missing ones with `npx shadcn@latest add <name> --yes`.
- **German locale:** All UI text, number formatting, and currency use German conventions.
- **Auth redirects:** Always use `window.location.href` (not `router.push`) after login/logout to force a full page reload and clear cached state.
- **pdf-parse import:** Must use `require('pdf-parse/lib/pdf-parse')` (not `import`) in API routes to avoid Next.js bundling issues with the test runner embedded in the package.

## Development Workflow Skills

```
/requirements → /architecture → /frontend → /backend → /qa → /deploy
```

Feature specs: `features/PROJ-X-name.md`. Status overview: `features/INDEX.md`.

## Product Context

@docs/PRD.md

## Feature Overview

@features/INDEX.md
