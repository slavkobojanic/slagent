import { DatabaseSync, type StatementSync } from "node:sqlite"
import type { UsageCumulative, UsageDay, UsageStats } from "../shared/types"

export type UsageRuntime = "pi" | "claude" | "muse"
export type UsageSource = "live" | "backfill"

// What a turn spent its tokens on. "agent" is the coding conversation itself;
// everything else is a small side call on the naming model.
export type UsagePurpose = "agent" | "naming" | "labels" | "commit" | "skill"

// One turn's usage. `key` identifies the turn so a rewrite cannot store it twice.
export type UsageRow = {
  ts: number
  chatId: string
  projectId: string
  runtime: UsageRuntime
  model: string
  provider: string
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  cost: number
  source: UsageSource
  purpose: UsagePurpose
  key: string
}

// A live Pi turn, with identity the runtime already knows.
export type UsageRecord = {
  ts: number
  model: string
  provider: string
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  cost: number
  key: string
}

// The running per-model total a Claude Code result reports.
export type ClaudeModelUsage = {
  inputTokens: number
  outputTokens: number
  cacheReadInputTokens: number
  cacheCreationInputTokens: number
  costUSD: number
}

// Migrations are additive. Unlike the search index this database is the only
// copy of its data, so it is never dropped and rebuilt.
const SCHEMA_VERSION = 2

const MIGRATIONS: string[] = [
  `
  CREATE TABLE usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts INTEGER NOT NULL,
    chat_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    runtime TEXT NOT NULL,
    model TEXT NOT NULL,
    provider TEXT NOT NULL,
    input INTEGER NOT NULL,
    output INTEGER NOT NULL,
    cache_read INTEGER NOT NULL,
    cache_write INTEGER NOT NULL,
    cost REAL NOT NULL,
    source TEXT NOT NULL,
    dedupe_key TEXT NOT NULL UNIQUE
  );
  CREATE INDEX usage_ts ON usage (ts);
  CREATE INDEX usage_model ON usage (model, provider);
  CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `,
  `
  ALTER TABLE usage ADD COLUMN purpose TEXT NOT NULL DEFAULT 'agent';
  CREATE INDEX usage_purpose ON usage (purpose);
  `,
]

export class UsageLedger {
  private db: DatabaseSync
  private statements = new Map<string, StatementSync>()
  // Last seen per-model totals per Claude chat, so each result stores only the increase.
  private claudeSnapshots = new Map<string, Map<string, ClaudeModelUsage>>()

  constructor(file: string) {
    this.db = new DatabaseSync(file)
    this.migrate()
    if (this.meta("live_since") === null) this.setMeta("live_since", String(Date.now()))
  }

  private migrate(): void {
    const row = this.db.prepare("PRAGMA user_version").get()! as { user_version: number }
    // Each step bumps the version in its own transaction, and a newer database is
    // left alone, so an older build opening it cannot roll the version back.
    for (let v = Number(row.user_version); v < SCHEMA_VERSION; v++) {
      this.db.exec("BEGIN")
      try {
        this.db.exec(MIGRATIONS[v]!)
        this.db.exec(`PRAGMA user_version = ${v + 1}`)
        this.db.exec("COMMIT")
      } catch (error) {
        this.db.exec("ROLLBACK")
        throw error
      }
    }
  }

  private statement(sql: string): StatementSync {
    let prepared = this.statements.get(sql)
    if (!prepared) {
      prepared = this.db.prepare(sql)
      this.statements.set(sql, prepared)
    }
    return prepared
  }

  meta(key: string): string | null {
    const row = this.statement("SELECT value FROM meta WHERE key = ?").get(key) as { value: string } | undefined
    return row?.value ?? null
  }

  setMeta(key: string, value: string): void {
    this.statement("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)").run(key, value)
  }

  liveSince(): number {
    return Number(this.meta("live_since") ?? Date.now())
  }

  backfillDone(): boolean {
    return this.meta("backfill_done") !== null
  }

  markBackfillDone(): void {
    this.setMeta("backfill_done", String(Date.now()))
  }

  recordLive(chatId: string, projectId: string, record: UsageRecord, purpose: UsagePurpose = "agent"): void {
    this.insert({ ...record, chatId, projectId, runtime: "pi", source: "live", purpose })
  }

  recordRow(row: UsageRow): void {
    this.insert(row)
  }

  recordBackfill(rows: UsageRow[]): void {
    this.transaction(() => {
      for (const row of rows) this.insert(row)
    })
  }

  // A Claude result reports cumulative per-model totals. Only the increase is
  // stored; a total that went down (a /clear or a zeroed error) stores nothing
  // and becomes the new baseline.
  recordClaude(chatId: string, projectId: string, ts: number, modelUsage: Record<string, ClaudeModelUsage>, costed: boolean): void {
    const previous = this.claudeSnapshots.get(chatId) ?? new Map()
    const rows: UsageRow[] = []
    let increased = true
    for (const [model, total] of Object.entries(modelUsage)) {
      const last = previous.get(model)
      if (last && (total.inputTokens < last.inputTokens || total.outputTokens < last.outputTokens)) {
        increased = false
        break
      }
    }
    if (increased) {
      for (const [model, total] of Object.entries(modelUsage)) {
        const last = previous.get(model)
        const input = total.inputTokens - (last?.inputTokens ?? 0)
        const output = total.outputTokens - (last?.outputTokens ?? 0)
        const cacheRead = total.cacheReadInputTokens - (last?.cacheReadInputTokens ?? 0)
        const cacheWrite = total.cacheCreationInputTokens - (last?.cacheCreationInputTokens ?? 0)
        if (input === 0 && output === 0 && cacheRead === 0 && cacheWrite === 0) continue
        rows.push({
          ts,
          chatId,
          projectId,
          runtime: "claude",
          model,
          provider: "anthropic",
          input,
          output,
          cacheRead,
          cacheWrite,
          cost: costed ? total.costUSD - (last?.costUSD ?? 0) : 0,
          source: "live",
          purpose: "agent",
          key: `claude:${chatId}:${ts}:${model}`,
        })
      }
    }
    this.claudeSnapshots.set(chatId, new Map(Object.entries(modelUsage)))
    if (rows.length > 0) this.recordBackfill(rows)
  }

  // A Muse model completion reports its own usage. The subscription pays, so
  // the row's cost stays 0; only tokens are meaningful.
  recordMuse(
    chatId: string,
    projectId: string,
    ts: number,
    model: string,
    usage: { inputTokens?: number; outputTokens?: number; cacheReadTokens?: number; cacheWriteTokens?: number },
  ): void {
    const input = usage.inputTokens ?? 0
    const output = usage.outputTokens ?? 0
    if (input === 0 && output === 0) return
    this.insert({
      ts,
      chatId,
      projectId,
      runtime: "muse",
      model,
      provider: "meta",
      input,
      output,
      cacheRead: usage.cacheReadTokens ?? 0,
      cacheWrite: usage.cacheWriteTokens ?? 0,
      cost: 0,
      source: "live",
      purpose: "agent",
      key: `muse:${chatId}:${ts}:${model}`,
    })
  }

  forgetChat(chatId: string): void {
    this.claudeSnapshots.delete(chatId)
  }

  private insert(row: UsageRow): void {
    this.statement(
      `INSERT OR IGNORE INTO usage (ts, chat_id, project_id, runtime, model, provider, input, output, cache_read, cache_write, cost, source, purpose, dedupe_key)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(row.ts, row.chatId, row.projectId, row.runtime, row.model, row.provider, row.input, row.output, row.cacheRead, row.cacheWrite, row.cost, row.source, row.purpose, row.key)
  }

  private transaction(work: () => void): void {
    this.db.exec("BEGIN")
    try {
      work()
    } catch (error) {
      this.db.exec("ROLLBACK")
      throw error
    }
    this.db.exec("COMMIT")
  }

  // Day grouping uses SQLite's localtime so the heatmap matches the user's
  // calendar. Rows live in UTC and keep their own timestamps.
  stats(now = Date.now()): UsageStats {
    const dayRows = this.statement(
      `SELECT date(ts/1000, 'unixepoch', 'localtime') AS day, sum(input + output + cache_read + cache_write) AS tokens, sum(cost) AS cost
       FROM usage GROUP BY day ORDER BY day`,
    ).all() as { day: string; tokens: number; cost: number }[]

    const cutoff = localDay(now - 364 * 86_400_000)
    const days: UsageDay[] = []
    const cumulative: UsageCumulative[] = []
    let running = 0
    for (const row of dayRows) {
      const day = { day: row.day, tokens: Number(row.tokens), cost: Number(row.cost) }
      running += day.cost
      cumulative.push({ day: row.day, cost: running })
      if (row.day >= cutoff) days.push(day)
    }

    const total = this.statement(
      `SELECT sum(input) AS input, sum(output) AS output, sum(cache_read) AS cacheRead, sum(cache_write) AS cacheWrite, sum(cost) AS cost, count(*) AS turns FROM usage`,
    ).get() as { input: number | null; output: number | null; cacheRead: number | null; cacheWrite: number | null; cost: number | null; turns: number }
    const models = this.statement(
      `SELECT model, provider, sum(input) AS input, sum(output) AS output, sum(cache_read) AS cacheRead, sum(cache_write) AS cacheWrite, sum(cost) AS cost, count(*) AS turns
       FROM usage GROUP BY model, provider ORDER BY sum(cost) DESC, model`,
    ).all() as { model: string; provider: string; input: number; output: number; cacheRead: number; cacheWrite: number; cost: number; turns: number }[]
    const purposes = this.statement(
      `SELECT purpose, sum(input + output + cache_read + cache_write) AS tokens, sum(cost) AS cost, count(*) AS turns
       FROM usage GROUP BY purpose ORDER BY sum(cost) DESC`,
    ).all() as { purpose: string; tokens: number; cost: number; turns: number }[]

    return {
      days,
      cumulative,
      totalTokens: Number(total.input) + Number(total.output) + Number(total.cacheRead) + Number(total.cacheWrite),
      totalCost: Number(total.cost ?? 0),
      totalTurns: Number(total.turns),
      models: models.map((row) => ({
        model: row.model,
        provider: row.provider,
        input: Number(row.input),
        output: Number(row.output),
        cacheRead: Number(row.cacheRead),
        cacheWrite: Number(row.cacheWrite),
        cost: Number(row.cost),
        turns: Number(row.turns),
      })),
      purposes: purposes.map((row) => ({
        purpose: row.purpose as UsagePurpose,
        tokens: Number(row.tokens),
        cost: Number(row.cost),
        turns: Number(row.turns),
      })),
      importing: !this.backfillDone(),
    }
  }
}

function localDay(ms: number): string {
  const date = new Date(ms)
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}