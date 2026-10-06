import type { ChatStatus } from "ai"
import { PaperclipIcon, XIcon } from "lucide-react"
import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react"
import { toast } from "sonner"
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input"
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
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
import { Button } from "@/components/ui/button"
import { errorText } from "@/lib/format"
import type { FileMatch, PromptFile, PromptMention, PromptRequest, QueueMode, QueuedMessage } from "@shared/types"

const MAX_FILE_BYTES = 20 * 1024 * 1024

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
              let description = modeLabel
              if (item.detail) description = `${item.detail}. ${modeLabel}`
              let content = item.text
              if (!content) content = item.detail
              return (
                <QueueItem key={item.id}>
                  <div className="flex items-center gap-2">
                    <QueueItemIndicator />
                    <QueueItemContent>{content}</QueueItemContent>
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
                  <QueueItemDescription>{description}</QueueItemDescription>
                </QueueItem>
              )
            })}
          </QueueList>
        </QueueSectionContent>
      </QueueSection>
    </Queue>
  )
}

function AttachButton() {
  const attachments = usePromptInputAttachments()
  return (
    <Button type="button" variant="ghost" size="icon-sm" aria-label="Attach files" onClick={() => attachments.openFileDialog()}>
      <PaperclipIcon className="size-4" />
    </Button>
  )
}

function ComposerAttachments() {
  const attachments = usePromptInputAttachments()
  if (attachments.files.length === 0) return null
  return (
    <PromptInputHeader>
      {attachments.files.map((file) => (
        <FileChip
          key={file.id}
          name={file.filename ?? "file"}
          mediaType={file.mediaType}
          url={file.url}
          onRemove={() => attachments.remove(file.id)}
        />
      ))}
    </PromptInputHeader>
  )
}

function FileChip({
  name,
  mediaType,
  url,
  onRemove,
}: {
  name: string
  mediaType: string
  url?: string
  onRemove: () => void
}) {
  if (mediaType.startsWith("image/") && url) {
    return <ImageAttachment name={name} url={url} onRemove={onRemove} />
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 p-1">
      <span className="max-w-40 truncate px-1 text-xs">{name}</span>
      <button type="button" className="rounded-md p-1 text-white/60 hover:text-white" aria-label={`Remove ${name}`} onClick={onRemove}>
        <XIcon className="size-3.5" />
      </button>
    </span>
  )
}

function ImageAttachment({ name, url, onRemove }: { name: string; url: string; onRemove: () => void }) {
  return (
    <span className="group relative inline-block">
      <img src={url} alt={name} className="block h-auto max-h-32 w-auto max-w-full rounded-md" />
      <button
        type="button"
        className="absolute inset-0 flex items-center justify-center rounded-md bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        aria-label={`Remove ${name}`}
        onClick={onRemove}
      >
        <XIcon className="size-4" />
      </button>
    </span>
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
  onPrompt: (request: PromptRequest) => Promise<void>
  onAbort: () => Promise<void>
  onQueueMode: (id: string, mode: QueueMode) => Promise<void>
  onRemoveQueued: (id: string) => Promise<void>
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [mentions, setMentions] = useState<PromptMention[]>([])
  const [mention, setMention] = useState<{ query: string; start: number } | null>(null)
  const [matches, setMatches] = useState<FileMatch[]>([])
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (!mention) {
      setMatches([])
      return
    }
    let stop = false
    const timer = window.setTimeout(() => {
      void window.slagent.searchFiles(mention.query).then((next) => {
        if (!stop) setMatches(next)
      })
    }, 80)
    return () => {
      stop = true
      window.clearTimeout(timer)
    }
  }, [mention])

  let status: ChatStatus = "ready"
  if (streaming) status = "streaming"

  let submitDisabled = disabled
  if (streaming) submitDisabled = false

  function syncMention(value: string, cursor: number) {
    setMention(mentionAt(value, cursor))
    setActive(0)
  }

  function chooseMention(match: FileMatch) {
    const textarea = textareaRef.current
    if (!textarea || !mention) return
    const value = textarea.value
    const cursor = textarea.selectionStart
    const token = `@${match.name} `
    const next = `${value.slice(0, mention.start)}${token}${value.slice(cursor)}`
    textarea.value = next
    const caret = mention.start + token.length
    textarea.setSelectionRange(caret, caret)
    setMention(null)
    setMentions((current) => {
      if (current.some((item) => item.path === match.path)) return current
      return [...current, { path: match.path, name: match.name }]
    })
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!mention || matches.length === 0) return
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActive((index) => Math.min(index + 1, matches.length - 1))
      return
    }
    if (event.key === "ArrowUp") {
      event.preventDefault()
      setActive((index) => Math.max(index - 1, 0))
      return
    }
    if (event.key === "Escape") {
      event.preventDefault()
      setMention(null)
      return
    }
    if (event.key === "Enter" && !event.shiftKey) {
      const match = matches[active]
      if (!match) return
      event.preventDefault()
      chooseMention(match)
    }
  }

  async function onSubmit(message: PromptInputMessage) {
    const files = promptFiles(message)
    const text = message.text
    const kept = mentions.filter((item) => text.includes(`@${item.name}`))
    if (!text.trim() && files.length === 0 && kept.length === 0) return
    try {
      await onPrompt({ text, mentions: kept, files })
      setMentions([])
      setMention(null)
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
    <div className="relative mx-auto w-full max-w-3xl px-6 pb-3">
      {queue.length > 0 && <MessageQueue items={queue} onMode={onQueueMode} onRemove={onRemoveQueued} />}
      {mention && matches.length > 0 && (
        <div className="absolute right-6 bottom-full left-6 z-20 mb-2 overflow-hidden rounded-md border border-white/15 bg-black">
          <div className="max-h-56 overflow-y-auto">
            {matches.map((match, index) => {
              let className = "block w-full truncate px-3 py-1.5 text-left text-sm hover:bg-white/10"
              if (index === 0) className += " rounded-t-md"
              if (index === matches.length - 1) className += " rounded-b-md"
              if (index === active) className += " bg-white text-black"
              return (
                <button key={match.path} type="button" className={className} onMouseDown={(event) => event.preventDefault()} onClick={() => chooseMention(match)}>
                  <span>@{match.name}</span>
                  <span className="ml-2 text-xs opacity-60">{match.path}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
      <PromptInput
        multiple
        maxFileSize={MAX_FILE_BYTES}
        onError={(error) => toast.error(error.message)}
        onSubmit={onSubmit}
      >
        <ComposerAttachments />
        <PromptInputBody>
          <PromptInputTextarea
            placeholder={placeholder}
            disabled={disabled}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
              textareaRef.current = event.currentTarget
              syncMention(event.currentTarget.value, event.currentTarget.selectionStart)
            }}
            onKeyDown={onKeyDown}
            onSelect={(event) => {
              const target = event.currentTarget
              textareaRef.current = target
              syncMention(target.value, target.selectionStart)
            }}
          />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools>
            <AttachButton />
          </PromptInputTools>
          <PromptInputSubmit className="ml-auto" disabled={submitDisabled} status={status} onStop={() => void onStop()} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  )
}

function promptFiles(message: PromptInputMessage): PromptFile[] {
  const files: PromptFile[] = []
  for (const file of message.files) {
    const name = file.filename || "file"
    const mimeType = file.mediaType || ""
    const path = (file as { path?: string }).path
    if (path) {
      files.push({ name, mimeType, path })
      continue
    }
    const dataBase64 = base64FromDataUrl(file.url)
    if (!dataBase64) continue
    files.push({ name, mimeType, dataBase64 })
  }
  return files
}

function base64FromDataUrl(url: string | undefined): string | null {
  if (!url) return null
  const marker = "base64,"
  const index = url.indexOf(marker)
  if (index < 0) return null
  return url.slice(index + marker.length)
}

function mentionAt(value: string, cursor: number): { query: string; start: number } | null {
  const before = value.slice(0, cursor)
  const at = before.lastIndexOf("@")
  if (at < 0) return null
  const previous = before[at - 1]
  if (previous && !/\s/.test(previous)) return null
  const query = before.slice(at + 1)
  if (query.includes(" ") || query.includes("\n")) return null
  return { query, start: at }
}

export { Composer }
