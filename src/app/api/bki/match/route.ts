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

  // Claude matched LV-Positionen zu BKI-Preisen (nur Text, kein PDF)
  try {
    const positionenJson = JSON.stringify(
      positionen.map((p) => ({ id: p.id, beschreibung: p.kurzbeschreibung, menge: p.menge, einheit: p.einheit }))
    )

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `Du bist ein Experte für deutsche Baukostenplanung mit BKI Baukosten.

Ordne jede der folgenden LV-Positionen dem passenden Preis aus der BKI Kompakt 2023 Preisdatenbank zu.

Für jede Position gib zurück:
- id: die ID der Position (unverändert)
- bkiVorschlag: empfohlener Einheitspreis in EUR als Zahl (z.B. 45.50) — nutze den Mittelwert aus BKI
- bkiKonfidenz: "hoch" (gute Übereinstimmung), "mittel" (ungefähre Übereinstimmung) oder "niedrig" (sehr unsicher)

Antworte NUR mit einem gültigen JSON-Array. Kein Text davor oder danach.
Format: [{"id":"...","bkiVorschlag":0.00,"bkiKonfidenz":"hoch"}]

LV-Positionen:
${positionenJson}

BKI Kompakt 2023 Preisdatenbank (Auszug):
${bkiText.slice(0, 40000)}`,
        },
      ],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Kein gültiges JSON vom Modell erhalten.' }, { status: 500 })
    }

    const matches: { id: string; bkiVorschlag: number; bkiKonfidenz: string }[] =
      JSON.parse(jsonMatch[0])

    return NextResponse.json({ matches })
  } catch (err) {
    console.error('BKI-Matching Fehler:', err)
    return NextResponse.json(
      { error: 'BKI-Matching fehlgeschlagen. Bitte erneut versuchen.' },
      { status: 500 }
    )
  }
}
