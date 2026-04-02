'use client'

import React, { useState, useRef, KeyboardEvent } from 'react'
import { AlertTriangle, Plus, Trash2 } from 'lucide-react'
import { TableCell, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { LVPosition } from '@/contexts/lv-context'
import { formatEuro, parsePrice, calcGP } from '@/lib/kalkulation'

interface KalkulationsRowProps {
  position: LVPosition
  onUpdateEP: (id: string, ep: number) => void
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

export function KalkulationsRow({ position, onUpdateEP, onFocusNext, onInsertAfter, onDelete, epRef, readOnly = false }: KalkulationsRowProps) {
  const [inputValue, setInputValue] = useState(
    position.einheitspreis > 0 ? String(position.einheitspreis).replace('.', ',') : ''
  )
  const [isFocused, setIsFocused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

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
      onFocusNext()
    }
  }

  return (
    <TableRow
      className={isUnpriced ? 'bg-amber-50/50 relative group' : 'relative group'}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <TableCell className="w-28 font-mono text-sm text-muted-foreground">
        {position.positionsnummer || '—'}
      </TableCell>
      <TableCell className="max-w-xs">
        <span className="font-medium line-clamp-2">{position.kurzbeschreibung}</span>
        {position.langbeschreibung && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {position.langbeschreibung}
          </p>
        )}
      </TableCell>
      <TableCell className="w-20 text-right text-sm">
        {position.menge || '—'}
      </TableCell>
      <TableCell className="w-16 text-sm text-muted-foreground">
        {position.einheit || '—'}
      </TableCell>

      {/* Einheitspreis Netto — editierbar, BKI-Preis als Vorschlag */}
      <TableCell className="w-36">
        {position.bkiKonfidenz === 'schätzung' ? (
          <p className="text-xs text-amber-600 mb-1">Marktschätzung</p>
        ) : position.bkiPositionsnummer ? (
          <p className="text-xs text-muted-foreground mb-1">
            <span className="font-mono">{position.bkiPositionsnummer}</span>
            {position.bkiBeschreibung && ` · ${position.bkiBeschreibung}`}
          </p>
        ) : null}
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
      <TableCell className="w-32 text-right text-sm font-medium">
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
      <TableCell className="w-32 text-right text-sm font-medium">
        {mengeNichtNumerisch ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className={gp === 0 ? 'text-muted-foreground' : ''}>
            {formatEuro((gp ?? 0) * 1.19)}
          </span>
        )}
      </TableCell>

      {/* Aktionen: Einfügen + Löschen */}
      <TableCell className="w-16 p-0">
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
