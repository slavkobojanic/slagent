import { ChevronDownIcon } from "lucide-react"
import {
  Queue,
  QueueItem,
  QueueItemContent,
  QueueList,
  QueueSection,
  QueueSectionContent,
  QueueSectionTrigger,
} from "@/components/ai-elements/queue"
import { TodoIcon } from "./todo-icon/todo-icon"

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

export function TodoPanel({ panel }: TodoPanelProps) {
  if (panel === null) {
    return null
  }
  return (
    <Queue className="mb-2">
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
                  <TodoIcon status={row.status} label={row.iconLabel} spinning={row.spinning} />
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
