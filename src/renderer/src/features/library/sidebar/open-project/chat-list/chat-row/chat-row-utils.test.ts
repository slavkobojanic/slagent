import { describe, expect, it } from "vitest"
import { DONE_WINDOW_MS, type ChatSummary } from "@shared/types"
import { chatDisplayStatus, nextDoneExpiry } from "@/features/library/sidebar/open-project/chat-list/chat-row/chat-row-utils"

function chat(id: string, overrides: Partial<ChatSummary> = {}): ChatSummary {
  return { id, title: id, pinned: false, pinnedAt: 0, updatedAt: 0, running: false, status: "idle", finishedAt: null, ...overrides }
}

describe("chatDisplayStatus", () => {
  const finishedAt = 1_000

  it("can keep a done chat done inside its window", () => {
    const done = chat("c1", { status: "done", finishedAt })

    expect(chatDisplayStatus(done, finishedAt + DONE_WINDOW_MS - 1)).toBe("done")
  })

  it("can fall back to idle once the window has closed", () => {
    const done = chat("c1", { status: "done", finishedAt })

    expect(chatDisplayStatus(done, finishedAt + DONE_WINDOW_MS)).toBe("idle")
  })

  it("can leave a status other than done as it is", () => {
    const running = chat("c1", { status: "running", finishedAt })

    expect(chatDisplayStatus(running, finishedAt + DONE_WINDOW_MS * 2)).toBe("running")
  })

  it("can keep a done chat done when its finish time is unknown", () => {
    const done = chat("c1", { status: "done", finishedAt: null })

    expect(chatDisplayStatus(done, finishedAt + DONE_WINDOW_MS * 2)).toBe("done")
  })
})

describe("nextDoneExpiry", () => {
  const now = 10_000

  it("can be null when no done chat is waiting to fall back to idle", () => {
    expect(nextDoneExpiry([chat("c1", { status: "running" })], now)).toBeNull()
  })

  it("can be the earliest window end among done chats still inside their window", () => {
    const chats = [
      chat("late", { status: "done", finishedAt: 9_000 }),
      chat("early", { status: "done", finishedAt: 8_000 }),
    ]

    expect(nextDoneExpiry(chats, now)).toBe(8_000 + DONE_WINDOW_MS)
  })

  it("can ignore windows that have already closed", () => {
    const chats = [chat("closed", { status: "done", finishedAt: now - DONE_WINDOW_MS - 10 })]

    expect(nextDoneExpiry(chats, now)).toBeNull()
  })
})
