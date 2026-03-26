'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { AlertTriangle } from 'lucide-react'
import { TableCell, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { LVPosition } from '@/contexts/lv-context'
import { formatEuro, parsePrice, calcGP } from '@/lib/kalkulation'

interface KalkulationsRowProps {
  position: LVPosition
  onUpdateEP: (id: string, ep: number) => void
  onFocusNext: () => void
}

const KONFIDENZ_LABEL: Record<string, string> = {
  hoch: 'Hohe Übereinstimmung',
  mittel: 'Mittlere Übereinstimmung',
  niedrig: 'Niedrige Übereinstimmung',
}

export function KalkulationsRow({ position, onUpdateEP, onFocusNext }: KalkulationsRowProps) {
  const [inputValue, setInputValue] = useState(
    position.einheitspreis > 0 ? String(position.einheitspreis).replace('.', ',') : ''
  )
  const [isFocused, setIsFocused] = useState(false)
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
    <TableRow className={isUnpriced ? 'bg-amber-50/50' : undefined}>
      <TableCell className="w-28 font-mono text-sm text-muted-foreground">
        {position.positionsnummer || '—'}
      </TableCell>
      <TableCell className="max-w-xs">
        <span className="font-medium line-clamp-1">{position.kurzbeschreibung}</span>
      </TableCell>
      <TableCell className="w-20 text-right text-sm">
        {position.menge || '—'}
      </TableCell>
      <TableCell className="w-16 text-sm text-muted-foreground">
        {position.einheit || '—'}
      </TableCell>

      {/* BKI-Vorschlag */}
      <TableCell className="w-32 text-right">
        {position.bkiVorschlag !== undefined ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-sm text-muted-foreground cursor-help">
                  {formatEuro(position.bkiVorschlag)}
                  {position.bkiKonfidenz && (
                    <Badge variant="outline" className="ml-1 text-xs py-0">
                      {position.bkiKonfidenz}
                    </Badge>
                  )}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {position.bkiKonfidenz
                  ? KONFIDENZ_LABEL[position.bkiKonfidenz]
                  : 'BKI-Vorschlag'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="text-xs text-muted-foreground/50">—</span>
        )}
      </TableCell>

      {/* EP-Eingabe */}
      <TableCell className="w-36">
        <div className="flex items-center gap-1">
          <Input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={isFocused ? inputValue : ep > 0 ? formatEuro(ep) : ''}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => {
              setIsFocused(true)
              setInputValue(ep > 0 ? String(ep).replace('.', ',') : '')
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={[
              'h-8 text-right text-sm',
              isUnpriced ? 'border-amber-300 bg-amber-50 placeholder:text-amber-400' : '',
            ].join(' ')}
            aria-label={`Einheitspreis für ${position.kurzbeschreibung}`}
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

      {/* GP */}
      <TableCell className="w-32 text-right text-sm font-medium">
        {mengeNichtNumerisch ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground cursor-help">—</span>
              </TooltipTrigger>
              <TooltipContent>Menge ist nicht numerisch — GP kann nicht berechnet werden</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className={gp === 0 ? 'text-muted-foreground' : ''}>
            {formatEuro(gp ?? 0)}
          </span>
        )}
      </TableCell>
    </TableRow>
  )
}
