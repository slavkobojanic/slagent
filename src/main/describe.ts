import type { ModelRuntime } from "@earendil-works/pi-coding-agent"

type Model = NonNullable<ReturnType<ModelRuntime["getModel"]>>

// A tool call waiting to be described. Args is the raw JSON string the runtime
// already serialized.
export type ToolCallSeed = { id: string; name: string; args: string }

const MAX_ARGS = 800
const MAX_EXCERPT = 600

const TOOL_SYSTEM = [
  "You write a few-word label for what a coding agent is doing at each step of its work.",
  "You get numbered tool calls with their arguments.",
  "For each call reply with one line that starts with the call's number, a period, then the label.",
  "The label describes the purpose of the step in plain words a person would use, 3 to 8 words, sentence case.",
  "Describe what the agent is trying to find or change, never name the tool or repeat the command text.",
  "Never use generic words like command, execute, running, tool call.",
  "No quotes, no trailing punctuation, no emoji, one line per call, no other text.",
  "Examples:",
  "bash: rg -l \"parse\" --glob '*.ts'",
  "1. Searching for files containing parse",
  "bash: pnpm vitest run src/main/format.test.ts",
  "2. Testing the format module",
  "bash: git add -A && git commit -m \"fix typo\"",
  "3. Committing the changes",
  "bash: kill 1234",
  "4. Stopping process 1234",
  "grep: pattern \"useEffect\" path src/",
  "5. Looking for useEffect in src/",
  "read: src/main/format.ts",
  "6. Reading src/main/format.ts",
  "Never write labels like: Execute command, Running command, bash rg -l parse,",
  "or long sentences about what the assistant is going to do.",
].join("\n")

const THINKING_SYSTEM = [
  "You name what a coding assistant is thinking about, from a short excerpt of its thinking.",
  "Reply with 3 to 8 words, sentence case, naming the topic or decision.",
  "Never reply to the thinking, summarize it from the outside.",
  "No quotes, no trailing punctuation, no emoji, one line only.",
  "Example: thinking about how to split the parser into modules",
  "Label: Splitting the parser into modules",
].join("\n")

const WORKING_SYSTEM = [
  "You name what a coding assistant is about to do with a user's request, before any work shows up.",
  "You see only the user's message.",
  "Reply with 3 to 8 words, sentence case, describing the next step from the outside.",
  "Never answer the request, never greet, never ask a question back.",
  "No quotes, no trailing punctuation, no emoji, one line only.",
  "Example: request: My docker container keeps exiting, what's happening?",
  "Label: Looking into the docker container exit",
].join("\n")

async function complete(runtime: ModelRuntime, model: Model, system: string, user: string): Promise<string> {
  const reply = await runtime.completeSimple(
    model,
    { systemPrompt: system, messages: [{ role: "user", content: user, timestamp: Date.now() }] },
    { maxTokens: 400, signal: AbortSignal.timeout(10_000) },
  )
  let text = ""
  for (const part of reply.content) {
    if (part.type === "text") text += part.text
  }
  return text
}

// Turns model output into one label: the first non-empty line, unquoted and
// trimmed, or null when nothing usable came back.
export function cleanLabel(text: string): string | null {
  const line =
    text
      .split("\n")
      .map((entry) => entry.trim())
      .find(Boolean) ?? ""
  const cleaned = line
    .replace(/^(label|1)\s*[:.)]?\s*/i, "")
    .replace(/^["'`*_#\s]+|["'`*_.\s]+$/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 80)
  return cleaned || null
}

function parseLabels(text: string, count: number): (string | null)[] {
  const labels: (string | null)[] = new Array(count).fill(null)
  for (const line of text.split("\n")) {
    const match = line.trim().match(/^(\d+)\.\s*(.+)$/)
    if (!match) continue
    const index = Number(match[1]) - 1
    if (!Number.isInteger(index) || index < 0 || index >= count) continue
    const label = cleanLabel(match[2])
    if (label && !labels[index]) labels[index] = label
  }
  return labels
}

export async function describeToolCalls(
  runtime: ModelRuntime,
  model: Model,
  calls: ToolCallSeed[],
): Promise<Map<string, string>> {
  const body = calls
    .map((call, index) => `${index + 1}. ${call.name}: ${call.args.slice(0, MAX_ARGS)}`)
    .join("\n")
  const reply = await complete(runtime, model, TOOL_SYSTEM, `Tool calls:\n\n${body}`)
  const labels = parseLabels(reply, calls.length)
  const described = new Map<string, string>()
  for (let index = 0; index < calls.length; index += 1) {
    const label = labels[index]
    if (label) described.set(calls[index]!.id, label)
  }
  return described
}

export async function describeThinking(runtime: ModelRuntime, model: Model, excerpt: string): Promise<string | null> {
  const reply = await complete(runtime, model, THINKING_SYSTEM, `Thinking:\n\n${excerpt.slice(0, MAX_EXCERPT)}`)
  return cleanLabel(reply)
}

export async function describeWorking(runtime: ModelRuntime, model: Model, user: string): Promise<string | null> {
  const reply = await complete(runtime, model, WORKING_SYSTEM, `Request:\n\n${user.slice(0, MAX_EXCERPT)}`)
  return cleanLabel(reply)
}

// Collects tool calls as they start and describes them in small batched
// requests, so parallel tool starts cost one call instead of one each. A
// failure leaves the fallback label untouched.
export class ToolDescriber {
  private pending = new Map<string, ToolCallSeed>()
  private timer: ReturnType<typeof setTimeout> | null = null
  private inflight: Promise<void> | null = null
  private closed = false

  constructor(
    private describe: (calls: ToolCallSeed[]) => Promise<Map<string, string>> | null,
    private apply: (id: string, label: string) => void,
    private delay = 500,
  ) {}

  add(seed: ToolCallSeed): void {
    if (this.closed || this.pending.has(seed.id)) return
    this.pending.set(seed.id, seed)
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => void this.flush(), this.delay)
  }

  // Results are applied as they land; a later flush waits for the inflight
  // request first so labels never apply out of turn.
  private async flush(): Promise<void> {
    this.timer = null
    if (this.inflight) {
      await this.inflight
      if (this.pending.size > 0) return void this.flush()
      return
    }
    const calls = [...this.pending.values()]
    this.pending.clear()
    if (calls.length === 0) return
    const described = this.describe(calls)
    if (!described) return
    this.inflight = described
      .then((labels) => {
        for (const [id, label] of labels) this.apply(id, label)
      })
      .catch(() => {
        // The fallback label stays.
      })
      .finally(() => {
        this.inflight = null
      })
    await this.inflight
    if (this.pending.size > 0 && !this.closed) return void this.flush()
  }

  stop(): void {
    this.closed = true
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    this.pending.clear()
  }
}
