import Ansi from "ansi-to-react"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { toast } from "sonner"
import type { AssistantMessage, ChatMessage, ToolMessage, UserMessage } from "@shared/types"
import { FadingResponse } from "@/components/fading-response"
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
import { Textarea } from "@/components/ui/textarea"
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning"
import { Shimmer } from "@/components/ai-elements/shimmer"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { errorText, openPath } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import { BotIcon, FileTextIcon, FolderIcon, ListChecksIcon, PencilIcon, RotateCcwIcon, SearchIcon, ServerIcon, TerminalIcon } from "lucide-react"
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

function ToolOutput({ message }: { message: ToolMessage }) {
  if (message.name === "bash") return <BashOutput message={message} />
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
  const path = toolPath(tool)
  if (!path) return <>{tool.label}</>
  return (
    <>
      {tool.name}{" "}
      <button
        type="button"
        className="underline-offset-2 hover:text-foreground hover:underline"
        title="Open in editor"
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
    <Message from="assistant" className="max-w-full">
      {assistant?.thinking && (
        <Reasoning isStreaming={assistant.streaming}>
          <ReasoningTrigger />
          <ReasoningContent>{assistant.thinking}</ReasoningContent>
        </Reasoning>
      )}
      <ToolChain tools={turn.tools} />
      {assistant && waitingForText(assistant, turn.tools) && <Shimmer>Working</Shimmer>}
      {assistant?.text && <AssistantText text={assistant.text} streaming={assistant.streaming} />}
      {assistant?.error && <p className="text-sm text-destructive">{assistant.error}</p>}
    </Message>
  )
}

function AssistantText({ text, streaming }: { text: string; streaming: boolean }) {
  const animate = useRef(streaming)
  if (streaming) animate.current = true
  if (animate.current) return <FadingResponse text={text} />
  return <MessageResponse>{text}</MessageResponse>
}

function UserTurn({
  message,
  editable,
  editing,
  onEditing,
  onEdit,
}: {
  message: UserMessage
  editable: boolean
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

  const attachments = message.attachments ?? []
  if (editing) {
    return <EditMessage message={message} onCancel={() => onEditing(false)} onSave={(text) => onEdit(message.id, text)} />
  }
  return (
    <Message from="user" className="group">
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
          <MessageAction tooltip="Edit and resend" onClick={() => onEditing(true)}>
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
    <section className="rounded-md border border-amber-300/40 bg-amber-300/5" aria-label="Proposed plan">
      <header className="flex items-center gap-2 border-b border-amber-300/20 px-4 py-2 text-sm">
        <span className="font-medium text-amber-200">Proposed plan</span>
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
          Add an API key, or sign in with the Pi CLI. slagent uses the same credentials.
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
}: {
  messages: ChatMessage[]
  notice: string | null
  configured: boolean
  cwd: string
  streaming: boolean
  planProposal: string | null
  onApprovePlan: () => Promise<void>
  onConnect: () => void
  onChoose: () => void
  onEdit: (id: string, text: string) => Promise<void>
}) {
  const blocks = groupMessages(messages)
  const [editingId, setEditingId] = useState<string | null>(null)
  const latest = useRef(messages)
  latest.current = messages

  useEffect(() => {
    function editLast() {
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

  return (
    <Conversation className="chat-transcript min-h-0">
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
                editing={editingId === block.message.id}
                onEditing={(editing) => setEditingId(editing ? block.message.id : null)}
                onEdit={edit}
              />
            )
          }
          return <AssistantTurn key={block.turn.id} turn={block.turn} />
        })}
        {planProposal ? <PlanCard plan={planProposal} onApprove={onApprovePlan} /> : null}
        {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  )
}

export { Transcript }
