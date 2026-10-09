import { CircleStopIcon, SquareTerminal } from "lucide-react"
import { cn } from "@/lib/utils"

export type StatusTerminal = {
  id: string
  title: string
  exited: boolean
  origin: "user" | "task"
  color: string | null
}

export type StatusTask = {
  id: string
  label: string
  status: "running" | "done" | "failed" | "stopped"
  statusText: string
  projectName: string
  color: string | null
  exitCode: number | null
}

export type StatusBarProps = {
  terminals: StatusTerminal[]
  tasks: StatusTask[]
  onTerminal: (id: string) => void
  onTask: (id: string) => void
  onTaskTerminal: (task: StatusTask) => void
  onStopTask: (id: string) => void
}

// A thin bar along the bottom edge: the user's terminal tabs on the left, the
// agents' background tasks on the right. Every chip opens its terminal.
export function StatusBar({ terminals, tasks, onTerminal, onTask, onTaskTerminal, onStopTask }: StatusBarProps) {
  return (
    <footer
      aria-label="Terminals"
      className="flex h-6 shrink-0 items-center gap-3 border-t border-white/10 bg-background px-2 text-xs"
    >
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {terminals.length === 0 ? <span className="shrink-0 text-white/30">No terminals</span> : terminals.map((terminal) => (
          <TerminalChip key={terminal.id} terminal={terminal} onOpen={() => onTerminal(terminal.id)} />
        ))}
      </div>
      <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
        {tasks.length === 0 ? <span className="shrink-0 text-white/30">No background tasks</span> : tasks.map((task) => (
          <TaskChip
            key={task.id}
            task={task}
            onOpen={() => onTask(task.id)}
            onTerminal={() => onTaskTerminal(task)}
            onStop={() => onStopTask(task.id)}
          />
        ))}
      </div>
    </footer>
  )
}

function TerminalChip({ terminal, onOpen }: { terminal: StatusTerminal; onOpen: () => void }) {
  return (
    <button
      type="button"
      title={terminal.exited ? `${terminal.title} (exited)` : terminal.title}
      className="flex max-w-40 shrink-0 items-center gap-1.5 rounded px-1.5 py-0.5 text-white/60 hover:bg-white/10 hover:text-white"
      onClick={onOpen}
    >
      <span
        aria-hidden
        className={cn("size-1.5 shrink-0 rounded-full", terminal.exited && "bg-foreground/40")}
        style={terminal.exited ? undefined : { backgroundColor: terminal.color ?? "rgba(255,255,255,0.6)" }}
      />
      <span className="truncate">{terminal.title}</span>
    </button>
  )
}

function TaskChip({ task, onOpen, onTerminal, onStop }: { task: StatusTask; onOpen: () => void; onTerminal: () => void; onStop: () => void }) {
  return (
    <span className="flex max-w-56 shrink-0 items-center gap-1 rounded border border-white/10 py-0.5 pr-0.5 pl-1.5 text-white/60">
      <span
        aria-hidden
        className={cn("size-1.5 shrink-0 rounded-full", task.status === "running" && "animate-pulse")}
        style={{ backgroundColor: task.color ?? "rgba(255,255,255,0.6)" }}
      />
      <button type="button" className="truncate hover:text-white" title={task.projectName} onClick={onOpen}>
        {task.label}
      </button>
      <span className="shrink-0 text-white/40">{task.statusText}</span>
      <button type="button" aria-label={`Open ${task.label} terminal`} title={`Open ${task.label} terminal`} className="rounded p-0.5 hover:bg-white/10 hover:text-white" onClick={onTerminal}>
        <SquareTerminal className="size-3" />
      </button>
      {task.status === "running" ? (
        <button type="button" aria-label={`Stop ${task.label}`} title={`Stop ${task.label}`} className="rounded p-0.5 hover:bg-white/10 hover:text-white" onClick={onStop}>
          <CircleStopIcon className="size-3" />
        </button>
      ) : null}
    </span>
  )
}
