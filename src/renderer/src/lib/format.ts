import type { ChatMessage, OpenRouterStatus } from "@shared/types"

export function errorText(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return "Something went wrong."
}

export function folderName(cwd: string): string {
  const parts = cwd.split(/[/\\]/).filter(Boolean)
  const last = parts[parts.length - 1]
  if (!last) return cwd
  return last
}

export function formatContext(tokens: number): string {
  if (tokens >= 1_000_000) {
    const millions = Math.round(tokens / 100_000) / 10
    return `${millions}M context`
  }
  return `${Math.round(tokens / 1000)}k context`
}

export function openRouterLabel(status: OpenRouterStatus): string {
  if (!status.configured) return "Not connected"
  if (status.source === "OAuth") return "Signed in"
  if (status.source === "OPENROUTER_API_KEY") return "Environment key"
  if (status.source === "stored credential") return "Saved key"
  if (status.source) return status.source
  return "Connected"
}

export function formatTranscript(title: string, messages: ChatMessage[]): string {
  const blocks: string[] = []
  for (const message of messages) {
    if (message.role === "user" && message.text.trim()) blocks.push(`You\n${message.text.trim()}`)
    if (message.role === "assistant" && message.text.trim()) blocks.push(`Assistant\n${message.text.trim()}`)
    if (message.role === "tool" && message.output.trim()) blocks.push(`${message.label}\n${message.output.trim()}`)
  }
  if (blocks.length === 0) return ""
  return [`# ${title}`, ...blocks].join("\n\n")
}
