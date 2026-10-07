import { ChevronRightIcon, GitBranchIcon, RefreshCwIcon, SparklesIcon, XIcon } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import type { DiffScope, GitStatus } from "@shared/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { errorText, openPath } from "@/lib/format"
import { cn } from "@/lib/utils"

type FileDiff = {
  path: string
  lines: string[]
  added: number
  removed: number
}

function parseDiff(diff: string): FileDiff[] {
  const files: FileDiff[] = []
  let current: FileDiff | null = null
  for (const line of diff.split("\n")) {
    if (line.startsWith("diff --git ")) {
      const match = / b\/(.+)$/.exec(line)
      current = { path: match?.[1] ?? line.slice(11), lines: [], added: 0, removed: 0 }
      files.push(current)
      continue
    }
    if (!current) continue
    if (line.startsWith("+++ ") || line.startsWith("--- ")) {
      if (line.startsWith("+++ b/")) current.path = line.slice(6).replace(/\t$/, "")
      continue
    }
    if (/^(index |new file mode|deleted file mode|similarity index|rename from|rename to|old mode|new mode)/.test(line)) continue
    if (line.startsWith("+")) current.added += 1
    if (line.startsWith("-")) current.removed += 1
    current.lines.push(line)
  }
  return files
}

function DiffPanel({ streaming, onClose }: { streaming: boolean; onClose: () => void }) {
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
    <aside className="flex h-full w-[min(44vw,560px)] min-w-80 flex-col border-l border-white/10" aria-label="Changes">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-white/10 px-3">
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
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Close changes" onClick={onClose}>
            <XIcon className="size-4" />
          </Button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <p className="px-4 py-6 text-sm text-white/50">
            {scope === "turn" ? "No changes since the last message with a checkpoint." : repo ? "No uncommitted changes." : "This folder is not a git repository."}
          </p>
        ) : (
          files.map((file) => <FileSection key={file.path} file={file} />)
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
    </aside>
  )
}

function FileSection({ file }: { file: FileDiff }) {
  const [open, setOpen] = useState(file.lines.length < 400)
  return (
    <section className="border-b border-white/10">
      <div className="sticky top-0 z-10 flex items-center gap-2 bg-black px-3 py-1.5 text-xs">
        <button type="button" className="flex min-w-0 flex-1 items-center gap-1.5 text-left" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          <ChevronRightIcon className={cn("size-3.5 shrink-0 text-white/50 transition-transform", open && "rotate-90")} />
          <span className="truncate font-mono">{file.path}</span>
        </button>
        <span className="text-emerald-400 tabular-nums">+{file.added}</span>
        <span className="text-[#ff5c5c] tabular-nums">-{file.removed}</span>
        <button type="button" className="text-white/50 hover:text-white" onClick={() => openPath(file.path)}>
          Open
        </button>
      </div>
      {open ? (
        <pre className="overflow-x-auto pb-2 font-mono text-[11px] leading-[1.45]">
          {file.lines.map((line, index) => {
            let className = "px-3 text-white/70"
            if (line.startsWith("+")) className = "bg-emerald-500/10 px-3 text-emerald-300"
            if (line.startsWith("-")) className = "bg-red-500/10 px-3 text-red-300"
            if (line.startsWith("@@")) className = "px-3 pt-1 text-sky-300/80"
            return (
              <div key={index} className={className}>
                {line || " "}
              </div>
            )
          })}
        </pre>
      ) : null}
    </section>
  )
}

export { DiffPanel }
