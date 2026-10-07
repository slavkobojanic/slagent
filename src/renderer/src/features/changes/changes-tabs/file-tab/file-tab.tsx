import { FileCodeIcon, XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type FileTabProps = {
  file: { name: string; path: string } | null
  active: boolean
  onTab: (tab: "file") => void
  onCloseFile: () => void
}

export function FileTab({ file, active, onTab, onCloseFile }: FileTabProps) {
  if (file === null) {
    return null
  }
  return (
    <span className={cn("flex min-w-0 items-center rounded-md", active && "bg-white/10")}>
      <button
        type="button"
        role="tab"
        aria-selected={active}
        className={cn("flex min-w-0 items-center gap-1.5 py-1 pr-1 pl-2 text-xs", active ? "text-white" : "text-white/60 hover:text-white")}
        title={file.path}
        onClick={() => onTab("file")}
      >
        <FileCodeIcon className="size-3.5 shrink-0" />
        <span className="truncate">{file.name}</span>
      </button>
      <button type="button" className="mr-1 rounded p-0.5 text-white/40 hover:text-white" aria-label="Close file" onClick={onCloseFile}>
        <XIcon className="size-3" />
      </button>
    </span>
  )
}
