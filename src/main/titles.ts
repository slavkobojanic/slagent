import type { ModelRuntime } from "@earendil-works/pi-coding-agent"

type Model = NonNullable<ReturnType<ModelRuntime["getModel"]>>

// Small, fast models tried first for naming chats. The chat's own model is the
// fallback, so a title still appears when none of these are available.
export const TITLE_MODELS = [
  "google/gemini-3.5-flash-lite",
  "google/gemini-2.5-flash-lite",
  "openai/gpt-5.4-mini",
  "anthropic/claude-haiku-4.5",
]

const SYSTEM = [
  "You name chat threads in a coding app.",
  "Reply with a title of 3 to 6 words that says what the user wants done.",
  "Use sentence case. No quotes, no trailing punctuation, no emoji.",
].join(" ")

export async function generateTitle(runtime: ModelRuntime, model: Model, user: string, assistant: string): Promise<string | null> {
  const excerpt = [`User: ${user.slice(0, 2000)}`]
  if (assistant) excerpt.push(`Assistant: ${assistant.slice(0, 1000)}`)
  const reply = await runtime.completeSimple(
    model,
    {
      systemPrompt: SYSTEM,
      messages: [{ role: "user", content: excerpt.join("\n\n"), timestamp: Date.now() }],
    },
    { maxTokens: 400, signal: AbortSignal.timeout(20_000) },
  )
  let text = ""
  for (const part of reply.content) {
    if (part.type === "text") text += part.text
  }
  return cleanTitle(text)
}

const COMMIT_SYSTEM = [
  "Write a git commit message for this diff.",
  "First line: a conventional commit subject under 72 characters, like feat: add search.",
  "Then a blank line and one or two short sentences on why, if the diff shows it.",
  "Reply with the message only. No code fences.",
].join(" ")

export async function generateCommitMessage(runtime: ModelRuntime, model: Model, diff: string): Promise<string> {
  const reply = await runtime.completeSimple(
    model,
    {
      systemPrompt: COMMIT_SYSTEM,
      messages: [{ role: "user", content: diff.slice(0, 40_000), timestamp: Date.now() }],
    },
    { maxTokens: 600, signal: AbortSignal.timeout(30_000) },
  )
  let text = ""
  for (const part of reply.content) {
    if (part.type === "text") text += part.text
  }
  return text.replace(/^```[a-z]*\n?|```$/g, "").trim()
}

export function cleanTitle(text: string): string | null {
  let title = text.split("\n").map((line) => line.trim()).find(Boolean) ?? ""
  title = title.replace(/^(title|chat title)\s*:\s*/i, "")
  title = title.replace(/^["'`*_#\s]+|["'`*_.\s]+$/g, "")
  if (!title) return null
  return title.slice(0, 80)
}
