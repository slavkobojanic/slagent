import { CheckIcon, ChevronDownIcon, CircleIcon, LoaderCircleIcon } from "lucide-react"
import { useState } from "react"
import type { TodoItem } from "@shared/types"
import { cn } from "@/lib/utils"

function TodoPanel({ todos, streaming }: { todos: TodoItem[]; streaming: boolean }) {
  const [open, setOpen] = useState(true)
  const done = todos.filter((todo) => todo.status === "completed").length
  if (todos.length === 0) return null
  if (done === todos.length && !streaming) return null
  const current = todos.find((todo) => todo.status === "in_progress")

  return (
    <div className="mb-2 rounded-md border border-white/15 bg-black text-sm">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="text-xs text-white/50 tabular-nums">
          {done}/{todos.length}
        </span>
        <span className="min-w-0 flex-1 truncate">{current?.text ?? "Tasks"}</span>
        <ChevronDownIcon className={cn("size-4 text-white/50 transition-transform", !open && "-rotate-90")} />
      </button>
      {open ? (
        <ul className="max-h-48 space-y-1 overflow-y-auto border-t border-white/10 px-3 py-2">
          {todos.map((todo, index) => (
            <li key={`${index}:${todo.text}`} className="flex items-start gap-2">
              <TodoIcon todo={todo} active={streaming} />
              <span className={cn("min-w-0 flex-1", todo.status === "completed" && "text-white/40 line-through")}>
                {todo.text}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function TodoIcon({ todo, active }: { todo: TodoItem; active: boolean }) {
  if (todo.status === "completed") return <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-white/40" aria-label="Done" />
  if (todo.status === "in_progress") {
    // Spin only while a run is live. A stale list (the model ended its turn
    // without re-sending it) must not look like it is still working.
    return (
      <LoaderCircleIcon
        className={cn("mt-0.5 size-3.5 shrink-0", active && "animate-spin")}
        aria-label={active ? "In progress" : "Not confirmed done"}
      />
    )
  }
  return <CircleIcon className="mt-0.5 size-3.5 shrink-0 text-white/40" aria-label="To do" />
}

export { TodoPanel }
