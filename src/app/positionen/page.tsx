'use client'

import { useRouter } from 'next/navigation'
import { useLV } from '@/contexts/lv-context'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function PositionenPage() {
  const { positionen } = useLV()
  const router = useRouter()

  if (positionen.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="max-w-5xl mx-auto px-6 py-4">
            <h1 className="text-xl font-semibold tracking-tight">BKI Angebots-Tool</h1>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-6 py-12 text-center">
          <p className="text-muted-foreground mb-4">Keine Positionen vorhanden.</p>
          <Button onClick={() => router.push('/upload')}>Zurück zum Upload</Button>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">BKI Angebots-Tool</h1>
          <Button variant="outline" size="sm" onClick={() => router.push('/upload')}>
            Neues LV hochladen
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Leistungsverzeichnis</h2>
          <p className="text-muted-foreground mt-1">{positionen.length} Positionen extrahiert</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Pos.-Nr.</TableHead>
              <TableHead>Beschreibung</TableHead>
              <TableHead className="w-24 text-right">Menge</TableHead>
              <TableHead className="w-20">Einheit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positionen.map((pos) => (
              <TableRow key={pos.id}>
                <TableCell className="font-mono text-sm">{pos.positionsnummer || '—'}</TableCell>
                <TableCell>
                  <div className="font-medium">{pos.kurzbeschreibung}</div>
                  {pos.langbeschreibung && (
                    <div className="text-sm text-muted-foreground mt-0.5">{pos.langbeschreibung}</div>
                  )}
                </TableCell>
                <TableCell className="text-right">{pos.menge}</TableCell>
                <TableCell>{pos.einheit}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </main>
    </div>
  )
}
