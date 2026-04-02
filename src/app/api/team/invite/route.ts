import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'

const InviteSchema = z.object({
  email: z.string().email(),
  rolle: z.enum(['kalkulator', 'teamleiter']),
})

export async function POST(request: NextRequest) {
  // Nur Teamleiter dürfen einladen
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })
  }

  // app_metadata ist nur via Admin-API setzbar — nicht vom User manipulierbar
  const meta = user.app_metadata as { rolle?: string } | undefined
  if (meta?.rolle !== 'teamleiter') {
    return NextResponse.json({ error: 'Nur Teamleiter können Einladungen versenden.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const parsed = InviteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Eingabe.' }, { status: 400 })
  }

  const { email, rolle } = parsed.data

  // Admin-Client mit Service Role Key
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${request.nextUrl.origin}/login/reset/confirm`,
    // app_metadata: vom Admin gesetzt, nicht vom User überschreibbar
    data: { app_metadata: { rolle } },
  })

  if (error) {
    // "User already registered" als freundliche Meldung
    if (error.message.includes('already')) {
      return NextResponse.json({ error: 'Diese E-Mail-Adresse ist bereits registriert.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Einladung konnte nicht gesendet werden.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
