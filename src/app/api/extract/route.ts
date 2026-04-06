import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse/lib/pdf-parse')

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' })

// Für PDFs über diesem Schwellwert wird Text-Chunking statt base64 genutzt,
// da max_tokens für viele Positionen sonst nicht ausreicht
const MAX_BASE64_PAGES = 5
// Each chunk sent to Claude — ~20k chars keeps JSON output well within max_tokens
const CHUNK_SIZE = 20000
// Overlap between chunks so positions at boundaries are not missed
const CHUNK_OVERLAP = 2000

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

const RawPositionSchema = z.object({
  positionsnummer: z.string().default(''),
  kurzbeschreibung: z.string().default(''),
  langbeschreibung: z.string().default(''),
  menge: z.string().default(''),
  einheit: z.string().default(''),
})

type RawPosition = z.infer<typeof RawPositionSchema>

function buildPrompt(text: string, chunkInfo: string): string {
  return `Du bist ein Experte für deutsche Leistungsverzeichnisse (LV) im Bauwesen.

Extrahiere alle Positionen aus diesem LV-Abschnitt${chunkInfo}. Gib für jede Position aus:
- positionsnummer: Positionsnummer (z.B. "01.001", "1.1", "2.1.10") — leer wenn nicht vorhanden
- kurzbeschreibung: Kurzbeschreibung der Leistung (max. 1-2 Zeilen)
- langbeschreibung: ausführliche Beschreibung falls vorhanden, sonst leer
- menge: Menge als Zeichenkette (z.B. "150", "pauschal", "1") — leer wenn nicht vorhanden
- einheit: Einheit (z.B. "m²", "m³", "Stk", "psch", "m") — leer wenn nicht vorhanden

Antworte NUR mit einem gültigen JSON-Array. Kein Text davor oder danach.
Format: [{"positionsnummer":"...","kurzbeschreibung":"...","langbeschreibung":"...","menge":"...","einheit":"..."}]

LV-Inhalt:
${text}`
}

function parseClaudeJson(raw: string): RawPosition[] {
  const jsonMatch = raw.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []
  try {
    const parsed = JSON.parse(jsonMatch[0])
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => {
        try {
          return RawPositionSchema.parse(item)
        } catch {
          return null
        }
      })
      .filter((p): p is RawPosition => p !== null && p.kurzbeschreibung.length > 0)
  } catch {
    return []
  }
}

async function extractChunk(text: string, chunkInfo: string): Promise<RawPosition[]> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8096,
    messages: [{ role: 'user', content: buildPrompt(text, chunkInfo) }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''
  return parseClaudeJson(raw)
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

  try {
    const buffer = Buffer.from(await file.arrayBuffer())

    // Parse PDF metadata — detect password-protected files early
    let pdfMeta
    try {
      pdfMeta = await pdfParse(buffer, { max: 1 })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.toLowerCase() : ''
      if (msg.includes('encrypted') || msg.includes('password')) {
        return NextResponse.json(
          { error: 'PDF ist passwortgeschützt. Bitte entsperrtes PDF hochladen.' },
          { status: 400 }
        )
      }
      throw err
    }

    const pageCount: number = pdfMeta.numpages ?? 0
    let allRaw: RawPosition[] = []

    if (pageCount <= MAX_BASE64_PAGES) {
      // Detect image-only (scanned) PDFs before calling Claude
      if (!pdfMeta.text || pdfMeta.text.trim().length < 50) {
        return NextResponse.json(
          {
            error:
              'PDF enthält keinen lesbaren Text. Bitte eine durchsuchbare PDF hochladen.',
          },
          { status: 422 }
        )
      }

      // Small PDF: send as base64 document directly to Claude
      const base64PDF = buffer.toString('base64')
      const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 8096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: { type: 'base64', media_type: 'application/pdf', data: base64PDF },
              },
              { type: 'text', text: buildPrompt('', '') },
            ],
          },
        ],
      })
      const raw = message.content[0].type === 'text' ? message.content[0].text : ''
      allRaw = parseClaudeJson(raw)
    } else {
      // Large PDF: extract text, split into chunks, process in parallel
      const pdfResult = await pdfParse(buffer)
      const fullText: string = pdfResult.text as string

      if (!fullText || fullText.trim().length < 50) {
        return NextResponse.json(
          {
            error:
              'PDF enthält keinen lesbaren Text. Bitte eine durchsuchbare PDF hochladen.',
          },
          { status: 422 }
        )
      }

      // Split at newline boundaries; each chunk overlaps the previous by
      // CHUNK_OVERLAP chars so positions at boundaries are not missed.
      const chunks: string[] = []
      let offset = 0
      while (offset < fullText.length) {
        let end = offset + CHUNK_SIZE
        if (end < fullText.length) {
          const boundary = fullText.lastIndexOf('\n', end)
          if (boundary > offset) end = boundary
        }
        chunks.push(fullText.slice(offset, end))
        offset = end - CHUNK_OVERLAP
        if (offset <= 0) break
      }

      const results = await Promise.all(
        chunks.map((chunk, idx) =>
          extractChunk(
            chunk,
            ` (Teil ${idx + 1} von ${chunks.length}, ${pageCount} Seiten gesamt)`
          )
        )
      )

      // Deduplicate by positionsnummer (overlap can produce duplicates)
      const seen = new Set<string>()
      for (const p of results.flat()) {
        const key = p.positionsnummer?.trim()
        if (key) {
          if (!seen.has(key)) {
            seen.add(key)
            allRaw.push(p)
          }
        } else {
          // No positionsnummer — keep as-is (can't deduplicate by key)
          allRaw.push(p)
        }
      }
    }

    if (allRaw.length === 0) {
      return NextResponse.json(
        {
          error:
            'KI konnte keine Positionen erkennen. Bitte prüfen Sie, ob es sich um ein Leistungsverzeichnis handelt.',
        },
        { status: 422 }
      )
    }

    const positionen = allRaw.map((p) => ({
      id: crypto.randomUUID(),
      positionsnummer: p.positionsnummer,
      kurzbeschreibung: p.kurzbeschreibung,
      langbeschreibung: p.langbeschreibung,
      menge: p.menge,
      einheit: p.einheit,
      einheitspreis: 0,
    }))

    return NextResponse.json({ positionen })
  } catch (err) {
    console.error('Extraktion fehlgeschlagen:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: 'KI-Extraktion fehlgeschlagen. Bitte erneut versuchen.' },
      { status: 500 }
    )
  }
}
