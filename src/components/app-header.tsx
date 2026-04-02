'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase'

interface AppHeaderProps {
  email: string
  rolle: 'kalkulator' | 'teamleiter'
}

const rolleLabel: Record<AppHeaderProps['rolle'], string> = {
  kalkulator: 'Kalkulator',
  teamleiter: 'Teamleiter',
}

export function AppHeader({ email, rolle }: AppHeaderProps) {
  const [isSigningOut, setIsSigningOut] = useState(false)
  const router = useRouter()

  async function handleSignOut() {
    setIsSigningOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      // BUG-2 Fix: window.location.href statt router.push — erzwingt vollständigen Seiten-Reload
      // und verhindert, dass gecachte geschützte Inhalte im Browser bleiben
      window.location.href = '/login'
    } catch {
      setIsSigningOut(false)
    }
  }

  return (
    <header className="border-b">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="text-xl font-semibold tracking-tight hover:opacity-80 transition-opacity"
          aria-label="Zur Startseite"
        >
          BKI Kalkulation
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/team"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
            aria-label="Team-Übersicht"
          >
            Team
          </Link>
          <span className="text-sm text-muted-foreground hidden sm:block" aria-label="Angemeldete E-Mail-Adresse">
            {email}
          </span>
          <Badge variant="secondary" aria-label={`Rolle: ${rolleLabel[rolle]}`}>
            {rolleLabel[rolle]}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            disabled={isSigningOut}
            aria-label="Abmelden"
          >
            {isSigningOut ? (
              <>
                <LogOut className="h-4 w-4 mr-2 animate-pulse" aria-hidden="true" />
                Abmelden…
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
                Abmelden
              </>
            )}
          </Button>
        </div>
      </div>
    </header>
  )
}
