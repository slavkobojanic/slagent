// @vitest-environment node
import { mkdtempSync } from "node:fs"
import { rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { UsageLedger, type UsageRecord, type UsageRow } from "./usage-ledger"

const tempDirs: string[] = []

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) await rm(dir, { recursive: true, force: true })
})

function ledgerFile(): string {
  const dir = mkdtempSync(join(tmpdir(), "slagent-usage-"))
  tempDirs.push(dir)
  return join(dir, "usage.db")
}

function record(overrides: Partial<UsageRecord> = {}): UsageRecord {
  return {
    ts: 1_700_000_000_000,
    model: "gpt-test",
    provider: "openrouter",
    input: 100,
    output: 50,
    cacheRead: 20,
    cacheWrite: 30,
    cost: 0.01,
    key: "pi:chat-1:msg-1",
    ...overrides,
  }
}

function row(overrides: Partial<UsageRow> = {}): UsageRow {
  return {
    ts: 1_700_000_000_000,
    chatId: "chat-1",
    projectId: "project-1",
    runtime: "pi",
    model: "gpt-test",
    provider: "openrouter",
    input: 100,
    output: 50,
    cacheRead: 20,
    cacheWrite: 30,
    cost: 0.01,
    source: "live",
    key: "pi:chat-1:msg-1",
    ...overrides,
  }
}

describe("UsageLedger", () => {
  describe("recordLive", () => {
    it("can store a live turn and read it back in stats", () => {
      const usage = new UsageLedger(ledgerFile())
      usage.recordLive("chat-1", "project-1", record({ ts: Date.now() }))

      const stats = usage.stats()
      expect(stats.totalTokens).toBe(200)
      expect(stats.totalCost).toBeCloseTo(0.01)
      expect(stats.totalTurns).toBe(1)
      expect(stats.days).toHaveLength(1)
      expect(stats.models[0]?.model).toBe("gpt-test")
    })

    it("can ignore a repeat of the same turn", () => {
      const usage = new UsageLedger(ledgerFile())
      usage.recordLive("chat-1", "project-1", record())
      usage.recordLive("chat-1", "project-1", record())

      expect(usage.stats().totalTurns).toBe(1)
    })

    it("can store the same turn in two chats", () => {
      const usage = new UsageLedger(ledgerFile())
      usage.recordLive("chat-1", "project-1", record({ key: "pi:chat-1:msg-1" }))
      usage.recordLive("chat-2", "project-1", record({ key: "pi:chat-2:msg-1" }))

      expect(usage.stats().totalTurns).toBe(2)
    })
  })

  describe("recordClaude", () => {
    it("can store the increase over the last per-model total", () => {
      const usage = new UsageLedger(ledgerFile())
      usage.recordClaude("chat-1", "project-1", 1_000, { "claude-opus": claude(100, 50, 0, 0, 0.5) }, true)
      usage.recordClaude("chat-1", "project-1", 2_000, { "claude-opus": claude(250, 90, 10, 0, 0.9) }, true)

      const stats = usage.stats()
      expect(stats.totalTurns).toBe(2)
      expect(stats.models[0]?.input).toBe(250)
      expect(stats.models[0]?.output).toBe(90)
      expect(stats.models[0]?.cost).toBeCloseTo(0.9)
    })

    it("can store nothing when a running total drops, and take the new baseline", () => {
      const usage = new UsageLedger(ledgerFile())
      usage.recordClaude("chat-1", "project-1", 1_000, { "claude-opus": claude(100, 50, 0, 0, 0.5) }, true)
      // A /clear zeroes the totals: nothing is stored for this result.
      usage.recordClaude("chat-1", "project-1", 2_000, { "claude-opus": claude(0, 0, 0, 0, 0) }, true)
      usage.recordClaude("chat-1", "project-1", 3_000, { "claude-opus": claude(40, 10, 0, 0, 0.2) }, true)

      const stats = usage.stats()
      expect(stats.totalTurns).toBe(2)
      expect(stats.models[0]?.input).toBe(140)
      expect(stats.models[0]?.output).toBe(60)
      expect(stats.models[0]?.cost).toBeCloseTo(0.7)
    })

    it("can keep chats apart", () => {
      const usage = new UsageLedger(ledgerFile())
      usage.recordClaude("chat-1", "project-1", 1_000, { "claude-opus": claude(100, 0, 0, 0, 0.5) }, true)
      usage.recordClaude("chat-2", "project-1", 1_000, { "claude-opus": claude(100, 0, 0, 0, 0.5) }, true)

      expect(usage.stats().totalTurns).toBe(2)
      expect(usage.stats().models[0]?.input).toBe(200)
    })

    it("can skip cost when the turn is not billed", () => {
      const usage = new UsageLedger(ledgerFile())
      usage.recordClaude("chat-1", "project-1", 1_000, { "claude-opus": claude(100, 50, 0, 0, 0.5) }, false)

      expect(usage.stats().totalCost).toBe(0)
      expect(usage.stats().totalTokens).toBe(150)
    })
  })

  describe("recordBackfill", () => {
    it("can store backfill rows and dedupe by key", () => {
      const usage = new UsageLedger(ledgerFile())
      usage.recordBackfill([row(), { ...row(), input: 999 }])
      usage.recordBackfill([row()])

      const stats = usage.stats()
      expect(stats.totalTurns).toBe(1)
      expect(stats.models[0]?.input).toBe(100)
      expect(stats.models[0]?.provider).toBe("openrouter")
    })
  })

  describe("stats", () => {
    it("can group tokens and cost per local day", () => {
      const usage = new UsageLedger(ledgerFile())
      const day = 86_400_000
      const now = Date.now()
      usage.recordBackfill([
        row({ ts: now, input: 10, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0.1, key: "k1" }),
        row({ ts: now + day, input: 20, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0.2, key: "k2" }),
      ])

      expect(usage.stats().days).toHaveLength(2)
      expect(usage.stats().days[0]?.tokens).toBe(10)
      expect(usage.stats().days[1]?.cost).toBeCloseTo(0.2)
    })

    it("can build a cumulative spend series", () => {
      const usage = new UsageLedger(ledgerFile())
      const day = 86_400_000
      const now = Date.now()
      usage.recordBackfill([
        row({ ts: now, cost: 0.1, key: "k1" }),
        row({ ts: now + day, cost: 0.2, key: "k2" }),
        row({ ts: now + 2 * day, cost: 0.3, key: "k3" }),
      ])

      const cumulative = usage.stats().cumulative
      expect(cumulative[0]?.cost).toBeCloseTo(0.1)
      expect(cumulative[1]?.cost).toBeCloseTo(0.3)
      expect(cumulative[2]?.cost).toBeCloseTo(0.6)
    })

    it("can report importing until the backfill is marked done", () => {
      const usage = new UsageLedger(ledgerFile())
      expect(usage.stats().importing).toBe(true)
      usage.markBackfillDone()
      expect(usage.stats().importing).toBe(false)
    })

    it("can keep live_since fixed across reopens", () => {
      const file = ledgerFile()
      const since = new UsageLedger(file).liveSince()
      const reopened = new UsageLedger(file)

      expect(reopened.liveSince()).toBe(since)
    })
  })
})

function claude(inputTokens: number, outputTokens: number, cacheRead: number, cacheWrite: number, costUSD: number) {
  return { inputTokens, outputTokens, cacheReadInputTokens: cacheRead, cacheCreationInputTokens: cacheWrite, costUSD }
}