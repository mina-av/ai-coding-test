# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This App Does

**BKI Angebots-Tool** — a German construction industry web app that:
1. Accepts a PDF Leistungsverzeichnis (LV) upload
2. Extracts all LV positions via Claude AI (Haiku model)
3. Lets users edit positions and enter unit prices (Einheitspreise)
4. Optionally matches positions to BKI Baukosten 2023 reference prices
5. Exports a finished Angebot (offer) as a PDF

## Tech Stack

- **Framework:** Next.js 16 (App Router), TypeScript, React 19
- **Styling:** Tailwind CSS + shadcn/ui (components in `src/components/ui/`)
- **AI:** Anthropic SDK (`@anthropic-ai/sdk`) — `claude-haiku-4-5-20251001` model
- **PDF generation:** `@react-pdf/renderer`
- **PDF parsing:** `pdf-parse` (server-side only, for BKI matching)
- **State:** React Context (`LVProvider` wraps the entire app)
- **Validation:** Zod + react-hook-form

## Build & Test Commands

```bash
npm run dev        # Development server (localhost:3000)
npm run build      # Production build
npm run lint       # ESLint
```

## Environment Variables

```
ANTHROPIC_API_KEY=   # Required for /api/extract and /api/bki/match
```

## App Architecture

### User Flow (pages in `src/app/`)
```
/ (page.tsx)           → Landing / upload prompt
/upload (page.tsx)     → PDF upload → calls /api/extract → populates LVContext
/positionen (page.tsx) → View/edit all extracted LV positions
/kalkulation (page.tsx)→ Enter Einheitspreise, see Netto/Brutto, export PDF
```

### Global State: `LVContext` (`src/contexts/lv-context.tsx`)
All LV positions live in `LVProvider` (mounted in `layout.tsx`). This is **in-memory only** — data is lost on page refresh. The context exposes:
- `positionen` / `setPositionen` — the full position list
- `updatePosition(id, changes)` — partial updates
- `addPosition()` / `deletePosition(id)`

The central `LVPosition` interface is defined in `lv-context.tsx` and includes: `id, positionsnummer, kurzbeschreibung, langbeschreibung, menge, einheit, einheitspreis, bkiVorschlag?, bkiKonfidenz?`

### API Routes (`src/app/api/`)
- **`POST /api/extract`** — receives a PDF (`multipart/form-data`), sends it to Claude as a base64 document, returns an array of `LVPosition` objects. Max 20 MB.
- **`POST /api/bki/match`** — receives positions JSON, reads `BKI kompakt 2023 Gesamt.pdf` from the project root (cached in memory), asks Claude to match each position to a BKI reference price. Returns `{ id, bkiVorschlag, bkiKonfidenz }[]`.

> **Important:** `BKI kompakt 2023 Gesamt.pdf` must exist at the project root for BKI matching to work. It is gitignored.

### Calculation Logic (`src/lib/kalkulation.ts`)
- `parsePrice(str)` — handles both German (`1.234,56`) and English (`1234.56`) number formats
- `calcGP(menge, ep)` — Menge × Einheitspreis; returns `null` for non-numeric Menge (e.g. "pauschal")
- `calcAngebotssumme(positionen)` — sums all GP values
- `formatEuro(value)` — formats as `de-DE` currency

### PDF Export (`src/components/angebot-pdf.tsx`)
Uses `@react-pdf/renderer` to generate an A4 PDF. The export modal (`src/components/export-modal.tsx`) handles filename input and triggers the download. MwSt (19%) is calculated and shown separately.

## Key Conventions

- **Feature IDs:** PROJ-1 through PROJ-6 (see `features/INDEX.md`)
- **Commits:** `feat(PROJ-X): description` / `fix(PROJ-X): description`
- **shadcn/ui first:** Never create custom versions of components that exist in `src/components/ui/`. Install missing ones with `npx shadcn@latest add <name> --yes`
- **German locale:** All UI text, number formatting, and currency use German conventions

## Development Workflow Skills

```
/requirements → /architecture → /frontend → /backend → /qa → /deploy
```

Feature specs: `features/PROJ-X-name.md`. Status overview: `features/INDEX.md`.

## Product Context

@docs/PRD.md

## Feature Overview

@features/INDEX.md
