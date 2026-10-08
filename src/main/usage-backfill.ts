import { readdir, readFile } from "node:fs/promises"
import { homedir } from "node:os"
import { dirname, join } from "node:path"
import type { Library } from "./library"
import { UsageLedger, type UsageRow } from "./usage-ledger"

// Where Claude Code stores its own session transcripts, keyed by an encoded cwd.
const CLAUDE_PROJECTS = join(homedir(), ".claude", "projects")

// Backfilled Claude history is always $0, even when the chat runs on an API
// key: only the exact cost of live turns is trusted.
const BACKFILL_CLAUDE_COST = 0

export type BackfillSource = {
  ledger: UsageLedger
  library: Library
  // Overridable in tests.
  claudeProjectsDir?: string
}

// Runs once, in the background at launch, and imports every assistant message
// older than live_since. Deleted chats cannot be recovered.
export async function runUsageBackfill(source: BackfillSource): Promise<void> {
  const ledger = source.ledger
  if (ledger.backfillDone()) return
  const since = ledger.liveSince()
  const claudeDir = source.claudeProjectsDir ?? CLAUDE_PROJECTS

  const rows: UsageRow[] = []
  for (const project of source.library.projects()) {
    for (const chat of source.library.projectChats(project.id)) {
      if (chat.sessionFile) rows.push(...(await piSessionRows(chat.sessionFile, chat.id, project.id, since)))
      if (chat.claudeSessionId) {
        const files = await claudeSessionFiles(claudeDir, project.path, chat.claudeSessionId)
        for (const file of files) rows.push(...(await claudeSessionRows(file, chat.id, project.id, since)))
      }
    }
  }
  ledger.recordBackfill(rows)
  ledger.markBackfillDone()
}

// Pi sessions are JSONL. Each assistant entry carries its own usage, model and
// timestamp; `responseId` dedupes against the live write, falling back to the
// entry id for responses that never had one.
export async function piSessionRows(file: string, chatId: string, projectId: string, since: number): Promise<UsageRow[]> {
  const lines = await readLines(file)
  const rows: UsageRow[] = []
  for (const line of lines) {
    const row = parsePiEntry(line, chatId, projectId)
    if (row && row.ts < since) rows.push(row)
  }
  return rows
}

export function parsePiEntry(line: string, chatId: string, projectId: string): UsageRow | null {
  let entry: PiEntry
  try {
    entry = JSON.parse(line) as PiEntry
  } catch {
    return null
  }
  const message = entry.message
  if (entry.type !== "message" || message?.role !== "assistant" || !message.usage) return null
  return {
    ts: message.timestamp ?? timestampMs(entry.timestamp),
    chatId,
    projectId,
    runtime: "pi",
    model: message.model ?? "unknown",
    provider: message.provider ?? "unknown",
    input: message.usage.input,
    output: message.usage.output,
    cacheRead: message.usage.cacheRead,
    cacheWrite: message.usage.cacheWrite,
    cost: message.usage.cost?.total ?? 0,
    source: "backfill",
    key: `pi:${chatId}:${message.responseId ?? entry.id ?? message.timestamp}`,
  }
}

type PiEntry = {
  type: string
  id?: string
  timestamp?: string
  message?: {
    role?: string
    model?: string
    provider?: string
    responseId?: string
    timestamp?: number
    usage?: { input: number; output: number; cacheRead: number; cacheWrite: number; cost?: { total: number } }
  }
}

// Claude Code stores one JSONL per session under the encoded cwd, plus a
// subagents folder. Per-message token data repeats across lines, so it is
// deduped by message id.
export async function claudeSessionRows(file: string, chatId: string, projectId: string, since: number): Promise<UsageRow[]> {
  const lines = await readLines(file)
  const rows = new Map<string, UsageRow>()
  for (const line of lines) {
    const row = parseClaudeEntry(line, chatId, projectId)
    if (row && row.ts < since) rows.set(row.key, row)
  }
  return [...rows.values()]
}

export function parseClaudeEntry(line: string, chatId: string, projectId: string): UsageRow | null {
  let entry: ClaudeEntry
  try {
    entry = JSON.parse(line) as ClaudeEntry
  } catch {
    return null
  }
  const message = entry.message
  const usage = message?.usage
  const id = message?.id
  if (entry.type !== "assistant" || !message || !usage || !id) return null
  return {
    ts: timestampMs(entry.timestamp),
    chatId,
    projectId,
    runtime: "claude",
    model: message.model ?? "unknown",
    provider: "anthropic",
    input: usage.input_tokens ?? 0,
    output: usage.output_tokens ?? 0,
    cacheRead: usage.cache_read_input_tokens ?? 0,
    cacheWrite: usage.cache_creation_input_tokens ?? 0,
    cost: BACKFILL_CLAUDE_COST,
    source: "backfill",
    key: `claude:${chatId}:${id}`,
  }
}

type ClaudeEntry = {
  type: string
  timestamp?: string
  message?: {
    id?: string
    model?: string
    usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number }
  }
}

// The encoded-cwd path first, then a glob on the session id for chats whose
// folder encoding does not match. The subagents transcripts ride along.
export async function claudeSessionFiles(claudeDir: string, cwd: string, sessionId: string): Promise<string[]> {
  let files: string[] = []
  const direct = join(claudeDir, encodeCwd(cwd), `${sessionId}.jsonl`)
  if (await exists(direct)) {
    files = [direct]
  } else {
    try {
      for (const project of await readdir(claudeDir)) {
        const candidate = join(claudeDir, project, `${sessionId}.jsonl`)
        if (await exists(candidate)) files.push(candidate)
      }
    } catch {
      files = []
    }
  }
  const rows: string[] = []
  for (const file of files) rows.push(file, ...(await subagentFiles(join(dirname(file), sessionId, "subagents"))))
  return rows
}

async function subagentFiles(dir: string): Promise<string[]> {
  try {
    const names = await readdir(dir)
    return names.filter((name) => name.endsWith(".jsonl")).map((name) => join(dir, name))
  } catch {
    return []
  }
}

export function encodeCwd(cwd: string): string {
  return cwd.replaceAll(/[^A-Za-z0-9]/g, "-")
}

async function readLines(file: string): Promise<string[]> {
  try {
    const raw = await readFile(file, "utf8")
    return raw.split("\n").filter((line) => line.trim() !== "")
  } catch {
    return []
  }
}

async function exists(file: string): Promise<boolean> {
  try {
    await readFile(file)
    return true
  } catch {
    return false
  }
}

function timestampMs(iso: string | undefined): number {
  const ms = iso ? Date.parse(iso) : NaN
  if (Number.isNaN(ms)) return 0
  return ms
}
