'use client'

import { useState, useEffect } from 'react'
import { Loader2, X, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

type MigrationState = 'hidden' | 'idle' | 'migrating' | 'success' | 'error'

export function MigrationBanner() {
  const [state, setState] = useState<MigrationState>('hidden')

  useEffect(() => {
    const raw = localStorage.getItem('bki-projekte')
    if (raw && raw.trim() && raw.trim() !== '[]' && raw.trim() !== 'null') {
      setState('idle')
    }
  }, [])

  async function handleMigrate() {
    setState('migrating')
    try {
      const raw = localStorage.getItem('bki-projekte')
      const projekte = raw ? JSON.parse(raw) : []

      const res = await fetch('/api/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projekte }),
      })

      if (!res.ok) throw new Error('Migration fehlgeschlagen.')

      // Nur löschen wenn Schreibvorgang bestätigt wurde
      localStorage.removeItem('bki-projekte')
      setState('success')
    } catch {
      // BUG-7 Fix: localStorage bleibt erhalten bei Fehler
      setState('error')
    }
  }

  function handleDismissIdle() {
    setState('hidden')
  }

  function handleDismissSuccess() {
    setState('hidden')
  }

  function handleCancel() {
    setState('hidden')
  }

  if (state === 'hidden') {
    return null
  }

  if (state === 'idle') {
    return (
      <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-yellow-800">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-600" />
          <span className="text-sm font-medium">
            Lokale Projektdaten gefunden. Jetzt in die Cloud migrieren?
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            onClick={handleMigrate}
            className="bg-yellow-600 text-white hover:bg-yellow-700"
          >
            Migrieren
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismissIdle}
            className="text-yellow-700 hover:bg-yellow-100 hover:text-yellow-900"
          >
            Später
          </Button>
        </div>
      </div>
    )
  }

  if (state === 'migrating') {
    return (
      <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-yellow-800">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-yellow-600" />
          <span className="text-sm font-medium">Migration läuft…</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" disabled className="bg-yellow-600 text-white opacity-50">
            Migrieren
          </Button>
          <Button size="sm" variant="ghost" disabled className="text-yellow-700 opacity-50">
            Später
          </Button>
        </div>
      </div>
    )
  }

  if (state === 'success') {
    return (
      <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-green-800">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
          <span className="text-sm font-medium">
            Migration erfolgreich. Alle Projekte wurden übertragen.
          </span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDismissSuccess}
          className="shrink-0 text-green-700 hover:bg-green-100 hover:text-green-900"
          aria-label="Erfolgsmeldung schließen"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  // state === 'error'
  return (
    <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-800">
      <div className="flex items-center gap-2">
        <XCircle className="h-4 w-4 shrink-0 text-red-600" />
        <span className="text-sm font-medium">
          Migration fehlgeschlagen. Ihre lokalen Daten sind noch vorhanden.
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          size="sm"
          onClick={handleMigrate}
          className="bg-red-600 text-white hover:bg-red-700"
        >
          Erneut versuchen
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCancel}
          className="text-red-700 hover:bg-red-100 hover:text-red-900"
        >
          Abbrechen
        </Button>
      </div>
    </div>
  )
}
