import { CircleStopIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import type { TaskInfo } from "@shared/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { errorText } from "@/lib/format"
import { cn } from "@/lib/utils"

function TaskStrip({ tasks }: { tasks: TaskInfo[] }) {
  const [viewing, setViewing] = useState<TaskInfo | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const anyRunning = tasks.some((task) => task.status === "running")

  // Keeps elapsed times moving while something runs.
  useEffect(() => {
    if (!anyRunning) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [anyRunning])

  // Only work still going belongs above the composer: a finished task's result
  // already reached the transcript, so its chip is cleared the moment it ends.
  const visible = tasks.filter((task) => task.status === "running")
  const current = viewing ? (tasks.find((task) => task.id === viewing.id) ?? viewing) : null
  if (visible.length === 0 && !current) return null

  return (
    <>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {visible.map((task) => (
          <span key={task.id} className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-white/15 py-0.5 pr-0.5 pl-2 text-xs">
            <span
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                task.status === "running" && "animate-pulse bg-white",
                task.status === "done" && "bg-emerald-400",
                task.status === "failed" && "bg-[#ff5c5c]",
                task.status === "stopped" && "bg-white/30",
              )}
            />
            <button type="button" className="max-w-56 truncate hover:underline" title={task.command} onClick={() => setViewing(task)}>
              {task.label}
            </button>
            <span className="text-white/40">{statusLabel(task, now)}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`Stop ${task.label}`}
              onClick={() => void window.slagent.stopTask(task.id).catch((error: unknown) => toast.error(errorText(error)))}
            >
              <CircleStopIcon className="size-3.5" />
            </Button>
          </span>
        ))}
      </div>
      <TaskOutputDialog task={current} onClose={() => setViewing(null)} />
    </>
  )
}

function TaskOutputDialog({ task, onClose }: { task: TaskInfo | null; onClose: () => void }) {
  const [output, setOutput] = useState("")
  const bottom = useRef<HTMLDivElement | null>(null)
  const id = task?.id ?? null
  const running = task?.status === "running"

  useEffect(() => {
    if (!id) return
    let stop = false
    async function load() {
      const next = await window.slagent.taskOutput(id as string)
      if (stop) return
      setOutput(next)
      window.requestAnimationFrame(() => bottom.current?.scrollIntoView({ block: "end" }))
    }
    void load()
    if (!running) return
    const timer = window.setInterval(() => void load(), 1000)
    return () => {
      stop = true
      window.clearInterval(timer)
    }
  }, [id, running])

  return (
    <Dialog open={task !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{task?.label}</DialogTitle>
          <DialogDescription className="font-mono text-xs break-all">{task?.command}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto rounded-md border border-white/10 bg-white/5 p-3">
          <pre className="font-mono text-xs whitespace-pre-wrap">{output || "No output yet."}</pre>
          <div ref={bottom} />
        </div>
        {task ? <p className="text-xs text-muted-foreground">{statusLabel(task, Date.now())}</p> : null}
      </DialogContent>
    </Dialog>
  )
}

function statusLabel(task: TaskInfo, now: number): string {
  if (task.status === "running") return elapsed(now - task.startedAt)
  if (task.status === "done") return "done"
  if (task.status === "stopped") return "stopped"
  return `exit ${task.exitCode ?? "?"}`
}

function elapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

export { TaskStrip }
