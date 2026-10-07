import { describe, expect, it } from "vitest"
import type { ChatSummary } from "@shared/types"
import { CHAT_LIMIT, canShowLess, visibleChats } from "@/features/library/sidebar/open-project/chat-list/chat-list-utils"

function chat(id: string): ChatSummary {
  return { id, title: id, pinned: false, pinnedAt: 0, updatedAt: 0, running: false, status: "idle", finishedAt: null }
}

describe("visibleChats", () => {
  const chats = Array.from({ length: CHAT_LIMIT + 2 }, (_, index) => chat(`c${index}`))

  it("can show only the first chats up to the limit when not showing all", () => {
    expect(visibleChats(chats, false)).toHaveLength(CHAT_LIMIT)
  })

  it("can show every chat when showing all", () => {
    expect(visibleChats(chats, true)).toHaveLength(CHAT_LIMIT + 2)
  })
})

describe("canShowLess", () => {
  it("can be false while the list is cut to the limit", () => {
    expect(canShowLess(CHAT_LIMIT + 5, false)).toBe(false)
  })

  it("can be false when showing all a list that fits the limit", () => {
    expect(canShowLess(CHAT_LIMIT, true)).toBe(false)
  })

  it("can be true when showing all a list longer than the limit", () => {
    expect(canShowLess(CHAT_LIMIT + 1, true)).toBe(true)
  })
})
