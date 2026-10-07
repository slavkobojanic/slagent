import { type DiffLineAnnotation, PatchDiff } from "@pierre/diffs/react"
import { XIcon } from "lucide-react"
import { memo } from "react"
import type { DiffComment } from "@shared/types"
import { CommentDraft } from "@/components/comment-draft"
import type { DiffDraft } from "@/features/changes/diff-panel/diff-draft"
import type { FileDiff } from "@/lib/diff"
import { PIERRE_CSS, PIERRE_THEME } from "@/lib/pierre"

// A saved comment, or null for the open comment box.
type Note = { comment: DiffComment | null }

export type DiffFileProps = {
  file: FileDiff
  comments: DiffComment[]
  draft: DiffDraft | null
  themeType: "light" | "dark"
  onStartDraft: (path: string, side: DiffComment["side"], line: number) => void
  onDraftSave: (text: string) => void
  onDraftCancel: () => void
  onRemoveComment: (id: string) => void
  onViewFile: (path: string) => void
}

// Memoised: Pierre re-renders whenever its options change, and the gutter callback below is a new
// function on every render.
export const DiffFile = memo(function DiffFile({
  file,
  comments,
  draft,
  themeType,
  onStartDraft,
  onDraftSave,
  onDraftCancel,
  onRemoveComment,
  onViewFile,
}: DiffFileProps) {
  const annotations: DiffLineAnnotation<Note>[] = comments
    .filter((comment) => comment.path === file.path)
    .map((comment) => ({ side: toPierreSide(comment.side), lineNumber: comment.line, metadata: { comment } }))
  if (draft !== null && draft.path === file.path) {
    annotations.push({ side: toPierreSide(draft.side), lineNumber: draft.line, metadata: { comment: null } })
  }

  return (
    <section className="border-b border-white/10">
      <PatchDiff<Note>
        patch={file.patch}
        options={{
          theme: PIERRE_THEME,
          themeType,
          diffStyle: "unified",
          overflow: "scroll",
          unsafeCSS: PIERRE_CSS,
          enableGutterUtility: true,
          onGutterUtilityClick: (range) => onStartDraft(file.path, range.side === "deletions" ? "old" : "new", range.start),
        }}
        lineAnnotations={annotations}
        renderHeaderMetadata={() => (
          <button type="button" className="text-xs text-white/50 hover:text-white" onClick={() => onViewFile(file.path)}>
            View file
          </button>
        )}
        renderAnnotation={(annotation) => {
          const comment = annotation.metadata?.comment ?? null
          if (comment === null) {
            return <CommentDraft onCancel={onDraftCancel} onSave={onDraftSave} />
          }
          return (
            <div className="mx-3 my-1.5 flex items-start gap-2 rounded-md border border-white/10 bg-secondary px-3 py-2 font-sans text-xs whitespace-pre-wrap text-white shadow-md">
              <span className="min-w-0 flex-1">{comment.text}</span>
              <button type="button" className="text-white/40 hover:text-white" aria-label="Delete comment" onClick={() => onRemoveComment(comment.id)}>
                <XIcon className="size-3.5" />
              </button>
            </div>
          )
        }}
      />
    </section>
  )
})

function toPierreSide(side: DiffComment["side"]): "deletions" | "additions" {
  if (side === "old") {
    return "deletions"
  }
  return "additions"
}
