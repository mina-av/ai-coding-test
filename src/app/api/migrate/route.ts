import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })
  }

  // TODO: Sobald Supabase-Tabellen `projekte` und `positionen` angelegt sind,
  // hier die Migration implementieren:
  //
  // const { projekte } = await request.json()
  // for (const projekt of projekte) {
  //   const { data: p } = await supabase.from('projekte').insert({...}).select().single()
  //   await supabase.from('positionen').insert(projekt.positionen.map(pos => ({ ...pos, projekt_id: p.id })))
  // }

  // Vorläufig: Migration nicht möglich solange Tabellen fehlen
  return NextResponse.json(
    { error: 'Datenmigration noch nicht verfügbar. Bitte Supabase-Tabellen zuerst anlegen.' },
    { status: 503 }
  )
}
