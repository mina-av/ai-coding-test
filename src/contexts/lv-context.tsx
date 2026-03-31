'use client'

import { createContext, useContext, useState, ReactNode, useCallback } from 'react'

export interface LVPosition {
  id: string
  positionsnummer: string
  kurzbeschreibung: string
  langbeschreibung?: string
  menge: string
  einheit: string
  einheitspreis: number
  bkiVorschlag?: number
  bkiKonfidenz?: 'hoch' | 'mittel' | 'niedrig' | 'schätzung'
  bkiPositionsnummer?: string
  bkiBeschreibung?: string
}

interface LVContextType {
  positionen: LVPosition[]
  setPositionen: (positionen: LVPosition[]) => void
  updatePosition: (id: string, changes: Partial<LVPosition>) => void
  addPosition: () => void
  insertAfter: (id: string) => void
  deletePosition: (id: string) => void
}

const LVContext = createContext<LVContextType | null>(null)

let nextId = 1000

export function LVProvider({ children }: { children: ReactNode }) {
  const [positionen, setPositionen] = useState<LVPosition[]>([])

  const updatePosition = useCallback((id: string, changes: Partial<LVPosition>) => {
    setPositionen((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...changes } : p))
    )
  }, [])

  const addPosition = useCallback(() => {
    const newPos: LVPosition = {
      id: String(nextId++),
      positionsnummer: '',
      kurzbeschreibung: '',
      langbeschreibung: '',
      menge: '',
      einheit: '',
      einheitspreis: 0,
    }
    setPositionen((prev) => [...prev, newPos])
  }, [])

  const insertAfter = useCallback((id: string) => {
    const newPos: LVPosition = {
      id: String(nextId++),
      positionsnummer: '',
      kurzbeschreibung: '',
      langbeschreibung: '',
      menge: '',
      einheit: '',
      einheitspreis: 0,
    }
    setPositionen((prev) => {
      const idx = prev.findIndex((p) => p.id === id)
      if (idx === -1) return [...prev, newPos]
      return [...prev.slice(0, idx + 1), newPos, ...prev.slice(idx + 1)]
    })
  }, [])

  const deletePosition = useCallback((id: string) => {
    setPositionen((prev) => prev.filter((p) => p.id !== id))
  }, [])

  return (
    <LVContext.Provider value={{ positionen, setPositionen, updatePosition, addPosition, insertAfter, deletePosition }}>
      {children}
    </LVContext.Provider>
  )
}

export function useLV() {
  const ctx = useContext(LVContext)
  if (!ctx) throw new Error('useLV muss innerhalb von LVProvider verwendet werden')
  return ctx
}
