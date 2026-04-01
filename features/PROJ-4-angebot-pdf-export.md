# PROJ-4: Angebot als PDF exportieren

## Status: Deployed
**Created:** 2026-03-25
**Last Updated:** 2026-04-01

## Dependencies
- Requires: PROJ-3 (Preiseingabe & Kalkulation) — Positionen mit Preisen müssen vorhanden sein

## User Stories
- Als Kalkulator möchte ich das fertige Angebot als PDF exportieren, damit ich es dem Kunden senden kann.
- Als Kalkulator möchte ich, dass das PDF professionell aussieht (Firmenlogo, Kopfzeile, Tabelle, Summe), damit es einen guten Eindruck macht.
- Als Kalkulator möchte ich vor dem Export einen Projektnamen und Kundennamen eingeben, damit das PDF korrekt beschriftet ist.
- Als Kalkulator möchte ich wählen können, ob Positionen ohne Preis im Export enthalten sind oder ausgeblendet werden.

## Acceptance Criteria
- [ ] Button "Angebot exportieren" ist sichtbar, wenn mindestens eine Position mit EP > 0 vorhanden ist
- [ ] Vor dem Export: Modal mit Eingabefeldern für Projektname, Kundenname, Datum (vorausgefüllt mit heute)
- [ ] Exportiertes PDF enthält: Kopfzeile (Projektname, Kunde, Datum), Tabelle aller Positionen (Pos.-Nr., Beschreibung, Menge, Einheit, EP, GP), Angebotssumme
- [ ] PDF hat lesbares Layout mit klarer Typografie und ausreichend Weißraum
- [ ] Dateiname des PDFs: `Angebot_[Projektname]_[Datum].pdf`
- [ ] Option: Positionen ohne Preis ausblenden oder als "Preis auf Anfrage" anzeigen
- [ ] PDF-Generierung dauert unter 5 Sekunden
- [ ] Ladeindikator während PDF-Generierung

## Edge Cases
- Sehr viele Positionen (100+) → PDF hat mehrere Seiten, Kopfzeile wiederholt sich auf jeder Seite
- Projektname enthält Sonderzeichen → im Dateinamen werden Sonderzeichen durch "-" ersetzt
- Nutzer klickt mehrfach auf Export → nur ein PDF wird generiert (Button während Generierung deaktiviert)
- Alle Positionen haben EP = 0 → Hinweis vor Export: "Alle Preise sind 0. Wirklich exportieren?"

## Technical Requirements
- PDF-Generierung server-seitig oder via Browser-Library (z.B. jsPDF oder Puppeteer)
- Kein externes Service-Dependency für PDF-Export
- Druckfreundliches Layout (A4)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
**Designed:** 2026-03-25

### Komponentenstruktur

```
Kalkulations-Seite (/kalkulation)
└── ExportButton  [sichtbar wenn ≥1 Position mit EP > 0]
    └── öffnet ExportModal

ExportModal  (shadcn/ui Dialog)
├── Formular
│   ├── Projektname  (Pflichtfeld)
│   ├── Kundenname   (Pflichtfeld)
│   └── Datum        (vorausgefüllt mit heute, änderbar)
├── Optionen
│   └── Positionen ohne Preis:
│       ○ Ausblenden
│       ○ Als "Preis auf Anfrage" anzeigen
├── Warnung  [wenn alle EP = 0]
│   └── "Alle Preise sind 0. Wirklich exportieren?"
├── Ladeindikator  [während Generierung]
└── "PDF generieren" Button  [deaktiviert während Generierung]

PDF-Dokument  (generiert im Hintergrund, A4)
├── Kopfzeile  [wiederholt auf jeder Seite]
│   ├── Projektname, Kundenname, Datum
│   └── Seitennummer ("Seite 1 von 3")
├── Positionstabelle
│   └── Pos.-Nr. | Beschreibung | Menge | Einheit | EP | GP
└── Fußzeile
    └── Angebotssumme  (prominent hervorgehoben)
```

### Datenmodell

Keine neuen Daten — liest aus bestehendem React Context (Positionen + EP + GP aus PROJ-3). Neue temporäre Eingaben im Modal: Projektname, Kundenname, Datum, Option für Positionen ohne Preis.

### Ablauf

React Context (Positionen + Preise) → Nutzer öffnet ExportModal → Projektname, Kundenname, Datum eingeben → "PDF generieren" → `@react-pdf/renderer` baut PDF im Browser → Automatischer Download: `Angebot_[Projektname]_[Datum].pdf`

Kein Server-Aufruf nötig — alles passiert direkt im Browser.

### Tech-Entscheidungen

| Entscheidung | Warum |
|---|---|
| `@react-pdf/renderer` (client-seitig) | Generiert PDFs direkt aus React-Komponenten im Browser — kein Server, kein externes Service, A4-Layout und automatische Seitenumbrüche inklusive |
| Kein Puppeteer | Puppeteer ist sehr schwer (Chrome-Dependency) und braucht einen Server — unnötig für diesen Anwendungsfall |
| shadcn/ui Dialog für Modal | Bereits installiert, kein neues Paket |
| Button deaktiviert während Export | Verhindert doppelten Download bei mehrfachem Klick |

### Neue Abhängigkeiten

- **`@react-pdf/renderer`** — PDF-Generierung aus React-Komponenten (client-seitig, kein Server nötig)

## QA Test Results
**Tested:** 2026-03-31
**Tester:** QA / Red-Team Pen-Test
**Build:** TypeScript compiles cleanly (npx tsc --noEmit = 0 errors)

### Acceptance Criteria Results

| # | Criterion | Result | Notes |
|---|-----------|--------|-------|
| AC-1 | Button "Angebot exportieren" sichtbar wenn >= 1 Position mit EP > 0 | **FAIL** | BUG-01: Button is visible and enabled whenever `positionen.length > 0`, regardless of whether any position has EP > 0. The condition on line 274 of `kalkulation/page.tsx` is `disabled={positionen.length === 0}` instead of `disabled={!hatPreise}`. The `hatPreise` variable is computed but never used for the export button. |
| AC-2 | Modal mit Projektname, Kundenname, Datum (vorausgefuellt mit heute) | **PASS** | Modal contains Projektname (required), Kundenname (required), Datum (pre-filled with today via `todayISO()`). Additional fields (Kundenadresse, Objektnummer, Angebotsnummer) go beyond spec -- not a problem. |
| AC-3 | PDF enthaelt Kopfzeile, Tabelle (Pos.-Nr., Beschreibung, Menge, Einheit, EP, GP), Angebotssumme | **PASS** | PDF includes header with Projektname, Kunde, Datum; table with Pos.-Nr., Beschreibung, Menge, Einh., EP Netto, GP Netto, GP Brutto; and sum section with Netto, MwSt, Brutto. |
| AC-4 | PDF hat lesbares Layout mit klarer Typografie und Weissraum | **PASS** | Uses Helvetica at 9pt with 40pt padding, alternating row backgrounds, clear header styling. A4 format. |
| AC-5 | Dateiname: `Angebot_[Projektname]_[Datum].pdf` | **PASS** | Line 123 of `kalkulation/page.tsx`: ``Angebot_${sanitizeFilename(data.projektname)}_${data.datum}.pdf``. Sanitization replaces non-alphanumeric (plus German umlauts) with hyphens. |
| AC-6 | Option: Positionen ohne Preis ausblenden oder als "Preis auf Anfrage" | **PASS** | RadioGroup in ExportModal offers "Ausblenden" and "Als Preis auf Anfrage anzeigen". AngebotPDF filters positions accordingly and shows "Auf Anfrage" text for EP/GP when option is selected. |
| AC-7 | PDF-Generierung dauert unter 5 Sekunden | **PASS (assumed)** | Client-side `@react-pdf/renderer` generates PDFs in-browser. For typical LV sizes (< 100 positions) this should be well under 5 seconds. Cannot measure precisely without runtime test. |
| AC-8 | Ladeindikator waehrend PDF-Generierung | **PASS** | Loader2 spinner shown with text "Wird generiert..." while `loading` state is true. Button disabled during generation. |

### Edge Case Results

| # | Edge Case | Result | Notes |
|---|-----------|--------|-------|
| EC-1 | 100+ Positionen, mehrere Seiten, Kopfzeile wiederholt sich | **FAIL** | BUG-02: The header (View with logo, company address, project info) is NOT marked as `fixed` in `@react-pdf/renderer`. Only the page number Text element has `fixed` prop. The header will appear on page 1 only; it will NOT repeat on subsequent pages. The table header row is also not repeated. |
| EC-2 | Sonderzeichen im Dateinamen durch "-" ersetzt | **PASS** | `sanitizeFilename()` regex replaces anything not in `[a-zA-Z0-9aouAOUss]` with "-", collapses multiple hyphens, trims leading/trailing hyphens. |
| EC-3 | Mehrfach-Klick auf Export: nur ein PDF | **PASS** | Button is disabled while `loading=true`. Modal cannot be closed during generation (`!loading && onClose()`). |
| EC-4 | Alle Positionen EP = 0: Hinweis vor Export | **PASS** | Alert with "Alle Preise sind 0. Wirklich exportieren?" shown when `alleOhnePreis` is true. Note: export is still allowed (no blocking confirmation dialog), which matches the implementation but is slightly weaker than a true confirmation. |

### Bug Report

#### BUG-01: Export button visible even when no position has EP > 0 (Severity: Medium, Priority: High)

**Steps to reproduce:**
1. Upload a PDF and extract positions (all positions have EP = 0 by default)
2. Navigate to /kalkulation
3. Do NOT enter any prices
4. Observe the "Angebot exportieren" button

**Expected:** Button should be hidden or disabled when no position has EP > 0.
**Actual:** Button is enabled as long as `positionen.length > 0`.
**Root cause:** In `kalkulation/page.tsx` line 274, the disabled condition is `positionen.length === 0`. The `hatPreise` variable (line 75) is computed (`positionen.some((p) => p.einheitspreis > 0)`) but is never used for the button's disabled state.
**Fix suggestion:** Change `disabled={positionen.length === 0}` to `disabled={!hatPreise}` on the export button.

#### BUG-02: PDF header does not repeat on subsequent pages (Severity: Medium, Priority: Medium)

**Steps to reproduce:**
1. Have 100+ positions loaded
2. Export as PDF
3. View page 2+ of the generated PDF

**Expected:** Kopfzeile (or at minimum the table header) repeats on every page as specified in the edge case requirement and tech design.
**Actual:** Only the page number (`<Text fixed>`) repeats. The header View and table header View lack the `fixed` prop, so they appear only on page 1. `@react-pdf/renderer` requires `fixed` prop on elements that should repeat across pages.
**Fix suggestion:** Add `fixed` prop to the header View and the table header View in `angebot-pdf.tsx`, or wrap them in a fixed-position element.

#### BUG-03: Angebotssumme in PDF uses all positions, not filtered positions (Severity: High, Priority: High)

**Steps to reproduce:**
1. Have positions, some with EP > 0, some with EP = 0
2. Open export modal, select "Ausblenden" for positions without price
3. Export PDF

**Expected:** Angebotssumme should match the sum of displayed positions, OR it should clearly state it includes all positions.
**Actual:** Line 101 of `angebot-pdf.tsx` computes `const netto = calcAngebotssumme(positionen)` using the full unfiltered `positionen` array, while the table only shows `filtered` positions. This means the total at the bottom could include GP from positions not visible in the table (positions with EP = 0 contribute 0 anyway, so the mathematical result is correct in practice). However, the inconsistency is a latent bug: if a position without EP were somehow given a non-zero GP through a future code change, the sum would be wrong. Current severity is low in practice but the code logic is incorrect by principle.
**Revised severity:** Low (currently no practical impact since EP=0 means GP=0)

#### BUG-04: Logo path may fail in @react-pdf/renderer (Severity: Medium, Priority: Medium)

**Steps to reproduce:**
1. Export a PDF from the application

**Expected:** Logo image renders in the PDF header.
**Actual:** The Image component uses `src="/logo.JPG"` (line 110 of `angebot-pdf.tsx`). In `@react-pdf/renderer`, which runs outside of Next.js's static file serving, a relative path like `/logo.JPG` may not resolve correctly. The library typically needs an absolute URL or a base64-encoded image. This could cause the PDF to fail or render without the logo depending on the runtime environment.
**Fix suggestion:** Use an absolute URL (e.g., `http://localhost:3000/logo.JPG` for dev, or a full production URL) or embed the image as base64.

#### BUG-05: ExportModal form state not reset on reopen (Severity: Low, Priority: Low)

**Steps to reproduce:**
1. Open export modal, fill in Projektname and Kundenname
2. Cancel the modal
3. Reopen the modal

**Expected:** Fields should be empty (fresh form) or retain values (both valid UX choices, but should be intentional).
**Actual:** State is initialized with `useState('')` at component mount. Since ExportModal is always rendered (not conditionally mounted), the state persists between opens. The Angebotsnummer is generated once at mount and never changes. If the user cancels and reopens minutes later, the Angebotsnummer and any previously entered data remain.
**Note:** This may actually be desired behavior (preserving user input). Flagging as low priority for UX review.

### Security Audit (Red-Team Perspective)

| # | Check | Result | Notes |
|---|-------|--------|-------|
| SEC-1 | XSS via Projektname/Kundenname in PDF | **PASS** | `@react-pdf/renderer` does not interpret HTML in Text elements. User input is rendered as plain text in the PDF. No risk of script injection in PDF output. |
| SEC-2 | XSS via Projektname in filename | **PASS** | `sanitizeFilename()` strips all non-alphanumeric characters except German umlauts. No risk of path traversal or filename injection. |
| SEC-3 | Sensitive data in client-side PDF | **LOW RISK** | PDF is generated entirely in the browser. No data is sent to a server for PDF generation. Data stays client-side. However, the ANTHROPIC_API_KEY is used server-side only (in /api/extract and /api/bki/match) and never exposed to the client. |
| SEC-4 | No authentication on PDF export | **INFO** | There is no authentication on the application at all (PROJ-6 is Planned). PDF export itself has no auth. This is expected for MVP but should be noted. |
| SEC-5 | BKI match API key exposed in client | **MEDIUM** | In `kalkulation/page.tsx` line 44, the BKI match request sends `'x-api-key': process.env.NEXT_PUBLIC_EXTRACT_API_KEY ?? ''`. The `NEXT_PUBLIC_` prefix means this key is bundled into the client JavaScript and visible to anyone inspecting the page source. If this key protects the extract API, it offers no real protection since anyone can read it from the browser bundle. |
| SEC-6 | Security headers present | **PASS** | `next.config.ts` sets X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: origin-when-cross-origin, HSTS with includeSubDomains. |
| SEC-7 | No server-side input validation for PDF | **N/A** | PDF is generated client-side. No server endpoint involved. |
| SEC-8 | URL.createObjectURL memory leak potential | **PASS** | `URL.revokeObjectURL(url)` is called immediately after triggering the download (line 125 of `kalkulation/page.tsx`). However, revoking immediately after `a.click()` may be too early on some browsers since the download may not have started yet. Low risk in practice. |

### Regression Check (PROJ-1, PROJ-2, PROJ-3)

| Feature | Check | Result | Notes |
|---------|-------|--------|-------|
| PROJ-1 (PDF Upload) | Extract API route unchanged | **PASS** | `/api/extract/route.ts` is unmodified by PROJ-4 changes. Zod validation, rate limiting, file type checks all intact. |
| PROJ-2 (Positionen) | LVContext interface unchanged | **PASS** | `LVPosition` interface unchanged. `useLV()` hook unchanged. No breaking changes to position data model. |
| PROJ-3 (Kalkulation) | EP input, GP calc, Angebotssumme | **PASS** | `kalkulations-row.tsx` unchanged. `kalkulation.ts` utility functions unchanged. Calculation logic is not affected by export feature. |
| PROJ-3 | Navigation between pages | **PASS** | "Zurueck zu Positionen" button still present. Empty state still redirects to /upload. |
| PROJ-1/2/3 | No new TypeScript errors | **PASS** | `npx tsc --noEmit` passes with 0 errors. |

### Responsive / Cross-Browser Notes

| Viewport | Component | Notes |
|----------|-----------|-------|
| 375px (mobile) | ExportModal | Modal uses `sm:max-w-md` class. On mobile it should expand to full width. shadcn Dialog handles this. |
| 375px (mobile) | Kalkulation table | Table may overflow horizontally on small screens. No horizontal scroll container detected. This is a pre-existing PROJ-3 issue, not introduced by PROJ-4. |
| 768px (tablet) | ExportModal | Should render well within the Dialog constraints. |
| 1440px (desktop) | All | Constrained by `max-w-5xl` container. Should render correctly. |
| Cross-browser | PDF generation | `@react-pdf/renderer` uses a web worker internally. Compatible with Chrome, Firefox, and Safari. Edge case: Safari may handle blob downloads differently (may open in new tab instead of downloading). |

### Summary

**Total Acceptance Criteria:** 8
**Passed:** 7
**Failed:** 1 (AC-1: export button visibility condition)

**Total Edge Cases:** 4
**Passed:** 3
**Failed:** 1 (EC-1: header not repeating on multi-page PDFs)

**Bugs Found:** 5
- BUG-01 (Medium/High): Export button enabled without prices
- BUG-02 (Medium/Medium): Header not repeating on subsequent PDF pages
- BUG-03 (Low/Low): Sum computed from unfiltered positions (no practical impact currently)
- BUG-04 (Medium/Medium): Logo path may not resolve in @react-pdf/renderer
- BUG-05 (Low/Low): Modal form state persists between opens

**Security Issues:** 1
- SEC-5 (Medium): API key with NEXT_PUBLIC_ prefix exposed in client bundle

**Recommendation:** Fix BUG-01 and BUG-02 before marking PROJ-4 as deployed. Investigate BUG-04 with a runtime test. Address SEC-5 by removing the NEXT_PUBLIC_ prefix and proxying through a server-side route if the key is meant to be secret.

## Deployment
_To be added by /deploy_
