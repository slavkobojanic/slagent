import { useRef } from "react"
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
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message"
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning"
import { Shimmer } from "@/components/ai-elements/shimmer"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { openPath } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import { FileTextIcon, FolderIcon, PencilIcon, SearchIcon, TerminalIcon } from "lucide-react"

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
  return FileTextIcon
}

function waitingForText(assistant: AssistantMessage | null, tools: ToolMessage[]): boolean {
  if (!assistant || !assistant.streaming || assistant.text || assistant.thinking) return false
  for (const tool of tools) {
    if (tool.running) return false
  }
  return true
}

function ToolOutput({ message }: { message: ToolMessage }) {
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

function UserTurn({ message }: { message: UserMessage }) {
  const attachments = message.attachments ?? []
  return (
    <Message from="user">
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
    </Message>
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
  onConnect,
  onChoose,
}: {
  messages: ChatMessage[]
  notice: string | null
  configured: boolean
  cwd: string
  onConnect: () => void
  onChoose: () => void
}) {
  const blocks = groupMessages(messages)

  return (
    <Conversation className="chat-transcript min-h-0">
      <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-6 py-8">
        {messages.length === 0 ? (
          <EmptyState configured={configured} cwd={cwd} onConnect={onConnect} onChoose={onChoose} />
        ) : null}
        {blocks.map((block) => {
          if (block.kind === "user") return <UserTurn key={block.message.id} message={block.message} />
          return <AssistantTurn key={block.turn.id} turn={block.turn} />
        })}
        {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  )
}

export { Transcript }
