import { CheckIcon, ChevronDownIcon, LoaderCircleIcon } from "lucide-react"
import type { TodoItem } from "@shared/types"
import {
  Queue,
  QueueItem,
  QueueItemContent,
  QueueItemIndicator,
  QueueList,
  QueueSection,
  QueueSectionContent,
  QueueSectionTrigger,
} from "@/components/ai-elements/queue"
import { cn } from "@/lib/utils"

function TodoPanel({ todos, streaming }: { todos: TodoItem[]; streaming: boolean }) {
  const done = todos.filter((todo) => todo.status === "completed").length
  if (todos.length === 0) return null
  if (done === todos.length && !streaming) return null
  const current = todos.find((todo) => todo.status === "in_progress")

  return (
    <Queue className="mb-2 rounded-none border-0 bg-transparent p-0 shadow-none">
      <QueueSection>
        <QueueSectionTrigger>
          <span className="flex min-w-0 items-center gap-2">
            <ChevronDownIcon className="size-4 shrink-0 transition-transform group-data-[state=closed]:-rotate-90" />
            <span className="tabular-nums">
              {done}/{todos.length}
            </span>
            <span className="min-w-0 truncate">{current?.text ?? "Tasks"}</span>
          </span>
        </QueueSectionTrigger>
        <QueueSectionContent>
          <QueueList>
            {todos.map((todo, index) => {
              const completed = todo.status === "completed"
              return (
                <QueueItem key={`${index}:${todo.text}`}>
                  <div className="flex items-center gap-2">
                    <TodoIcon todo={todo} active={streaming} />
                    <QueueItemContent completed={completed}>{todo.text}</QueueItemContent>
                  </div>
                </QueueItem>
              )
            })}
          </QueueList>
        </QueueSectionContent>
      </QueueSection>
    </Queue>
  )
}

function TodoIcon({ todo, active }: { todo: TodoItem; active: boolean }) {
  if (todo.status === "completed") {
    return <CheckIcon className="size-2.5 shrink-0 text-muted-foreground/50" aria-label="Done" />
  }
  if (todo.status === "in_progress") {
    // Spin only while a run is live. A stale list (the model ended its turn
    // without re-sending it) must not look like it is still working.
    return (
      <LoaderCircleIcon
        className={cn("size-2.5 shrink-0 text-muted-foreground", active && "animate-spin")}
        aria-label={active ? "In progress" : "Not confirmed done"}
      />
    )
  }
  return <QueueItemIndicator className="mt-0 shrink-0" aria-label="To do" />
}

export { TodoPanel }
