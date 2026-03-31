'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UploadZone } from '@/components/upload-zone'
import { ExtractionProgress } from '@/components/extraction-progress'
import { ErrorAlert } from '@/components/error-alert'
import { useLV } from '@/contexts/lv-context'

type PageState = 'idle' | 'extracting' | 'error'

export default function UploadPage() {
  const [state, setState] = useState<PageState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const { setPositionen } = useLV()
  const router = useRouter()

  async function handleFileSelect(file: File) {
    setState('extracting')
    setErrorMessage('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'x-api-key': process.env.NEXT_PUBLIC_EXTRACT_API_KEY ?? '' },
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Unbekannter Fehler bei der Extraktion.')
      }

      const { positionen } = await res.json()
      setPositionen(positionen)
      router.push('/positionen')
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Verbindungsfehler. Bitte erneut versuchen.'
      )
      setState('error')
    }
  }

  function handleRetry() {
    setState('idle')
    setErrorMessage('')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <h1 className="text-xl font-semibold tracking-tight">BKI Angebots-Tool</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold">Leistungsverzeichnis hochladen</h2>
          <p className="text-muted-foreground mt-1">
            Laden Sie ein LV als PDF hoch. Die KI erkennt alle Positionen automatisch.
          </p>
        </div>

        {state === 'idle' && <UploadZone onFileSelect={handleFileSelect} />}
        {state === 'extracting' && <ExtractionProgress />}
        {state === 'error' && (
          <ErrorAlert message={errorMessage} onRetry={handleRetry} />
        )}
      </main>
    </div>
  )
}
