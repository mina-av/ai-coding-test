import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse/lib/pdf-parse')
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'
import { join } from 'path'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// BKI-Text wird einmalig extrahiert und im Prozess gecacht
let bkiTextCache: string | null = null

async function getBkiText(): Promise<string> {
  if (bkiTextCache) return bkiTextCache
  const bkiPath = join(process.cwd(), 'BKI kompakt 2023 Gesamt.pdf')
  const buffer = readFileSync(bkiPath)
  const result = await pdfParse(buffer)
  bkiTextCache = result.text
  return bkiTextCache as string
}

interface LVPosition {
  id: string
  kurzbeschreibung: string
  menge: string
  einheit: string
}

export async function POST(req: NextRequest) {
  // API-Key-Schutz (SEC-1)
  const apiKey = req.headers.get('x-api-key')
  if (!process.env.EXTRACT_API_KEY || apiKey !== process.env.EXTRACT_API_KEY) {
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })
  }

  let positionen: LVPosition[]
  try {
    const body = await req.json()
    positionen = body.positionen
    if (!Array.isArray(positionen) || positionen.length === 0) {
      return NextResponse.json({ error: 'Keine Positionen übergeben.' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request.' }, { status: 400 })
  }

  // BKI-Text laden (gecacht nach erstem Aufruf)
  let bkiText: string
  try {
    bkiText = await getBkiText()
  } catch {
    return NextResponse.json(
      { error: 'BKI-Preisliste konnte nicht geladen werden.' },
      { status: 500 }
    )
  }

  // Claude matched LV-Positionen zu BKI-Preisen — in Batches damit max_tokens nicht überschritten wird
  try {
    const BATCH_SIZE = 30
    const bkiContext = bkiText.slice(0, 80000)

    const systemPrompt = `Du bist ein Experte für deutsche Baukostenplanung mit BKI Baukosten.

Ordne jede der folgenden LV-Positionen dem passenden Preis aus der BKI Kompakt 2023 Preisdatenbank zu.

Für jede Position gib zurück:
- id: die ID der Position (unverändert)
- bkiVorschlag: Einheitspreis in EUR als Zahl — entweder aus BKI (Mittelwert) oder als Marktschätzung
- bkiKonfidenz: "hoch" (gute BKI-Übereinstimmung), "mittel" (ungefähre BKI-Übereinstimmung), "niedrig" (sehr unsichere BKI-Übereinstimmung) oder "schätzung" (kein BKI-Eintrag gefunden, Preis ist eine Marktschätzung auf Basis allgemeiner Baukostenerfahrung)
- bkiPositionsnummer: Positionsnummer aus der BKI-Datenbank — leer bei Marktschätzung
- bkiBeschreibung: Kurzbeschreibung aus der BKI-Datenbank — leer bei Marktschätzung

Wichtig: Jede Position MUSS einen bkiVorschlag > 0 erhalten. Wenn kein passender BKI-Eintrag gefunden wird, schätze den Marktpreis auf Basis deiner Erfahrung mit deutschen Baukosten und setze bkiKonfidenz auf "schätzung".

Antworte NUR mit einem gültigen JSON-Array. Kein Text davor oder danach.
Format: [{"id":"...","bkiVorschlag":0.00,"bkiKonfidenz":"hoch","bkiPositionsnummer":"...","bkiBeschreibung":"..."}]

BKI Kompakt 2023 Preisdatenbank (Auszug):
${bkiContext}`

    const buildUserMessage = (batch: LVPosition[]) => {
      const positionenJson = JSON.stringify(
        batch.map((p) => ({ id: p.id, beschreibung: p.kurzbeschreibung, menge: p.menge, einheit: p.einheit }))
      )
      return `LV-Positionen:\n${positionenJson}`
    }

    // Split into batches and process sequentially to stay within rate limits
    const batches: LVPosition[][] = []
    for (let i = 0; i < positionen.length; i += BATCH_SIZE) {
      batches.push(positionen.slice(i, i + BATCH_SIZE))
    }

    const batchResults: { id: string; bkiVorschlag: number; bkiKonfidenz: string; bkiPositionsnummer: string; bkiBeschreibung: string }[][] = []
    for (const batch of batches) {
      const message = await client.messages.create(
        {
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 6144, // ~200 tokens per position × 30 positions
          system: [
            {
              type: 'text',
              text: systemPrompt,
              cache_control: { type: 'ephemeral' },
            },
          ],
          messages: [{ role: 'user', content: buildUserMessage(batch) }],
        },
        { headers: { 'anthropic-beta': 'prompt-caching-2024-07-31' } }
      )
      const raw = message.content[0].type === 'text' ? message.content[0].text : ''
      const jsonMatch = raw.match(/\[[\s\S]*\]/)
      if (!jsonMatch) { batchResults.push([]); continue }
      try {
        batchResults.push(JSON.parse(jsonMatch[0]))
      } catch {
        batchResults.push([])
      }
    }

    const matches = batchResults.flat()
    return NextResponse.json({ matches })
  } catch (err) {
    console.error('BKI-Matching Fehler:', err)
    return NextResponse.json(
      { error: 'BKI-Matching fehlgeschlagen. Bitte erneut versuchen.' },
      { status: 500 }
    )
  }
}
