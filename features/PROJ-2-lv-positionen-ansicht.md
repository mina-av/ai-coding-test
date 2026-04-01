# PROJ-2: LV-Positionen anzeigen & bearbeiten

## Status: Deployed
**Created:** 2026-03-25
**Last Updated:** 2026-04-01

## Dependencies
- Requires: PROJ-1 (PDF-Upload & KI-Extraktion) — extrahierte Positionen als Datengrundlage

## User Stories
- Als Kalkulator möchte ich alle extrahierten LV-Positionen in einer übersichtlichen Tabelle sehen, damit ich einen vollständigen Überblick habe.
- Als Kalkulator möchte ich einzelne Positionen bearbeiten (Beschreibung, Menge, Einheit), damit ich KI-Fehler korrigieren kann.
- Als Kalkulator möchte ich Positionen hinzufügen, damit ich fehlende Positionen manuell ergänzen kann.
- Als Kalkulator möchte ich Positionen löschen, damit ich nicht relevante Positionen entfernen kann.
- Als Kalkulator möchte ich die Positionsnummern sehen, damit ich die Struktur des LV nachvollziehen kann.

## Acceptance Criteria
- [ ] Alle extrahierten Positionen werden in einer Tabelle angezeigt mit: Pos.-Nr., Beschreibung, Menge, Einheit
- [ ] Jede Zeile ist inline bearbeitbar (Klick auf Feld öffnet Eingabe)
- [ ] Änderungen werden automatisch gespeichert (kein separater Speichern-Button nötig)
- [ ] Nutzer kann neue Positionen am Ende der Tabelle hinzufügen
- [ ] Nutzer kann einzelne Positionen löschen (mit Bestätigungsdialog)
- [ ] Tabelle ist sortierbar nach Positionsnummer
- [ ] Bei mehr als 50 Positionen wird paginiert oder gescrollt (keine Performance-Probleme)
- [ ] Leerer Zustand (0 Positionen): Hinweis und Button zum manuellen Hinzufügen

## Edge Cases
- KI hat Menge als Text erkannt (z.B. "ca. 10") → Feld zeigt Text, Nutzer muss Zahl eingeben für Kalkulation
- Positionsnummern fehlen → leeres Feld, Nutzer kann manuell ausfüllen
- Sehr lange Beschreibung (>500 Zeichen) → Beschreibung wird gekürzt dargestellt, Tooltip/Expand zeigt vollständigen Text
- Nutzer löscht alle Positionen → leerer Zustand mit Hinweis
- Browser wird geschlossen ohne Speichern → Änderungen sind durch Auto-Save bereits persistiert

## Technical Requirements
- Daten werden im Browser-State (React) gehalten, nach Extraktion aus PROJ-1 übernommen
- In MVP: kein persistentes Backend erforderlich (Session-basiert)
- Inline-Editing mit Tastaturnavigation (Tab zwischen Feldern)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
**Deployed:** 2026-04-01
**Platform:** Vercel
**Branch:** main
**Notes:** Bereits als Teil von PROJ-1 deployed. Spec war nicht aktualisiert worden.
