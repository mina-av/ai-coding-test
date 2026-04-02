'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, UserPlus, CheckCircle, AlertCircle } from 'lucide-react'
import { useUser } from '@/hooks/use-user'
import { AppHeader } from '@/components/app-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'

const rolleLabel: Record<'kalkulator' | 'teamleiter', string> = {
  kalkulator: 'Kalkulator',
  teamleiter: 'Teamleiter',
}

type InviteStatus = 'idle' | 'loading' | 'success' | 'error'

export default function TeamPage() {
  const { email, rolle, loading } = useUser()
  const router = useRouter()

  // BUG-3 Fix: Kalkulatoren haben keinen Zugang zu /team
  useEffect(() => {
    if (!loading && rolle === 'kalkulator') {
      router.replace('/')
    }
  }, [loading, rolle, router])

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRolle, setInviteRolle] = useState<'kalkulator' | 'teamleiter'>('kalkulator')
  const [status, setStatus] = useState<InviteStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, rolle: inviteRolle }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Einladung fehlgeschlagen.')
        setStatus('error')
        return
      }

      setStatus('success')
      setInviteEmail('')
    } catch {
      setErrorMsg('Netzwerkfehler. Bitte erneut versuchen.')
      setStatus('error')
    }
  }

  if (loading) return null

  return (
    <div className="min-h-screen bg-background">
      <AppHeader email={email} rolle={rolle} />

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-muted-foreground mt-1">
            Teammitglieder verwalten und einladen
          </p>
        </div>

        {/* Einladungsformular — nur für Teamleiter */}
        {rolle === 'teamleiter' && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Neues Teammitglied einladen
              </CardTitle>
            </CardHeader>
            <CardContent>
              {status === 'success' ? (
                <div className="space-y-4">
                  <Alert className="border-green-300 bg-green-50 text-green-800">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      Einladung wurde gesendet. Das Teammitglied erhält eine E-Mail mit einem Link zum Passwort setzen.
                    </AlertDescription>
                  </Alert>
                  <Button variant="outline" className="w-full" onClick={() => setStatus('idle')}>
                    Weitere Person einladen
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleInvite} noValidate className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="invite-email">E-Mail-Adresse</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="name@firma.de"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      disabled={status === 'loading'}
                      required
                      autoComplete="off"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="invite-rolle">Rolle</Label>
                    <Select
                      value={inviteRolle}
                      onValueChange={(v) => setInviteRolle(v as 'kalkulator' | 'teamleiter')}
                      disabled={status === 'loading'}
                    >
                      <SelectTrigger id="invite-rolle">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kalkulator">Kalkulator</SelectItem>
                        <SelectItem value="teamleiter">Teamleiter</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Kalkulator: eigene Projekte bearbeiten · Teamleiter: alle Projekte lesen
                    </p>
                  </div>

                  {status === 'error' && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{errorMsg}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={status === 'loading' || !inviteEmail}
                  >
                    {status === 'loading' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Wird gesendet…
                      </>
                    ) : (
                      'Einladung senden'
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        {/* Hinweis für Kalkulatoren */}
        {rolle === 'kalkulator' && (
          <div className="rounded-lg border bg-muted/30 px-5 py-4 text-sm text-muted-foreground">
            Einladungen können nur von Teamleitern versendet werden. Bitte wende dich an deinen Teamleiter.
          </div>
        )}

        {/* Eigenes Profil */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-sm font-medium text-muted-foreground mb-3">Angemeldet als</p>
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0"
                aria-hidden="true"
              >
                {email.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{email}</p>
                <Badge variant="secondary" className="text-xs mt-0.5">
                  {rolleLabel[rolle]}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
