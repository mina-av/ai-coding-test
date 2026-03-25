'use client'

import { useCallback, useState } from 'react'
import { useDropzone, FileRejection } from 'react-dropzone'
import { Upload, FileText } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface UploadZoneProps {
  onFileSelect: (file: File) => void
  disabled?: boolean
}

const MAX_SIZE = 20 * 1024 * 1024 // 20 MB

export function UploadZone({ onFileSelect, disabled }: UploadZoneProps) {
  const [validationError, setValidationError] = useState<string | null>(null)

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setValidationError(null)
      if (rejectedFiles.length > 0) {
        const code = rejectedFiles[0].errors[0]?.code
        if (code === 'file-too-large') {
          setValidationError('Die Datei ist zu groß. Maximale Dateigröße: 20 MB.')
        } else {
          setValidationError('Nur PDF-Dateien werden akzeptiert.')
        }
        return
      }
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0])
      }
    },
    [onFileSelect]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: MAX_SIZE,
    multiple: false,
    disabled,
  })

  return (
    <div>
      <Card
        {...getRootProps()}
        className={[
          'flex flex-col items-center justify-center gap-4 p-12 cursor-pointer',
          'border-2 border-dashed transition-colors',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/30 hover:border-primary/50',
          disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '',
        ].join(' ')}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3 text-center">
          {isDragActive ? (
            <FileText className="h-12 w-12 text-primary" />
          ) : (
            <Upload className="h-12 w-12 text-muted-foreground" />
          )}
          <div>
            <p className="text-lg font-medium">
              {isDragActive ? 'PDF hier ablegen' : 'Leistungsverzeichnis hochladen'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              PDF-Datei hier ablegen oder per Klick auswählen
            </p>
          </div>
          <Button type="button" variant="outline" disabled={disabled}>
            Datei auswählen
          </Button>
          <p className="text-xs text-muted-foreground">Nur PDF-Dateien · Maximal 20 MB</p>
        </div>
      </Card>
      {validationError && (
        <p className="mt-2 text-sm text-destructive">{validationError}</p>
      )}
    </div>
  )
}
