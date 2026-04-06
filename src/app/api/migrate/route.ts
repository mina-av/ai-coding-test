import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'

const PositionSchema = z.object({
  id: z.string(),
  positionsnummer: z.string().default(''),
  kurzbeschreibung: z.string().default(''),
  langbeschreibung: z.string().optional(),
  menge: z.string().default(''),
  einheit: z.string().default(''),
  einheitspreis: z.number().default(0),
  bkiVorschlag: z.number().optional(),
  bkiPreise: z.array(z.number()).length(5).optional(),
  bkiKonfidenz: z.string().optional(),
  bkiPositionsnummer: z.string().optional(),
  bkiBeschreibung: z.string().optional(),
})

const AngebotSchema = z.object({
  projektname: z.string().default(''),
  kundenname: z.string().default(''),
  kundenadresse: z.string().default(''),
  objektnummer: z.string().default(''),
  angebotsnummer: z.string().default(''),
  datum: z.string().default(''),
  ohnePreis: z.string().default('ausblenden'),
  exportedAt: z.string().default(''),
})

const ProjektSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string().default('in-bearbeitung'),
  createdAt: z.string(),
  updatedAt: z.string(),
  positionen: z.array(PositionSchema).default([]),
  angebote: z.array(AngebotSchema).default([]),
})

const MigrateRequestSchema = z.object({
  projekte: z.array(ProjektSchema),
})

const BATCH_SIZE = 500

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger JSON-Body.' }, { status: 400 })
  }

  const parsed = MigrateRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Ungültige Daten.', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { projekte } = parsed.data
  let migrated = 0
  let skipped = 0

  for (const projekt of projekte) {
    // UPSERT projekt — on conflict do nothing (skip duplicates)
    const { error: projErr, data: projData } = await supabase
      .from('projekte')
      .upsert(
        {
          id: projekt.id,
          name: projekt.name,
          status: projekt.status,
          created_at: projekt.createdAt,
          updated_at: projekt.updatedAt,
        },
        { onConflict: 'id', ignoreDuplicates: true }
      )
      .select('id')

    if (projErr) {
      console.error('Fehler beim Migrieren von Projekt:', projekt.id, projErr)
      return NextResponse.json(
        { error: `Fehler beim Migrieren von Projekt "${projekt.name}".` },
        { status: 500 }
      )
    }

    // If projData is empty, the project already existed — skip
    if (!projData || projData.length === 0) {
      skipped++
      continue
    }

    migrated++

    // Insert positionen in batches
    if (projekt.positionen.length > 0) {
      const dbPositionen = projekt.positionen.map((pos, idx) => ({
        id: pos.id,
        projekt_id: projekt.id,
        positionsnummer: pos.positionsnummer,
        kurzbeschreibung: pos.kurzbeschreibung,
        langbeschreibung: pos.langbeschreibung ?? null,
        menge: pos.menge,
        einheit: pos.einheit,
        einheitspreis: pos.einheitspreis,
        bki_vorschlag: pos.bkiVorschlag ?? null,
        bki_preise: pos.bkiPreise ?? null,
        bki_konfidenz: pos.bkiKonfidenz ?? null,
        bki_positionsnummer: pos.bkiPositionsnummer ?? null,
        bki_beschreibung: pos.bkiBeschreibung ?? null,
        sort_order: idx,
      }))

      for (let i = 0; i < dbPositionen.length; i += BATCH_SIZE) {
        const batch = dbPositionen.slice(i, i + BATCH_SIZE)
        const { error: posErr } = await supabase
          .from('positionen')
          .upsert(batch, { onConflict: 'id', ignoreDuplicates: true })
        if (posErr) {
          console.error('Fehler beim Migrieren von Positionen:', posErr)
          return NextResponse.json(
            { error: `Fehler beim Migrieren der Positionen von Projekt "${projekt.name}".` },
            { status: 500 }
          )
        }
      }
    }

    // Insert angebote in batches
    if (projekt.angebote.length > 0) {
      const dbAngebote = projekt.angebote.map(ang => ({
        projekt_id: projekt.id,
        projektname: ang.projektname,
        kundenname: ang.kundenname,
        kundenadresse: ang.kundenadresse,
        objektnummer: ang.objektnummer,
        angebotsnummer: ang.angebotsnummer,
        datum: ang.datum || null,
        ohne_preis: ang.ohnePreis,
        exported_at: ang.exportedAt || null,
      }))

      for (let i = 0; i < dbAngebote.length; i += BATCH_SIZE) {
        const batch = dbAngebote.slice(i, i + BATCH_SIZE)
        const { error: angErr } = await supabase
          .from('angebote')
          .insert(batch)
        if (angErr) {
          console.error('Fehler beim Migrieren von Angeboten:', angErr)
          return NextResponse.json(
            { error: `Fehler beim Migrieren der Angebote von Projekt "${projekt.name}".` },
            { status: 500 }
          )
        }
      }
    }
  }

  return NextResponse.json({ migrated, skipped })
}
