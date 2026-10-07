import { XIcon } from "lucide-react"

export type NameChipProps = {
  name: string
  onRemove: () => void
}

export function NameChip({ name, onRemove }: NameChipProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 p-1">
      <span className="max-w-40 truncate px-1 text-xs">{name}</span>
      <button type="button" className="rounded-md p-1 text-white/60 hover:text-white" aria-label={`Remove ${name}`} onClick={onRemove}>
        <XIcon className="size-3.5" />
      </button>
    </span>
  )
}
