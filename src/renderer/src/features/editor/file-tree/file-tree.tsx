import { RefreshCwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FileTreeRow } from "@/features/editor/file-tree/file-tree-row/file-tree-row"
import type { TreeRow } from "@/features/editor/file-tree/file-tree-types"

export type FileTreeProps = {
  rows: TreeRow[]
  activePath: string | null
  error: string | null
  onToggle: (path: string) => void
  onOpen: (path: string) => void
  onRefresh: () => void
}

export function FileTree({ rows, activePath, error, onToggle, onOpen, onRefresh }: FileTreeProps) {
  return (
    <nav aria-label="Files" className="flex w-56 shrink-0 flex-col border-r border-white/10">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-white/10 pr-1 pl-3">
        <span className="text-xs font-medium text-white/60">Files</span>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Refresh files" onClick={onRefresh}>
          <RefreshCwIcon className="size-3.5" />
        </Button>
      </div>
      {error === null ? null : (
        <p role="alert" className="px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}
      <div role="tree" className="min-h-0 flex-1 overflow-y-auto py-1">
        {rows.map((row) => (
          <FileTreeRow key={row.path} row={row} active={row.path === activePath} onToggle={onToggle} onOpen={onOpen} />
        ))}
      </div>
    </nav>
  )
}
