import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

export type QuestionImageProps = {
  src: string
  alt: string
  broken: boolean
  zoomed: boolean
  onError: (src: string) => void
  onZoomChange: (open: boolean) => void
}

export function QuestionImage({ src, alt, broken, zoomed, onError, onZoomChange }: QuestionImageProps) {
  if (broken) {
    return <p className="text-xs text-muted-foreground">The image didn't load.</p>
  }
  return (
    <>
      <button type="button" className="block max-w-full cursor-zoom-in" title="View larger" onClick={() => onZoomChange(true)}>
        <img src={src} alt={alt} className="max-h-64 max-w-full rounded" onError={() => onError(src)} />
      </button>
      <Dialog open={zoomed} onOpenChange={onZoomChange}>
        <DialogContent className="p-2">
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <img src={src} alt={alt} className="max-h-screen w-full object-contain" />
        </DialogContent>
      </Dialog>
    </>
  )
}
