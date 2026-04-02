'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { useLV } from '@/contexts/lv-context'
import { useUser } from '@/hooks/use-user'
import { AppHeader } from '@/components/app-header'
import { PositionRow } from '@/components/position-row'
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function PositionenPage() {
  const { positionen, updatePosition, addPosition, deletePosition } = useLV()
  const { email, rolle } = useUser()
  const readOnly = rolle === 'teamleiter'
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const router = useRouter()

  function handleConfirmDelete() {
    if (deleteTargetId) {
      deletePosition(deleteTargetId)
      setDeleteTargetId(null)
    }
  }

  if (positionen.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader email={email} rolle={rolle} />
        <main className="max-w-5xl mx-auto px-6 py-16 flex flex-col items-center gap-4 text-center">
          <p className="text-muted-foreground">Keine Positionen vorhanden.</p>
          <div className="flex gap-3">
            {!readOnly && (
              <Button variant="outline" onClick={() => router.push('/upload')}>
                LV hochladen
              </Button>
            )}
            {!readOnly && (
              <Button onClick={addPosition}>
                <Plus className="h-4 w-4 mr-2" />
                Position hinzufügen
              </Button>
            )}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader email={email} rolle={rolle} />

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">Leistungsverzeichnis</h2>
            <p className="text-muted-foreground mt-1">
              {positionen.length} Position{positionen.length !== 1 ? 'en' : ''}
              {!readOnly && ' · Klick auf ein Feld zum Bearbeiten'}
            </p>
          </div>
          {!readOnly && (
            <Button onClick={addPosition}>
              <Plus className="h-4 w-4 mr-2" />
              Position hinzufügen
            </Button>
          )}
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Pos.-Nr.</TableHead>
                <TableHead>Beschreibung</TableHead>
                <TableHead className="w-24 text-right">Menge</TableHead>
                <TableHead className="w-20">Einheit</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {positionen.map((pos) => (
                <PositionRow
                  key={pos.id}
                  position={pos}
                  onUpdate={updatePosition}
                  onDelete={deletePosition}
                  onRequestDelete={(id) => setDeleteTargetId(id)}
                  readOnly={readOnly}
                />
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={() => router.push('/kalkulation')}>
            Zur Kalkulation
          </Button>
        </div>
      </main>

      <DeleteConfirmDialog
        open={deleteTargetId !== null}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  )
}
