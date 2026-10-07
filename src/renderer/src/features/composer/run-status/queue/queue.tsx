import { XIcon } from "lucide-react"
import type { QueueMode } from "@shared/types"
import {
  Queue,
  QueueItem,
  QueueItemAction,
  QueueItemActions,
  QueueItemContent,
  QueueItemDescription,
  QueueItemIndicator,
  QueueList,
  QueueSection,
  QueueSectionContent,
  QueueSectionLabel,
  QueueSectionTrigger,
} from "@/components/ai-elements/queue"

export type QueueRow = {
  id: string
  content: string
  description: string | null
  switchLabel: string
  nextMode: QueueMode
}

export type MessageQueueProps = {
  rows: QueueRow[]
  error: string | null
  onModeChange: (id: string, mode: QueueMode) => void
  onRemove: (id: string) => void
}

export function MessageQueue({ rows, error, onModeChange, onRemove }: MessageQueueProps) {
  if (rows.length === 0) {
    return null
  }
  return (
    <Queue className="mb-2 rounded-none border-0 bg-transparent p-0 shadow-none">
      <QueueSection>
        <QueueSectionTrigger>
          <QueueSectionLabel count={rows.length} label="queued" />
        </QueueSectionTrigger>
        <QueueSectionContent>
          <QueueList>
            {rows.map((row) => (
              <QueueItem key={row.id}>
                <div className="flex items-center gap-2">
                  <QueueItemIndicator />
                  <QueueItemContent>{row.content}</QueueItemContent>
                  <QueueItemActions>
                    <QueueItemAction className="opacity-100" onClick={() => onModeChange(row.id, row.nextMode)}>
                      {row.switchLabel}
                    </QueueItemAction>
                    <QueueItemAction className="opacity-100" aria-label="Remove from queue" onClick={() => onRemove(row.id)}>
                      <XIcon className="size-3.5" />
                    </QueueItemAction>
                  </QueueItemActions>
                </div>
                {row.description !== null ? <QueueItemDescription>{row.description}</QueueItemDescription> : null}
              </QueueItem>
            ))}
          </QueueList>
        </QueueSectionContent>
      </QueueSection>
      {error !== null ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
    </Queue>
  )
}
