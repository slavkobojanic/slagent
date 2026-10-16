import type { AssistantMessage, Message, ToolResultMessage, UserMessage } from "@earendil-works/pi-ai"

// Pi drives the loop; Muse runs its own tools inside the turn it is given. So
// the whole pi transcript renders into one text turn, role by role, with tool
// traffic kept as labelled text so the model can follow what happened.

export const IMAGE_PLACEHOLDER = "[image attached]"

function userText(message: UserMessage): string {
  if (typeof message.content === "string") return message.content
  return message.content
    .map((part) => (part.type === "text" ? part.text : part.type === "image" ? IMAGE_PLACEHOLDER : ""))
    .filter((text) => text !== "")
    .join("\n")
}

function toolResultText(message: ToolResultMessage): string {
  const parts: string[] = []
  for (const block of message.content) {
    if (block.type === "text" && block.text) parts.push(block.text)
    if (block.type === "image") parts.push(IMAGE_PLACEHOLDER)
  }
  if (message.isError && parts.length === 0) parts.push("the call failed")
  return parts.join("\n")
}

function assistantText(message: AssistantMessage): string {
  const parts: string[] = []
  for (const block of message.content) {
    if (block.type === "text" && block.text) parts.push(block.text)
    if (block.type === "toolCall") parts.push(`used tool ${block.name}`)
  }
  return parts.join("\n")
}

// The system prompt rides at the top; later system messages carry patched
// instructions, so they render as updates where they appear.
export function renderTranscript(messages: Message[]): string {
  const blocks: string[] = []
  for (const message of messages) {
    if (message.role === "system") {
      blocks.push(`[system]\n${message.content}`)
    } else if (message.role === "user") {
      const text = userText(message)
      if (text.trim()) blocks.push(`[user]\n${text}`)
    } else if (message.role === "assistant") {
      const text = assistantText(message)
      if (text.trim()) blocks.push(`[assistant]\n${text}`)
    } else if (message.role === "toolResult") {
      blocks.push(`[tool result: ${message.toolName}]\n${toolResultText(message)}`)
    }
  }
  return blocks.join("\n\n")
}

// The turn prompt asks Muse to continue the transcript as itself, so its own
// coding tools do the work.
export function turnPrompt(prompt: string): string {
  return (
    "You are continuing a coding session. Earlier turns are shown as a labelled transcript; " +
    "the last [user] block is what to do now. Use your tools as needed, then reply with your answer.\n\n" +
    prompt
  )
}
