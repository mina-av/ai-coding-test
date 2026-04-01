'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Plus, FolderOpen, Pencil, Trash2, CheckCircle, Clock } from 'lucide-react'
import { useProjekte } from '@/contexts/projekte-context'
import { useLV } from '@/contexts/lv-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function ProjektePage() {
  const { projekte, setActiveProjectId, renameProject, deleteProject, setProjectStatus, storageError, clearStorageError } = useProjekte()
  const { setPositionen } = useLV()
  const router = useRouter()

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  function handleOpen(id: string) {
    const projekt = projekte.find(p => p.id === id)
    if (!projekt) return
    setActiveProjectId(id)
    setPositionen(projekt.positionen)
    router.push('/positionen')
  }

  function handleRenameOpen(id: string) {
    const projekt = projekte.find(p => p.id === id)
    if (!projekt) return
    setRenameId(id)
    setRenameValue(projekt.name)
  }

  function handleRenameConfirm() {
    if (!renameId || !renameValue.trim()) return
    renameProject(renameId, renameValue.trim())
    setRenameId(null)
  }

  function handleDeleteConfirm() {
    if (!deleteId) return
    deleteProject(deleteId)
    setDeleteId(null)
  }

  function handleStatusToggle(id: string, current: 'in-bearbeitung' | 'abgeschlossen') {
    setProjectStatus(id, current === 'in-bearbeitung' ? 'abgeschlossen' : 'in-bearbeitung')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">BKI Angebots-Tool</h1>
          <Button onClick={() => router.push('/upload')}>
            <Plus className="h-4 w-4 mr-2" />
            Neues Projekt
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {storageError && (
          <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md flex items-center justify-between">
            <span>{storageError}</span>
            <Button variant="ghost" size="sm" onClick={clearStorageError}>×</Button>
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-2xl font-bold">Meine Projekte</h2>
          {projekte.length > 0 && (
            <p className="text-muted-foreground mt-1">
              {projekte.length} Projekt{projekte.length !== 1 ? 'e' : ''}
            </p>
          )}
        </div>

        {projekte.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-muted-foreground mb-4">
              Noch keine Projekte. Jetzt erstes Projekt erstellen.
            </p>
            <Button onClick={() => router.push('/upload')}>
              <Plus className="h-4 w-4 mr-2" />
              Neues Projekt
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {projekte.map(projekt => (
              <Card key={projekt.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="px-5 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{projekt.name}</span>
                      <Badge
                        variant={projekt.status === 'abgeschlossen' ? 'default' : 'secondary'}
                        className="shrink-0"
                      >
                        {projekt.status === 'abgeschlossen' ? 'Abgeschlossen' : 'In Bearbeitung'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {projekt.positionen.length} Position{projekt.positionen.length !== 1 ? 'en' : ''} · Erstellt {fmtDate(projekt.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" onClick={() => handleOpen(projekt.id)}>
                      <FolderOpen className="h-4 w-4 mr-1.5" />
                      Öffnen
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Mehr Optionen</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleRenameOpen(projekt.id)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Umbenennen
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusToggle(projekt.id, projekt.status)}>
                          {projekt.status === 'in-bearbeitung' ? (
                            <><CheckCircle className="h-4 w-4 mr-2" />Als abgeschlossen markieren</>
                          ) : (
                            <><Clock className="h-4 w-4 mr-2" />Als in Bearbeitung markieren</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteId(projekt.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Löschen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Lösch-Bestätigung */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Projekt löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Projekt wirklich löschen? Alle Daten werden entfernt. Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Umbenennen-Dialog */}
      <Dialog open={renameId !== null} onOpenChange={(open) => !open && setRenameId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Projekt umbenennen</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="rename-input">Projektname</Label>
            <Input
              id="rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRenameConfirm()}
              className="mt-1.5"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameId(null)}>Abbrechen</Button>
            <Button onClick={handleRenameConfirm} disabled={!renameValue.trim()}>Umbenennen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
