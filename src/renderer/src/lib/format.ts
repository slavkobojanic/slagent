import type { OpenRouterStatus } from "@shared/types"

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
