import { Loader2 } from 'lucide-react'

interface ExtractionProgressProps {
  message?: string
}

export function ExtractionProgress({
  message = 'KI liest Leistungsverzeichnis aus...',
}: ExtractionProgressProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-base text-muted-foreground">{message}</p>
      <p className="text-sm text-muted-foreground/60">
        Dies kann bis zu 60 Sekunden dauern.
      </p>
    </div>
  )
}
