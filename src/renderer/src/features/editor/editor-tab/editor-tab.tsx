import { XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type EditorTabProps = {
  name: string
  path: string
  active: boolean
  dirty: boolean
  onSelect: () => void
  onClose: () => void
}

export function EditorTab({ name, path, active, dirty, onSelect, onClose }: EditorTabProps) {
  return (
    <span className={cn("flex min-w-0 shrink-0 items-center rounded-md", active && "bg-white/10")}>
      <button
        type="button"
        role="tab"
        aria-selected={active}
        className={cn("flex min-w-0 items-center gap-1.5 py-1 pr-1 pl-2 text-xs", active ? "text-white" : "text-white/60 hover:text-white")}
        title={path}
        onClick={onSelect}
      >
        <span className="truncate">{name}</span>
        {dirty ? <span role="img" aria-label="Unsaved changes" className="size-1.5 shrink-0 rounded-full bg-white/70" /> : null}
      </button>
      <button type="button" className="mr-1 rounded p-0.5 text-white/40 hover:text-white" aria-label={`Close ${name}`} onClick={onClose}>
        <XIcon className="size-3" />
      </button>
    </span>
  )
}
