import Ansi from "ansi-to-react"
import { useStickToBottomContext } from "use-stick-to-bottom"
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react"
import { toast } from "sonner"
import type { AssistantMessage, ChatMessage, ReplyComment, ToolMessage, TranscriptPage, UserMessage } from "@shared/types"
import { AnsweredQuestions } from "@/components/question-card"
import { FadingResponse } from "@/components/fading-response"
import { CommentableResponse, ReplyCommentsContext } from "@/components/response-comments"
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought"
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import { Message, MessageAction, MessageActions, MessageContent, MessageResponse } from "@/components/ai-elements/message"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning"
import { Shimmer } from "@/components/ai-elements/shimmer"
import { Spinner } from "@/components/ui/spinner"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { errorText, openPath } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import { BotIcon, FileTextIcon, MessageCircleQuestionIcon, FolderIcon, ListChecksIcon, PencilIcon, RotateCcwIcon, SearchIcon, ServerIcon, TerminalIcon } from "lucide-react"
import type { RewindMode } from "@shared/types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { fillComposer } from "@/lib/composer"

export const EDIT_LAST_EVENT = "slagent:edit-last"

type Turn = {
  id: string
  assistant: AssistantMessage | null
  tools: ToolMessage[]
}

type Block = { kind: "user"; message: UserMessage } | { kind: "turn"; turn: Turn }

function groupMessages(messages: ChatMessage[]): Block[] {
  const blocks: Block[] = []
  for (const message of messages) {
    if (message.role === "user") {
      blocks.push({ kind: "user", message })
      continue
    }
    if (message.role === "assistant") {
      blocks.push({
        kind: "turn",
        turn: { id: message.id, assistant: message, tools: [] },
      })
      continue
    }
    const last = blocks[blocks.length - 1]
    if (last && last.kind === "turn") {
      last.turn.tools.push(message)
      continue
    }
    blocks.push({
      kind: "turn",
      turn: { id: message.id, assistant: null, tools: [message] },
    })
  }
  return blocks
}

function toolIcon(name: string): LucideIcon {
  if (name === "bash") return TerminalIcon
  if (name === "grep" || name === "find") return SearchIcon
  if (name === "ls") return FolderIcon
  if (name === "edit" || name === "write") return PencilIcon
  if (name === "subagent") return BotIcon
  if (name === "ask_user") return MessageCircleQuestionIcon
  if (name === "todo" || name === "propose_plan") return ListChecksIcon
  if (name === "bash_background" || name === "task_output" || name === "task_stop") return ServerIcon
  return FileTextIcon
}

function waitingForText(assistant: AssistantMessage | null, tools: ToolMessage[]): boolean {
  if (!assistant || !assistant.streaming || assistant.text || assistant.thinking) return false
  for (const tool of tools) {
    if (tool.running) return false
  }
  return true
}

function bashCommand(tool: ToolMessage): string {
  try {
    const args = JSON.parse(tool.args) as { command?: unknown }
    if (typeof args.command === "string" && args.command) return args.command
  } catch {
    // Long arguments are truncated and no longer parse.
  }
  if (tool.label.startsWith("bash  ")) return tool.label.slice("bash  ".length)
  return tool.label
}

// Bash runs render as a small terminal right in the transcript: the command,
// then its output, which stays pinned to the bottom while it streams.
function BashOutput({ message }: { message: ToolMessage }) {
  const scroller = useRef<HTMLDivElement | null>(null)
  const pinned = useRef(true)

  useLayoutEffect(() => {
    const element = scroller.current
    if (!element || !pinned.current) return
    element.scrollTop = element.scrollHeight
  }, [message.output])

  return (
    <div className="mt-1 overflow-hidden rounded-md border border-white/10 bg-white/[0.03] font-mono text-xs">
      <div
        ref={scroller}
        className="max-h-72 overflow-auto px-3 py-2"
        onScroll={(event) => {
          const element = event.currentTarget
          pinned.current = element.scrollHeight - element.scrollTop - element.clientHeight < 24
        }}
      >
        <div className="break-all whitespace-pre-wrap text-white/90">
          <span className="text-white/40 select-none">$ </span>
          {bashCommand(message)}
        </div>
        {message.output ? (
          <div className={cn("mt-1 break-words whitespace-pre-wrap text-white/60", message.isError && "text-[#ff8a8a]")}>
            <Ansi>{message.output}</Ansi>
          </div>
        ) : message.running ? (
          <div className="mt-1 text-white/30">Running…</div>
        ) : null}
      </div>
    </div>
  )
}

// True while a run is going but nothing on screen shows it: right after
// sending, and between a finished tool and the model's next reply.
function awaitingModel(messages: ChatMessage[], streaming: boolean): boolean {
  if (!streaming) return false
  const last = messages[messages.length - 1]
  if (!last) return true
  if (last.role === "user") return true
  if (last.role === "tool") return !last.running
  return !last.streaming
}

function PendingReply({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
      <Spinner className="size-3.5" />
      <Shimmer>{label}</Shimmer>
    </div>
  )
}

function ToolOutput({ message }: { message: ToolMessage }) {
  if (message.name === "bash") return <BashOutput message={message} />
  if (message.name === "ask_user" && message.answers?.length) return <AnsweredQuestions answers={message.answers} />
  const images = message.images ?? []
  if (!message.output && images.length === 0) return null
  return (
    <div className="space-y-2">
      {images.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {images.map((url) => (
            <img key={url} src={url} alt="" className="max-h-48 max-w-full rounded-md" />
          ))}
        </div>
      ) : null}
      {message.output ? (
        <Collapsible>
          <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground">
            Output
          </CollapsibleTrigger>
          <CollapsibleContent>
            <pre
              className={cn(
                "mt-2 max-h-48 overflow-auto font-mono text-xs whitespace-pre-wrap text-muted-foreground",
                message.isError && "text-destructive",
              )}
            >
              {message.output}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  )
}

const PATH_TOOLS = new Set(["read", "edit", "write", "ls"])

function toolPath(tool: ToolMessage): string | null {
  if (!PATH_TOOLS.has(tool.name)) return null
  try {
    const args = JSON.parse(tool.args) as { path?: unknown; file_path?: unknown; offset?: unknown }
    let path = args.path ?? args.file_path
    if (typeof path !== "string" || !path) return null
    if (typeof args.offset === "number" && args.offset > 0) path = `${path}:${args.offset}`
    return path as string
  } catch {
    return null
  }
}

function ToolLabel({ tool }: { tool: ToolMessage }) {
  if (tool.name === "bash") return <>{tool.running ? "Running command" : tool.isError ? "Command failed" : "Ran command"}</>
  if (tool.name === "ask_user") {
    if (tool.running) return <>Waiting for your answer</>
    return <>{tool.isError ? "Question cancelled" : tool.answers?.length === 1 ? "Asked a question" : "Asked questions"}</>
  }
  const path = toolPath(tool)
  if (!path) return <>{tool.label}</>
  return (
    <>
      {tool.name}{" "}
      <button
        type="button"
        className="text-left underline-offset-2 hover:text-foreground hover:underline"
        title="View file"
        onClick={() => openPath(path)}
      >
        {path}
      </button>
    </>
  )
}

function ToolChain({ tools }: { tools: ToolMessage[] }) {
  if (tools.length === 0) return null
  return (
    <ChainOfThought defaultOpen>
      <ChainOfThoughtHeader>Tools</ChainOfThoughtHeader>
      <ChainOfThoughtContent>
        {tools.map((tool) => {
          let status: "active" | "complete" = "complete"
          if (tool.running) status = "active"
          return (
            <ChainOfThoughtStep
              key={tool.id}
              icon={toolIcon(tool.name)}
              label={<ToolLabel tool={tool} />}
              status={status}
              className={cn(tool.isError && "text-destructive")}
            >
              <ToolOutput message={tool} />
            </ChainOfThoughtStep>
          )
        })}
      </ChainOfThoughtContent>
    </ChainOfThought>
  )
}

function AssistantTurn({ turn }: { turn: Turn }) {
  const assistant = turn.assistant
  return (
    <Message from="assistant" className="max-w-full" data-message-id={turn.id}>
      {assistant?.thinking && (
        <Reasoning isStreaming={assistant.streaming}>
          <ReasoningTrigger />
          <ReasoningContent>{assistant.thinking}</ReasoningContent>
        </Reasoning>
      )}
      <ToolChain tools={turn.tools} />
      {assistant && waitingForText(assistant, turn.tools) && <Shimmer>Working</Shimmer>}
      {assistant?.text && <AssistantText messageId={assistant.id} text={assistant.text} streaming={assistant.streaming} />}
      {assistant?.error && <p className="text-sm text-destructive">{assistant.error}</p>}
    </Message>
  )
}

function AssistantText({ messageId, text, streaming }: { messageId: string; text: string; streaming: boolean }) {
  const animate = useRef(streaming)
  if (streaming) animate.current = true
  if (animate.current) return <FadingResponse messageId={messageId} text={text} streaming={streaming} />
  return <CommentableResponse messageId={messageId} text={text} />
}

function UserTurn({
  message,
  editable,
  latest,
  editing,
  onEditing,
  onEdit,
}: {
  message: UserMessage
  editable: boolean
  latest: boolean
  editing: boolean
  onEditing: (editing: boolean) => void
  onEdit: (id: string, text: string) => Promise<void>
}) {
  async function rewind(mode: RewindMode) {
    try {
      const result = await window.slagent.rewind(message.id, mode)
      if (mode !== "code") fillComposer(result.text)
      const undo = result.undo
      let label = "Chat rewound"
      if (mode === "code") label = "Code rewound"
      if (mode === "both") label = "Code and chat rewound"
      if (!undo) {
        toast.success(label)
        return
      }
      toast.success(label, {
        action: {
          label: "Undo code",
          onClick: () => {
            void window.slagent.undoRewind(undo).catch((error: unknown) => toast.error(errorText(error)))
          },
        },
      })
    } catch (error) {
      toast.error(errorText(error))
    }
  }

  const [confirming, setConfirming] = useState(false)

  function startEdit() {
    if (latest) {
      onEditing(true)
      return
    }
    setConfirming(true)
  }

  const attachments = message.attachments ?? []
  if (editing) {
    return <EditMessage message={message} onCancel={() => onEditing(false)} onSave={(text) => onEdit(message.id, text)} />
  }
  return (
    <Message from="user" className="group" data-message-id={message.id}>
      {attachments.length > 0 ? (
        <div className="flex flex-wrap justify-end gap-2">
          {attachments.map((attachment) => {
            if (attachment.kind === "image" && attachment.url) {
              return (
                <img
                  key={attachment.id}
                  src={attachment.url}
                  alt={attachment.name}
                  className="max-h-48 max-w-full rounded-md"
                />
              )
            }
            return (
              <span key={attachment.id} className="rounded-md border border-white/15 px-2 py-1 text-xs">
                {attachment.name}
              </span>
            )
          })}
        </div>
      ) : null}
      {message.replies?.length ? (
        <div className="ml-auto w-full max-w-[80%] divide-y divide-white/10 rounded-md bg-white/[0.06] px-3 text-xs">
          {message.replies.map((reply) => (
            <div key={reply.id} className="space-y-1.5 py-2.5">
              <blockquote className="line-clamp-3 border-l-2 border-amber-400/50 pl-2 whitespace-pre-wrap text-white/50">{reply.quote}</blockquote>
              <p className="whitespace-pre-wrap">{reply.text}</p>
            </div>
          ))}
        </div>
      ) : null}
      {message.text ? <MessageContent className="whitespace-pre-wrap">{message.text}</MessageContent> : null}
      {message.comments?.length ? (
        <div className="ml-auto w-full max-w-[80%] divide-y divide-white/10 rounded-md bg-white/[0.06] px-3 text-xs">
          {message.comments.map((comment) => (
            <div key={comment.id} className="space-y-1 py-2.5">
              <button
                type="button"
                className="block font-mono text-white/50 hover:text-white hover:underline"
                onClick={() => openPath(`${comment.path}:${comment.line}`)}
              >
                {comment.path}:{comment.line}
              </button>
              {comment.code.trim() ? <p className="truncate font-mono text-white/40">{comment.code.trim()}</p> : null}
              <p className="whitespace-pre-wrap">{comment.text}</p>
            </div>
          ))}
        </div>
      ) : null}
      {editable ? (
        <MessageActions className="justify-end opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <MessageAction tooltip="Edit and resend" onClick={startEdit}>
            <PencilIcon className="size-3.5" />
          </MessageAction>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <MessageAction label="Rewind">
                <RotateCcwIcon className="size-3.5" />
              </MessageAction>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                Go back to before this message
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={!message.checkpoint} onSelect={() => void rewind("both")}>
                Rewind code and chat
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void rewind("chat")}>Rewind chat only</DropdownMenuItem>
              <DropdownMenuItem disabled={!message.checkpoint} onSelect={() => void rewind("code")}>
                Rewind code only
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </MessageActions>
      ) : null}
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit earlier message?</DialogTitle>
            <DialogDescription>
              Sending the edit replaces this message and deletes everything after it in the chat.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                setConfirming(false)
                onEditing(true)
              }}
            >
              Edit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Message>
  )
}

function EditMessage({
  message,
  onCancel,
  onSave,
}: {
  message: UserMessage
  onCancel: () => void
  onSave: (text: string) => Promise<void>
}) {
  const [draft, setDraft] = useState(message.text)
  const [saving, setSaving] = useState(false)

  async function save() {
    const text = draft.trim()
    if (!text || saving) return
    setSaving(true)
    try {
      await onSave(text)
    } catch (error) {
      toast.error(errorText(error))
      setSaving(false)
    }
  }

  return (
    <div className="ml-auto w-full max-w-[80%] space-y-2">
      <Textarea
        value={draft}
        autoFocus
        aria-label="Edit message"
        className="min-h-20 text-sm"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault()
            onCancel()
          }
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            void save()
          }
        }}
      />
      <p className="text-xs text-muted-foreground">Sending replaces this message and everything after it.</p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={() => void save()} disabled={saving || !draft.trim()}>
          Send
        </Button>
      </div>
    </div>
  )
}

function PlanCard({ plan, onApprove }: { plan: string; onApprove: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)

  async function approve() {
    setBusy(true)
    try {
      await onApprove()
    } catch (error) {
      toast.error(errorText(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-md border border-amber-500/40 bg-amber-300/10 dark:border-amber-300/40 dark:bg-amber-300/5" aria-label="Proposed plan">
      <header className="flex items-center gap-2 border-b border-amber-300/20 px-4 py-2 text-sm">
        <span className="font-medium text-amber-800 dark:text-amber-200">Proposed plan</span>
        <span className="text-xs text-muted-foreground">Nothing has changed yet.</span>
      </header>
      <div className="max-h-[50vh] overflow-y-auto px-4 py-3">
        <MessageResponse>{plan}</MessageResponse>
      </div>
      <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-amber-300/20 px-4 py-2">
        <span className="mr-auto text-xs text-muted-foreground">Reply below to change the plan.</span>
        <Button type="button" size="sm" disabled={busy} onClick={() => void approve()}>
          Approve and build
        </Button>
      </footer>
    </section>
  )
}

function EmptyState({
  configured,
  cwd,
  onConnect,
  onChoose,
}: {
  configured: boolean
  cwd: string
  onConnect: () => void
  onChoose: () => void
}) {
  if (!cwd) {
    return (
      <ConversationEmptyState>
        <h1 className="text-xl font-medium tracking-tight">Choose a folder</h1>
        <p className="max-w-md text-sm text-muted-foreground">A project is the folder the agent works in.</p>
        <button
          type="button"
          className="mt-2 h-8 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-white/90"
          onClick={onChoose}
        >
          Choose folder
        </button>
      </ConversationEmptyState>
    )
  }

  if (!configured) {
    return (
      <ConversationEmptyState>
        <h1 className="text-xl font-medium tracking-tight">Connect OpenRouter</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Add an API key, or sign in with the Pi CLI. slagent uses the same credentials. To use your Claude
          subscription instead, pick a Claude Code model from the model menu.
        </p>
        <button
          type="button"
          className="mt-2 h-8 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-white/90"
          onClick={onConnect}
        >
          Add API key
        </button>
      </ConversationEmptyState>
    )
  }

  return (
    <ConversationEmptyState>
      <h1 className="text-xl font-medium tracking-tight">Ask for a change in this folder</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The agent can read files, edit them, and run commands. Pi extensions and skills load from this folder and
        from your Pi config.
      </p>
      <p className="font-mono text-xs break-all text-muted-foreground/70">{cwd}</p>
    </ConversationEmptyState>
  )
}

function Transcript({
  messages,
  notice,
  configured,
  cwd,
  streaming,
  planProposal,
  onApprovePlan,
  onConnect,
  onChoose,
  onEdit,
  jumpTo,
  onJumped,
  page,
  replies,
  onReplies,
}: {
  messages: ChatMessage[]
  page: TranscriptWindowPage
  replies: ReplyComment[]
  onReplies: Dispatch<SetStateAction<ReplyComment[]>>
  notice: string | null
  configured: boolean
  cwd: string
  streaming: boolean
  planProposal: string | null
  onApprovePlan: () => Promise<void>
  onConnect: () => void
  onChoose: () => void
  onEdit: (id: string, text: string) => Promise<void>
  jumpTo: string | null
  onJumped: () => void
}) {
  const blocks = groupMessages(messages)
  const pending = awaitingModel(messages, streaming) && !planProposal
  // With newer turns outside the window, the live end of the chat is not on screen.
  const live = !page.hasNewer
  let latestUserId: string | undefined
  if (live) latestUserId = [...messages].reverse().find((message) => message.role === "user" && message.entryId)?.id
  const [editingId, setEditingId] = useState<string | null>(null)
  const latest = useRef(messages)
  latest.current = messages
  const liveRef = useRef(live)
  liveRef.current = live

  useEffect(() => {
    function editLast() {
      if (!liveRef.current) return
      const last = [...latest.current].reverse().find((message) => message.role === "user" && message.entryId)
      if (last) setEditingId(last.id)
    }
    window.addEventListener(EDIT_LAST_EVENT, editLast)
    return () => window.removeEventListener(EDIT_LAST_EVENT, editLast)
  }, [])

  async function edit(id: string, text: string) {
    await onEdit(id, text)
    setEditingId(null)
  }

  const replyState = useMemo(() => ({ replies, onReplies }), [replies, onReplies])

  return (
    <ReplyCommentsContext.Provider value={replyState}>
      {/* Content settling after a chat opens (markdown, highlighting) snaps to the bottom;
          only streamed output scrolls smoothly. */}
      <Conversation className="chat-transcript min-h-0" resize={streaming ? "smooth" : "instant"}>
        <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-6 py-8">
          {messages.length === 0 ? (
            <EmptyState configured={configured} cwd={cwd} onConnect={onConnect} onChoose={onChoose} />
          ) : null}
          {blocks.map((block) => {
            if (block.kind === "user") {
              return (
                <UserTurn
                  key={block.message.id}
                  message={block.message}
                  editable={!streaming && Boolean(block.message.entryId)}
                  latest={block.message.id === latestUserId}
                  editing={editingId === block.message.id}
                  onEditing={(editing) => setEditingId(editing ? block.message.id : null)}
                  onEdit={edit}
                />
              )
            }
            return <AssistantTurn key={block.turn.id} turn={block.turn} />
          })}
          {live && planProposal ? <PlanCard plan={planProposal} onApprove={onApprovePlan} /> : null}
          {live && pending ? <PendingReply label={notice ?? "Thinking"} /> : null}
          {live && notice && !pending ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
        </ConversationContent>
        <WindowPager messages={messages} page={page} />
        <JumpToMessage messages={messages} messageId={jumpTo} onJumped={onJumped} />
      </Conversation>
    </ReplyCommentsContext.Provider>
  )
}

type TranscriptWindowPage = { windowStart: number; hasOlder: boolean; hasNewer: boolean }

// Distance from either end of the scroller at which the next page is requested.
const PAGE_MARGIN = 800

// Loads older or newer turns as the reader nears either end of the window, keeping the
// message on screen in place while turns are added or trimmed around it.
function WindowPager({ messages, page }: { messages: ChatMessage[]; page: TranscriptWindowPage }) {
  const { scrollRef, scrollToBottom, stopScroll } = useStickToBottomContext()
  const loading = useRef(false)
  const toLatest = useRef(false)
  // A message on screen and its offset from the scroller top before the window moved.
  const anchor = useRef<{ id: string; top: number } | null>(null)
  const pageRef = useRef(page)
  pageRef.current = page

  const request = useRef((next: TranscriptPage) => {
    loading.current = true
    window.slagent
      .pageTranscript(next)
      // The new window renders before the next frame; release the anchor after it.
      .then(() => new Promise((resolve) => window.requestAnimationFrame(resolve)))
      .catch((error) => toast.error(errorText(error)))
      .finally(() => {
        loading.current = false
        anchor.current = null
        check.current()
      })
  })

  const check = useRef(() => {
    const scroller = scrollRef.current
    if (!scroller || loading.current) return
    const current = pageRef.current
    const fromBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight
    let next: TranscriptPage | null = null
    if (current.hasOlder && scroller.scrollTop < PAGE_MARGIN) next = "older"
    else if (current.hasNewer && fromBottom < PAGE_MARGIN) next = "newer"
    if (!next) return
    // Keep stick-to-bottom from chasing turns appended below the reader.
    if (next === "newer") stopScroll()
    anchor.current = visibleMessage(scroller)
    request.current(next)
  })

  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller) return
    const onScroll = () => check.current()
    // Wheel too, so a window too short to scroll can still page.
    scroller.addEventListener("scroll", onScroll, { passive: true })
    scroller.addEventListener("wheel", onScroll, { passive: true })
    return () => {
      scroller.removeEventListener("scroll", onScroll)
      scroller.removeEventListener("wheel", onScroll)
    }
  }, [scrollRef])

  // Runs on every render while a page is loading, since streamed updates of the old
  // window can arrive before the new one.
  useLayoutEffect(() => {
    const scroller = scrollRef.current
    if (toLatest.current && !page.hasNewer) {
      toLatest.current = false
      anchor.current = null
      void scrollToBottom({ animation: "instant" })
      return
    }
    const held = anchor.current
    if (!scroller || !held) return
    const element = scroller.querySelector<HTMLElement>(`[data-message-id="${CSS.escape(held.id)}"]`)
    if (element) scroller.scrollTop += element.getBoundingClientRect().top - scroller.getBoundingClientRect().top - held.top
  }, [page.windowStart, page.hasOlder, page.hasNewer, messages, scrollRef, scrollToBottom])

  if (!page.hasNewer) return <ConversationScrollButton />
  return (
    <ConversationScrollButton
      aria-label="Jump to latest"
      onClick={() => {
        toLatest.current = true
        request.current("latest")
      }}
    />
  )
}

function visibleMessage(scroller: HTMLElement): { id: string; top: number } | null {
  const top = scroller.getBoundingClientRect().top
  for (const element of scroller.querySelectorAll<HTMLElement>("[data-message-id]")) {
    const box = element.getBoundingClientRect()
    if (box.bottom > top) return { id: element.dataset.messageId ?? "", top: box.top - top }
  }
  return null
}

// Scrolls a search result's message into view once it has rendered, and
// releases the stick-to-bottom lock so the chat does not snap back down.
function JumpToMessage({ messages, messageId, onJumped }: { messages: ChatMessage[]; messageId: string | null; onJumped: () => void }) {
  const { stopScroll } = useStickToBottomContext()
  const found = messageId !== null && messages.some((message) => message.id === messageId)
  const done = useRef(onJumped)
  done.current = onJumped

  useEffect(() => {
    if (!found || !messageId) return
    const frame = window.requestAnimationFrame(() => {
      const element = document.querySelector<HTMLElement>(`[data-message-id="${CSS.escape(messageId)}"]`)
      done.current()
      if (!element) return
      stopScroll()
      element.scrollIntoView({ block: "center" })
      element.classList.remove("search-hit")
      void element.offsetWidth
      element.classList.add("search-hit")
    })
    return () => window.cancelAnimationFrame(frame)
  }, [found, messageId, stopScroll])

  return null
}

export { Transcript }
