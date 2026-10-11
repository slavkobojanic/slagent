import { BugIcon, FilesIcon, GitBranchIcon, MessagesSquareIcon, PuzzleIcon, SearchIcon, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import type { EditorStatus } from "@/features/editor/editor-types"

export type EditorProps = {
  url: string | null
  status: EditorStatus
  error: string | null
  frameRef: (element: HTMLIFrameElement | null) => void
  onFrameLoad: () => void
  onCommand: (id: string) => void
  onRetry: () => void
  onExit: () => void
}

// The workbench's own views, which its hidden activity bar would normally switch between.
const VIEWS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "workbench.view.explorer", label: "Files", icon: FilesIcon },
  { id: "workbench.view.search", label: "Search", icon: SearchIcon },
  { id: "workbench.view.scm", label: "Source control", icon: GitBranchIcon },
  { id: "workbench.view.debug", label: "Run and debug", icon: BugIcon },
  { id: "workbench.view.extensions", label: "Extensions", icon: PuzzleIcon },
]

function surface({ url, status, error, frameRef, onFrameLoad, onRetry }: Pick<EditorProps, "url" | "status" | "error" | "frameRef" | "onFrameLoad" | "onRetry">): ReactNode {
  if (status === "failed") {
    return (
      <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-sm">
        <p className="text-destructive">{error ?? "The editor could not start."}</p>
        <Button type="button" size="sm" variant="ghost" onClick={onRetry}>
          Try again
        </Button>
      </div>
    )
  }
  if (url === null) {
    return <div className="flex flex-1 items-center justify-center text-sm text-white/50">Starting the editor</div>
  }
  return (
    <div className="relative min-h-0 flex-1">
      <iframe ref={frameRef} title="Editor" src={url} allow="clipboard-read; clipboard-write" className="absolute inset-0 size-full border-0" onLoad={onFrameLoad} />
      {status === "loading" ? <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background text-sm text-white/50">Loading the editor</div> : null}
    </div>
  )
}

export function Editor({ url, status, error, frameRef, onFrameLoad, onCommand, onRetry, onExit }: EditorProps) {
  return (
    <section aria-label="Editor" className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-white/10 px-2">
        {VIEWS.map((view) => (
          <Button key={view.id} type="button" variant="ghost" size="icon-sm" aria-label={view.label} title={view.label} disabled={status !== "ready"} onClick={() => onCommand(view.id)}>
            <view.icon className="size-4" />
          </Button>
        ))}
        <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={onExit}>
          <MessagesSquareIcon className="size-3.5" />
          Back to chat
        </Button>
      </div>
      {surface({ url, status, error, frameRef, onFrameLoad, onRetry })}
    </section>
  )
}
