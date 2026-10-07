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
import { setTextareaValue } from "@/lib/composer"
import { errorText } from "@/lib/format"
import { promptHistory, rememberPrompt, searchHistory } from "@/lib/history"
import type { FileMatch, PromptFile, PromptMention, PromptRequest, QueueMode, QueuedMessage, SlashCommand, TodoItem, UsageState } from "@shared/types"
import { TodoPanel } from "@/components/todo-panel"
import { UsageMeter } from "@/components/usage-meter"

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
  usage,
  todos,
  onCompact,
  onPrompt,
  onAbort,
  onQueueMode,
  onRemoveQueued,
}: {
  streaming: boolean
  disabled: boolean
  placeholder: string
  queue: QueuedMessage[]
  usage: UsageState | null
  todos: TodoItem[]
  onCompact: () => Promise<void>
  onPrompt: (request: PromptRequest) => Promise<void>
  onAbort: () => Promise<void>
  onQueueMode: (id: string, mode: QueueMode) => Promise<void>
  onRemoveQueued: (id: string) => Promise<void>
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [mentions, setMentions] = useState<PromptMention[]>([])
  const [mention, setMention] = useState<{ query: string; start: number } | null>(null)
  const [matches, setMatches] = useState<FileMatch[]>([])
  const [slash, setSlash] = useState<string | null>(null)
  const [commands, setCommands] = useState<SlashCommand[]>([])
  const [active, setActive] = useState(0)
  const [historyQuery, setHistoryQuery] = useState<string | null>(null)
  const historyIndex = useRef<number | null>(null)
  const historyDraft = useRef("")
  const slashOpen = slash !== null
  const historyMatches = historyQuery === null ? [] : searchHistory(historyQuery)

  useEffect(() => {
    if (!slashOpen) return
    let stop = false
    void window.slagent.listCommands().then((next) => {
      if (!stop) setCommands(next)
    })
    return () => {
      stop = true
    }
  }, [slashOpen])

  const commandMatches = slash === null ? [] : filterCommands(commands, slash)

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
    setSlash(slashAt(value, cursor))
    setActive(0)
  }

  function chooseCommand(command: SlashCommand) {
    const textarea = textareaRef.current
    if (!textarea) return
    const value = textarea.value
    const cursor = textarea.selectionStart
    const token = `${command.insert} `
    const next = `${token}${value.slice(cursor).trimStart()}`
    setTextareaValue(textarea, next)
    textarea.setSelectionRange(token.length, token.length)
    setSlash(null)
  }

  function chooseMention(match: FileMatch) {
    const textarea = textareaRef.current
    if (!textarea || !mention) return
    const value = textarea.value
    const cursor = textarea.selectionStart
    const token = `@${match.name} `
    const next = `${value.slice(0, mention.start)}${token}${value.slice(cursor)}`
    setTextareaValue(textarea, next)
    const caret = mention.start + token.length
    textarea.setSelectionRange(caret, caret)
    setMention(null)
    setMentions((current) => {
      if (current.some((item) => item.path === match.path)) return current
      return [...current, { path: match.path, name: match.name }]
    })
  }

  function browseHistory(textarea: HTMLTextAreaElement, direction: -1 | 1): boolean {
    const items = promptHistory()
    if (items.length === 0) return false
    const index = historyIndex.current
    const browsing = index !== null && textarea.value === items[index]
    if (direction === -1) {
      if (!browsing && textarea.value.slice(0, textarea.selectionStart).includes("\n")) return false
      if (!browsing) historyDraft.current = textarea.value
      let next = items.length - 1
      if (browsing && index !== null) next = index - 1
      if (next < 0) return true
      historyIndex.current = next
      setTextareaValue(textarea, items[next] ?? "")
      return true
    }
    if (!browsing || index === null) return false
    const next = index + 1
    if (next >= items.length) {
      historyIndex.current = null
      setTextareaValue(textarea, historyDraft.current)
      return true
    }
    historyIndex.current = next
    setTextareaValue(textarea, items[next] ?? "")
    return true
  }

  function chooseHistory(text: string) {
    const textarea = textareaRef.current
    setHistoryQuery(null)
    if (!textarea) return
    setTextareaValue(textarea, text)
    textarea.setSelectionRange(text.length, text.length)
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    const textarea = event.currentTarget
    textareaRef.current = textarea
    if (event.ctrlKey && event.key === "r") {
      event.preventDefault()
      setHistoryQuery((current) => (current === null ? textarea.value : null))
      setActive(0)
      return
    }
    let count = 0
    if (historyQuery !== null) count = historyMatches.length
    else if (mention) count = matches.length
    else if (slash !== null) count = commandMatches.length
    if (historyQuery !== null && event.key === "Escape") {
      event.preventDefault()
      setHistoryQuery(null)
      return
    }
    if (count === 0) {
      if (historyQuery !== null) {
        if (event.key === "Enter") event.preventDefault()
        return
      }
      if (event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return
      if (event.key === "ArrowUp" && browseHistory(textarea, -1)) event.preventDefault()
      if (event.key === "ArrowDown" && browseHistory(textarea, 1)) event.preventDefault()
      return
    }
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActive((index) => Math.min(index + 1, count - 1))
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
      setSlash(null)
      setHistoryQuery(null)
      return
    }
    if ((event.key === "Enter" && !event.shiftKey) || event.key === "Tab") {
      event.preventDefault()
      if (historyQuery !== null) {
        const item = historyMatches[active]
        if (item) chooseHistory(item)
        return
      }
      if (mention) {
        const match = matches[active]
        if (match) chooseMention(match)
        return
      }
      const command = commandMatches[active]
      if (command) chooseCommand(command)
    }
  }

  async function onSubmit(message: PromptInputMessage) {
    const files = promptFiles(message)
    const text = message.text
    const kept = mentions.filter((item) => text.includes(`@${item.name}`))
    if (!text.trim() && files.length === 0 && kept.length === 0) return
    try {
      await onPrompt({ text, mentions: kept, files })
      rememberPrompt(text)
      historyIndex.current = null
      setHistoryQuery(null)
      setMentions([])
      setMention(null)
      setSlash(null)
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
      <TodoPanel todos={todos} streaming={streaming} />
      {queue.length > 0 && <MessageQueue items={queue} onMode={onQueueMode} onRemove={onRemoveQueued} />}
      {historyQuery !== null && (
        <Suggestions
          active={active}
          empty="No matching prompts"
          title={`History search${historyQuery ? `: ${historyQuery}` : ""}`}
          items={historyMatches.map((item, index) => ({
            key: `${index}:${item}`,
            label: item.replace(/\s+/g, " "),
            detail: "",
            choose: () => chooseHistory(item),
          }))}
        />
      )}
      {historyQuery === null && mention && matches.length > 0 && (
        <Suggestions
          active={active}
          items={matches.map((match) => ({
            key: match.path,
            label: `@${match.name}`,
            detail: match.path,
            choose: () => chooseMention(match),
          }))}
        />
      )}
      {historyQuery === null && !mention && slash !== null && commandMatches.length > 0 && (
        <Suggestions
          active={active}
          items={commandMatches.map((command) => ({
            key: command.insert,
            label: command.insert,
            detail: command.description || kindLabel(command.kind),
            choose: () => chooseCommand(command),
          }))}
        />
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
              if (historyQuery !== null) {
                setHistoryQuery(event.currentTarget.value)
                setActive(0)
                return
              }
              syncMention(event.currentTarget.value, event.currentTarget.selectionStart)
            }}
            onKeyDown={onKeyDown}
            onSelect={(event) => {
              const target = event.currentTarget
              textareaRef.current = target
              if (historyQuery !== null) return
              syncMention(target.value, target.selectionStart)
            }}
          />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools>
            <AttachButton />
          </PromptInputTools>
          <UsageMeter usage={usage} busy={streaming} onCompact={onCompact} />
          <PromptInputSubmit disabled={submitDisabled} status={status} onStop={() => void onStop()} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  )
}

type Suggestion = {
  key: string
  label: string
  detail: string
  choose: () => void
}

function Suggestions({
  items,
  active,
  title,
  empty,
}: {
  items: Suggestion[]
  active: number
  title?: string
  empty?: string
}) {
  return (
    <div className="absolute right-6 bottom-full left-6 z-20 mb-2 overflow-hidden rounded-md border border-white/15 bg-black">
      {title ? <p className="truncate border-b border-white/10 px-3 py-1.5 text-xs text-white/50">{title}</p> : null}
      {items.length === 0 && empty ? <p className="px-3 py-1.5 text-sm text-white/50">{empty}</p> : null}
      <div className="max-h-56 overflow-y-auto">
        {items.map((item, index) => {
          let className = "block w-full truncate px-3 py-1.5 text-left text-sm hover:bg-white/10"
          if (index === 0) className += " rounded-t-md"
          if (index === items.length - 1) className += " rounded-b-md"
          if (index === active) className += " bg-white text-black"
          return (
            <button key={item.key} type="button" className={className} onMouseDown={(event) => event.preventDefault()} onClick={item.choose}>
              <span>{item.label}</span>
              <span className="ml-2 text-xs opacity-60">{item.detail}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function kindLabel(kind: SlashCommand["kind"]): string {
  if (kind === "skill") return "Skill"
  if (kind === "prompt") return "Prompt template"
  return "Command"
}

function filterCommands(commands: SlashCommand[], query: string): SlashCommand[] {
  const needle = query.toLowerCase()
  const starts: SlashCommand[] = []
  const contains: SlashCommand[] = []
  for (const command of commands) {
    const name = command.insert.slice(1).toLowerCase()
    if (name.startsWith(needle) || command.name.toLowerCase().startsWith(needle)) starts.push(command)
    else if (name.includes(needle)) contains.push(command)
  }
  return [...starts, ...contains].slice(0, 50)
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

function slashAt(value: string, cursor: number): string | null {
  const before = value.slice(0, cursor)
  const match = /^\/(\S*)$/.exec(before)
  if (!match) return null
  return match[1] ?? ""
}

export { Composer }
