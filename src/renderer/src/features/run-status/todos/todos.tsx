import { CheckIcon, ChevronDownIcon, LoaderCircleIcon } from "lucide-react"
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

export type TodoRow = {
  key: string
  text: string
  status: "pending" | "in_progress" | "completed"
  iconLabel: string
  spinning: boolean
}

export type TodoPanelModel = {
  countText: string
  currentText: string
  rows: TodoRow[]
}

export type TodoPanelProps = {
  panel: TodoPanelModel | null
}

// The todo list as a collapsible section. Its header shows the count and the task in progress.
export function TodoPanel({ panel }: TodoPanelProps) {
  if (panel === null) {
    return null
  }
  return (
    <Queue className="mb-2 rounded-none border-0 bg-transparent p-0 shadow-none">
      <QueueSection>
        <QueueSectionTrigger>
          <span className="flex min-w-0 items-center gap-2">
            <ChevronDownIcon className="size-4 shrink-0 transition-transform group-data-[state=closed]:-rotate-90" />
            <span className="tabular-nums">{panel.countText}</span>
            <span className="min-w-0 truncate">{panel.currentText}</span>
          </span>
        </QueueSectionTrigger>
        <QueueSectionContent>
          <QueueList>
            {panel.rows.map((row) => (
              <QueueItem key={row.key}>
                <div className="flex items-center gap-2">
                  <TodoIcon row={row} />
                  <QueueItemContent completed={row.status === "completed"}>{row.text}</QueueItemContent>
                </div>
              </QueueItem>
            ))}
          </QueueList>
        </QueueSectionContent>
      </QueueSection>
    </Queue>
  )
}

function TodoIcon({ row }: { row: TodoRow }) {
  if (row.status === "completed") {
    return <CheckIcon className="size-2.5 shrink-0 text-muted-foreground/50" aria-label={row.iconLabel} />
  }
  if (row.status === "in_progress") {
    return (
      <LoaderCircleIcon
        className={cn("size-2.5 shrink-0 text-muted-foreground", row.spinning && "animate-spin")}
        aria-label={row.iconLabel}
      />
    )
  }
  return <QueueItemIndicator className="mt-0 shrink-0" aria-label={row.iconLabel} />
}
