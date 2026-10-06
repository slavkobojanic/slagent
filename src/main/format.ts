const TEXT_LIMIT = 12_000
const ARGS_LIMIT = 2_000
const LABEL_LIMIT = 140

export function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text
  return `${text.slice(0, limit)}\n\n… truncated`
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === "AbortError" || error.name === "TimeoutError") {
      return "The request timed out. Try again."
    }
    if (error.message) return error.message
  }
  return "Something went wrong."
}

export function formatValue(value: unknown, limit = ARGS_LIMIT): string {
  if (value === undefined) return ""
  try {
    return truncate(JSON.stringify(value, null, 2), limit)
  } catch {
    return ""
  }
}

export function bashCommand(args: unknown): string {
  if (typeof args !== "object" || args === null) return "bash"
  const command = (args as { command?: unknown }).command
  if (typeof command !== "string" || command.length === 0) return "bash"
  return command
}

export function toolLabel(name: string, args: unknown): string {
  if (typeof args !== "object" || args === null) return name
  const record = args as Record<string, unknown>
  const fields = ["path", "file_path", "command", "pattern", "query"]
  for (const field of fields) {
    const value = record[field]
    if (typeof value === "string" && value.length > 0) {
      return `${name}  ${truncate(value, LABEL_LIMIT)}`
    }
  }
  return name
}

export function toolResultText(result: unknown): string {
  if (typeof result !== "object" || result === null) return ""
  const content = (result as { content?: unknown }).content
  if (!Array.isArray(content)) return ""
  const parts: string[] = []
  for (const part of content) {
    if (typeof part !== "object" || part === null) continue
    const block = part as { type?: string; text?: string }
    if (block.type === "text" && typeof block.text === "string") parts.push(block.text)
  }
  return truncate(parts.join("\n"), TEXT_LIMIT)
}

type ContentPart = { type?: string; text?: string; thinking?: string }

export function assistantParts(content: readonly ContentPart[]): { text: string; thinking: string } {
  const text: string[] = []
  const thinking: string[] = []
  for (const part of content) {
    if (part.type === "text" && part.text) text.push(part.text)
    if (part.type === "thinking" && part.thinking) thinking.push(part.thinking)
  }
  return { text: text.join(""), thinking: thinking.join("\n\n") }
}
