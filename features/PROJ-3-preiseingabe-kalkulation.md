# PROJ-3: Preiseingabe & Kalkulation

## Status: In Progress
**Created:** 2026-03-25
**Last Updated:** 2026-03-25

## Dependencies
- Requires: PROJ-2 (LV-Positionen anzeigen & bearbeiten) — Positionen mit Menge und Einheit müssen vorhanden sein

## User Stories
- Als Kalkulator möchte ich für jede Position einen Einheitspreis eingeben, damit ich das Angebot kalkulieren kann.
- Als Kalkulator möchte ich, dass der Gesamtpreis pro Position automatisch berechnet wird (Menge × Einheitspreis), damit ich keine Rechenfehler mache.
- Als Kalkulator möchte ich die Angebotssumme (Summe aller Positionen) sehen, damit ich das Gesamtangebot im Blick habe.
- Als Kalkulator möchte ich Preise jederzeit anpassen, damit ich Korrekturen vornehmen kann.
- Als Kalkulator möchte ich einen Überblick, wie viele Positionen noch ohne Preis sind, damit ich nichts vergesse.

## Acceptance Criteria
- [ ] Jede Position hat ein Eingabefeld für den Einheitspreis (EP) in Euro
- [ ] Der Gesamtpreis (GP) = Menge × EP wird automatisch und in Echtzeit berechnet und angezeigt
- [ ] Die Angebotssumme (Summe aller GP) wird am Ende der Tabelle und prominent angezeigt
- [ ] Einheitspreise sind jederzeit editierbar; Änderung löst sofortige Neuberechnung aus
- [ ] Positionen ohne Preis (EP = 0 oder leer) werden visuell hervorgehoben
- [ ] Anzahl der Positionen ohne Preis wird angezeigt (z.B. "3 Positionen ohne Preis")
- [ ] Preise werden mit deutschem Zahlenformat angezeigt (1.234,56 €)
- [ ] Negative Einheitspreise sind nicht erlaubt (Validierung)

## Edge Cases
- Menge ist 0 → GP = 0, kein Fehler
- Menge ist nicht numerisch (z.B. "pauschal") → GP kann nicht berechnet werden, Feld zeigt "–", Hinweis an Nutzer
- Einheitspreis sehr hoch (>1.000.000 €) → keine Einschränkung, aber Warnung anzeigen
- Alle Positionen haben EP = 0 → Angebotssumme = 0,00 €, Hinweis "Keine Preise eingegeben"
- Copy-Paste eines Preises mit Komma/Punkt (z.B. "1.234,56") → korrekt als Zahl interpretieren

## Technical Requirements
- Berechnung rein client-seitig (kein API-Call nötig)
- Rundung auf 2 Dezimalstellen bei Währungsbeträgen
- Tastaturnavigation: Enter/Tab springt zur nächsten EP-Eingabe

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
**Designed:** 2026-03-25

### Komponentenstruktur

```
Einstellungen-Seite (/einstellungen)  [einmalig]
└── BKI-Upload-Bereich
    ├── Drag-and-Drop für BKI-PDF
    ├── Ladezustand ("KI liest BKI-Preisliste aus...")
    └── Status-Badge: "BKI Kompakt 2023 geladen ✓"

Kalkulations-Seite (/kalkulation)  [pro Projekt]
├── BKI-StatusBanner  [wenn BKI noch nicht geladen]
│   └── Hinweis + Link zu Einstellungen
├── PageHeader
│   ├── Titel "Angebotskalkulation"
│   └── StatusBadge ("3 Positionen ohne Preis")
├── BKI-MatchingProgress  [erscheint einmalig beim Laden]
│   └── "KI sucht passende BKI-Preise..." + Fortschrittsbalken
├── KalkulationsTabelle
│   ├── TableHeader
│   │   └── Pos.-Nr. | Beschreibung | Menge | Einheit | BKI-Vorschlag | EP (€) | GP (€)
│   ├── PositionRow  [pro Position]
│   │   ├── Pos.-Nr., Beschreibung, Menge, Einheit  (Anzeige)
│   │   ├── BKI-Vorschlag  (grau, Tooltip zeigt BKI-Quelle + Konfidenz)
│   │   ├── EP-Eingabefeld  (vorausgefüllt mit BKI-Preis, jederzeit überschreibbar)
│   │   └── GP  (Menge × EP, Echtzeit-Berechnung)
│   └── SummenZeile → Angebotssumme
└── AngebotssummeCard  (prominent)
```

### Datenmodell

**Neue Datenbank-Tabelle: `bki_eintraege`**
Jeder BKI-Eintrag enthält: ID, Bezeichnung, Einheitspreis (€), Einheit, Kostengruppe/Kategorie.

**Bestehende Positionen** (React Context) erhalten neue Felder:
- BKI-Vorschlagspreis (aus Datenbank)
- BKI-Konfidenz (hoch / mittel / niedrig)
- Einheitspreis (EP) — vorausgefüllt mit BKI-Vorschlag, manuell überschreibbar

### Ablauf

**Einmalig (Setup):**
BKI-PDF hochladen → API `/api/bki/upload` → pdf-parse extrahiert Text → Claude strukturiert Preisliste → Supabase speichert `bki_eintraege`

**Pro Projekt (Kalkulation):**
LV-Positionen → API `/api/bki/match` → Claude vergleicht Positionsbeschreibungen mit `bki_eintraege` → EP-Felder vorausfüllen → Nutzer prüft + überschreibt → Echtzeit GP + Angebotssumme

### Tech-Entscheidungen

| Entscheidung | Warum |
|---|---|
| Supabase für BKI-Daten | BKI-Preise dauerhaft speichern — einmal hochladen, immer verfügbar |
| Claude API für Matching | Positionsbeschreibungen sind unstrukturiert — KI versteht Kontext besser als Textsuche |
| BKI-Extraktion einmalig | BKI-PDF ändert sich selten — nicht bei jedem Projekt neu extrahieren |
| EP vorausgefüllt aber editierbar | Spart Zeit, behält Kontrolle beim Kalkulator |
| Konfidenz-Anzeige | Zeigt Sicherheit des Matchings — niedrige Konfidenz = manuell prüfen |

### Neue Abhängigkeiten

Keine neuen Pakete — `pdf-parse` und `@anthropic-ai/sdk` aus PROJ-1 bereits vorhanden. Supabase bereits im Stack (neue Tabelle `bki_eintraege`).

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
