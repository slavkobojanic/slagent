import { FileCodeIcon, GitCompareIcon, ScrollTextIcon, XIcon } from "lucide-react"
import type { ReactNode } from "react"
import { ResizeHandle } from "@/components/resize-handle"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type RightPanelProps = {
  // Whether the pane is being dragged. The handle shows its hairline while it is.
  resizing: boolean
  showing: "changes" | "file" | "plan"
  file: { name: string; path: string } | null
  hasPlan: boolean
  // The tab's content: the diff, an open file, or the plan. The owner picks which.
  body: ReactNode
  onTab: (tab: "changes" | "file" | "plan") => void
  onCloseFile: () => void
  onClose: () => void
  onResizeStart: (event: PointerEvent) => void
  onResizeReset: () => void
}

// The right side panel's root: an aside with a resize handle on its inner edge, a tab strip, and
// the showing tab. The shell owns the slot around it, which opens, closes and sizes the aside.
export function RightPanel({ resizing, showing, file, hasPlan, body, onTab, onCloseFile, onClose, onResizeStart, onResizeReset }: RightPanelProps) {
  return (
    <aside className="relative flex h-full shrink-0 flex-col border-l border-white/10" aria-label="Side panel">
      <ResizeHandle edge="diff" resizing={resizing} onResizeStart={onResizeStart} onResizeReset={onResizeReset} />
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-white/10 px-2" role="tablist">
        <Tab active={showing === "changes"} onClick={() => onTab("changes")}>
          <GitCompareIcon className="size-3.5" />
          Changes
        </Tab>
        {hasPlan ? (
          <Tab active={showing === "plan"} onClick={() => onTab("plan")}>
            <ScrollTextIcon className="size-3.5" />
            Plan
          </Tab>
        ) : null}
        <FileTab file={file} active={showing === "file"} onTab={onTab} onCloseFile={onCloseFile} />
        <Button type="button" variant="ghost" size="icon-sm" className="ml-auto" aria-label="Close side panel" onClick={onClose}>
          <XIcon className="size-4" />
        </Button>
      </div>
      {body}
    </aside>
  )
}

// The open file's tab, with a close button beside it. Nothing shows when no file is open.
function FileTab({
  file,
  active,
  onTab,
  onCloseFile,
}: {
  file: { name: string; path: string } | null
  active: boolean
  onTab: (tab: "file") => void
  onCloseFile: () => void
}) {
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

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={cn("flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs", active ? "bg-white/10 text-white" : "text-white/60 hover:text-white")}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
