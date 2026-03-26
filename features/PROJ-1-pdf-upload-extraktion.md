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
- KI-Modell: Claude API (claude-sonnet-4-6) für Textextraktion und Strukturierung
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
_To be added by /qa_

## Deployment
_To be added by /deploy_
