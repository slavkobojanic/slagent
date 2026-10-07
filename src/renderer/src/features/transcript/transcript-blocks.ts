import type { AssistantMessage, ChatMessage, ToolMessage, UserMessage } from "@shared/types"

// One assistant reply and the tool calls that ran for it. A turn with no assistant message
// holds tool calls that arrived before any reply text.
export type Turn = {
  id: string
  assistant: AssistantMessage | null
  tools: ToolMessage[]
}

export type Block = { kind: "user"; message: UserMessage } | { kind: "turn"; turn: Turn }

// Groups the messages into the blocks the transcript renders: each user message on its own,
// each assistant reply with the tool calls that follow it.
export function groupMessages(messages: ChatMessage[]): Block[] {
  const blocks: Block[] = []
  for (const message of messages) {
    if (message.role === "user") {
      blocks.push({ kind: "user", message })
      continue
    }
    if (message.role === "assistant") {
      blocks.push({ kind: "turn", turn: { id: message.id, assistant: message, tools: [] } })
      continue
    }
    const last = blocks[blocks.length - 1]
    if (last && last.kind === "turn") {
      last.turn.tools.push(message)
      continue
    }
    blocks.push({ kind: "turn", turn: { id: message.id, assistant: null, tools: [message] } })
  }
  return blocks
}

// The last user message that the chat can edit. Only messages with an entry in the saved
// chat can be edited.
export function lastEditableMessage(messages: ChatMessage[]): UserMessage | undefined {
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index]
    if (message?.role === "user" && message.entryId) {
      return message
    }
  }
  return undefined
}

// True while a run is going but nothing on screen shows it: right after sending, and between a
// finished tool and the model's next reply.
export function awaitingModel(messages: ChatMessage[], streaming: boolean): boolean {
  if (!streaming) {
    return false
  }
  const last = messages[messages.length - 1]
  if (!last) {
    return true
  }
  if (last.role === "user") {
    return true
  }
  if (last.role === "tool") {
    return !last.running
  }
  return !last.streaming
}

// The working label shows while a reply has started but has no text or reasoning yet, and no
// tool call is running.
export function waitingForText(assistant: AssistantMessage | null, tools: ToolMessage[]): boolean {
  if (!assistant || !assistant.streaming || assistant.text || assistant.thinking) {
    return false
  }
  return !tools.some((tool) => tool.running)
}
