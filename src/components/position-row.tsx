'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { TableCell, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { LVPosition } from '@/contexts/lv-context'

interface PositionRowProps {
  position: LVPosition
  onUpdate: (id: string, changes: Partial<LVPosition>) => void
  onDelete: (id: string) => void
  onRequestDelete: (id: string) => void
}

type Field = keyof Pick<LVPosition, 'positionsnummer' | 'kurzbeschreibung' | 'menge' | 'einheit'>

const FIELDS: Field[] = ['positionsnummer', 'kurzbeschreibung', 'menge', 'einheit']

export function PositionRow({ position, onUpdate, onRequestDelete }: PositionRowProps) {
  const [editingField, setEditingField] = useState<Field | null>(null)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit(field: Field) {
    setEditingField(field)
    setDraft(position[field])
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function commitEdit() {
    if (editingField) {
      onUpdate(position.id, { [editingField]: draft })
      setEditingField(null)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      commitEdit()
      if (editingField) {
        const idx = FIELDS.indexOf(editingField)
        const nextField = FIELDS[idx + 1]
        if (nextField) startEdit(nextField)
      }
    }
    if (e.key === 'Escape') {
      setEditingField(null)
    }
  }

  function renderCell(field: Field, className?: string) {
    const value = position[field]
    if (editingField === field) {
      return (
        <Input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          className="h-7 text-sm px-1"
        />
      )
    }
    return (
      <span
        onClick={() => startEdit(field)}
        className={[
          'block cursor-pointer rounded px-1 py-0.5 -mx-1',
          'hover:bg-muted transition-colors min-h-[1.5rem]',
          !value ? 'text-muted-foreground italic' : '',
          className ?? '',
        ].join(' ')}
      >
        {value || '—'}
      </span>
    )
  }

  return (
    <TableRow className="group">
      <TableCell className="w-28 font-mono text-sm">
        {renderCell('positionsnummer')}
      </TableCell>
      <TableCell>
        {renderCell('kurzbeschreibung')}
        {position.langbeschreibung && (
          <span className="block text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {position.langbeschreibung}
          </span>
        )}
      </TableCell>
      <TableCell className="w-24 text-right">
        {renderCell('menge', 'text-right')}
      </TableCell>
      <TableCell className="w-20">
        {renderCell('einheit')}
      </TableCell>
      <TableCell className="w-12 text-right">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
          onClick={() => onRequestDelete(position.id)}
          aria-label="Position löschen"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  )
}
