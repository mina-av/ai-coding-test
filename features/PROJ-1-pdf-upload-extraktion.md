# PROJ-1: PDF-Upload & KI-Extraktion

## Status: In Progress
**Created:** 2026-03-25
**Last Updated:** 2026-03-25

## Dependencies
- None

## User Stories
- Als Kalkulator möchte ich ein LV als PDF hochladen, damit ich nicht alle Positionen manuell eintippen muss.
- Als Kalkulator möchte ich, dass die KI alle Positionen automatisch erkennt (Positionsnummer, Beschreibung, Menge, Einheit), damit ich Zeit spare.
- Als Kalkulator möchte ich den Fortschritt der Extraktion sehen, damit ich weiß, wann das Ergebnis bereit ist.
- Als Kalkulator möchte ich bei einer fehlerhaften Erkennung eine Fehlermeldung erhalten, damit ich weiß, was schiefgelaufen ist.

## Acceptance Criteria
- [ ] Nutzer kann eine PDF-Datei per Drag-and-Drop oder Datei-Dialog hochladen
- [ ] Nur PDF-Dateien werden akzeptiert (andere Formate werden abgelehnt mit Hinweis)
- [ ] Maximale Dateigröße: 20 MB (größere Dateien werden abgelehnt mit Hinweis)
- [ ] Nach dem Upload wird ein Ladezustand angezeigt, während die KI das PDF verarbeitet
- [ ] Die KI extrahiert pro Position: Positionsnummer, Kurzbeschreibung, Langbeschreibung (falls vorhanden), Menge, Einheit
- [ ] Extrahierte Positionen werden strukturiert gespeichert und zur nächsten Ansicht weitergeleitet
- [ ] Bei KI-Fehler (API-Fehler, unlesbares PDF) wird eine verständliche Fehlermeldung angezeigt
- [ ] Upload- und Extraktionsprozess dauert unter 60 Sekunden für ein typisches LV (bis 100 Positionen)

## Edge Cases
- PDF ist passwortgeschützt → Fehlermeldung: "PDF ist passwortgeschützt. Bitte entsperrtes PDF hochladen."
- PDF enthält nur gescannte Bilder (kein Text) → Fehlermeldung: "PDF enthält keinen lesbaren Text. Bitte eine durchsuchbare PDF hochladen."
- PDF ist kein Leistungsverzeichnis (z.B. ein Briefdokument) → KI extrahiert leere Liste, Nutzer sieht leere Tabelle mit Hinweis
- Verbindungsabbruch während Extraktion → Fehlermeldung mit Retry-Button
- Sehr großes LV (500+ Positionen) → Extraktion dauert länger, Fortschrittsanzeige notwendig
- Doppelter Upload derselben Datei → kein automatisches Deduplizieren in MVP, neuer Eintrag wird erstellt

## Technical Requirements
- KI-Modell: Claude API (`claude-haiku-4-5-20251001`) für Textextraktion und Strukturierung (Haiku aus Kostengründen)
- PDF-Parsing: Server-seitig (API Route), nicht im Browser
- Unterstützte LV-Formate: ÖNORM, VOB, sowie proprietäre Formate (Best-effort durch KI)
- Sicherheit: Keine persistente Speicherung der PDF-Datei nach Extraktion

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
**Designed:** 2026-03-25

### Komponentenstruktur
```
Upload-Seite (/upload)
├── UploadZone
│   ├── Drag-and-Drop Bereich (visuelles Ziel)
│   ├── "Datei auswählen" Button (öffnet Datei-Dialog)
│   └── Validierungshinweise (Typ/Größe)
├── ExtractionProgress  [erscheint nach Upload]
│   ├── Fortschrittsbalken / Spinner
│   └── Statustext ("KI liest Leistungsverzeichnis aus...")
└── ErrorAlert  [erscheint bei Fehler]
    ├── Fehlermeldung (verständlicher Text)
    └── "Erneut versuchen" Button
```

### Datenmodell
Jede LV-Position enthält: ID, Positionsnummer, Kurzbeschreibung, Langbeschreibung (optional), Menge, Einheit, Einheitspreis (initial 0).
Gespeichert in: React Context (Browser-Arbeitsspeicher) — kein Datenbank-Server für PROJ-1 nötig.

### Ablauf
1. Nutzer wählt/dropped PDF → Client prüft Typ (nur PDF) und Größe (max. 20 MB)
2. PDF wird an API-Route `/api/extract` gesendet
3. Server extrahiert Text mit `pdf-parse`
4. Text wird an Claude API (claude-sonnet-4-6) geschickt → strukturiertes JSON der Positionen
5. Positionen werden in React Context gespeichert
6. Weiterleitung zur Positionsansicht (PROJ-2)

### Neue Abhängigkeiten
- `pdf-parse` — Text aus PDF extrahieren (server-seitig)
- `@anthropic-ai/sdk` — Claude API Client
- `react-dropzone` — Drag-and-Drop UI

### Neue Umgebungsvariablen
- `ANTHROPIC_API_KEY` — Claude API-Schlüssel (geheim, nie in Git)

## QA Test Results
**Tested by:** QA / Red-Team Pen-Test
**Date:** 2026-03-31
**Tested against commit:** ef2bf0e (main)

---

### Acceptance Criteria Results

| # | Criterion | Result | Notes |
|---|-----------|--------|-------|
| AC-1 | Nutzer kann eine PDF-Datei per Drag-and-Drop oder Datei-Dialog hochladen | PASS | `react-dropzone` configured with `accept: { 'application/pdf': ['.pdf'] }`, drag-and-drop zone renders, file dialog triggered via button. Both paths call `onFileSelect`. |
| AC-2 | Nur PDF-Dateien werden akzeptiert (andere Formate werden abgelehnt mit Hinweis) | PASS | Client-side: `react-dropzone` `accept` filter + error message "Nur PDF-Dateien werden akzeptiert." Server-side: `file.type !== 'application/pdf'` check returns 400. |
| AC-3 | Maximale Dateigroe: 20 MB (groessere Dateien werden abgelehnt mit Hinweis) | PASS | Client-side: `maxSize: 20 * 1024 * 1024` in dropzone + error message. Server-side: `file.size > 20 * 1024 * 1024` check returns 400. |
| AC-4 | Nach dem Upload wird ein Ladezustand angezeigt, waehrend die KI das PDF verarbeitet | PASS | `ExtractionProgress` component renders spinner + "KI liest Leistungsverzeichnis aus..." text when state is 'extracting'. |
| AC-5 | Die KI extrahiert pro Position: Positionsnummer, Kurzbeschreibung, Langbeschreibung (falls vorhanden), Menge, Einheit | PASS | Prompt in `buildPrompt()` explicitly requests all five fields. `RawPosition` type models them. Response is parsed and mapped to `LVPosition` objects. |
| AC-6 | Extrahierte Positionen werden strukturiert gespeichert und zur naechsten Ansicht weitergeleitet | PASS | `setPositionen(positionen)` stores in LVContext, then `router.push('/positionen')` navigates. |
| AC-7 | Bei KI-Fehler (API-Fehler, unlesbares PDF) wird eine verstaendliche Fehlermeldung angezeigt | PASS | `catch` block in `handleFileSelect` sets error message, `ErrorAlert` renders with destructive Alert and retry button. Server returns German error messages. |
| AC-8 | Upload- und Extraktionsprozess dauert unter 60 Sekunden fuer ein typisches LV (bis 100 Positionen) | PARTIAL | Cannot verify without live API call. The code uses `claude-haiku-4-5-20251001` which is fast. However, for PDFs > 100 pages the chunks are processed **sequentially** (not in parallel despite the comment on line 109 saying "process in parallel"), which could exceed 60s for large documents. |

### Edge Case Test Results

| Edge Case | Result | Notes |
|-----------|--------|-------|
| Password-protected PDF | FAIL | No specific detection. `pdf-parse` will throw a generic error, caught by the catch-all on line 181. The user sees "KI-Extraktion fehlgeschlagen" instead of the spec-required message "PDF ist passwortgeschuetzt. Bitte entsperrtes PDF hochladen." See BUG-1. |
| Scanned-image PDF (no text) | FAIL | No detection for image-only PDFs. When sent as base64 document to Claude (<=100 pages path), Claude may still attempt OCR-like extraction. The text-chunking path (>100 pages) would produce empty text, but the base64 document path has no empty-text check. The spec-required message "PDF enthaelt keinen lesbaren Text" is never shown. See BUG-2. |
| PDF is not an LV | PASS | If Claude returns zero positions, the API returns 422 with "KI konnte keine Positionen erkennen." message. |
| Connection abort during extraction | PASS | Network errors are caught by the catch block and "Verbindungsfehler. Bitte erneut versuchen." is shown. Retry button resets to idle state. |
| Very large LV (500+ positions) | FAIL (partial) | Chunking logic exists but chunks are processed sequentially, not in parallel. No real progress indicator -- the spinner is static with no percentage or chunk progress. See BUG-3. |
| Duplicate upload of same file | PASS | No deduplication (acceptable per spec: "kein automatisches Deduplizieren in MVP"). |

---

### Bugs Found

#### BUG-1: Password-protected PDF not detected with specific error message
- **Severity:** Medium
- **Priority:** P2
- **Location:** `src/app/api/extract/route.ts`, line 75-187
- **Steps to reproduce:** Upload a password-protected PDF file.
- **Expected:** Error message "PDF ist passwortgeschuetzt. Bitte entsperrtes PDF hochladen."
- **Actual:** Generic error "KI-Extraktion fehlgeschlagen. Bitte erneut versuchen." because the `pdf-parse` error is caught by the generic catch block with no password-detection logic.
- **Fix suggestion:** Catch the specific `pdf-parse` error for encrypted PDFs (typically includes "encrypted" or "password" in the error message) and return a 400 with the spec-required message.

#### BUG-2: Scanned/image-only PDF not detected with specific error message
- **Severity:** Medium
- **Priority:** P2
- **Location:** `src/app/api/extract/route.ts`
- **Steps to reproduce:** Upload a scanned PDF that contains only images (no selectable text).
- **Expected:** Error message "PDF enthaelt keinen lesbaren Text. Bitte eine durchsuchbare PDF hochladen."
- **Actual:** For PDFs <= 100 pages (the common path), the PDF is sent as a base64 document directly to Claude, bypassing any text-content check. Claude may attempt to read the image and return empty or garbled results. The "no positions found" 422 error may or may not trigger.
- **Fix suggestion:** After `pdfParse(buffer, { max: 1 })`, check `pdfMeta.text.trim().length`. If essentially empty, return the spec-required error before calling Claude.

#### BUG-3: No real progress indication for large PDFs
- **Severity:** Low
- **Priority:** P3
- **Location:** `src/components/extraction-progress.tsx`, `src/app/upload/page.tsx`
- **Steps to reproduce:** Upload a very large LV PDF (500+ positions, >100 pages).
- **Expected:** Progress indicator showing extraction progress (e.g., "Chunk 3/7 verarbeitet").
- **Actual:** Static spinner with fixed text "KI liest Leistungsverzeichnis aus..." No chunk-level progress is communicated to the client because the API call is a single POST with no streaming/SSE.
- **Fix suggestion:** Implement Server-Sent Events or a polling mechanism to report chunk progress to the frontend.

#### BUG-4: Sequential chunk processing despite "parallel" comment
- **Severity:** Low
- **Priority:** P3
- **Location:** `src/app/api/extract/route.ts`, lines 138-142
- **Steps to reproduce:** Upload a PDF with >100 pages that triggers the chunking path.
- **Expected:** Chunks processed in parallel for speed (as the comment on line 109 states: "process in parallel").
- **Actual:** Chunks are processed in a sequential `for` loop (`for (let idx = 0; idx < chunks.length; idx++)`), one at a time. This could cause extraction to exceed the 60-second target for large documents.
- **Fix suggestion:** Use `Promise.all()` or `Promise.allSettled()` with rate limiting to process chunks concurrently.

#### BUG-5: Model mismatch between spec and implementation
- **Severity:** Low (informational)
- **Status:** RESOLVED — spec updated. `CLAUDE.md` mandates `claude-haiku-4-5-20251001` for cost reasons; this is intentional.
- **Resolution:** Updated Technical Requirements below to reflect `claude-haiku-4-5-20251001`.

#### BUG-6: Debug console.log statements left in production code
- **Severity:** Low
- **Priority:** P3
- **Location:** `src/app/api/extract/route.ts`, lines 129-135, 140
- **Steps to reproduce:** Upload a PDF with >100 pages and check server logs.
- **Actual:** Multiple `console.log` calls dump full PDF text (first 500 chars) and chunk contents (first 300 chars each) to the server log. This leaks potentially sensitive document content into logs.
- **Fix suggestion:** Remove or gate behind a `DEBUG` environment variable.

#### BUG-7: JSON parsing of Claude response is fragile
- **Severity:** Medium
- **Priority:** P2
- **Location:** `src/app/api/extract/route.ts`, lines 104-107
- **Steps to reproduce:** If Claude returns malformed JSON or wraps the array in markdown code fences with extra text.
- **Expected:** Robust parsing with fallback.
- **Actual:** The regex `/\[[\s\S]*\]/` is greedy and will match from the first `[` to the last `]` in the response. If Claude includes explanation text with brackets after the JSON, the parse will fail silently and `allRaw` stays empty, returning a 422 error. The `<=100 pages` path (line 106) has no try/catch around `JSON.parse` -- an exception here would be caught by the outer catch and return a generic 500 error instead of a meaningful message.
- **Fix suggestion:** Wrap line 106 in try/catch like the `extractChunk` function does. Consider using a non-greedy regex or requesting JSON mode from the Claude API.

---

### Security Audit (Red-Team)

#### SEC-1: No authentication on /api/extract endpoint -- CRITICAL
- **Severity:** Critical
- **Priority:** P0
- **Location:** `src/app/api/extract/route.ts`
- **Description:** The `/api/extract` endpoint has no authentication or authorization check. Anyone with the URL can POST PDFs and consume the Anthropic API quota. This is a direct API cost attack vector. An attacker could script thousands of requests to drain the API budget.
- **Mitigation:** Add authentication (even a simple API key or session check) before processing. At minimum, implement rate limiting per IP.
- **Note:** Per `.claude/rules/security.md`: "Always verify authentication before processing API requests." This rule is violated.

#### SEC-2: No rate limiting on upload/extract endpoint -- HIGH
- **Severity:** High
- **Priority:** P1
- **Location:** `src/app/api/extract/route.ts`
- **Description:** No rate limiting exists. An attacker can flood the endpoint with 20 MB PDFs, causing: (a) Anthropic API cost exhaustion, (b) server memory exhaustion (each request buffers up to 20 MB), (c) denial of service for legitimate users.
- **Mitigation:** Implement rate limiting (e.g., 5 requests per minute per IP). Consider using Next.js middleware or an edge-based rate limiter.

#### SEC-3: No ANTHROPIC_API_KEY validation at startup -- MEDIUM
- **Severity:** Medium
- **Priority:** P2
- **Location:** `src/app/api/extract/route.ts`, line 6
- **Description:** `new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })` does not validate that the key exists. If `ANTHROPIC_API_KEY` is unset, the first request will fail with an opaque SDK error rather than a clear startup message.
- **Mitigation:** Add a guard: `if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')`.

#### SEC-4: ANTHROPIC_API_KEY not documented in .env.local.example -- MEDIUM
- **Severity:** Medium
- **Priority:** P2
- **Location:** `.env.local.example`
- **Description:** The file contains only Supabase vars. `ANTHROPIC_API_KEY` is not listed, violating the security rule: "Document all required env vars in `.env.local.example` with dummy values."
- **Mitigation:** Add `ANTHROPIC_API_KEY=sk-ant-your-key-here` to `.env.local.example`.

#### SEC-5: No security headers configured -- MEDIUM
- **Severity:** Medium
- **Priority:** P2
- **Location:** `next.config.ts`
- **Description:** `next.config.ts` is empty. Per `.claude/rules/security.md`, the following headers are required: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: origin-when-cross-origin`, `Strict-Transport-Security`. None are set.
- **Mitigation:** Add a `headers()` function to `next.config.ts` with the required security headers.

#### SEC-6: No input validation with Zod on server side -- MEDIUM
- **Severity:** Medium
- **Priority:** P2
- **Location:** `src/app/api/extract/route.ts`
- **Description:** Per `.claude/rules/security.md` and `.claude/rules/backend.md`: "Validate all inputs using Zod schemas before processing." The extract route uses manual `if` checks for file type and size but does not use Zod schemas. The Claude API response is also not validated with Zod before being sent to the client -- a malformed AI response could include unexpected fields or types.
- **Mitigation:** Define a Zod schema for the expected `RawPosition[]` structure and validate the parsed JSON against it before returning to the client.

#### SEC-7: Sensitive document content leaked to server logs -- MEDIUM
- **Severity:** Medium
- **Priority:** P2
- **Location:** `src/app/api/extract/route.ts`, lines 129-135
- **Description:** The chunking path logs the first 500 characters of the full PDF text and the first 300 characters of each chunk. In production, this means sensitive construction documents are written to server logs, which may be accessible to hosting platform staff or log aggregation services.
- **Mitigation:** Remove `console.log` statements or use a proper logging framework with log level controls.

#### SEC-8: ID generation uses Date.now() -- predictable IDs -- LOW
- **Severity:** Low
- **Priority:** P3
- **Location:** `src/app/api/extract/route.ts`, line 171
- **Description:** Position IDs are generated with `String(Date.now() + i)`. These are predictable and sequential. While this is acceptable for an in-memory MVP with no persistence, it would become a vulnerability if IDs are later used for authorization decisions.
- **Mitigation:** Use `crypto.randomUUID()` for ID generation.

#### SEC-9: No Content-Security-Policy header -- LOW
- **Severity:** Low
- **Priority:** P3
- **Description:** No CSP header is configured, leaving the app vulnerable to XSS if any user-controlled content is rendered unsafely. Currently, extracted text from PDFs is rendered in table cells, which React escapes by default. Risk is low but defense-in-depth is missing.

#### SEC-10: PDF file not explicitly discarded after processing -- LOW
- **Severity:** Low
- **Priority:** P3
- **Location:** `src/app/api/extract/route.ts`
- **Description:** The spec requires "Keine persistente Speicherung der PDF-Datei nach Extraktion." The PDF buffer is held in memory during processing and should be garbage collected after the request ends, but there is no explicit nullification of the buffer variable. In Node.js this is normally fine, but if the runtime keeps the closure alive (e.g., in a serverless cold start scenario), the buffer may persist longer than expected.
- **Mitigation:** Informational only. Consider explicitly setting `buffer = null` after use if deploying to long-lived server processes.

---

### Regression Check (features/INDEX.md)

| Feature | Regression Risk | Notes |
|---------|----------------|-------|
| PROJ-2 (LV-Positionen) | None detected | Upload populates same LVContext consumed by PROJ-2. |
| PROJ-3 (Preiseingabe) | None detected | Depends on `einheitspreis` field which is initialized to 0 in extract route. |
| PROJ-4 (PDF Export) | None detected | Reads from LVContext, no coupling to upload flow. |

---

### Summary

- **Acceptance Criteria:** 6/8 PASS, 1 PARTIAL, 1 implicitly PASS (performance not testable offline)
- **Edge Cases:** 3/6 FAIL (password-protected PDF, scanned PDF, progress for large PDFs)
- **Bugs Found:** 7 (0 critical, 2 medium-high, 2 medium, 3 low)
- **Security Issues:** 10 (1 critical, 1 high, 5 medium, 3 low)
- **Recommendation:** Do NOT deploy until SEC-1 (no auth) and SEC-2 (no rate limiting) are addressed. BUG-1 and BUG-2 (edge case error messages) should be fixed before moving to "In Review" status.

## Deployment
**Deployed:** 2026-03-31
**Platform:** Vercel
**Branch:** main
**Commit:** 1122892
**Notes:** EXTRACT_API_KEY deaktiviert (NEXT_PUBLIC_ Build-time Issue); Rate Limiting (5 req/min) aktiv. Auth folgt mit PROJ-6.
