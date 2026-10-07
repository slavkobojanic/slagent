import { XIcon } from "lucide-react"

export type AttachmentChipRow = { id: string; name: string; imageUrl: string | null }

export type AttachmentChipsProps = {
  items: AttachmentChipRow[]
  onRemove: (id: string) => void
}

// The files waiting for the next prompt. Images show a thumbnail; anything else shows its name.
export function AttachmentChips({ items, onRemove }: AttachmentChipsProps) {
  return (
    <>
      {items.map((item) => {
        if (item.imageUrl !== null) {
          return <ImageChip key={item.id} name={item.name} url={item.imageUrl} onRemove={() => onRemove(item.id)} />
        }
        return <NameChip key={item.id} name={item.name} onRemove={() => onRemove(item.id)} />
      })}
    </>
  )
}

function NameChip({ name, onRemove }: { name: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 p-1">
      <span className="max-w-40 truncate px-1 text-xs">{name}</span>
      <button type="button" className="rounded-md p-1 text-white/60 hover:text-white" aria-label={`Remove ${name}`} onClick={onRemove}>
        <XIcon className="size-3.5" />
      </button>
    </span>
  )
}

function ImageChip({ name, url, onRemove }: { name: string; url: string; onRemove: () => void }) {
  return (
    <span className="group relative inline-block">
      <img src={url} alt={name} className="block h-auto max-h-32 w-auto max-w-full rounded-md" />
      <button
        type="button"
        className="absolute inset-0 flex items-center justify-center rounded-md bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        aria-label={`Remove ${name}`}
        onClick={onRemove}
      >
        <XIcon className="size-4" />
      </button>
    </span>
  )
}
