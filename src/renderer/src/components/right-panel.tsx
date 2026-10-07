import { FileCodeIcon, GitCompareIcon, XIcon } from "lucide-react"
import type { PointerEvent as ReactPointerEvent } from "react"
import type { DiffComment, FileView } from "@shared/types"
import { DiffPanel } from "@/components/diff-panel"
import { FileViewer } from "@/components/file-viewer"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type RightTab = "changes" | "file"

function RightPanel({
  tab,
  file,
  width,
  streaming,
  comments,
  onTab,
  onCloseFile,
  onClose,
  onAddComment,
  onRemoveComment,
  onResizeStart,
  onResetWidth,
}: {
  tab: RightTab
  file: FileView | null
  width: number
  streaming: boolean
  comments: DiffComment[]
  onTab: (tab: RightTab) => void
  onCloseFile: () => void
  onClose: () => void
  onAddComment: (comment: DiffComment) => void
  onRemoveComment: (id: string) => void
  onResizeStart: (event: ReactPointerEvent<HTMLDivElement>) => void
  onResetWidth: () => void
}) {
  const showing: RightTab = tab === "file" && file ? "file" : "changes"
  return (
    <aside className="relative flex h-full shrink-0 flex-col border-l border-white/10" style={{ width }} aria-label="Side panel">
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize side panel"
        title="Drag to resize, double-click to reset"
        className="resize-handle -left-[5px]"
        onPointerDown={onResizeStart}
        onDoubleClick={onResetWidth}
      />
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-white/10 px-2" role="tablist">
        <Tab active={showing === "changes"} onClick={() => onTab("changes")}>
          <GitCompareIcon className="size-3.5" />
          Changes
        </Tab>
        {file ? (
          <span className={cn("flex min-w-0 items-center rounded-md", showing === "file" && "bg-white/10")}>
            <button
              type="button"
              role="tab"
              aria-selected={showing === "file"}
              className={cn("flex min-w-0 items-center gap-1.5 py-1 pr-1 pl-2 text-xs", showing === "file" ? "text-white" : "text-white/60 hover:text-white")}
              title={file.path}
              onClick={() => onTab("file")}
            >
              <FileCodeIcon className="size-3.5 shrink-0" />
              <span className="truncate">{file.path.split("/").pop()}</span>
            </button>
            <button type="button" className="mr-1 rounded p-0.5 text-white/40 hover:text-white" aria-label="Close file" onClick={onCloseFile}>
              <XIcon className="size-3" />
            </button>
          </span>
        ) : null}
        <Button type="button" variant="ghost" size="icon-sm" className="ml-auto" aria-label="Close side panel" onClick={onClose}>
          <XIcon className="size-4" />
        </Button>
      </div>
      {showing === "file" && file ? (
        <FileViewer file={file} />
      ) : (
        <DiffPanel streaming={streaming} comments={comments} onAddComment={onAddComment} onRemoveComment={onRemoveComment} />
      )}
    </aside>
  )
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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

export { RightPanel }
