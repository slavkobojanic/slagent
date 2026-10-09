import { CircleStopIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export type ViewerTask = {
  id: string
  label: string
  command: string
  status: "running" | "done" | "failed" | "stopped"
  statusText: string
  projectName: string
}

export type TaskViewerProps = {
  task: ViewerTask | null
  output: string
  error: string | null
  onClose: () => void
  onStop: (id: string) => void
  bindBottom: (element: HTMLDivElement | null) => void
}

// The task's buffered output. The terminal drawer shows the live grid; this is
// the readable scrollback, so both stay available.
export function TaskViewer({ task, output, error, onClose, onStop, bindBottom }: TaskViewerProps) {
  return (
    <Dialog
      open={task !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {task === null ? null : <span aria-hidden className={cn("size-1.5 rounded-full", DOT_CLASS[task.status])} />}
            {task?.label}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs break-all">
            {task?.command}
          </DialogDescription>
        </DialogHeader>
        <Card className="max-h-96 overflow-auto p-3">
          <pre className="font-mono text-xs whitespace-pre-wrap">{output}</pre>
          <div ref={bindBottom} />
        </Card>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {task === null ? null : (
              <>
                {task.projectName} · {task.statusText}
              </>
            )}
          </p>
          {task !== null && task.status === "running" ? (
            <Button type="button" variant="outline" size="sm" onClick={() => onStop(task.id)}>
              <CircleStopIcon className="size-3.5" />
              Stop
            </Button>
          ) : null}
        </div>
        {error !== null ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

// The dot colour per status. Each is a full class string, so Tailwind generates every one.
const DOT_CLASS = {
  running: "animate-pulse bg-white",
  done: "bg-success",
  failed: "bg-destructive",
  stopped: "bg-white/30",
} as const
