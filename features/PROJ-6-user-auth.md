# PROJ-6: User Auth & Teamzugang

## Status: Planned
**Created:** 2026-03-25
**Last Updated:** 2026-03-25

## Dependencies
- Requires: PROJ-5 (Projektverwaltung) — Projekte müssen nutzerspezifisch gespeichert werden

## User Stories
- Als Mitarbeiter möchte ich mich mit meiner E-Mail einloggen, damit nur Teammitglieder Zugang haben.
- Als Mitarbeiter möchte ich meine eigenen Projekte sehen und bearbeiten, damit meine Daten nicht mit anderen vermischt werden.
- Als Teamleiter möchte ich Projekte anderer Teammitglieder einsehen können, damit ich den Status von Angeboten verfolgen kann.
- Als Administrator möchte ich neue Nutzer einladen, damit ich den Teamzugang verwalten kann.

## Acceptance Criteria
- [ ] Login via E-Mail + Passwort (Supabase Auth)
- [ ] Registrierung nur per Einladung (kein offenes Signup)
- [ ] Jeder Nutzer sieht nur seine eigenen Projekte
- [ ] Teamleiter-Rolle: kann alle Projekte des Teams sehen (read-only)
- [ ] Logout-Funktion im Header
- [ ] Nicht eingeloggte Nutzer werden auf Login-Seite weitergeleitet
- [ ] Passwort-Reset per E-Mail möglich
- [ ] Row Level Security (RLS) in Supabase für alle Tabellen

## Edge Cases
- Nutzer vergisst Passwort → Passwort-Reset Flow per E-Mail
- Einladungslink abgelaufen → Hinweis mit Möglichkeit, neuen Link anzufordern
- Session abgelaufen → automatische Weiterleitung zur Login-Seite
- Nutzer versucht, URL eines anderen Nutzers direkt aufzurufen → 403-Fehlerseite

## Technical Requirements
- Supabase Auth (E-Mail/Passwort)
- RLS Policies für alle Tabellen (projects, positions)
- Einladungsflow via Supabase Admin API oder Magic Link

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
