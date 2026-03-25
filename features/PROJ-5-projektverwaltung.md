# PROJ-5: Projektverwaltung (mehrere LVs)

## Status: Planned
**Created:** 2026-03-25
**Last Updated:** 2026-03-25

## Dependencies
- Requires: PROJ-1 (PDF-Upload & KI-Extraktion) — als Einstiegspunkt für neue Projekte

## User Stories
- Als Kalkulator möchte ich mehrere Projekte verwalten, damit ich nicht jedes Mal von vorne anfangen muss.
- Als Kalkulator möchte ich eine Übersicht aller meiner Projekte sehen (Name, Datum, Status), damit ich den Überblick behalte.
- Als Kalkulator möchte ich ein bestehendes Projekt öffnen und weiterbearbeiten, damit ich unterbrochene Arbeiten fortsetzen kann.
- Als Kalkulator möchte ich Projekte umbenennen und löschen können, damit ich meine Projektliste sauber halte.

## Acceptance Criteria
- [ ] Startseite zeigt eine Liste aller gespeicherten Projekte (Name, Erstelldatum, Anzahl Positionen, Status)
- [ ] Button "Neues Projekt" startet den PDF-Upload-Prozess (PROJ-1)
- [ ] Jedes Projekt kann geöffnet, umbenannt und gelöscht werden
- [ ] Projektstatus: "In Bearbeitung" / "Abgeschlossen" (manuell setzbar)
- [ ] Projekte werden persistent gespeichert (nicht verloren nach Browser-Neustart)
- [ ] Leerer Zustand: Hinweis "Noch keine Projekte. Jetzt erstes Projekt erstellen."
- [ ] Löschen mit Bestätigungsdialog ("Projekt wirklich löschen? Alle Daten werden entfernt.")

## Edge Cases
- Viele Projekte (50+) → Liste wird paginiert oder gefiltert
- Projektname bereits vergeben → Warnung, aber kein harter Block (Duplikate erlaubt in MVP)
- Browser-Storage voll → Fehlermeldung mit Hinweis, alte Projekte zu löschen

## Technical Requirements
- Persistenz: localStorage oder IndexedDB (kein Backend in MVP)
- Maximale Größe pro Projekt im Storage: ca. 500 KB
- Bei Einführung von PROJ-6 (Auth): Migration auf Supabase-Backend

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
