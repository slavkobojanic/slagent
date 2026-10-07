import type { ChatMessage } from "../shared/types"

// How much of one old chat a single reference or read_chat may occupy.
export const TRANSCRIPT_CAP = 8000

export type RenderedTranscript = {
  text: string
  shown: number
  total: number
  truncated: boolean
}

// The user and assistant text of a transcript, formatted for a model. Tool
// noise is skipped the same way the search index skips it, and the result is
// capped so one old chat cannot flood the context.
export function renderTranscript(messages: ChatMessage[], cap: number = TRANSCRIPT_CAP): RenderedTranscript {
  const lines: string[] = []
  let size = 0
  let shown = 0
  let truncated = false
  for (const message of messages) {
    if (message.role === "tool" || !message.text.trim()) continue
    const line = `${message.role}: ${message.text.trim().replaceAll("\n", " ")}`
    if (size + line.length > cap) {
      truncated = true
      break
    }
    lines.push(line)
    size += line.length + 1
    shown++
  }
  if (truncated) {
    lines.push(`[… truncated, ${shown} of ${countMessages(messages)} messages shown; use search_chats with narrower terms or read another chat]`)
  }
  return { text: lines.join("\n"), shown, total: countMessages(messages), truncated }
}

function countMessages(messages: ChatMessage[]): number {
  let total = 0
  for (const message of messages) {
    if (message.role === "tool" || !message.text.trim()) continue
    total++
  }
  return total
}

export function shortDate(epoch: number): string {
  return new Date(epoch).toISOString().slice(0, 10)
}
