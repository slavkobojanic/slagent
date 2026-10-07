import { ChevronRightIcon, GitBranchIcon, MessageSquarePlusIcon, RefreshCwIcon, SparklesIcon, XIcon } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import type { DiffComment, DiffScope, GitStatus } from "@shared/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { errorText, openPath } from "@/lib/format"
import { type FileDiff, parseDiff } from "@/lib/diff"
import { cn } from "@/lib/utils"

function DiffPanel({
  streaming,
  comments,
  onAddComment,
  onRemoveComment,
}: {
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
    if (streaming) return
    void refresh()
  }, [refresh, streaming])

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
  const [open, setOpen] = useState(file.lines.length < 400)
  const [drafting, setDrafting] = useState<string | null>(null)
  return (
    <section className="border-b border-white/10">
      <div className="sticky top-0 z-10 flex items-center gap-2 bg-black px-3 py-1.5 text-xs">
        <button type="button" className="flex min-w-0 flex-1 items-center gap-1.5 text-left" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          <ChevronRightIcon className={cn("size-3.5 shrink-0 text-white/50 transition-transform", open && "rotate-90")} />
          <span className="truncate font-mono">{file.path}</span>
        </button>
        {comments.length > 0 ? <span className="text-white/60 tabular-nums">{comments.length} 💬</span> : null}
        <span className="text-emerald-400 tabular-nums">+{file.added}</span>
        <span className="text-[#ff5c5c] tabular-nums">-{file.removed}</span>
        <button type="button" className="text-white/50 hover:text-white" onClick={() => openPath(file.path)}>
          View
        </button>
      </div>
      {open ? (
        <div className="overflow-x-auto pb-2 font-mono text-[11px] leading-[1.45]">
          {file.lines.map((line, index) => {
            if (line.kind === "hunk") {
              return (
                <div key={index} className="px-3 pt-1 whitespace-pre text-sky-300/80">
                  {line.text}
                </div>
              )
            }
            const side: DiffComment["side"] = line.kind === "del" ? "old" : "new"
            const number = side === "old" ? line.oldLine : line.newLine
            const key = `${side}:${number}`
            const lineComments = comments.filter((comment) => comment.side === side && comment.line === number)
            let tone = "text-white/70"
            if (line.kind === "add") tone = "bg-emerald-500/10 text-emerald-300"
            if (line.kind === "del") tone = "bg-red-500/10 text-red-300"
            return (
              <div key={index}>
                <div className={cn("group/line flex min-w-max", tone)}>
                  <span className="w-10 shrink-0 pr-2 text-right text-white/25 tabular-nums select-none">{number ?? ""}</span>
                  <button
                    type="button"
                    className="w-4 shrink-0 text-white/0 group-hover/line:text-white/60 hover:!text-white focus-visible:text-white"
                    aria-label={`Comment on line ${number}`}
                    onClick={() => setDrafting(key)}
                  >
                    <MessageSquarePlusIcon className="size-3" />
                  </button>
                  <span className="pr-3 whitespace-pre">{line.text || " "}</span>
                </div>
                {lineComments.map((comment) => (
                  <div key={comment.id} className="mx-3 my-1 flex items-start gap-2 rounded-md bg-white/[0.06] px-3 py-2 font-sans text-xs whitespace-pre-wrap text-white/90">
                    <span className="min-w-0 flex-1">{comment.text}</span>
                    <button type="button" className="text-white/40 hover:text-white" aria-label="Delete comment" onClick={() => onRemove(comment.id)}>
                      <XIcon className="size-3.5" />
                    </button>
                  </div>
                ))}
                {drafting === key && number !== null ? (
                  <CommentDraft
                    onCancel={() => setDrafting(null)}
                    onSave={(text) => {
                      onAdd({
                        id: crypto.randomUUID(),
                        path: file.path,
                        line: number,
                        side,
                        code: line.text.slice(1),
                        text,
                      })
                      setDrafting(null)
                    }}
                  />
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}

function CommentDraft({ onSave, onCancel }: { onSave: (text: string) => void; onCancel: () => void }) {
  const [text, setText] = useState("")
  function save() {
    if (text.trim()) onSave(text.trim())
  }
  return (
    <div className="mx-3 my-1 space-y-1.5 font-sans">
      <Textarea
        value={text}
        autoFocus
        aria-label="Comment"
        placeholder="Comment for the next message"
        className="min-h-14 text-xs"
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault()
            event.stopPropagation()
            onCancel()
          }
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            save()
          }
        }}
      />
      <div className="flex justify-end gap-1.5">
        <Button type="button" variant="ghost" size="xs" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="xs" disabled={!text.trim()} onClick={save}>
          Add comment
        </Button>
      </div>
    </div>
  )
}

export { DiffPanel }
