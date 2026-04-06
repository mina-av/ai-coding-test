# PROJ-8: Supabase-Migration

## Status: Planned
**Created:** 2026-04-06
**Last Updated:** 2026-04-06

## Dependencies
- Requires: PROJ-6 (User Auth & Teamzugang) — Supabase Auth muss aktiv sein

## User Stories
- Als Kalkulator möchte ich meine Projekte geräteübergreifend abrufen können, damit ich nicht auf einen Browser angewiesen bin.
- Als Kalkulator möchte ich, dass neue Projekte automatisch in der Cloud gespeichert werden, ohne etwas tun zu müssen.
- Als Nutzer mit bestehenden lokalen Daten möchte ich meine Projekte einmalig migrieren können, damit ich nichts verliere.
- Als Teamleiter möchte ich alle Projekte des Teams sehen können, ohne dass jemand Daten exportieren muss.
- Als Nutzer möchte ich, dass ein fehlgeschlagener Schreibvorgang meine lokalen Daten nicht zerstört.

## Acceptance Criteria

### Datenbankschema
- [ ] Tabelle `projekte`: id (uuid PK), name (text), status (text), created_at (timestamptz), updated_at (timestamptz)
- [ ] Tabelle `positionen`: id (uuid PK), projekt_id (uuid FK → projekte.id CASCADE DELETE), positionsnummer (text), kurzbeschreibung (text), langbeschreibung (text), menge (text), einheit (text), einheitspreis (numeric), bki_vorschlag (numeric), bki_preise (jsonb), bki_konfidenz (text), bki_positionsnummer (text), bki_beschreibung (text), sort_order (int)
- [ ] Tabelle `angebote`: id (uuid PK), projekt_id (uuid FK → projekte.id CASCADE DELETE), projektname (text), kundenname (text), kundenadresse (text), objektnummer (text), angebotsnummer (text), datum (date), ohne_preis (text), exported_at (timestamptz)
- [ ] RLS aktiviert auf allen Tabellen: alle authentifizierten Nutzer können alle Datensätze lesen und schreiben (kein user_id-Filter)

### ProjekteContext
- [ ] `createProject` schreibt direkt in Supabase (inkl. Positionen)
- [ ] `updateActiveProject` aktualisiert Positionen in Supabase
- [ ] `renameProject` / `deleteProject` / `setProjectStatus` operieren gegen Supabase
- [ ] `addAngebot` schreibt in die `angebote`-Tabelle
- [ ] Beim App-Start werden Projekte aus Supabase geladen (inkl. Positionen und Angebote)
- [ ] localStorage wird nicht mehr für Projektdaten verwendet

### Migration (bestehende Daten)
- [ ] `POST /api/migrate` empfängt `{ projekte }` und schreibt alle Projekte, Positionen und Angebote in Supabase
- [ ] Bei bereits existierender Projekt-ID (Duplikat) wird übersprungen (kein Fehler)
- [ ] localStorage-Eintrag `bki-projekte` wird nach erfolgreicher Migration gelöscht
- [ ] MigrationBanner erscheint nur wenn `localStorage['bki-projekte']` nicht leer ist
- [ ] Bei Migrationsfehler bleibt localStorage erhalten

### Fehlerverhalten
- [ ] Schlägt ein Supabase-Write fehl, wird ein lesbarer Fehler angezeigt (kein silent fail)
- [ ] Laden der Projekte beim Start zeigt Ladezustand

## Edge Cases
- Nutzer hat localStorage-Daten mit IDs die bereits in Supabase existieren → überspringen
- Supabase ist nicht erreichbar beim Start → Fehlermeldung, kein leerer Projektebereich
- Sehr viele Positionen (>500) in einem Projekt → Migration in Batches (Supabase max 1000 rows/insert)
- Projekt wird gelöscht während ein anderer Tab es gerade öffnet → Supabase gibt 404, graceful handling
- `angebote`-Feld fehlt in alten localStorage-Daten → leeres Array als Default

## Technical Requirements
- Alle Supabase-Schreibvorgänge server-seitig (API Route) oder über den Browser-Client mit RLS
- RLS: `auth.role() = 'authenticated'` auf allen Tabellen für SELECT/INSERT/UPDATE/DELETE
- Kein localStorage mehr für Projektdaten nach Migration (nur noch für Session-State o.ä.)
- Index auf `positionen.projekt_id` für schnelle Joins

---

## Tech Design (Solution Architect)

### Komponentenstruktur

```
App (layout.tsx) — unverändert
└── ProjekteProvider (UMBAU: localStorage → Supabase)
    ├── Lädt beim Start alle Projekte + Positionen + Angebote aus Supabase
    ├── Exponiert: loading (bool), error (string), projekte[]
    ├── Alle Schreibvorgänge direkt via Supabase Browser-Client
    └── Kein localStorage mehr

/ (Projektliste, page.tsx) — kleine Ergänzung
├── Loading-Skeleton (NEU — während Supabase-Abruf beim Start)
├── Fehleranzeige (NEU — bei Verbindungsfehler)
├── MigrationBanner (vorhanden, keine Änderung)
└── Projektliste + Karten (vorhanden, unverändert)

/api/migrate (route.ts) — IMPLEMENTIERUNG (war 503-Stub)
├── Authentifizierung prüfen
├── Projekte aus Request empfangen
├── Upsert: projekte → positionen (je Batch) → angebote (je Batch)
└── Erfolg / Fehler zurückgeben
```

### Datenfluss

| Aktion | Wo | Wie |
|---|---|---|
| App-Start | ProjekteProvider | Browser-Client lädt alle projekte + positionen + angebote per JOIN |
| Neues Projekt erstellen | ProjekteProvider | INSERT projekte, dann INSERT positionen |
| Positionen bearbeiten | ProjekteProvider | DELETE alte Positionen des Projekts, INSERT alle neuen |
| Umbenennen / Status ändern | ProjekteProvider | UPDATE projekte |
| Projekt löschen | ProjekteProvider | DELETE projekte (CASCADE löscht positionen + angebote) |
| Angebot exportieren | ProjekteProvider | INSERT angebote |
| Migration (einmalig) | /api/migrate | UPSERT projekte → positionen → angebote (Duplikate überspringen) |

### Architekturentscheidungen

**Browser-Client für alle CRUD-Operationen (keine neuen API-Routes)**
Da RLS auf "alle authentifizierten Nutzer lesen/schreiben" gesetzt wird, kann der Browser-Client direkt mit Supabase kommunizieren — ohne Umweg über eigene API-Routes. Das reduziert Komplexität und Latenz. Der Server-Client (createServerSupabaseClient) wird nur für /api/migrate verwendet.

**Positionen: Delete-then-Insert statt differenziellem Update**
Bei jeder Positionsänderung werden alle Positionen des Projekts gelöscht und neu eingefügt. Das ist einfacher als einen Diff zu berechnen, und bei typischen LV-Größen (< 500 Positionen) ausreichend performant. Ein `sort_order`-Feld erhält die Reihenfolge.

**Migration via /api/migrate mit UPSERT (on conflict do nothing)**
Der bestehende Stub wird implementiert. Bei doppelter Projekt-ID (ID bereits in Supabase) wird übersprungen — kein Fehler. Positionen und Angebote werden in Batches eingefügt (max. 500 Zeilen pro Insert).

**Kein localStorage-Fallback nach Migration**
Nach erfolgter Migration wird localStorage bereinigt. Neue Projekte gehen direkt in Supabase. Kein Dual-Write.

### Neue Felder in ProjekteContext

| Feld | Typ | Zweck |
|---|---|---|
| `loading` | boolean | Zeigt Ladezustand beim App-Start |
| `error` | string \| null | Zeigt Supabase-Verbindungsfehler |

Bestehende API (`createProject`, `updateActiveProject`, `renameProject`, `deleteProject`, `setProjectStatus`, `addAngebot`) bleibt nach außen identisch — alle Seiten (`/`, `/positionen`, `/kalkulation`) brauchen keine Änderungen außer der Loading/Error-Anzeige auf `/`.

### Supabase-Tabellen (SQL wird im Backend-Skill erstellt)

| Tabelle | Zweck | Beziehung |
|---|---|---|
| `projekte` | Projektmetadaten | — |
| `positionen` | LV-Positionen | FK → projekte.id (CASCADE DELETE) |
| `angebote` | Exportierte Angebote | FK → projekte.id (CASCADE DELETE) |

Index auf `positionen.projekt_id` und `angebote.projekt_id` für schnelle Abfragen.

### Keine neuen npm-Pakete erforderlich
Supabase JS Client ist bereits installiert (`@supabase/ssr`). Alle benötigten Clients (Browser + Server) sind bereits in `src/lib/supabase.ts` und `src/lib/supabase-server.ts` vorhanden.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
