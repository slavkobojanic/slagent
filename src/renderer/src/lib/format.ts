import type { ChatMessage, OpenRouterStatus } from "@shared/types"

export function errorText(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return "Something went wrong."
}

const FILE_PATH = /^(?:~\/|\.{1,2}\/|\/)?(?:[\w@.+-]+\/)*[\w@+-][\w@.+-]*\.[A-Za-z0-9]{1,8}(?::\d+){0,2}$/

export function looksLikePath(text: string): boolean {
  if (text.length > 300 || /\s/.test(text)) return false
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text) && !text.startsWith("file://")) return false
  if (text.startsWith("file://")) return true
  return FILE_PATH.test(text)
}

export function modKey(platform: string): string {
  if (platform === "darwin") return "⌘"
  return "Ctrl+"
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

export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`
  }
  if (tokens >= 1000) {
    return `${Math.round(tokens / 1000)}k`
  }
  return String(tokens)
}

export function formatCost(cost: number): string {
  if (cost > 0 && cost < 0.01) {
    return "<$0.01"
  }
  return `$${cost.toFixed(2)}`
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
