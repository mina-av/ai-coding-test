'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo, ReactNode } from 'react'
import { LVPosition } from './lv-context'
import { createClient } from '@/lib/supabase'

export type OhnePreisOption = 'ausblenden' | 'auf-anfrage'

export interface SavedAngebot {
  projektname: string
  kundenname: string
  kundenadresse: string
  objektnummer: string
  angebotsnummer: string
  datum: string
  ohnePreis: OhnePreisOption
  exportedAt: string
}

export interface Projekt {
  id: string
  name: string
  status: 'in-bearbeitung' | 'abgeschlossen'
  createdAt: string
  updatedAt: string
  positionen: LVPosition[]
  angebote: SavedAngebot[]
}

// ----- snake_case <-> camelCase mapping helpers -----

interface DbPosition {
  id: string
  projekt_id: string
  positionsnummer: string | null
  kurzbeschreibung: string | null
  langbeschreibung: string | null
  menge: string | null
  einheit: string | null
  einheitspreis: number
  bki_vorschlag: number | null
  bki_preise: [number, number, number, number, number] | null
  bki_konfidenz: string | null
  bki_positionsnummer: string | null
  bki_beschreibung: string | null
  sort_order: number
}

interface DbAngebot {
  id: string
  projekt_id: string
  projektname: string | null
  kundenname: string | null
  kundenadresse: string | null
  objektnummer: string | null
  angebotsnummer: string | null
  datum: string | null
  ohne_preis: string | null
  exported_at: string | null
}

interface DbProjekt {
  id: string
  name: string
  status: string
  created_at: string
  updated_at: string
}

function mapDbPositionToLV(db: DbPosition): LVPosition {
  return {
    id: db.id,
    positionsnummer: db.positionsnummer ?? '',
    kurzbeschreibung: db.kurzbeschreibung ?? '',
    langbeschreibung: db.langbeschreibung ?? undefined,
    menge: db.menge ?? '',
    einheit: db.einheit ?? '',
    einheitspreis: db.einheitspreis ?? 0,
    bkiVorschlag: db.bki_vorschlag ?? undefined,
    bkiPreise: db.bki_preise ?? undefined,
    bkiKonfidenz: (db.bki_konfidenz as LVPosition['bkiKonfidenz']) ?? undefined,
    bkiPositionsnummer: db.bki_positionsnummer ?? undefined,
    bkiBeschreibung: db.bki_beschreibung ?? undefined,
  }
}

function mapDbAngebotToSaved(db: DbAngebot): SavedAngebot {
  return {
    projektname: db.projektname ?? '',
    kundenname: db.kundenname ?? '',
    kundenadresse: db.kundenadresse ?? '',
    objektnummer: db.objektnummer ?? '',
    angebotsnummer: db.angebotsnummer ?? '',
    datum: db.datum ?? '',
    ohnePreis: (db.ohne_preis as OhnePreisOption) ?? 'ausblenden',
    exportedAt: db.exported_at ?? '',
  }
}

function mapLVPositionToDb(pos: LVPosition, projektId: string, sortOrder: number) {
  return {
    id: pos.id,
    projekt_id: projektId,
    positionsnummer: pos.positionsnummer,
    kurzbeschreibung: pos.kurzbeschreibung,
    langbeschreibung: pos.langbeschreibung ?? null,
    menge: pos.menge,
    einheit: pos.einheit,
    einheitspreis: pos.einheitspreis,
    bki_vorschlag: pos.bkiVorschlag ?? null,
    bki_preise: pos.bkiPreise ?? null,
    bki_konfidenz: pos.bkiKonfidenz ?? null,
    bki_positionsnummer: pos.bkiPositionsnummer ?? null,
    bki_beschreibung: pos.bkiBeschreibung ?? null,
    sort_order: sortOrder,
  }
}

// ----- Context definition -----

interface ProjekteContextType {
  projekte: Projekt[]
  activeProjectId: string | null
  setActiveProjectId: (id: string | null) => void
  createProject: (name: string, positionen: LVPosition[]) => string
  updateActiveProject: (positionen: LVPosition[]) => void
  renameProject: (id: string, name: string) => void
  deleteProject: (id: string) => void
  setProjectStatus: (id: string, status: Projekt['status']) => void
  addAngebot: (data: Omit<SavedAngebot, 'exportedAt'>) => void
  storageError: string | null
  clearStorageError: () => void
  loading: boolean
  error: string | null
}

const ProjekteContext = createContext<ProjekteContextType | null>(null)

export function ProjekteProvider({ children }: { children: ReactNode }) {
  const [projekte, setProjekte] = useState<Projekt[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [storageError, setStorageError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const activeProjectIdRef = useRef<string | null>(null)

  // Eine stabile Supabase-Instanz pro Provider-Mount
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => { activeProjectIdRef.current = activeProjectId }, [activeProjectId])

  // Load all projects + positions + angebote from Supabase on mount
  useEffect(() => {
    async function loadProjekte() {
      try {
        setLoading(true)
        setError(null)

        const { data: dbProjekte, error: projError } = await supabase
          .from('projekte')
          .select('*')
          .order('created_at', { ascending: false })

        if (projError) throw projError

        if (!dbProjekte || dbProjekte.length === 0) {
          setProjekte([])
          setLoading(false)
          return
        }

        const projektIds = dbProjekte.map((p: DbProjekt) => p.id)

        const [posRes, angRes] = await Promise.all([
          supabase
            .from('positionen')
            .select('*')
            .in('projekt_id', projektIds)
            .order('sort_order', { ascending: true }),
          supabase
            .from('angebote')
            .select('*')
            .in('projekt_id', projektIds)
            .order('exported_at', { ascending: false }),
        ])

        if (posRes.error) throw posRes.error
        if (angRes.error) throw angRes.error

        const positionenByProjekt = new Map<string, LVPosition[]>()
        for (const dbPos of (posRes.data as DbPosition[]) ?? []) {
          const arr = positionenByProjekt.get(dbPos.projekt_id) ?? []
          arr.push(mapDbPositionToLV(dbPos))
          positionenByProjekt.set(dbPos.projekt_id, arr)
        }

        const angeboteByProjekt = new Map<string, SavedAngebot[]>()
        for (const dbAng of (angRes.data as DbAngebot[]) ?? []) {
          const arr = angeboteByProjekt.get(dbAng.projekt_id) ?? []
          arr.push(mapDbAngebotToSaved(dbAng))
          angeboteByProjekt.set(dbAng.projekt_id, arr)
        }

        const mapped: Projekt[] = dbProjekte.map((p: DbProjekt) => ({
          id: p.id,
          name: p.name,
          status: p.status as Projekt['status'],
          createdAt: p.created_at,
          updatedAt: p.updated_at,
          positionen: positionenByProjekt.get(p.id) ?? [],
          angebote: angeboteByProjekt.get(p.id) ?? [],
        }))

        setProjekte(mapped)
      } catch (err) {
        console.error('Fehler beim Laden der Projekte:', err)
        setError('Projekte konnten nicht geladen werden. Bitte Seite neu laden.')
      } finally {
        setLoading(false)
      }
    }

    loadProjekte()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const createProject = useCallback((name: string, positionen: LVPosition[]): string => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const neu: Projekt = { id, name, status: 'in-bearbeitung', createdAt: now, updatedAt: now, positionen, angebote: [] }

    // Optimistic update
    setProjekte(prev => [neu, ...prev])
    setActiveProjectId(id)
    activeProjectIdRef.current = id

    // Write to Supabase async
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const { error: projErr } = await supabase.from('projekte').insert({
          id,
          name,
          status: 'in-bearbeitung',
          created_at: now,
          updated_at: now,
          ...(user ? { owner_id: user.id } : {}),
        })
        if (projErr) throw projErr

        if (positionen.length > 0) {
          const dbPositionen = positionen.map((pos, idx) => mapLVPositionToDb(pos, id, idx))
          const { error: posErr } = await supabase.from('positionen').insert(dbPositionen)
          if (posErr) throw posErr
        }
      } catch (err) {
        console.error('Fehler beim Erstellen des Projekts:', err)
        setStorageError('Projekt konnte nicht gespeichert werden. Bitte erneut versuchen.')
      }
    })()

    return id
  }, [supabase])

  const updateActiveProject = useCallback((positionen: LVPosition[]) => {
    const id = activeProjectIdRef.current
    if (!id) return

    // Optimistic update
    setProjekte(prev =>
      prev.map(p =>
        p.id === id ? { ...p, positionen, updatedAt: new Date().toISOString() } : p
      )
    )

    // Write to Supabase: delete-then-insert for positionen
    ;(async () => {
      try {
        const now = new Date().toISOString()
        const { error: delErr } = await supabase.from('positionen').delete().eq('projekt_id', id)
        if (delErr) throw delErr

        if (positionen.length > 0) {
          const dbPositionen = positionen.map((pos, idx) => mapLVPositionToDb(pos, id, idx))
          const { error: insErr } = await supabase.from('positionen').insert(dbPositionen)
          if (insErr) throw insErr
        }

        await supabase.from('projekte').update({ updated_at: now }).eq('id', id)
      } catch (err) {
        console.error('Fehler beim Aktualisieren der Positionen:', err)
        setStorageError('Positionen konnten nicht gespeichert werden. Bitte erneut versuchen.')
      }
    })()
  }, [supabase])

  const renameProject = useCallback((id: string, name: string) => {
    const now = new Date().toISOString()
    setProjekte(prev =>
      prev.map(p => p.id === id ? { ...p, name, updatedAt: now } : p)
    )

    ;(async () => {
      try {
        const { error: err } = await supabase
          .from('projekte')
          .update({ name, updated_at: now })
          .eq('id', id)
        if (err) throw err
      } catch (err) {
        console.error('Fehler beim Umbenennen:', err)
        setStorageError('Projekt konnte nicht umbenannt werden.')
      }
    })()
  }, [supabase])

  const deleteProject = useCallback((id: string) => {
    setProjekte(prev => prev.filter(p => p.id !== id))
    if (activeProjectIdRef.current === id) {
      setActiveProjectId(null)
      activeProjectIdRef.current = null
    }

    ;(async () => {
      try {
        const { error: err } = await supabase.from('projekte').delete().eq('id', id)
        if (err) throw err
      } catch (err) {
        console.error('Fehler beim Löschen:', err)
        setStorageError('Projekt konnte nicht gelöscht werden.')
      }
    })()
  }, [supabase])

  const setProjectStatus = useCallback((id: string, status: Projekt['status']) => {
    const now = new Date().toISOString()
    setProjekte(prev =>
      prev.map(p => p.id === id ? { ...p, status, updatedAt: now } : p)
    )

    ;(async () => {
      try {
        const { error: err } = await supabase
          .from('projekte')
          .update({ status, updated_at: now })
          .eq('id', id)
        if (err) throw err
      } catch (err) {
        console.error('Fehler beim Statuswechsel:', err)
        setStorageError('Status konnte nicht geändert werden.')
      }
    })()
  }, [supabase])

  const addAngebot = useCallback((data: Omit<SavedAngebot, 'exportedAt'>) => {
    const id = activeProjectIdRef.current
    if (!id) return
    const exportedAt = new Date().toISOString()
    const angebot: SavedAngebot = { ...data, exportedAt }

    setProjekte(prev =>
      prev.map(p =>
        p.id === id
          ? { ...p, angebote: [angebot, ...(p.angebote ?? [])], updatedAt: exportedAt }
          : p
      )
    )

    ;(async () => {
      try {
        const { error: err } = await supabase.from('angebote').insert({
          projekt_id: id,
          projektname: data.projektname,
          kundenname: data.kundenname,
          kundenadresse: data.kundenadresse,
          objektnummer: data.objektnummer,
          angebotsnummer: data.angebotsnummer,
          datum: data.datum || null,
          ohne_preis: data.ohnePreis,
          exported_at: exportedAt,
        })
        if (err) throw err
      } catch (err) {
        console.error('Fehler beim Speichern des Angebots:', err)
        setStorageError('Angebot konnte nicht gespeichert werden.')
      }
    })()
  }, [supabase])

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
      addAngebot,
      storageError,
      clearStorageError: () => setStorageError(null),
      loading,
      error,
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
