import type { ChatStatus } from "ai"
import { XIcon } from "lucide-react"
import { toast } from "sonner"
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input"
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input"
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
import { errorText } from "@/lib/format"
import type { QueueMode, QueuedMessage } from "@shared/types"

function MessageQueue({
  items,
  onMode,
  onRemove,
}: {
  items: QueuedMessage[]
  onMode: (id: string, mode: QueueMode) => Promise<void>
  onRemove: (id: string) => Promise<void>
}) {
  return (
    <Queue className="mb-2">
      <QueueSection>
        <QueueSectionTrigger>
          <QueueSectionLabel count={items.length} label="queued" />
        </QueueSectionTrigger>
        <QueueSectionContent>
          <QueueList>
            {items.map((item) => {
              let modeLabel = "Sends when this run finishes."
              let switchLabel = "Steer"
              let nextMode: QueueMode = "steer"
              if (item.mode === "steer") {
                modeLabel = "Sends after the current tool."
                switchLabel = "Follow-up"
                nextMode = "follow-up"
              }
              return (
                <QueueItem key={item.id}>
                  <div className="flex items-center gap-2">
                    <QueueItemIndicator />
                    <QueueItemContent>{item.text}</QueueItemContent>
                    <QueueItemActions>
                      <QueueItemAction
                        className="opacity-100"
                        onClick={() => {
                          void onMode(item.id, nextMode).catch((error: unknown) => {
                            toast.error(errorText(error))
                          })
                        }}
                      >
                        {switchLabel}
                      </QueueItemAction>
                      <QueueItemAction
                        className="opacity-100"
                        aria-label="Remove from queue"
                        onClick={() => {
                          void onRemove(item.id).catch((error: unknown) => {
                            toast.error(errorText(error))
                          })
                        }}
                      >
                        <XIcon className="size-3.5" />
                      </QueueItemAction>
                    </QueueItemActions>
                  </div>
                  <QueueItemDescription>{modeLabel}</QueueItemDescription>
                </QueueItem>
              )
            })}
          </QueueList>
        </QueueSectionContent>
      </QueueSection>
    </Queue>
  )
}

function Composer({
  streaming,
  disabled,
  placeholder,
  queue,
  onPrompt,
  onAbort,
  onQueueMode,
  onRemoveQueued,
}: {
  streaming: boolean
  disabled: boolean
  placeholder: string
  queue: QueuedMessage[]
  onPrompt: (text: string) => Promise<void>
  onAbort: () => Promise<void>
  onQueueMode: (id: string, mode: QueueMode) => Promise<void>
  onRemoveQueued: (id: string) => Promise<void>
}) {
  let status: ChatStatus = "ready"
  if (streaming) status = "streaming"

  let submitDisabled = disabled
  if (streaming) submitDisabled = false

  async function onSubmit(message: PromptInputMessage) {
    const text = message.text.trim()
    if (!text) return
    try {
      await onPrompt(text)
    } catch (error) {
      toast.error(errorText(error))
      throw error
    }
  }

  async function onStop() {
    try {
      await onAbort()
    } catch (error) {
      toast.error(errorText(error))
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 pb-3">
      {queue.length > 0 && (
        <MessageQueue items={queue} onMode={onQueueMode} onRemove={onRemoveQueued} />
      )}
      <PromptInput onSubmit={onSubmit}>
        <PromptInputBody>
          <PromptInputTextarea placeholder={placeholder} disabled={disabled} />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputSubmit className="ml-auto" disabled={submitDisabled} status={status} onStop={() => void onStop()} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  )
}

export { Composer }
