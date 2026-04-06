'use client'

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { TableCell, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { LVPosition } from '@/contexts/lv-context'
import { formatEuro, parsePrice, calcGP } from '@/lib/kalkulation'

interface KalkulationsRowProps {
  position: LVPosition
  onUpdateEP: (id: string, ep: number) => void
  onUpdateMenge?: (id: string, menge: string) => void
  onUpdateEinheit?: (id: string, einheit: string) => void
  onFocusNext: () => void
  onInsertAfter: (id: string) => void
  onDelete: (id: string) => void
  epRef?: (el: HTMLInputElement | null) => void
  readOnly?: boolean
}

const KONFIDENZ_LABEL: Record<string, string> = {
  hoch: 'Hohe Übereinstimmung',
  mittel: 'Mittlere Übereinstimmung',
  niedrig: 'Niedrige Übereinstimmung',
}

const BKI_LABELS = ['Min', '25%', 'Mittel', '75%', 'Max']

export function KalkulationsRow({ position, onUpdateEP, onUpdateMenge, onUpdateEinheit, onFocusNext, onInsertAfter, onDelete, epRef, readOnly = false }: KalkulationsRowProps) {
  const [inputValue, setInputValue] = useState(
    position.einheitspreis > 0 ? String(position.einheitspreis).replace('.', ',') : ''
  )
  const [isFocused, setIsFocused] = useState(false)
  const [mengeValue, setMengeValue] = useState(position.menge)
  const [einheitValue, setEinheitValue] = useState(position.einheit)

  useEffect(() => { setMengeValue(position.menge) }, [position.menge])
  useEffect(() => { setEinheitValue(position.einheit) }, [position.einheit])
  const [hovered, setHovered] = useState(false)
  const [descExpanded, setDescExpanded] = useState(false)
  const [bkiIdx, setBkiIdx] = useState(2) // Mittelwert als Default
  const inputRef = useRef<HTMLInputElement>(null)

  // BUG-PROJ3-10: Index auf Mittelwert zurücksetzen wenn neue BKI-Preise ankommen
  useEffect(() => {
    setBkiIdx(2)
  }, [position.bkiPreise])

  const ep = position.einheitspreis
  const gp = calcGP(position.menge, ep)
  const isUnpriced = ep === 0
  const isHighPrice = ep > 1_000_000
  const mengeNichtNumerisch = gp === null

  function handleBlur() {
    setIsFocused(false)
    const parsed = parsePrice(inputValue)
    if (parsed < 0) return
    onUpdateEP(position.id, parsed)
    setInputValue(parsed > 0 ? String(parsed).replace('.', ',') : '')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      inputRef.current?.blur()
      // BUG-PROJ3-12: setTimeout stellt sicher dass blur + State-Update
      // abgeschlossen sind bevor focus() auf das nächste Feld gesetzt wird
      setTimeout(() => onFocusNext(), 0)
    }
  }

  function handleBkiScroll(direction: -1 | 1) {
    if (!position.bkiPreise) return
    const newIdx = Math.max(0, Math.min(4, bkiIdx + direction))
    setBkiIdx(newIdx)
    // BUG-PROJ3-11: Preis validieren bevor er als EP gesetzt wird
    const raw = position.bkiPreise[newIdx]
    const validated = isFinite(raw) ? Math.max(0, raw) : 0
    onUpdateEP(position.id, validated)
    setInputValue(validated > 0 ? String(validated).replace('.', ',') : '')
  }

  const hasLang = !!position.langbeschreibung

  return (
    <TableRow
      className={isUnpriced ? 'bg-amber-50/50 relative group' : 'relative group'}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <TableCell className="w-28 font-mono text-sm text-muted-foreground align-top pt-3">
        {position.positionsnummer || '—'}
      </TableCell>

      {/* Beschreibung: 2 Zeilen sichtbar, Rest aufklappbar */}
      <TableCell className="max-w-xs align-top pt-2">
        <div>
          <p className={['font-medium text-sm', descExpanded ? '' : 'line-clamp-2'].join(' ')}>
            {position.kurzbeschreibung}
          </p>
          {hasLang && (
            <p className={['text-xs text-muted-foreground mt-0.5', descExpanded ? '' : 'line-clamp-2'].join(' ')}>
              {position.langbeschreibung}
            </p>
          )}
          {(hasLang || (position.kurzbeschreibung && position.kurzbeschreibung.length > 80)) && (
            <button
              type="button"
              onClick={() => setDescExpanded((v) => !v)}
              className="mt-0.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 focus:outline-none"
            >
              {descExpanded ? (
                <><ChevronUp className="h-3 w-3" /> Weniger</>
              ) : (
                <><ChevronDown className="h-3 w-3" /> Mehr</>
              )}
            </button>
          )}
        </div>
      </TableCell>

      <TableCell className="w-20 text-right align-top pt-2">
        {readOnly ? (
          <span className="text-sm">{position.menge || '—'}</span>
        ) : (
          <Input
            type="text"
            value={mengeValue}
            onChange={(e) => setMengeValue(e.target.value)}
            onBlur={() => onUpdateMenge?.(position.id, mengeValue)}
            className="h-8 text-right text-sm"
            aria-label={`Menge für ${position.kurzbeschreibung}`}
          />
        )}
      </TableCell>
      <TableCell className="w-16 align-top pt-2">
        {readOnly ? (
          <span className="text-sm text-muted-foreground">{position.einheit || '—'}</span>
        ) : (
          <Input
            type="text"
            value={einheitValue}
            onChange={(e) => setEinheitValue(e.target.value)}
            onBlur={() => onUpdateEinheit?.(position.id, einheitValue)}
            className="h-8 text-sm"
            aria-label={`Einheit für ${position.kurzbeschreibung}`}
          />
        )}
      </TableCell>

      {/* BKI Preis-Scroller + EP-Eingabe */}
      <TableCell className="w-44 align-top pt-2">
        {/* BKI Konfidenz / Quelle */}
        {position.bkiKonfidenz === 'schätzung' ? (
          <p className="text-xs text-amber-600 mb-1">Marktschätzung</p>
        ) : position.bkiPositionsnummer ? (
          <p className="text-xs text-muted-foreground mb-1">
            <span className="font-mono">{position.bkiPositionsnummer}</span>
            {position.bkiBeschreibung && ` · ${position.bkiBeschreibung}`}
            {position.bkiKonfidenz && KONFIDENZ_LABEL[position.bkiKonfidenz] && (
              <span className="ml-1 text-muted-foreground/60">({KONFIDENZ_LABEL[position.bkiKonfidenz]})</span>
            )}
          </p>
        ) : null}

        {/* 5 BKI Netto-Preise scrollbar */}
        {position.bkiPreise && !readOnly && (
          <div className="flex items-center gap-1 mb-1.5">
            <button
              type="button"
              onClick={() => handleBkiScroll(-1)}
              disabled={bkiIdx === 0}
              className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none"
              tabIndex={-1}
              aria-label="Günstigerer BKI-Preis"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <div className="text-center min-w-[72px]">
              <p className="text-[10px] font-medium text-muted-foreground leading-none">{BKI_LABELS[bkiIdx]} (Netto)</p>
              <p className="text-xs font-semibold leading-tight mt-0.5 text-foreground">
                {formatEuro(position.bkiPreise[bkiIdx])}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleBkiScroll(1)}
              disabled={bkiIdx === 4}
              className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none"
              tabIndex={-1}
              aria-label="Teurerer BKI-Preis"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* EP Eingabe */}
        <div className="flex items-center gap-1">
          <Input
            ref={(el) => { (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el; epRef?.(el) }}
            type="text"
            inputMode="decimal"
            placeholder={position.bkiVorschlag ? formatEuro(position.bkiVorschlag) : '0,00'}
            value={isFocused ? inputValue : ep > 0 ? formatEuro(ep) : ''}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => {
              if (readOnly) return
              setIsFocused(true)
              setInputValue(ep > 0 ? String(ep).replace('.', ',') : '')
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            readOnly={readOnly}
            className={[
              'h-8 text-right text-sm',
              isUnpriced ? 'border-amber-300 bg-amber-50 placeholder:text-amber-400' : '',
              readOnly ? 'cursor-default opacity-75' : '',
            ].join(' ')}
            aria-label={`Einheitspreis Netto für ${position.kurzbeschreibung}`}
          />
          {isHighPrice && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                </TooltipTrigger>
                <TooltipContent>Ungewöhnlich hoher Preis (&gt; 1.000.000 €)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </TableCell>

      {/* Netto (€) = Menge × EP */}
      <TableCell className="w-32 text-right text-sm font-medium align-top pt-3">
        {mengeNichtNumerisch ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground cursor-help">—</span>
              </TooltipTrigger>
              <TooltipContent>Menge ist nicht numerisch — Betrag kann nicht berechnet werden</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className={gp === 0 ? 'text-muted-foreground' : ''}>
            {formatEuro(gp ?? 0)}
          </span>
        )}
      </TableCell>

      {/* Brutto (€) = Netto × 1,19 */}
      <TableCell className="w-32 text-right text-sm font-medium align-top pt-3">
        {mengeNichtNumerisch ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className={gp === 0 ? 'text-muted-foreground' : ''}>
            {formatEuro((gp ?? 0) * 1.19)}
          </span>
        )}
      </TableCell>

      {/* Aktionen: Einfügen + Löschen */}
      <TableCell className="w-16 p-0 align-top pt-2">
        {hovered && !readOnly && (
          <div className="flex items-center gap-0.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={() => onInsertAfter(position.id)}
                    tabIndex={-1}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Position darunter einfügen</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => onDelete(position.id)}
                    tabIndex={-1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Position löschen</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </TableCell>
    </TableRow>
  )
}
