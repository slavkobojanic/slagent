import { ChevronDownIcon, GitBranchIcon, RefreshCwIcon } from "lucide-react"
import type { ComponentType } from "react"
import type { DiffScope, GitCommit } from "@shared/types"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const SCOPES: Array<{ value: DiffScope; label: string }> = [
  { value: "uncommitted", label: "Uncommitted" },
  { value: "turn", label: "Last turn" },
  { value: "branch", label: "Since branch start" },
]

export type DiffPanelProps = {
  branch: string
  scope: DiffScope
  scopeLabel: string
  commits: GitCommit[]
  loading: boolean
  DiffFiles: ComponentType
  DiffFooter: ComponentType
  onScope: (scope: DiffScope) => void
  onRefresh: () => void
}

export function DiffPanel({ branch, scope, scopeLabel, commits, loading, DiffFiles, DiffFooter, onScope, onRefresh }: DiffPanelProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-10 shrink-0 items-center gap-2 border-b border-white/10 px-3">
        <GitBranchIcon className="size-4 text-white/50" />
        <span className="truncate text-sm">{branch}</span>
        <div className="ml-auto flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="xs" className="gap-1" aria-label={`Diff scope: ${scopeLabel}`}>
                <span className="max-w-40 truncate">{scopeLabel}</span>
                <ChevronDownIcon className="size-3 shrink-0 text-white/50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {SCOPES.map((item) => (
                <DropdownMenuItem key={item.value} aria-checked={scope === item.value} onClick={() => onScope(item.value)}>
                  {item.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Pick a commit</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
                  {commits.map((commit) => (
                    <DropdownMenuItem
                      key={commit.sha}
                      aria-checked={scope === `commit:${commit.sha}`}
                      onClick={() => onScope(`commit:${commit.sha}`)}
                    >
                      <span className="truncate">{commit.subject}</span>
                      <span className="shrink-0 text-xs text-white/40">{commit.date}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
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
