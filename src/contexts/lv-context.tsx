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
}

interface LVContextType {
  positionen: LVPosition[]
  setPositionen: (positionen: LVPosition[]) => void
  updatePosition: (id: string, changes: Partial<LVPosition>) => void
  addPosition: () => void
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

  const deletePosition = useCallback((id: string) => {
    setPositionen((prev) => prev.filter((p) => p.id !== id))
  }, [])

  return (
    <LVContext.Provider value={{ positionen, setPositionen, updatePosition, addPosition, deletePosition }}>
      {children}
    </LVContext.Provider>
  )
}

export function useLV() {
  const ctx = useContext(LVContext)
  if (!ctx) throw new Error('useLV muss innerhalb von LVProvider verwendet werden')
  return ctx
}
