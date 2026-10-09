import { ChevronLeft, RefreshCwIcon } from "lucide-react"
import type { ComponentType } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type MobileChangesScreenProps = {
  projectName: string | null
  branch: string
  count: number
  loading: boolean
  DiffList: ComponentType
  onBack: () => void
  onRefresh: () => void
}

// The chat's changes, read-only: a phone-sized version of the desktop diff
// panel, without comments, commit, push or pull requests.
export function MobileChangesScreen({ projectName, branch, count, loading, DiffList, onBack, onRefresh }: MobileChangesScreenProps) {
  return (
    <div className="mobile-safe-x flex h-full flex-col bg-background text-foreground">
      <header className="mobile-safe-top shrink-0 border-b border-border">
        <div className="flex h-12 items-center gap-1 px-1">
          <Button type="button" variant="ghost" size="icon-lg" aria-label="Back to chat" onClick={onBack}>
            <ChevronLeft className="size-6" />
          </Button>
          <div className="min-w-0 flex-1 text-center">
            <h1 className="truncate text-sm font-semibold">
              Changes{count > 0 ? ` (${count})` : ""}
            </h1>
            <p className="truncate text-xs text-foreground/50">{projectName ?? branch}</p>
          </div>
          <Button type="button" variant="ghost" size="icon-lg" aria-label="Refresh" onClick={onRefresh}>
            <RefreshCwIcon className={cn("size-5", loading && "animate-spin")} />
          </Button>
        </div>
      </header>
      <main className="mobile-safe-bottom min-h-0 flex-1 overflow-y-auto">
        <DiffList />
      </main>
    </div>
  )
}
