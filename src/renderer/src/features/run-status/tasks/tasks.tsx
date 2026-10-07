import { CircleStopIcon } from "lucide-react"
import type { TaskInfo } from "@shared/types"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { TaskOutputDialog, type DialogTask } from "@/features/run-status/tasks/task-output-dialog"

export type TaskChip = {
  id: string
  label: string
  command: string
  status: TaskInfo["status"]
  statusText: string
}

export type TaskStripProps = {
  chips: TaskChip[]
  error: string | null
  viewing: DialogTask | null
  output: string
  onOpen: (id: string) => void
  onStop: (id: string) => void
  onClose: () => void
  bindBottom: (element: HTMLDivElement | null) => void
}

// The dot colour per status. Each is a full class string, so Tailwind generates every one.
const DOT_CLASS: Record<TaskInfo["status"], string> = {
  running: "animate-pulse bg-white",
  done: "bg-success",
  failed: "bg-destructive",
  stopped: "bg-white/30",
}

// Running tasks above the prompt box. A chip's label opens the task's output, and its stop button ends the task.
export function TaskStrip({ chips, error, viewing, output, onOpen, onStop, onClose, bindBottom }: TaskStripProps) {
  if (chips.length === 0 && viewing === null) {
    return null
  }
  return (
    <>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <span key={chip.id} className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-white/15 py-0.5 pr-0.5 pl-2 text-xs">
            <span className={cn("size-1.5 shrink-0 rounded-full", DOT_CLASS[chip.status])} />
            <button type="button" className="max-w-56 truncate hover:underline" title={chip.command} onClick={() => onOpen(chip.id)}>
              {chip.label}
            </button>
            <span className="text-white/40">{chip.statusText}</span>
            <Button type="button" variant="ghost" size="icon-xs" aria-label={`Stop ${chip.label}`} onClick={() => void onStop(chip.id)}>
              <CircleStopIcon className="size-3.5" />
            </Button>
          </span>
        ))}
      </div>
      {error !== null ? <p role="alert" className="mb-2 text-xs text-destructive">{error}</p> : null}
      <TaskOutputDialog task={viewing} output={output} onClose={onClose} bindBottom={bindBottom} />
    </>
  )
}
