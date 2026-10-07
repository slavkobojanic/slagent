import { GitBranchIcon, RefreshCwIcon } from "lucide-react"
import type { ReactNode } from "react"
import type { DiffComment, DiffScope } from "@shared/types"
import { Button } from "@/components/ui/button"
import type { DiffDraft } from "@/features/changes/diff-draft"
import { DiffFile } from "@/features/changes/diff-panel/diff-file"
import type { FileDiff } from "@/lib/diff"
import { cn } from "@/lib/utils"

const SCOPES: Array<{ value: DiffScope; label: string }> = [
  { value: "uncommitted", label: "Uncommitted" },
  { value: "turn", label: "Last turn" },
]

export type DiffPanelProps = {
  branch: string
  scope: DiffScope
  loading: boolean
  files: FileDiff[]
  emptyText: string
  comments: DiffComment[]
  draft: DiffDraft | null
  themeType: "light" | "dark"
  // The commit box. The owner leaves it out when the folder is not a git repository.
  footer: ReactNode
  onScope: (scope: DiffScope) => void
  onRefresh: () => void
  onStartDraft: (path: string, side: DiffComment["side"], line: number) => void
  onDraftSave: (text: string) => void
  onDraftCancel: () => void
  onRemoveComment: (id: string) => void
  onViewFile: (path: string) => void
}

// The changes tab: the branch, the scope and refresh controls, the diff of each file, and the
// commit box.
export function DiffPanel({
  branch,
  scope,
  loading,
  files,
  emptyText,
  comments,
  draft,
  themeType,
  footer,
  onScope,
  onRefresh,
  onStartDraft,
  onDraftSave,
  onDraftCancel,
  onRemoveComment,
  onViewFile,
}: DiffPanelProps) {
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
        <FileList
          files={files}
          emptyText={emptyText}
          comments={comments}
          draft={draft}
          themeType={themeType}
          onStartDraft={onStartDraft}
          onDraftSave={onDraftSave}
          onDraftCancel={onDraftCancel}
          onRemoveComment={onRemoveComment}
          onViewFile={onViewFile}
        />
      </div>
      {footer}
    </div>
  )
}

// The files of the diff, or the reason there are none.
function FileList({
  files,
  emptyText,
  comments,
  draft,
  themeType,
  onStartDraft,
  onDraftSave,
  onDraftCancel,
  onRemoveComment,
  onViewFile,
}: Pick<
  DiffPanelProps,
  "files" | "emptyText" | "comments" | "draft" | "themeType" | "onStartDraft" | "onDraftSave" | "onDraftCancel" | "onRemoveComment" | "onViewFile"
>) {
  if (files.length === 0) {
    return <p className="px-4 py-6 text-sm text-white/50">{emptyText}</p>
  }
  return (
    <>
      {files.map((file) => (
        <DiffFile
          key={file.path}
          file={file}
          comments={comments}
          draft={draft}
          themeType={themeType}
          onStartDraft={onStartDraft}
          onDraftSave={onDraftSave}
          onDraftCancel={onDraftCancel}
          onRemoveComment={onRemoveComment}
          onViewFile={onViewFile}
        />
      ))}
    </>
  )
}
