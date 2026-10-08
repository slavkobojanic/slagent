import { describe, expect, it } from "vitest"
import type { ChatSummary, LibraryState } from "@shared/types"
import { openChatOf } from "@/features/shell/shell-header/chat-title/chat-title-utils"

function chat(overrides: Partial<ChatSummary> = {}): ChatSummary {
  return { id: "c1", title: "Fix the build", pinned: false, pinnedAt: 0, updatedAt: 0, running: false, status: "idle", finishedAt: null, ...overrides }
}

function library(overrides: Partial<LibraryState> = {}): LibraryState {
  return { projects: [], openProjectId: "p1", chats: [chat()], chatsByProject: {}, openChatId: "c1", ...overrides }
}

describe("openChatOf", () => {
  it("can return the chat the library has open", () => {
    expect(openChatOf(library())?.title).toBe("Fix the build")
  })

  it("can return null for a draft with no chat open", () => {
    expect(openChatOf(library({ openChatId: null }))).toBeNull()
  })

  it("can return null when the open chat is not in the list", () => {
    expect(openChatOf(library({ openChatId: "gone" }))).toBeNull()
  })

  it("can find the open chat in a project that is not open", () => {
    const other = chat({ id: "c2", title: "Other project chat" })

    expect(openChatOf(library({ openChatId: "c2", chats: [], chatsByProject: { p2: [other] } }))?.title).toBe("Other project chat")
  })
})
