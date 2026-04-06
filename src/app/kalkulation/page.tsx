'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import { useUser } from '@/hooks/use-user'
import { useLV } from '@/contexts/lv-context'
import { useProjekte } from '@/contexts/projekte-context'
import { AppHeader } from '@/components/app-header'
import { KalkulationsRow } from '@/components/kalkulations-row'
import { ExportModal, ExportFormData } from '@/components/export-modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table'
import { formatEuro, calcAngebotssumme, calcGP } from '@/lib/kalkulation'

function sanitizeFilename(s: string): string {
  return s.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

export default function KalkulationPage() {
  const { positionen, updatePosition, insertAfter, deletePosition } = useLV()
  const { email, rolle } = useUser()
  const { projekte, activeProjectId, addAngebot } = useProjekte()
  const readOnly = rolle === 'teamleiter'
  const router = useRouter()
  const rowRefs = useRef<(HTMLInputElement | null)[]>([])
  const [exportOpen, setExportOpen] = useState(false)
  const [anfragenOpen, setAnfragenOpen] = useState(false)
  const [bkiLoading, setBkiLoading] = useState(false)
  const [bkiError, setBkiError] = useState<string | null>(null)
  const bkiMatchedRef = useRef(false)

  const aktiveProjekt = projekte.find(p => p.id === activeProjectId)
  const gespeicherteAngebote = aktiveProjekt?.angebote ?? []
  const lastAngebot = gespeicherteAngebote[0]

  async function runBkiMatch() {
    setBkiLoading(true)
    setBkiError(null)
    try {
      const res = await fetch('/api/bki/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_EXTRACT_API_KEY ?? '',
        },
        body: JSON.stringify({ positionen }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'BKI-Matching fehlgeschlagen.')
      }
      const { matches } = await res.json()
      matches.forEach((m: { id: string; bkiVorschlag: number; bkiPreise?: [number, number, number, number, number]; bkiKonfidenz: string; bkiPositionsnummer: string; bkiBeschreibung: string }) => {
        const mittelwert = m.bkiPreise?.[2] ?? m.bkiVorschlag
        updatePosition(m.id, {
          bkiVorschlag: mittelwert || undefined,
          bkiPreise: m.bkiPreise,
          bkiKonfidenz: m.bkiKonfidenz as 'hoch' | 'mittel' | 'niedrig' | 'schätzung',
          bkiPositionsnummer: m.bkiPositionsnummer || undefined,
          bkiBeschreibung: m.bkiBeschreibung || undefined,
          ...(mittelwert > 0 ? { einheitspreis: mittelwert } : {}),
        })
      })
    } catch (err) {
      setBkiError(err instanceof Error ? err.message : 'BKI-Matching fehlgeschlagen.')
    } finally {
      setBkiLoading(false)
    }
  }

  // BKI-Matching nur automatisch auslösen wenn noch keine Preise oder BKI-Daten vorhanden
  useEffect(() => {
    if (bkiMatchedRef.current || positionen.length === 0) return
    const hatBereitsPreise = positionen.some((p) => p.einheitspreis > 0)
    const hatBereitssBkiDaten = positionen.some((p) => p.bkiKonfidenz != null)
    if (hatBereitsPreise || hatBereitssBkiDaten) {
      bkiMatchedRef.current = true // nicht nochmal prüfen
      return
    }
    bkiMatchedRef.current = true
    runBkiMatch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionen])

  const ohnePreis = positionen.filter((p) => p.einheitspreis === 0).length
  const angebotssumme = calcAngebotssumme(positionen)
  const hatPreise = positionen.some((p) => p.einheitspreis > 0)

  async function handleExcelExport() {
    const XLSX = await import('xlsx')
    const rows = positionen.map((p) => {
      const gp = calcGP(p.menge, p.einheitspreis)
      return {
        'Pos.-Nr.': p.positionsnummer,
        'Kurzbeschreibung': p.kurzbeschreibung,
        'Langbeschreibung': p.langbeschreibung ?? '',
        'Menge': p.menge,
        'Einheit': p.einheit,
        'EP Netto (€)': p.einheitspreis > 0 ? p.einheitspreis : '',
        'GP Netto (€)': gp !== null ? gp : '',
        'GP Brutto (€)': gp !== null ? Math.round(gp * 1.19 * 100) / 100 : '',
      }
    })

    const netto = calcAngebotssumme(positionen)
    const mwst = Math.round(netto * 0.19 * 100) / 100
    const brutto = Math.round(netto * 1.19 * 100) / 100

    rows.push({} as typeof rows[0])
    rows.push({ 'Pos.-Nr.': '', 'Kurzbeschreibung': 'Angebotssumme Netto', 'Langbeschreibung': '', 'Menge': '', 'Einheit': '', 'EP Netto (€)': '', 'GP Netto (€)': netto, 'GP Brutto (€)': '' })
    rows.push({ 'Pos.-Nr.': '', 'Kurzbeschreibung': 'MwSt. 19 %', 'Langbeschreibung': '', 'Menge': '', 'Einheit': '', 'EP Netto (€)': '', 'GP Netto (€)': mwst, 'GP Brutto (€)': '' })
    rows.push({ 'Pos.-Nr.': '', 'Kurzbeschreibung': 'Gesamtbetrag Brutto', 'Langbeschreibung': '', 'Menge': '', 'Einheit': '', 'EP Netto (€)': '', 'GP Netto (€)': '', 'GP Brutto (€)': brutto })

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Angebot')
    XLSX.writeFile(wb, `Angebot_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  async function handleExport(data: ExportFormData) {
    const [{ pdf }, { AngebotPDF }] = await Promise.all([
      import('@react-pdf/renderer'),
      import('@/components/angebot-pdf'),
    ])
    const blob = await pdf(
      <AngebotPDF
        projektname={data.projektname}
        kundenname={data.kundenname}
        kundenadresse={data.kundenadresse}
        objektnummer={data.objektnummer}
        angebotsnummer={data.angebotsnummer}
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
    addAngebot(data)
  }
  const alleOhnePreis = positionen.length > 0 && ohnePreis === positionen.length

  function focusRow(index: number) {
    const next = rowRefs.current[index]
    if (next) next.focus()
  }

  if (positionen.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader email={email} rolle={rolle} />
        <main className="max-w-5xl mx-auto px-6 py-16 flex flex-col items-center gap-4 text-center">
          <p className="text-muted-foreground">Keine Positionen vorhanden.</p>
          {!readOnly && (
            <Button variant="outline" onClick={() => router.push('/upload')}>
              LV hochladen
            </Button>
          )}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader email={email} rolle={rolle} />

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

        {/* BKI-Status */}
        {bkiLoading && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              KI sucht passende BKI-Preise… Dies kann einige Sekunden dauern.
            </AlertDescription>
          </Alert>
        )}
        {bkiError && (
          <Alert variant="destructive">
            <AlertDescription>{bkiError}</AlertDescription>
          </Alert>
        )}

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
                <TableHead className="w-44 text-right">Einheitspreis Netto</TableHead>
                <TableHead className="w-32 text-right">Netto (€)</TableHead>
                <TableHead className="w-32 text-right">Brutto (€)</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {positionen.map((pos, idx) => (
                <KalkulationsRow
                  key={pos.id}
                  position={pos}
                  onUpdateEP={(id, ep) => updatePosition(id, { einheitspreis: ep })}
                  onUpdateMenge={(id, menge) => updatePosition(id, { menge })}
                  onUpdateEinheit={(id, einheit) => updatePosition(id, { einheit })}
                  onFocusNext={() => focusRow(idx + 1)}
                  onInsertAfter={insertAfter}
                  onDelete={deletePosition}
                  epRef={(el) => { rowRefs.current[idx] = el }}
                  readOnly={readOnly}
                />
              ))}
              {/* Summenzeile */}
              <TableRow className="border-t-2 font-semibold bg-muted/30">
                <TableCell colSpan={5} className="text-right text-sm text-muted-foreground">
                  Angebotssumme Netto
                </TableCell>
                <TableCell className="text-right">
                  {formatEuro(angebotssumme)}
                </TableCell>
                <TableCell className="text-right">
                  {formatEuro(angebotssumme * 1.19)}
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

        {/* Gespeicherte Anfragen */}
        {gespeicherteAngebote.length > 0 && (
          <div className="rounded-md border">
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
              onClick={() => setAnfragenOpen(v => !v)}
            >
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Gespeicherte Anfragen ({gespeicherteAngebote.length})
              </span>
              {anfragenOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {anfragenOpen && (
              <div className="border-t divide-y">
                {gespeicherteAngebote.map((ang, i) => (
                  <div key={i} className="px-4 py-3 text-sm flex flex-col gap-0.5">
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-medium">{ang.angebotsnummer}</span>
                      <span className="text-muted-foreground text-xs">
                        {new Date(ang.exportedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </span>
                    </div>
                    <span className="text-muted-foreground">{ang.projektname} · {ang.kundenname}</span>
                    {ang.kundenadresse && <span className="text-muted-foreground text-xs">{ang.kundenadresse}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-end gap-2 pt-2">
          {!readOnly && hatPreise && (
            <Button variant="outline" onClick={runBkiMatch} disabled={bkiLoading}>
              {bkiLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />BKI wird aktualisiert…</> : 'BKI-Preise aktualisieren'}
            </Button>
          )}
          <Button variant="outline" onClick={handleExcelExport} disabled={positionen.length === 0}>
            Als Excel exportieren
          </Button>
          {!readOnly && (
            <Button onClick={() => setExportOpen(true)} disabled={positionen.length === 0 || !hatPreise}>
              Angebot exportieren
            </Button>
          )}
        </div>
      </main>

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onExport={handleExport}
        positionen={positionen}
        initialData={lastAngebot}
      />
    </div>
  )
}
