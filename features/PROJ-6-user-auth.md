# PROJ-6: User Auth & Teamzugang

## Status: Planned
**Created:** 2026-03-25
**Last Updated:** 2026-04-01

## Dependencies
- Requires: PROJ-5 (Projektverwaltung) — localStorage-Daten werden zu Supabase migriert

## Scope-Entscheidungen
- **Persistenz:** localStorage wird komplett durch Supabase ersetzt (Projekte sind dann nutzerspezifisch und geräteübergreifend)
- **Rollen:** 2 Rollen — Kalkulator (eigene Projekte) und Teamleiter (alle Projekte read-only)
- **Registrierung:** Nur per Einladungs-E-Mail, kein offenes Signup
- **Teamleiter:** Read-only Zugriff, keine Bearbeitungsrechte auf fremde Projekte

## User Stories

### Kalkulator
- Als Kalkulator möchte ich mich mit E-Mail und Passwort einloggen, damit nur autorisierte Teammitglieder Zugang haben.
- Als Kalkulator möchte ich nach dem Login automatisch auf meine Projektliste weitergeleitet werden.
- Als Kalkulator möchte ich mich ausloggen können, damit meine Daten nach der Sitzung geschützt sind.
- Als Kalkulator möchte ich mein Passwort per E-Mail zurücksetzen können, wenn ich es vergessen habe.
- Als Kalkulator möchte ich nur meine eigenen Projekte sehen, damit die Daten anderer Kollegen nicht sichtbar sind.

### Teamleiter
- Als Teamleiter möchte ich alle Projekte meines Teams sehen (read-only), damit ich Angebotsstatus und Fortschritt verfolgen kann.
- Als Teamleiter möchte ich erkennen können, welcher Kalkulator ein Projekt erstellt hat.

### Einladungsflow
- Als Teamleiter möchte ich neue Teammitglieder per E-Mail einladen, damit ich den Zugang zentral verwalte.
- Als eingeladener Nutzer möchte ich per Einladungslink ein Passwort setzen und sofort loslegen können.

## Acceptance Criteria

### Auth
- [ ] Login-Seite unter `/login` mit E-Mail und Passwort Feldern
- [ ] Nicht eingeloggte Nutzer werden von allen Seiten auf `/login` weitergeleitet
- [ ] Nach erfolgreichem Login: Weiterleitung auf `/` (Projektliste)
- [ ] Logout-Button im Header auf allen Seiten nach dem Login
- [ ] Nach Logout: Weiterleitung auf `/login`, Session vollständig beendet
- [ ] Passwort-Reset: Nutzer gibt E-Mail ein, bekommt Reset-Link per E-Mail

### Einladungsflow
- [ ] Kein offenes Signup — `/login` hat keinen "Registrieren"-Link
- [ ] Teamleiter kann über eine Verwaltungsseite (`/team`) neue Nutzer per E-Mail einladen
- [ ] Eingeladener Nutzer erhält E-Mail mit Link zum Passwort setzen
- [ ] Nach Passwort-Setzen ist der Nutzer direkt eingeloggt

### Rollen & Datenzugriff
- [ ] Kalkulator sieht auf `/` nur seine eigenen Projekte
- [ ] Teamleiter sieht auf `/` alle Projekte des Teams mit Ersteller-Info
- [ ] Teamleiter kann ein Projekt öffnen (Positionen & Kalkulation ansehen), aber nicht bearbeiten
- [ ] Bearbeiten-Aktionen (Hinzufügen, Löschen, Preise ändern) sind für Teamleiter deaktiviert/ausgeblendet
- [ ] Row Level Security (RLS) in Supabase — kein Datenzugriff ohne korrekte Session

### Datenmigration (localStorage → Supabase)
- [ ] Beim ersten Login nach PROJ-6-Deploy: bestehende localStorage-Daten werden automatisch in Supabase migriert
- [ ] Nach erfolgreicher Migration wird localStorage geleert
- [ ] Schlägt die Migration fehl: Fehlermeldung mit Hinweis, Daten sind noch lokal vorhanden

## Edge Cases
- Nutzer vergisst Passwort → Passwort-Reset per E-Mail; bei ungültiger E-Mail wird trotzdem "E-Mail verschickt" angezeigt (kein User Enumeration)
- Einladungslink abgelaufen → Hinweisseite mit Option, neuen Link anzufordern
- Session abgelaufen während aktiver Nutzung → automatische Weiterleitung zu `/login`, nach Re-Login zurück zur vorherigen Seite
- Teamleiter versucht, Bearbeiten-URL eines anderen Nutzers direkt aufzurufen → Daten werden geladen, aber alle Mutationen sind gesperrt (RLS + UI)
- Kalkulator versucht, `/team` (Nutzerverwaltung) aufzurufen → 403 / Weiterleitung zu `/`
- Nutzer hat localStorage-Daten aus PROJ-5 → automatische Migration beim ersten Login
- Migration schlägt fehl (z.B. Netzwerkfehler) → Fehler anzeigen, localStorage-Daten bleiben erhalten

## Technical Requirements
- Supabase Auth (E-Mail/Passwort + Magic Link für Einladungen)
- Supabase-Tabellen: `profiles` (id, email, role, team_id), `projekte` (id, name, status, owner_id, team_id, created_at, updated_at), `positionen` (id, projekt_id, …)
- RLS Policies: Kalkulator liest/schreibt nur eigene Zeilen; Teamleiter liest alle Zeilen des eigenen Teams
- Next.js Middleware für Session-Check auf allen geschützten Routen
- Migration: beim Login localStorage auslesen, per API in Supabase schreiben, danach localStorage löschen

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

**Designed:** 2026-04-01

### Neue & geänderte Seiten

```
Neue Seiten:
/login                     → E-Mail + Passwort Login
/login/reset               → Passwort vergessen (E-Mail eingeben)
/login/reset/confirm       → Passwort setzen (aus E-Mail-Link)
/team                      → Nutzerverwaltung (nur Teamleiter)

Geänderte Seiten:
/ (Projektliste)           → Kalkulator: nur eigene; Teamleiter: alle + Ersteller-Info
/positionen                → Teamleiter: alle Buttons deaktiviert (read-only)
/kalkulation               → Teamleiter: keine Preiseingabe möglich

Neue Komponenten:
src/components/app-header.tsx       → gemeinsamer Header mit Logout + Nutzer-Info
src/components/migration-banner.tsx → einmalige Migration localStorage → Supabase
middleware.ts (Projektroot)         → schützt alle Seiten außer /login/*
```

### Datenmodell (Supabase-Tabellen)

```
teams
  id, name, created_at

profiles (ein Eintrag pro Nutzer)
  id          → Supabase Auth User ID
  email
  rolle       → "kalkulator" | "teamleiter"
  team_id     → Zugehörigkeit zum Team
  created_at

projekte (ersetzt localStorage)
  id, name, status
  owner_id    → welcher Kalkulator hat erstellt
  team_id     → Teamzugehörigkeit
  created_at, updated_at

positionen (eigene Tabelle, war Teil von projekte in localStorage)
  id, projekt_id
  positionsnummer, kurzbeschreibung, langbeschreibung
  menge, einheit, einheitspreis
  bki_vorschlag, bki_konfidenz, bki_positionsnummer, bki_beschreibung
  sort_order

Row Level Security:
  projekte:   Kalkulator CRUD (owner_id = auth.uid())
              Teamleiter SELECT (team_id = eigenes Team)
  positionen: folgt projekte-Muster
  profiles:   Nutzer liest eigenes Profil; Teamleiter liest alle im Team
```

### Technische Entscheidungen

| Entscheidung | Wahl | Begründung |
|---|---|---|
| Auth | Supabase Auth | bereits vorbereitet in `src/lib/supabase.ts`, E-Mail/Passwort + Magic Link out-of-the-box |
| Routing-Schutz | Next.js Middleware | serverseitiger Session-Check vor dem Laden der Seite |
| Einladungsflow | Supabase Admin API `inviteUserByEmail()` | kein eigenes E-Mail-System nötig |
| Rollen | `profiles.rolle`-Feld, per RLS durchgesetzt | einfach, erweiterbar |
| Migration | einmaliger Schritt beim ersten Login | localStorage → Supabase, danach localStorage löschen |
| Positionen | eigene `positionen`-Tabelle | sauberere Trennung, bessere RLS-Granularität |

### Neue Pakete

| Paket | Zweck |
|---|---|
| `@supabase/supabase-js` | Supabase Client |
| `@supabase/ssr` | Session-Handling für Next.js App Router + Middleware |

### Migrationsablauf

```
Beim ersten Login nach PROJ-6-Deploy:
  1. localStorage auf Daten prüfen
  2. Falls vorhanden: Migrations-Banner anzeigen
  3. Daten in Supabase-Tabellen schreiben
  4. localStorage leeren
  5. Projektliste aus Supabase laden

Bei Fehler:
  → Fehlermeldung, localStorage-Daten bleiben erhalten
  → Nutzer kann Migration erneut starten
```

## QA Test Results

**QA Engineer:** Claude Code (claude-sonnet-4-6)
**Date:** 2026-04-01
**Method:** Static code analysis + red-team security audit of all relevant source files

---

### Acceptance Criteria Results

#### Auth

- [x] **Login-Seite unter `/login` mit E-Mail und Passwort Feldern**
  PASS — `src/app/login/page.tsx` renders email (`type="email"`) and password (`type="password"`) inputs with correct labels, autocomplete attributes, and form submission via Supabase `signInWithPassword`.

- [x] **Nicht eingeloggte Nutzer werden von allen Seiten auf `/login` weitergeleitet**
  PASS — `middleware.ts` calls `supabase.auth.getUser()` server-side and redirects unauthenticated requests to `/login`. Matcher covers all routes except `_next/static`, images, and `favicon.ico`.
  NOTE: See BUG-1 — all `/api/*` routes are publicly accessible (intentionally excluded, but this includes `/api/team/invite`).

- [x] **Nach erfolgreichem Login: Weiterleitung auf `/`**
  PASS — `login/page.tsx` line 29: `window.location.href = '/'` after verifying `data.session` exists.

- [x] **Logout-Button im Header auf allen Seiten nach dem Login**
  PASS — `AppHeader` component is included in `/`, `/positionen`, `/kalkulation`, and `/team` pages. Button calls `supabase.auth.signOut()`.

- [ ] **Nach Logout: Weiterleitung auf `/login`, Session vollständig beendet**
  FAIL — `app-header.tsx` line 31 uses `router.push('/login')` (Next.js client-side navigation) instead of `window.location.href = '/login'`. After `signOut()`, the client-side router push does NOT guarantee a hard redirect that clears all in-memory state. The session cookie is cleared by Supabase, but the Next.js router cache may still hold protected page data momentarily. See BUG-2.

- [x] **Passwort-Reset: Nutzer gibt E-Mail ein, bekommt Reset-Link per E-Mail**
  PASS — `login/reset/page.tsx` calls `supabase.auth.resetPasswordForEmail()` with `redirectTo` pointing to `/login/reset/confirm`. Always shows success message (correct anti-enumeration behavior per edge case spec).

#### Einladungsflow

- [x] **Kein offenes Signup — `/login` hat keinen "Registrieren"-Link**
  PASS — `login/page.tsx` only contains a "Passwort vergessen?" link. No registration link present.

- [ ] **Teamleiter kann über eine Verwaltungsseite (`/team`) neue Nutzer per E-Mail einladen**
  PARTIAL FAIL — The `/team` page (`src/app/team/page.tsx`) exists and correctly shows the invite form only to users with `rolle === 'teamleiter'`. However, the `/team` page has NO route protection: the middleware does NOT restrict `/team` to Teamleiter only. A Kalkulator can navigate directly to `/team` and see the page (though the invite form is hidden in the UI). See BUG-3.

- [x] **Eingeladener Nutzer erhält E-Mail mit Link zum Passwort setzen**
  PASS — `api/team/invite/route.ts` calls `adminClient.auth.admin.inviteUserByEmail()` with `redirectTo: .../login/reset/confirm`.

- [ ] **Nach Passwort-Setzen ist der Nutzer direkt eingeloggt**
  PARTIAL FAIL — `login/reset/confirm/page.tsx` calls `supabase.auth.updateUser({ password })` and then redirects to `/`. However, `updateUser` only works if there is an active session from the invite link. If the confirm page is accessed without a valid recovery token in the URL fragment (i.e., the page is visited without the magic-link token), the user will see no error and the form will appear — but `updateUser` will fail with an auth error. There is no handling for the case where the page is loaded without a valid token (no token detection, no redirect to /login). See BUG-4.

#### Rollen & Datenzugriff

- [ ] **Kalkulator sieht auf `/` nur seine eigenen Projekte**
  PARTIAL FAIL — `src/app/page.tsx` uses `useProjekte()` from `src/contexts/projekte-context.tsx` which still uses localStorage as the data source (not Supabase). The page heading says "Meine Projekte" but no owner-based filtering is applied at the data layer since projects are not yet fetched from Supabase. See BUG-5.

- [ ] **Teamleiter sieht auf `/` alle Projekte des Teams mit Ersteller-Info**
  FAIL — The home page (`src/app/page.tsx`) does NOT differentiate rendering based on `rolle`. Both Kalkulator and Teamleiter see the exact same UI: "Meine Projekte" heading, no creator info shown, and no role-aware data fetching from Supabase. See BUG-5.

- [x] **Teamleiter kann ein Projekt öffnen (Positionen & Kalkulation ansehen), aber nicht bearbeiten**
  PASS — `positionen/page.tsx` and `kalkulation/page.tsx` both derive `readOnly = rolle === 'teamleiter'` and pass it to child components. `PositionRow` and `KalkulationsRow` both implement the `readOnly` prop correctly.

- [x] **Bearbeiten-Aktionen (Hinzufügen, Löschen, Preise ändern) sind für Teamleiter deaktiviert/ausgeblendet**
  PASS — In `positionen/page.tsx`: "Position hinzufügen" button and "LV hochladen" button are hidden behind `!readOnly`. In `kalkulations-row.tsx`: price input is `readOnly={readOnly}` and insert/delete action buttons are hidden behind `!readOnly`. In `kalkulation/page.tsx`: "Angebot exportieren" button is hidden for Teamleiter.

- [ ] **Row Level Security (RLS) in Supabase — kein Datenzugriff ohne korrekte Session**
  CANNOT VERIFY — No SQL migration files, no Supabase schema definitions, and no RLS policy files exist in the repository. RLS must be configured directly in the Supabase dashboard and is not code-reviewable here. This is a deployment risk. See BUG-6.

#### Datenmigration (localStorage → Supabase)

- [ ] **Beim ersten Login nach PROJ-6-Deploy: bestehende localStorage-Daten werden automatisch in Supabase migriert**
  FAIL — `src/components/migration-banner.tsx` line 25 contains a `// TODO: write parsed projects to Supabase via API call` comment. The actual migration logic is NOT implemented. The function reads from localStorage and then immediately simulates success by clearing it, without ever writing data to Supabase. Data is silently discarded. See BUG-7 (Critical).

- [ ] **Nach erfolgreicher Migration wird localStorage geleert**
  FAIL — localStorage IS cleared (line 28: `localStorage.removeItem('bki-projekte')`), but only after the stub "migration" that never actually writes anything to Supabase. Data is destroyed without being migrated. (Consequence of BUG-7.)

- [x] **Schlägt die Migration fehl: Fehlermeldung mit Hinweis, Daten sind noch lokal vorhanden**
  PASS (UI only) — The error state UI is correctly implemented with a retry button. However, since the actual migration is a stub, the error path can only be triggered by a `JSON.parse` failure, not by a real Supabase write failure.

---

### Security Audit

#### Auth Bypass

- **Middleware public route exclusion:** All `/api/*` routes are excluded from authentication (`pathname.startsWith('/api/')`). This means `/api/team/invite` is reachable without a valid session cookie at the middleware layer. The route handler itself does perform auth checking (line 14: `supabase.auth.getUser()`), so this is mitigated — but defense in depth would require the middleware to also protect API routes. (See BUG-1.)

- **Cookie setAll bug in middleware:** In `middleware.ts` lines 15-22, the `setAll` handler calls `cookiesToSet.forEach` and then immediately reassigns `supabaseResponse = NextResponse.next({ request })`. This means the first `forEach` sets cookies on `request.cookies` (which has no effect on the response) and the second `forEach` correctly sets them on the new `supabaseResponse`. However, this pattern means the refreshed session cookies may not be set on the *original* `supabaseResponse` reference, which can cause session refresh failures mid-session. See BUG-8.

#### Role Escalation

- **Invite API role check relies on user_metadata:** `api/team/invite/route.ts` line 20 reads `user.user_metadata` to determine if the caller is a Teamleiter. `user_metadata` in Supabase can be updated by the user themselves via `supabase.auth.updateUser({ data: { rolle: 'teamleiter' } })` from the browser. A Kalkulator can escalate their role to Teamleiter client-side and then call the invite API. See BUG-9 (Critical).

- **`/team` page accessible to Kalkulator:** The middleware does not restrict `/team` to Teamleiter. A Kalkulator can visit the page. While the UI hides the invite form, there is no server-side enforcement of this page-level restriction. (See BUG-3.)

#### IDOR (Insecure Direct Object Reference)

- **Projektverwaltung context uses localStorage, not Supabase:** Because `projekte-context.tsx` reads from localStorage (not user-scoped Supabase data), a Kalkulator cannot directly access another user's project data via URL manipulation — because there is no server-side project data to access yet. However, this also means the data isolation spec requirement is not implemented (Kalkulator sees all locally stored projects, not just their own). The IDOR risk will exist once Supabase data is properly integrated and must be enforced via RLS.

- **No `/api/` auth bypass risk for existing non-invite API routes:** `/api/extract` and `/api/bki/match` do not operate on user-specific data, so they are not IDOR vectors.

#### Input Validation on Invite API

- PASS — `api/team/invite/route.ts` uses Zod schema `InviteSchema` (lines 6-9) to validate `email` (must be valid email format) and `rolle` (must be `'kalkulator'` or `'teamleiter'`). Invalid input returns 400.

#### Service Role Key Exposure

- PASS — `SUPABASE_SERVICE_ROLE_KEY` is used as `process.env.SUPABASE_SERVICE_ROLE_KEY` (no `NEXT_PUBLIC_` prefix), so it is NOT exposed to the browser bundle. It is only used server-side in the API route.

#### User Enumeration in Password Reset

- PASS — `login/reset/page.tsx` always sets `submitted = true` regardless of whether the email exists in Supabase (the `await supabase.auth.resetPasswordForEmail()` result is not checked). Both valid and invalid emails display the same success message. This correctly prevents user enumeration.

---

### Bug Report

### BUG-1: All API Routes Bypass Middleware Authentication
- **Severity:** High
- **Steps to Reproduce:** Send a POST request to `/api/team/invite` without any authentication cookie. The middleware will not redirect the request.
- **Expected:** Middleware should protect API routes from unauthenticated requests as a first line of defense.
- **Actual:** `middleware.ts` line 35: `pathname.startsWith('/api/')` is treated as a public route. The API route handler catches this with its own auth check (returning 401), but there is no middleware-level protection, violating defense-in-depth.
- **Priority:** Fix before deploy

---

### BUG-2: Logout Uses Client-Side Navigation Instead of Hard Redirect
- **Severity:** Medium
- **Steps to Reproduce:** 1. Log in. 2. Click "Abmelden". 3. Observe that `router.push('/login')` is called (Next.js client navigation). 4. Press browser Back button — the protected page may still be rendered from the router cache.
- **Expected:** After logout, `window.location.href = '/login'` should be used to force a full page reload, invalidating the router cache and ensuring no cached protected content is visible.
- **Actual:** `app-header.tsx` line 31 uses `router.push('/login')`, which preserves the Next.js client router cache. Per the project's own frontend rules (`frontend.md`): "Use `window.location.href` for post-login redirect."
- **Priority:** Fix before deploy

---

### BUG-3: `/team` Page Not Protected by Role — Kalkulator Can Access It
- **Severity:** Medium
- **Steps to Reproduce:** 1. Log in as Kalkulator. 2. Navigate directly to `/team`. 3. The page loads and shows the "Angemeldet als" profile card and a hint about invitations being Teamleiter-only.
- **Expected:** Kalkulator should be redirected to `/` (or shown a 403) when accessing `/team`, as stated in Edge Cases: "Kalkulator versucht, `/team` aufzurufen → 403 / Weiterleitung zu `/`."
- **Actual:** No server-side or middleware-level restriction exists for `/team`. The route protection is UI-only (the invite form is hidden via `rolle === 'teamleiter'` condition in JSX), but the page itself is accessible.
- **Priority:** Fix before deploy

---

### BUG-4: Password Confirm Page Has No Token Validation on Load
- **Severity:** Medium
- **Steps to Reproduce:** 1. Navigate directly to `/login/reset/confirm` without a valid recovery token in the URL fragment. 2. The "Neues Passwort setzen" form renders with no error. 3. Enter any password and submit. 4. `supabase.auth.updateUser()` will fail with an error (no active session), and the error is shown — but only after form submission.
- **Expected:** On page load, the component should check for the presence of a valid session/recovery token (e.g., listen to `supabase.auth.onAuthStateChange` for `PASSWORD_RECOVERY` event). If no token, redirect to `/login/reset` with an explanatory message.
- **Actual:** The confirm page renders unconditionally with no token/session check. The invited user or password-reset user only discovers the link has expired AFTER filling out and submitting the form.
- **Priority:** Fix before deploy

---

### BUG-5: Home Page Does Not Implement Role-Based Data Separation
- **Severity:** High
- **Steps to Reproduce:** 1. Log in as Teamleiter. 2. Navigate to `/`. 3. The heading reads "Meine Projekte" and no creator info is shown. 4. The page shows the same view as a Kalkulator.
- **Expected:** Teamleiter should see all team projects with creator info (creator's email/name). Kalkulator should see only their own projects. Both should be sourced from Supabase, not localStorage.
- **Actual:** `src/app/page.tsx` uses `useProjekte()` context which reads from localStorage. There is no role-aware rendering: no "Ersteller" column, no team-wide project listing for Teamleiter. The heading is hardcoded as "Meine Projekte" for all roles.
- **Priority:** Fix before deploy

---

### BUG-6: No RLS Policies Are Defined or Verifiable in the Codebase
- **Severity:** High
- **Steps to Reproduce:** Search the repository for SQL migration files, Supabase schema files, or RLS policy definitions — none exist.
- **Expected:** RLS policies for `projekte`, `positionen`, and `profiles` tables should be defined in migration files (e.g., `supabase/migrations/`) and checked into source control so they can be reviewed, tested, and deployed reliably.
- **Actual:** No SQL schema or migration files exist in the repository. RLS configuration is entirely out-of-band and cannot be verified, tested, or reproduced from source control. If the Supabase project is reset or recreated, all RLS would be lost.
- **Priority:** Fix before deploy

---

### BUG-7: Migration Stub Destroys Local Data Without Migrating to Supabase
- **Severity:** Critical
- **Steps to Reproduce:** 1. Have `bki-projekte` data in localStorage from PROJ-5. 2. Log in and see the MigrationBanner. 3. Click "Migrieren". 4. localStorage is cleared. 5. No data was written to Supabase. All projects are permanently lost.
- **Expected:** `handleMigrate()` should POST the localStorage projects to an API endpoint that writes them to Supabase before clearing localStorage. On API failure, localStorage should be retained and an error shown.
- **Actual:** `migration-banner.tsx` line 25 is a TODO comment: `// TODO: write parsed projects to Supabase via API call`. The function immediately clears localStorage without any Supabase write. This is a data-loss bug that will silently destroy real user data.
- **Priority:** Fix before deploy

---

### BUG-8: Middleware Cookie `setAll` Handler May Fail to Persist Refreshed Sessions
- **Severity:** Medium
- **Steps to Reproduce:** 1. Log in with a session close to expiry. 2. Make a page request that triggers Supabase to refresh the session token. 3. The refreshed token cookies may not be set on the response, causing the session to appear expired on the next request.
- **Expected:** Per Supabase SSR docs, the `setAll` handler must set cookies on both `request` AND the final `supabaseResponse` object (which must be the same object returned). The current pattern creates a new `NextResponse.next()` inside `setAll`, which loses the reference to the original `supabaseResponse` used downstream.
- **Actual:** `middleware.ts` lines 16-22: `supabaseResponse` is reassigned inside `setAll` to a new `NextResponse.next({ request })`. If there are multiple `setAll` calls, each creates a fresh response. The returned `supabaseResponse` at line 43 is the last-assigned one — but intermediate cookie sets may be lost if the pattern is relied upon across calls.
- **Priority:** Fix before deploy

---

### BUG-9: Role Escalation — Kalkulator Can Self-Elevate to Teamleiter via `user_metadata`
- **Severity:** Critical
- **Steps to Reproduce:**
  1. Log in as a Kalkulator.
  2. In the browser console, execute:
     ```js
     const { createBrowserClient } = await import('https://esm.sh/@supabase/ssr')
     // or use the already-loaded supabase client
     await supabase.auth.updateUser({ data: { rolle: 'teamleiter' } })
     ```
  3. Now call `POST /api/team/invite` with a valid JSON body — the server reads `user.user_metadata.rolle` which now returns `'teamleiter'` and the invite is sent.
- **Expected:** Role (`rolle`) must be stored in the `profiles` table in the database (server-controlled), not in `user_metadata` (user-writable). The invite API must query `profiles.rolle` from the database to determine authorization.
- **Actual:** `api/team/invite/route.ts` line 20: `const meta = user.user_metadata as { rolle?: string }` — `user_metadata` is directly writable by any authenticated user via the Supabase client SDK. `use-user.ts` also reads role exclusively from `user_metadata`. Any Kalkulator can self-assign the Teamleiter role and bypass the invite-only access control.
- **Priority:** Fix before deploy

---

### BUG-10: `unused import` — `useRouter` Imported but Not Used in `login/reset/confirm/page.tsx`
- **Severity:** Low
- **Steps to Reproduce:** Read `src/app/login/reset/confirm/page.tsx` line 4: `import { useRouter } from 'next/navigation'` — `useRouter` is declared at line 14 (`const router = useRouter()`) but `router` is never used anywhere in the component.
- **Expected:** Dead code should be removed to keep the codebase clean and avoid lint warnings.
- **Actual:** `router` is initialized but never called, likely a leftover from an earlier implementation attempt.
- **Priority:** Fix after deploy

---

### Summary

| Category | Pass | Fail | Partial |
|---|---|---|---|
| Auth | 4 | 1 | 0 |
| Einladungsflow | 2 | 1 | 1 |
| Rollen & Datenzugriff | 2 | 2 | 1 |
| Datenmigration | 1 | 2 | 0 |
| **Total** | **9** | **6** | **2** |

| Severity | Count |
|---|---|
| Critical | 2 (BUG-7, BUG-9) |
| High | 3 (BUG-1, BUG-5, BUG-6) |
| Medium | 4 (BUG-2, BUG-3, BUG-4, BUG-8) |
| Low | 1 (BUG-10) |

**Blockers before deploy:** BUG-7 (data loss), BUG-9 (role escalation), BUG-5 (feature incomplete), BUG-6 (RLS unverifiable), BUG-1, BUG-2, BUG-3, BUG-4, BUG-8.

## Deployment
_To be added by /deploy_
