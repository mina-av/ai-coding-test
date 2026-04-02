'use client'

import { useState, useEffect } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClient } from '@/lib/supabase'

export default function ResetConfirmPage() {
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // BUG-4 Fix: Token-Validität beim Laden prüfen
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      setTokenValid(!!data.session)
    })
  }, [])

  const mismatch = passwordConfirm.length > 0 && password !== passwordConfirm

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (password !== passwordConfirm) return
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      window.location.href = '/'
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Passwort konnte nicht gesetzt werden. Bitte erneut versuchen.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <h1 className="text-xl font-semibold tracking-tight">BKI Angebots-Tool</h1>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl">Neues Passwort setzen</CardTitle>
            <CardDescription>
              Wählen Sie ein neues Passwort für Ihr Konto.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Abgelaufener oder ungültiger Link */}
            {tokenValid === false && (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Dieser Link ist abgelaufen oder ungültig. Bitte fordern Sie einen neuen Reset-Link an.
                  </AlertDescription>
                </Alert>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/login/reset">Neuen Link anfordern</Link>
                </Button>
              </div>
            )}

            {/* Laden */}
            {tokenValid === null && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Formular */}
            {tokenValid === true && (
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">Neues Passwort</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    minLength={8}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">Passwort bestätigen</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    disabled={loading}
                    required
                    aria-invalid={mismatch}
                  />
                  {mismatch && (
                    <p className="text-xs text-destructive">Passwörter stimmen nicht überein.</p>
                  )}
                </div>

                {error && (
                  <Alert variant="destructive" role="alert">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || !password || !passwordConfirm || mismatch}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                      Wird gespeichert…
                    </>
                  ) : (
                    'Passwort speichern'
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
