import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse/lib/pdf-parse')
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

// BUG-PROJ3-6: Zod-Schema für eingehende Position-Objekte
const LVPositionSchema = z.object({
  id: z.string().min(1),
  kurzbeschreibung: z.string(),
  menge: z.string(),
  einheit: z.string(),
})

// BUG-PROJ3-7: Zod-Schema für Claude-Response
const BkiMatchSchema = z.object({
  id: z.string().min(1),
  bkiVorschlag: z.number().finite().nonnegative(),
  bkiPreise: z.tuple([
    z.number().finite().nonnegative(),
    z.number().finite().nonnegative(),
    z.number().finite().nonnegative(),
    z.number().finite().nonnegative(),
    z.number().finite().nonnegative(),
  ]).optional(),
  bkiKonfidenz: z.enum(['hoch', 'mittel', 'niedrig', 'schätzung']),
  bkiPositionsnummer: z.string(),
  bkiBeschreibung: z.string(),
})

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// In-memory rate limiter: max 5 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 60 * 1000

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

// BKI-Text wird einmalig extrahiert und im Prozess gecacht
let bkiTextCache: string | null = null

async function getBkiText(): Promise<string> {
  if (bkiTextCache) return bkiTextCache

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase.storage
    .from('bki-assets')
    .download('BKI kompakt 2023 Gesamt.pdf')

  if (error || !data) throw new Error(`Supabase Storage Fehler: ${error?.message}`)

  const buffer = Buffer.from(await data.arrayBuffer())
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
  // API-Key-Schutz (SEC-1) — nur prüfen wenn EXTRACT_API_KEY gesetzt ist
  const requiredKey = process.env.EXTRACT_API_KEY
  if (requiredKey && req.headers.get('x-api-key') !== requiredKey) {
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Zu viele Anfragen. Bitte warten Sie eine Minute und versuchen Sie es erneut.' },
      { status: 429 }
    )
  }

  let positionen: LVPosition[]
  try {
    const body = await req.json()
    if (!Array.isArray(body.positionen) || body.positionen.length === 0) {
      return NextResponse.json({ error: 'Keine Positionen übergeben.' }, { status: 400 })
    }
    // BUG-PROJ3-6: Jedes Position-Objekt mit Zod validieren
    const parsed = z.array(LVPositionSchema).safeParse(body.positionen)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungültige Positionsdaten.' }, { status: 400 })
    }
    positionen = parsed.data
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

BKI Kompakt 2023 enthält für jede Position 5 NETTO-Preiswerte (ohne MwSt.):
- a = Minimum
- b = Unterer Quartilswert (25 %)
- c = Mittelwert (50 %)
- d = Oberer Quartilswert (75 %)
- e = Maximum

Für jede Position gib zurück:
- id: die ID der Position (unverändert)
- bkiVorschlag: Mittelwert (c) in EUR Netto als Zahl — entweder aus BKI oder als Marktschätzung
- bkiPreise: Array mit genau 5 NETTO-Werten [min, q1, mittel, q3, max] — bei Marktschätzung sinnvolle Preisspanne angeben
- bkiKonfidenz: "hoch" (gute BKI-Übereinstimmung), "mittel" (ungefähre BKI-Übereinstimmung), "niedrig" (sehr unsichere BKI-Übereinstimmung) oder "schätzung" (kein BKI-Eintrag gefunden, Preise sind Marktschätzungen)
- bkiPositionsnummer: Positionsnummer aus der BKI-Datenbank — leer bei Marktschätzung
- bkiBeschreibung: Vollständige Leistungsbeschreibung der Position exakt so wie sie in der BKI-Datenbank steht — leer bei Marktschätzung

Wichtig: Alle Preise sind NETTO (ohne MwSt. 19 %). Jede Position MUSS bkiPreise mit genau 5 Werten > 0 erhalten. bkiVorschlag muss gleich bkiPreise[2] sein.

Antworte NUR mit einem gültigen JSON-Array. Kein Text davor oder danach.
Format: [{"id":"...","bkiVorschlag":100.00,"bkiPreise":[50.00,75.00,100.00,130.00,180.00],"bkiKonfidenz":"hoch","bkiPositionsnummer":"...","bkiBeschreibung":"Vollständige Beschreibung aus dem BKI-Dokument..."}]

BKI Kompakt 2023 Preisdatenbank (Auszug):
${bkiContext}`

    function sanitizeForPrompt(s: string): string {
      return s.replace(/[\x00-\x1F\x7F]/g, ' ').slice(0, 300)
    }

    const buildUserMessage = (batch: LVPosition[]) => {
      const positionenJson = JSON.stringify(
        batch.map((p) => ({
          id: p.id,
          beschreibung: sanitizeForPrompt(p.kurzbeschreibung),
          menge: sanitizeForPrompt(p.menge),
          einheit: sanitizeForPrompt(p.einheit),
        }))
      )
      return `LV-Positionen:\n${positionenJson}`
    }

    // Split into batches and process sequentially to stay within rate limits
    const batches: LVPosition[][] = []
    for (let i = 0; i < positionen.length; i += BATCH_SIZE) {
      batches.push(positionen.slice(i, i + BATCH_SIZE))
    }

    const batchResults: z.infer<typeof BkiMatchSchema>[][] = []
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
        const parsed = JSON.parse(jsonMatch[0])
        // BUG-PROJ3-7: Claude-Response mit Zod validieren, ungültige Einträge filtern
        const validated = z.array(BkiMatchSchema).safeParse(parsed)
        batchResults.push(validated.success ? validated.data : [])
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
