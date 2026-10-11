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

export function toolResultImages(result: unknown): { data: string; mimeType: string }[] {
  if (typeof result !== "object" || result === null) return []
  const content = (result as { content?: unknown }).content
  if (!Array.isArray(content)) return []
  const images: { data: string; mimeType: string }[] = []
  for (const part of content) {
    if (typeof part !== "object" || part === null) continue
    const block = part as { type?: string; data?: string; mimeType?: string }
    if (block.type !== "image" || typeof block.data !== "string" || !block.mimeType) continue
    images.push({ data: block.data, mimeType: block.mimeType })
  }
  return images
}

type ContentPart = { type?: string; text?: string; thinking?: string; toolCall?: unknown }

export function assistantParts(content: readonly ContentPart[]): { text: string; thinking: string } {
  const text: string[] = []
  const thinking: string[] = []
  for (const part of content) {
    if (part.type === "text" && part.text) text.push(part.text)
    if (part.type === "thinking" && part.thinking) thinking.push(part.thinking)
  }
  return { text: text.join(""), thinking: thinking.join("\n\n") }
}

// Splits an assistant message's text into the run before each tool call and the
// prose that follows the last one. The runs become those tool calls' labels, so
// the model's own narration names the step instead of a second-guessed
// description repeating it. Narrations keep their positions: entry i belongs to
// the i-th tool call, empty when the model said nothing before it.
export function narrationParts(content: readonly ContentPart[]): { narrations: string[]; text: string } {
  const narrations: string[] = []
  let run = ""
  for (const part of content) {
    if (part.type === "text" && part.text) {
      run += part.text
      continue
    }
    if (part.type === "toolCall") {
      narrations.push(run.trim())
      run = ""
    }
  }
  return { narrations, text: run.trim() }
}
