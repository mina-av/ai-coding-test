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
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
