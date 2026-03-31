'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LVPosition } from '@/contexts/lv-context'

export type OhnePreisOption = 'ausblenden' | 'auf-anfrage'

export interface ExportFormData {
  projektname: string
  kundenname: string
  kundenadresse: string
  objektnummer: string
  angebotsnummer: string
  datum: string
  ohnePreis: OhnePreisOption
}

interface ExportModalProps {
  open: boolean
  onClose: () => void
  onExport: (data: ExportFormData) => Promise<void>
  positionen: LVPosition[]
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function generateAngebotsnummer() {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const rand = String(Math.floor(1000 + Math.random() * 9000))
  return `ANG-${ymd}-${rand}`
}

export function ExportModal({ open, onClose, onExport, positionen }: ExportModalProps) {
  const [projektname, setProjektname] = useState('')
  const [kundenname, setKundenname] = useState('')
  const [kundenadresse, setKundenadresse] = useState('')
  const [objektnummer, setObjektnummer] = useState('')
  const [angebotsnummer] = useState(generateAngebotsnummer)
  const [datum, setDatum] = useState(todayISO)
  const [ohnePreis, setOhnePreis] = useState<OhnePreisOption>('ausblenden')
  const [loading, setLoading] = useState(false)

  const alleOhnePreis = positionen.every((p) => p.einheitspreis === 0)
  const canExport = projektname.trim() !== '' && kundenname.trim() !== ''

  async function handleExport() {
    if (!canExport) return
    setLoading(true)
    try {
      await onExport({
        projektname: projektname.trim(),
        kundenname: kundenname.trim(),
        kundenadresse: kundenadresse.trim(),
        objektnummer: objektnummer.trim(),
        angebotsnummer,
        datum,
        ohnePreis,
      })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !loading && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Angebot exportieren</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {alleOhnePreis && (
            <Alert variant="destructive">
              <AlertDescription>
                Alle Preise sind 0. Wirklich exportieren?
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="projektname">Projektname *</Label>
            <Input
              id="projektname"
              value={projektname}
              onChange={(e) => setProjektname(e.target.value)}
              placeholder="z.B. Neubau Musterstraße 5"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="kundenname">Kundenname *</Label>
            <Input
              id="kundenname"
              value={kundenname}
              onChange={(e) => setKundenname(e.target.value)}
              placeholder="z.B. Max Mustermann"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="kundenadresse">Kundenadresse</Label>
            <Input
              id="kundenadresse"
              value={kundenadresse}
              onChange={(e) => setKundenadresse(e.target.value)}
              placeholder="z.B. Musterstraße 1, 12345 Berlin"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="objektnummer">Objektnummer</Label>
            <Input
              id="objektnummer"
              value={objektnummer}
              onChange={(e) => setObjektnummer(e.target.value)}
              placeholder="z.B. OBJ-2026-001"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="angebotsnummer">Angebotsnummer</Label>
            <Input id="angebotsnummer" value={angebotsnummer} readOnly className="bg-muted" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="datum">Datum</Label>
            <Input
              id="datum"
              type="date"
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label>Positionen ohne Preis</Label>
            <RadioGroup
              value={ohnePreis}
              onValueChange={(v) => setOhnePreis(v as OhnePreisOption)}
              disabled={loading}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="ausblenden" id="ausblenden" />
                <Label htmlFor="ausblenden" className="font-normal cursor-pointer">Ausblenden</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="auf-anfrage" id="auf-anfrage" />
                <Label htmlFor="auf-anfrage" className="font-normal cursor-pointer">Als "Preis auf Anfrage" anzeigen</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Abbrechen
          </Button>
          <Button onClick={handleExport} disabled={!canExport || loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {loading ? 'Wird generiert...' : 'PDF generieren'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
