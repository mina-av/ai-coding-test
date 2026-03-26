'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Info } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import { useLV } from '@/contexts/lv-context'
import { KalkulationsRow } from '@/components/kalkulations-row'
import { ExportModal, ExportFormData } from '@/components/export-modal'
import { AngebotPDF } from '@/components/angebot-pdf'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table'
import { formatEuro, calcAngebotssumme } from '@/lib/kalkulation'

function sanitizeFilename(s: string): string {
  return s.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

export default function KalkulationPage() {
  const { positionen, updatePosition } = useLV()
  const router = useRouter()
  const rowRefs = useRef<(HTMLInputElement | null)[]>([])
  const [exportOpen, setExportOpen] = useState(false)

  const ohnePreis = positionen.filter((p) => p.einheitspreis === 0).length
  const angebotssumme = calcAngebotssumme(positionen)
  const hatPreise = positionen.some((p) => p.einheitspreis > 0)

  async function handleExport(data: ExportFormData) {
    const blob = await pdf(
      <AngebotPDF
        projektname={data.projektname}
        kundenname={data.kundenname}
        datum={data.datum}
        positionen={positionen}
        ohnePreis={data.ohnePreis}
      />
    ).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Angebot_${sanitizeFilename(data.projektname)}_${data.datum}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }
  const alleOhnePreis = positionen.length > 0 && ohnePreis === positionen.length

  function focusRow(index: number) {
    const next = rowRefs.current[index]
    if (next) next.focus()
  }

  if (positionen.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="max-w-5xl mx-auto px-6 py-4">
            <h1 className="text-xl font-semibold tracking-tight">BKI Angebots-Tool</h1>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-6 py-16 flex flex-col items-center gap-4 text-center">
          <p className="text-muted-foreground">Keine Positionen vorhanden.</p>
          <Button variant="outline" onClick={() => router.push('/upload')}>
            LV hochladen
          </Button>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">BKI Angebots-Tool</h1>
          <Button variant="outline" size="sm" onClick={() => router.push('/positionen')}>
            Zurück zu Positionen
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">Angebotskalkulation</h2>
            <p className="text-muted-foreground mt-1">
              {positionen.length} Positionen
            </p>
          </div>
          {ohnePreis > 0 && (
            <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">
              {ohnePreis} Position{ohnePreis !== 1 ? 'en' : ''} ohne Preis
            </Badge>
          )}
        </div>

        {/* BKI-Hinweis (solange Backend nicht verfügbar) */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            BKI-Preisvorschläge werden verfügbar, sobald das Backend eingerichtet ist.
            Bitte Einheitspreise manuell eingeben.
          </AlertDescription>
        </Alert>

        {/* Warnung wenn alle EP = 0 */}
        {alleOhnePreis && (
          <Alert variant="destructive">
            <AlertDescription>
              Keine Preise eingegeben. Bitte Einheitspreise für alle Positionen eintragen.
            </AlertDescription>
          </Alert>
        )}

        {/* Tabelle */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Pos.-Nr.</TableHead>
                <TableHead>Beschreibung</TableHead>
                <TableHead className="w-20 text-right">Menge</TableHead>
                <TableHead className="w-16">Einheit</TableHead>
                <TableHead className="w-32 text-right">Einheitspreis Netto</TableHead>
                <TableHead className="w-36 text-right">Netto (€)</TableHead>
                <TableHead className="w-32 text-right">Brutto (€)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positionen.map((pos, idx) => (
                <KalkulationsRow
                  key={pos.id}
                  position={pos}
                  onUpdateEP={(id, ep) => updatePosition(id, { einheitspreis: ep })}
                  onFocusNext={() => focusRow(idx + 1)}
                />
              ))}
              {/* Summenzeile */}
              <TableRow className="border-t-2 font-semibold bg-muted/30">
                <TableCell colSpan={6} className="text-right text-sm text-muted-foreground">
                  Angebotssumme Netto
                </TableCell>
                <TableCell className="text-right">
                  {formatEuro(angebotssumme)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Angebotssumme prominent */}
        <div className="flex justify-end">
          <div className="rounded-lg border bg-card px-8 py-5 text-right shadow-sm min-w-72 space-y-2">
            <div className="flex justify-between gap-12 text-sm">
              <span className="text-muted-foreground">Angebotssumme Netto</span>
              <span className="font-medium">{formatEuro(angebotssumme)}</span>
            </div>
            <div className="flex justify-between gap-12 text-sm">
              <span className="text-muted-foreground">enthaltene MwSt. (19 %)</span>
              <span className="font-medium">{formatEuro(angebotssumme * 0.19)}</span>
            </div>
            <div className="flex justify-between gap-12 border-t pt-2">
              <span className="font-semibold">Brutto</span>
              <span className="text-xl font-bold">{formatEuro(angebotssumme * 1.19)}</span>
            </div>
            {ohnePreis > 0 && (
              <p className="text-xs text-amber-600 pt-1">
                inkl. {ohnePreis} Position{ohnePreis !== 1 ? 'en' : ''} ohne Preis
              </p>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-end pt-2">
          <Button onClick={() => setExportOpen(true)} disabled={positionen.length === 0}>
            Angebot exportieren
          </Button>
        </div>
      </main>

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onExport={handleExport}
        positionen={positionen}
      />
    </div>
  )
}
