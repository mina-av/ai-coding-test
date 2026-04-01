'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react'
import { LVPosition } from './lv-context'

export interface Projekt {
  id: string
  name: string
  status: 'in-bearbeitung' | 'abgeschlossen'
  createdAt: string
  updatedAt: string
  positionen: LVPosition[]
}

const STORAGE_KEY = 'bki-projekte'

interface ProjekteContextType {
  projekte: Projekt[]
  activeProjectId: string | null
  setActiveProjectId: (id: string | null) => void
  createProject: (name: string, positionen: LVPosition[]) => string
  updateActiveProject: (positionen: LVPosition[]) => void
  renameProject: (id: string, name: string) => void
  deleteProject: (id: string) => void
  setProjectStatus: (id: string, status: Projekt['status']) => void
  storageError: string | null
  clearStorageError: () => void
}

const ProjekteContext = createContext<ProjekteContextType | null>(null)

export function ProjekteProvider({ children }: { children: ReactNode }) {
  const [projekte, setProjekte] = useState<Projekt[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [storageError, setStorageError] = useState<string | null>(null)
  const activeProjectIdRef = useRef<string | null>(null)

  useEffect(() => { activeProjectIdRef.current = activeProjectId }, [activeProjectId])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setProjekte(JSON.parse(raw))
    } catch {}
  }, [])

  function persist(updated: Projekt[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch {
      setStorageError('Speicher ist voll. Bitte löschen Sie alte Projekte.')
    }
    setProjekte(updated)
  }

  const createProject = useCallback((name: string, positionen: LVPosition[]): string => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const neu: Projekt = { id, name, status: 'in-bearbeitung', createdAt: now, updatedAt: now, positionen }
    setProjekte(prev => {
      const updated = [neu, ...prev]
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch {
        setStorageError('Speicher ist voll. Bitte löschen Sie alte Projekte.')
      }
      return updated
    })
    setActiveProjectId(id)
    activeProjectIdRef.current = id
    return id
  }, [])

  const updateActiveProject = useCallback((positionen: LVPosition[]) => {
    const id = activeProjectIdRef.current
    if (!id) return
    setProjekte(prev => {
      const updated = prev.map(p =>
        p.id === id ? { ...p, positionen, updatedAt: new Date().toISOString() } : p
      )
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch {
        setStorageError('Speicher ist voll. Bitte löschen Sie alte Projekte.')
      }
      return updated
    })
  }, [])

  const renameProject = useCallback((id: string, name: string) => {
    setProjekte(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, name, updatedAt: new Date().toISOString() } : p)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch {}
      return updated
    })
  }, [])

  const deleteProject = useCallback((id: string) => {
    setProjekte(prev => {
      const updated = prev.filter(p => p.id !== id)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch {}
      return updated
    })
    if (activeProjectIdRef.current === id) {
      setActiveProjectId(null)
      activeProjectIdRef.current = null
    }
  }, [])

  const setProjectStatus = useCallback((id: string, status: Projekt['status']) => {
    setProjekte(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, status, updatedAt: new Date().toISOString() } : p)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch {}
      return updated
    })
  }, [])

  return (
    <ProjekteContext.Provider value={{
      projekte,
      activeProjectId,
      setActiveProjectId,
      createProject,
      updateActiveProject,
      renameProject,
      deleteProject,
      setProjectStatus,
      storageError,
      clearStorageError: () => setStorageError(null),
    }}>
      {children}
    </ProjekteContext.Provider>
  )
}

export function useProjekte() {
  const ctx = useContext(ProjekteContext)
  if (!ctx) throw new Error('useProjekte muss innerhalb von ProjekteProvider verwendet werden')
  return ctx
}
