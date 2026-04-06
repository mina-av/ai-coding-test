# Product Requirements Document

## Vision
Ein internes Web-Tool für Bau- und Handwerksbetriebe, das Leistungsverzeichnisse (LV) aus PDF-Dateien per KI automatisch ausliest und daraus strukturierte Angebote mit manuell anpassbaren Einheitspreisen und automatischer Kalkulation erstellt. Ziel ist es, den manuellen Aufwand bei der Angebotserstellung deutlich zu reduzieren.

## Target Users
**Mitarbeiter im Kalkulations- und Angebotswesen** kleiner bis mittelgroßer Bau- und Handwerksbetriebe.
- Schmerzen: Leistungsverzeichnisse müssen manuell aus PDFs abgetippt werden, fehleranfällig und zeitaufwendig
- Bedürfnis: Schnelle Übernahme aller LV-Positionen, einfache Preiseingabe, sauberer PDF-Export des Angebots
- Technisches Level: Kein IT-Hintergrund, einfache Bedienung erforderlich

## Core Features (Roadmap)

| Priority | Feature | Status |
|----------|---------|--------|
| P0 (MVP) | PDF-Upload & KI-Extraktion | Planned |
| P0 (MVP) | LV-Positionen anzeigen & bearbeiten | Planned |
| P0 (MVP) | Preiseingabe & Kalkulation | Planned |
| P1 | Angebot als PDF exportieren | Planned |
| P1 | Projektverwaltung (mehrere LVs) | Planned |
| P2 | User Auth & Teamzugang | Planned |
| P2 | Supabase-Migration (localStorage → Cloud) | Planned |

## Success Metrics
- Zeit von PDF-Upload bis fertigem Angebot: unter 15 Minuten
- Extraktionsgenauigkeit der KI: > 90% der Positionen korrekt erkannt
- Nutzerzufriedenheit: Team nutzt Tool täglich statt manuellem Prozess

## Constraints
- Kein festes Zeitlimit (exploratives Projekt)
- Kleines Team, keine dedizierte IT-Abteilung
- KI-Kosten (OpenAI / Claude API) müssen kalkulierbar bleiben

## Non-Goals
- Kein GAEB-Import in MVP (evtl. späteres Feature)
- Keine Buchhaltungsintegration
- Kein mobiles App-Erlebnis (Desktop-first)
- Keine automatische Preisfindung (Preise werden manuell eingegeben)

---

Use `/requirements` to create detailed feature specifications for each item in the roadmap above.
