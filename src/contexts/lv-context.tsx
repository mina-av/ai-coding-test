'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

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
}

const LVContext = createContext<LVContextType | null>(null)

export function LVProvider({ children }: { children: ReactNode }) {
  const [positionen, setPositionen] = useState<LVPosition[]>([])

  return (
    <LVContext.Provider value={{ positionen, setPositionen }}>
      {children}
    </LVContext.Provider>
  )
}

export function useLV() {
  const ctx = useContext(LVContext)
  if (!ctx) throw new Error('useLV muss innerhalb von LVProvider verwendet werden')
  return ctx
}
