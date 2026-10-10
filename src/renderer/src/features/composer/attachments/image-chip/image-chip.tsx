import { XIcon } from "lucide-react"
import { useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

export type ImageChipProps = {
  name: string
  url: string
  onRemove: () => void
}

export function ImageChip({ name, url, onRemove }: ImageChipProps) {
  const [open, setOpen] = useState(false)

  return (
    <span className="relative inline-block">
      <button type="button" className="block cursor-zoom-in" aria-label={`View ${name}`} onClick={() => setOpen(true)}>
        <img src={url} alt={name} className="block h-auto max-h-32 w-auto max-w-full rounded-lg" />
      </button>
      <button
        type="button"
        className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-black text-white"
        aria-label={`Remove ${name}`}
        onClick={onRemove}
      >
        <XIcon className="size-2.5" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          hideClose
          aria-describedby={undefined}
          className="flex w-auto max-w-[90vw] items-center justify-center border-0 bg-transparent p-0"
          onClick={() => setOpen(false)}
        >
          <DialogTitle className="sr-only">{name}</DialogTitle>
          <img src={url} alt={name} className="block max-h-[90vh] max-w-[90vw] rounded-lg object-contain" />
        </DialogContent>
      </Dialog>
    </span>
  )
}
