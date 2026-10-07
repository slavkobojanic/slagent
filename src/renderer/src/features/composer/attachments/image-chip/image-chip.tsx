import { XIcon } from "lucide-react"

export type ImageChipProps = {
  name: string
  url: string
  onRemove: () => void
}

export function ImageChip({ name, url, onRemove }: ImageChipProps) {
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
