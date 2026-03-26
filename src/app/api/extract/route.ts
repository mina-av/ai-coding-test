import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file')

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'Keine Datei hochgeladen.' }, { status: 400 })
  }
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Nur PDF-Dateien werden akzeptiert.' }, { status: 400 })
  }
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'Die Datei ist zu groß. Maximale Dateigröße: 20 MB.' },
      { status: 400 }
    )
  }

  // Claude liest das PDF direkt und extrahiert die LV-Positionen
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const base64PDF = buffer.toString('base64')

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64PDF,
              },
            },
            {
              type: 'text',
              text: `Du bist ein Experte für deutsche Leistungsverzeichnisse (LV) im Bauwesen.

Extrahiere alle Positionen aus diesem LV. Gib für jede Position aus:
- positionsnummer: Positionsnummer (z.B. "01.001", "1.1", "A.01") — leer wenn nicht vorhanden
- kurzbeschreibung: Kurzbeschreibung der Leistung (max. 1-2 Zeilen)
- langbeschreibung: ausführliche Beschreibung falls vorhanden, sonst leer
- menge: Menge als Zeichenkette (z.B. "150", "pauschal", "1") — leer wenn nicht vorhanden
- einheit: Einheit (z.B. "m²", "m³", "Stk", "psch", "m") — leer wenn nicht vorhanden

Antworte NUR mit einem gültigen JSON-Array. Kein Text davor oder danach.
Format: [{"positionsnummer":"...","kurzbeschreibung":"...","langbeschreibung":"...","menge":"...","einheit":"..."}]`,
            },
          ],
        },
      ],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'KI konnte keine Positionen erkennen. Bitte prüfen Sie, ob es sich um ein Leistungsverzeichnis handelt.' },
        { status: 422 }
      )
    }

    const parsed: {
      positionsnummer: string
      kurzbeschreibung: string
      langbeschreibung: string
      menge: string
      einheit: string
    }[] = JSON.parse(jsonMatch[0])

    const positionen = parsed.map((p, i) => ({
      id: String(Date.now() + i),
      positionsnummer: p.positionsnummer ?? '',
      kurzbeschreibung: p.kurzbeschreibung ?? '',
      langbeschreibung: p.langbeschreibung ?? '',
      menge: p.menge ?? '',
      einheit: p.einheit ?? '',
      einheitspreis: 0,
    }))

    return NextResponse.json({ positionen })
  } catch (err) {
    console.error('Claude API Fehler:', err)
    return NextResponse.json(
      { error: 'KI-Extraktion fehlgeschlagen. Bitte erneut versuchen.' },
      { status: 500 }
    )
  }
}
