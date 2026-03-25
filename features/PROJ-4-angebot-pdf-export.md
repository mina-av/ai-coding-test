# PROJ-4: Angebot als PDF exportieren

## Status: In Progress
**Created:** 2026-03-25
**Last Updated:** 2026-03-25

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
_To be added by /qa_

## Deployment
_To be added by /deploy_
