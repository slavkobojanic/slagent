import type { ModelRuntime } from "@earendil-works/pi-coding-agent"
import type { TitleModelOption } from "../shared/types"

type Model = NonNullable<ReturnType<ModelRuntime["getModel"]>>

// Small and cheap models offered for naming chats, cheapest first. The first is
// the default. They all run through OpenRouter, so naming a chat never spends
// the chat's own model, which may be an expensive one.
export const TITLE_MODELS: TitleModelOption[] = [
  { id: "deepseek/deepseek-v4-flash-0731", name: "DeepSeek V4 Flash (0731)" },
  { id: "deepseek/deepseek-v4-flash", name: "DeepSeek V4 Flash" },
  { id: "google/gemini-3.5-flash-lite", name: "Gemini 3.5 Flash Lite" },
  { id: "google/gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite" },
  { id: "openai/gpt-5.4-mini", name: "GPT-5.4 mini" },
  { id: "anthropic/claude-haiku-4.5", name: "Claude Haiku 4.5" },
  { id: "mistralai/ministral-8b-2512", name: "Ministral 8B" },
  { id: "minimax/minimax-m2.7", name: "MiniMax M2.7" },
]

export const DEFAULT_TITLE_MODEL = TITLE_MODELS[0]!.id

export function isTitleModel(id: string): boolean {
  return TITLE_MODELS.some((model) => model.id === id)
}

// An unknown or missing stored value falls back to the default, so an old
// preference never leaves naming without a model.
export function parseTitleModelId(value: unknown): string {
  if (typeof value === "string" && isTitleModel(value)) return value
  return DEFAULT_TITLE_MODEL
}

const SYSTEM = [
  "You name chat threads in a coding app.",
  "You see only the user's first message.",
  "Reply with a title of 3 to 7 words that names the concrete thing the message is about,",
  "in a human readable way: what a person would say it's about, not a file path or a tag.",
  "Never use generic words like conversation, discussion, request, question or help.",
  "Use sentence case. No quotes, no trailing punctuation, no emoji.",
  "Examples:",
  "First message: My docker container keeps exiting after a few seconds, the logs just say code 137. What's happening?",
  "Title: Docker container exits with code 137",
  "First message: The submit button on the checkout page is invisible on mobile but works fine on desktop. Can you look into it?",
  "Title: Invisible checkout button on mobile",
  "First message: I keep going back and forth between Postgres and SQLite for a small side project with maybe 100 users. Which one would you pick?",
  "Title: Postgres vs SQLite for a side project",
  "First message: Can you explain how CSS grid areas work? I keep messing up the template definition.",
  "Title: Understanding CSS grid areas",
].join(" ")

export async function generateTitle(runtime: ModelRuntime, model: Model, user: string): Promise<string | null> {
  const reply = await runtime.completeSimple(
    model,
    {
      systemPrompt: SYSTEM,
      messages: [{ role: "user", content: `First message:\n\n${user.slice(0, 2000)}`, timestamp: Date.now() }],
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
