import type { DiffLineAnnotation, SelectedLineRange } from "@pierre/diffs/react"
import { PatchDiff } from "@pierre/diffs/react"
import { GitBranchIcon, RefreshCwIcon, SparklesIcon, XIcon } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import type { DiffComment, DiffScope, GitStatus } from "@shared/types"
import { Button } from "@/components/ui/button"
import { CommentDraft } from "@/components/comment-draft"
import { Textarea } from "@/components/ui/textarea"
import { errorText, openPath } from "@/lib/format"
import { type FileDiff, lineText, parseDiff } from "@/lib/diff"
import { PIERRE_CSS, PIERRE_THEME } from "@/lib/pierre"
import { useResolvedTheme } from "@/lib/theme"
import { cn } from "@/lib/utils"

function DiffPanel({
  active,
  streaming,
  comments,
  onAddComment,
  onRemoveComment,
}: {
  // Whether the diff is on screen; nothing is fetched while the panel is hidden.
  active: boolean
  streaming: boolean
  comments: DiffComment[]
  onAddComment: (comment: DiffComment) => void
  onRemoveComment: (id: string) => void
}) {
  const [scope, setScope] = useState<DiffScope>("uncommitted")
  const [status, setStatus] = useState<GitStatus | null>(null)
  const [files, setFiles] = useState<FileDiff[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [nextStatus, diff] = await Promise.all([window.slagent.gitStatus(), window.slagent.gitDiff(scope)])
      setStatus(nextStatus)
      setFiles(parseDiff(diff))
    } catch (error) {
      toast.error(errorText(error))
    } finally {
      setLoading(false)
    }
  }, [scope])

  // Refresh when the panel opens, the scope changes, and each time a run ends.
  useEffect(() => {
    if (!active || streaming) return
    void refresh()
  }, [active, refresh, streaming])

  async function act(name: string, task: () => Promise<void>) {
    setBusy(name)
    try {
      await task()
    } catch (error) {
      toast.error(errorText(error))
    } finally {
      setBusy(null)
      void refresh()
    }
  }

  const repo = status?.repo ?? false
  const changed = status?.files.length ?? 0
  let pushLabel = "Push"
  if (status && status.ahead > 0) pushLabel = `Push ${status.ahead}`

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-10 shrink-0 items-center gap-2 border-b border-white/10 px-3">
        <GitBranchIcon className="size-4 text-white/50" />
        <span className="truncate text-sm">{status?.branch ?? (repo ? "Detached" : "Changes")}</span>
        <div className="ml-auto flex items-center gap-1">
          <div className="mr-1 flex rounded-md border border-white/15 p-0.5 text-xs">
            {(["uncommitted", "turn"] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={cn("rounded px-2 py-0.5", scope === item ? "bg-white text-black" : "text-white/60 hover:text-white")}
                aria-pressed={scope === item}
                onClick={() => setScope(item)}
              >
                {item === "turn" ? "Last turn" : "Uncommitted"}
              </button>
            ))}
          </div>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Refresh" onClick={() => void refresh()}>
            <RefreshCwIcon className={cn("size-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <p className="px-4 py-6 text-sm text-white/50">
            {scope === "turn" ? "No changes since the last message with a checkpoint." : repo ? "No uncommitted changes." : "This folder is not a git repository."}
          </p>
        ) : (
          files.map((file) => (
            <FileSection
              key={file.path}
              file={file}
              comments={comments.filter((comment) => comment.path === file.path)}
              onAdd={onAddComment}
              onRemove={onRemoveComment}
            />
          ))
        )}
      </div>
      {repo ? (
        <footer className="shrink-0 space-y-2 border-t border-white/10 p-3">
          <div className="relative">
            <Textarea
              value={message}
              placeholder={changed > 0 ? `Commit message for ${changed} file${changed === 1 ? "" : "s"}` : "Nothing to commit"}
              aria-label="Commit message"
              className="min-h-16 pr-9 text-sm"
              disabled={changed === 0}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && message.trim()) {
                  event.preventDefault()
                  void act("commit", async () => {
                    const sha = await window.slagent.gitCommit(message)
                    setMessage("")
                    toast.success(`Committed ${sha}`)
                  })
                }
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="absolute top-1.5 right-1.5"
              aria-label="Write a commit message"
              title="Write a commit message from the diff"
              disabled={changed === 0 || busy !== null}
              onClick={() =>
                void act("message", async () => {
                  setMessage(await window.slagent.gitCommitMessage())
                })
              }
            >
              <SparklesIcon className={cn("size-3.5", busy === "message" && "animate-pulse")} />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              className="flex-1"
              disabled={changed === 0 || !message.trim() || busy !== null}
              onClick={() =>
                void act("commit", async () => {
                  const sha = await window.slagent.gitCommit(message)
                  setMessage("")
                  toast.success(`Committed ${sha}`)
                })
              }
            >
              Commit all
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy !== null || !status?.branch}
              onClick={() =>
                void act("push", async () => {
                  await window.slagent.gitPush()
                  toast.success("Pushed")
                })
              }
            >
              {pushLabel}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy !== null || !status?.branch}
              onClick={() =>
                void act("pr", async () => {
                  const url = await window.slagent.gitPullRequest()
                  toast.success("Pull request ready", {
                    action: { label: "Open", onClick: () => void window.slagent.openExternal(url) },
                  })
                })
              }
            >
              Open PR
            </Button>
          </div>
        </footer>
      ) : null}
    </div>
  )
}

type Draft = { side: DiffComment["side"]; line: number }
type Note = { comment: DiffComment | null }

function toPierreSide(side: DiffComment["side"]): "deletions" | "additions" {
  if (side === "old") return "deletions"
  return "additions"
}

// One file of the diff, rendered by Pierre. Hovering a line shows a + in the
// gutter that opens a comment box under that line.
function FileSection({
  file,
  comments,
  onAdd,
  onRemove,
}: {
  file: FileDiff
  comments: DiffComment[]
  onAdd: (comment: DiffComment) => void
  onRemove: (id: string) => void
}) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const annotations: DiffLineAnnotation<Note>[] = comments.map((comment) => ({
    side: toPierreSide(comment.side),
    lineNumber: comment.line,
    metadata: { comment },
  }))
  if (draft) annotations.push({ side: toPierreSide(draft.side), lineNumber: draft.line, metadata: { comment: null } })

  const themeType = useResolvedTheme()
  const options = useMemo(
    () => ({
      theme: PIERRE_THEME,
      themeType,
      diffStyle: "unified" as const,
      overflow: "scroll" as const,
      unsafeCSS: PIERRE_CSS,
      enableGutterUtility: true,
      onGutterUtilityClick: (range: SelectedLineRange) => {
        let side: DiffComment["side"] = "new"
        if (range.side === "deletions") side = "old"
        setDraft({ side, line: range.start })
      },
    }),
    [themeType],
  )

  return (
    <section className="border-b border-white/10">
      <PatchDiff<Note>
        patch={file.patch}
        options={options}
        lineAnnotations={annotations}
        renderHeaderMetadata={() => (
          <button type="button" className="text-xs text-white/50 hover:text-white" onClick={() => openPath(file.path)}>
            View file
          </button>
        )}
        renderAnnotation={(annotation) => {
          const comment = annotation.metadata?.comment
          if (!comment) {
            const current = draft
            if (!current) return null
            return (
              <CommentDraft
                onCancel={() => setDraft(null)}
                onSave={(text) => {
                  onAdd({
                    id: crypto.randomUUID(),
                    path: file.path,
                    line: current.line,
                    side: current.side,
                    code: lineText(file, current.side, current.line),
                    text,
                  })
                  setDraft(null)
                }}
              />
            )
          }
          return (
            <div className="mx-3 my-1.5 flex items-start gap-2 rounded-md border border-white/10 bg-secondary px-3 py-2 font-sans text-xs whitespace-pre-wrap text-white shadow-md">
              <span className="min-w-0 flex-1">{comment.text}</span>
              <button type="button" className="text-white/40 hover:text-white" aria-label="Delete comment" onClick={() => onRemove(comment.id)}>
                <XIcon className="size-3.5" />
              </button>
            </div>
          )
        }}
      />
    </section>
  )
}

export { DiffPanel }
