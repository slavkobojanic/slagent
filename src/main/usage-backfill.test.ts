// @vitest-environment node
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { claudeSessionFiles, claudeSessionRows, encodeCwd, parseClaudeEntry, parsePiEntry, piSessionRows } from "./usage-backfill"

const tempDirs: string[] = []

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) await rm(dir, { recursive: true, force: true })
})

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "slagent-backfill-"))
  tempDirs.push(dir)
  return dir
}

const SINCE = Date.parse("2026-10-05T00:00:00.000Z")

describe("parsePiEntry", () => {
  it("can read an assistant entry with its own usage and cost", () => {
    const line = JSON.stringify({
      type: "message",
      id: "entry-1",
      timestamp: "2026-10-07T10:00:00.000Z",
      message: {
        role: "assistant",
        model: "z-ai/glm-5.3-flash",
        provider: "openrouter",
        responseId: "resp-1",
        timestamp: 1_791_502_529_679,
        usage: { input: 15_333, output: 367, cacheRead: 12, cacheWrite: 5, totalTokens: 15_717, cost: { total: 0.0025 } },
      },
    })

    expect(parsePiEntry(line, "chat-1", "project-1")).toEqual({
      ts: 1_791_502_529_679,
      chatId: "chat-1",
      projectId: "project-1",
      runtime: "pi",
      model: "z-ai/glm-5.3-flash",
      provider: "openrouter",
      input: 15_333,
      output: 367,
      cacheRead: 12,
      cacheWrite: 5,
      cost: 0.0025,
      source: "backfill",
      key: "pi:chat-1:resp-1",
    })
  })

  it("can skip user messages, non-messages and broken lines", () => {
    expect(parsePiEntry(JSON.stringify({ type: "message", message: { role: "user" } }), "chat-1", "project-1")).toBeNull()
    expect(parsePiEntry(JSON.stringify({ type: "model_change" }), "chat-1", "project-1")).toBeNull()
    expect(parsePiEntry("not json", "chat-1", "project-1")).toBeNull()
  })
})

describe("piSessionRows", () => {
  it("can import only the assistant messages from before live_since", async () => {
    const dir = tempDir()
    const file = join(dir, "session.jsonl")
    const old = JSON.stringify({
      type: "message",
      id: "old-entry",
      message: { role: "assistant", model: "m", provider: "openrouter", responseId: "old", timestamp: SINCE - 1_000, usage: { input: 1, output: 2, cacheRead: 0, cacheWrite: 0, cost: { total: 0.1 } } },
    })
    const recent = JSON.stringify({
      type: "message",
      id: "new-entry",
      message: { role: "assistant", model: "m", provider: "openrouter", responseId: "new", timestamp: SINCE + 1_000, usage: { input: 5, output: 5, cacheRead: 0, cacheWrite: 0, cost: { total: 0.2 } } },
    })
    writeFileSync(file, [old, recent].join("\n"))

    const rows = await piSessionRows(file, "chat-1", "project-1", SINCE)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.key).toBe("pi:chat-1:old")
  })
})

describe("parseClaudeEntry", () => {
  it("can read an assistant line at $0, deduped later by message id", () => {
    const line = JSON.stringify({
      type: "assistant",
      timestamp: "2026-10-07T00:49:37.881Z",
      message: {
        id: "msg_011CfmxWz5UNUa9QQeUaycbs",
        model: "claude-opus-5-5",
        usage: { input_tokens: 2, output_tokens: 279, cache_read_input_tokens: 46_169, cache_creation_input_tokens: 22_251 },
      },
    })

    expect(parseClaudeEntry(line, "chat-1", "project-1")).toEqual({
      ts: Date.parse("2026-10-07T00:49:37.881Z"),
      chatId: "chat-1",
      projectId: "project-1",
      runtime: "claude",
      model: "claude-opus-5-5",
      provider: "anthropic",
      input: 2,
      output: 279,
      cacheRead: 46_169,
      cacheWrite: 22_251,
      cost: 0,
      source: "backfill",
      key: "claude:chat-1:msg_011CfmxWz5UNUa9QQeUaycbs",
    })
  })

  it("can skip results, attachments and broken lines", () => {
    expect(parseClaudeEntry(JSON.stringify({ type: "result" }), "chat-1", "project-1")).toBeNull()
    expect(parseClaudeEntry(JSON.stringify({ type: "assistant", message: { id: "msg-1" } }), "chat-1", "project-1")).toBeNull()
    expect(parseClaudeEntry("not json", "chat-1", "project-1")).toBeNull()
  })
})

describe("claudeSessionRows", () => {
  it("can dedupe repeated message ids across the file", async () => {
    const dir = tempDir()
    const file = join(dir, "session.jsonl")
    const message = JSON.stringify({
      type: "assistant",
      timestamp: "2026-10-07T00:49:37.881Z",
      message: { id: "msg-1", model: "claude-opus-5-5", usage: { input_tokens: 2, output_tokens: 279, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } },
    })
    // Claude Code appends the same message again when a turn resumes.
    writeFileSync(file, [message, message].join("\n"))

    const rows = await claudeSessionRows(file, "chat-1", "project-1", Date.parse("2026-10-07T23:00:00.000Z"))
    expect(rows).toHaveLength(1)
  })
})

describe("claudeSessionFiles", () => {
  it("can find the session by encoded cwd and its subagents", async () => {
    const dir = tempDir()
    const encoded = encodeCwd("/Users/x/project")
    mkdirSync(join(dir, encoded, "session-1", "subagents"), { recursive: true })
    writeFileSync(join(dir, encoded, "session-1.jsonl"), "{}")
    writeFileSync(join(dir, encoded, "session-1", "subagents", "agent-a.jsonl"), "{}")

    const files = await claudeSessionFiles(dir, "/Users/x/project", "session-1")
    expect(files).toEqual([join(dir, encoded, "session-1.jsonl"), join(dir, encoded, "session-1", "subagents", "agent-a.jsonl")])
  })

  it("can fall back to a glob on the session id", async () => {
    const dir = tempDir()
    mkdirSync(join(dir, "-Users-x-other"), { recursive: true })
    writeFileSync(join(dir, "-Users-x-other", "session-1.jsonl"), "{}")

    const files = await claudeSessionFiles(dir, "/Users/x/project", "session-1")
    expect(files).toEqual([join(dir, "-Users-x-other", "session-1.jsonl")])
  })

  it("can return nothing when the session is gone", async () => {
    const dir = tempDir()

    expect(await claudeSessionFiles(dir, "/Users/x/project", "session-1")).toEqual([])
  })
})

describe("encodeCwd", () => {
  it("can encode a cwd the way Claude Code does", () => {
    expect(encodeCwd("/Users/slavkobojanic/projects/slagent")).toBe("-Users-slavkobojanic-projects-slagent")
  })
})