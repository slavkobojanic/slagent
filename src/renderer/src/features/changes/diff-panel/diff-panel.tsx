import { GitBranchIcon, RefreshCwIcon } from "lucide-react"
import type { ComponentType } from "react"
import type { DiffScope } from "@shared/types"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const SCOPES: Array<{ value: DiffScope; label: string }> = [
  { value: "uncommitted", label: "Uncommitted" },
  { value: "turn", label: "Last turn" },
]

export type DiffPanelProps = {
  branch: string
  scope: DiffScope
  loading: boolean
  DiffFiles: ComponentType
  DiffFooter: ComponentType
  onScope: (scope: DiffScope) => void
  onRefresh: () => void
}

export function DiffPanel({ branch, scope, loading, DiffFiles, DiffFooter, onScope, onRefresh }: DiffPanelProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-10 shrink-0 items-center gap-2 border-b border-white/10 px-3">
        <GitBranchIcon className="size-4 text-white/50" />
        <span className="truncate text-sm">{branch}</span>
        <div className="ml-auto flex items-center gap-1">
          <div className="mr-1 flex rounded-md border border-white/15 p-0.5 text-xs">
            {SCOPES.map((item) => (
              <button
                key={item.value}
                type="button"
                className={cn("rounded px-2 py-0.5", scope === item.value ? "bg-white text-black" : "text-white/60 hover:text-white")}
                aria-pressed={scope === item.value}
                onClick={() => onScope(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Refresh" onClick={onRefresh}>
            <RefreshCwIcon className={cn("size-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <DiffFiles />
      </div>
      <DiffFooter />
    </div>
  )
}
