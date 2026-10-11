import { ChevronDownIcon, ChevronRightIcon, FileIcon, FolderIcon } from "lucide-react"
import type { TreeRow } from "@/features/editor/file-tree/file-tree-types"
import { cn } from "@/lib/utils"

export type FileTreeRowProps = {
  row: TreeRow
  active: boolean
  onToggle: (path: string) => void
  onOpen: (path: string) => void
}

export function FileTreeRow({ row, active, onToggle, onOpen }: FileTreeRowProps) {
  const Chevron = row.expanded ? ChevronDownIcon : ChevronRightIcon
  return (
    <button
      type="button"
      role="treeitem"
      aria-level={row.depth + 1}
      aria-expanded={row.dir ? row.expanded : undefined}
      aria-selected={active}
      title={row.path}
      // The indent is the row's depth, which only exists at runtime.
      style={{ paddingLeft: row.depth * 12 + 8 }}
      className={cn("flex w-full items-center gap-1.5 py-0.5 pr-2 text-left text-xs", active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white")}
      onClick={() => (row.dir ? onToggle(row.path) : onOpen(row.path))}
    >
      {row.dir ? <Chevron className="size-3 shrink-0" /> : <span className="size-3 shrink-0" />}
      {row.dir ? <FolderIcon className="size-3.5 shrink-0" /> : <FileIcon className="size-3.5 shrink-0" />}
      <span className={cn("truncate", row.loading && "opacity-50")}>{row.name}</span>
    </button>
  )
}
