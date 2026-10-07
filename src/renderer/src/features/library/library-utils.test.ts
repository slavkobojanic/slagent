import { describe, expect, it } from "vitest"
import { DONE_WINDOW_MS, type ChatSummary, type LibraryState, type ProjectSummary } from "@shared/types"
import {
  CHAT_LIMIT,
  canShowLess,
  chatDisplayStatus,
  isDraftBecomingChat,
  libraryContext,
  nextDoneExpiry,
  openProjectOf,
  orderedChats,
  pinnedProjects,
  samePlace,
  visibleChats,
} from "@/features/library/library-utils"
import { projectStatus, sortedProjects } from "@/lib/projects"

function chat(id: string, overrides: Partial<ChatSummary> = {}): ChatSummary {
  return { id, title: id, pinned: false, pinnedAt: 0, updatedAt: 0, running: false, status: "idle", finishedAt: null, ...overrides }
}

function project(id: string, overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return { id, path: `/work/${id}`, name: id, pinned: false, pinnedAt: 0, lastOpenedAt: 0, running: false, attention: false, ...overrides }
}

describe("orderedChats", () => {
  it("can put pinned chats first, the most recent pin first", () => {
    const chats = [chat("older", { pinned: true, pinnedAt: 1 }), chat("newer", { pinned: true, pinnedAt: 5 })]

    expect(orderedChats(chats).map((item) => item.id)).toEqual(["newer", "older"])
  })

  it("can sort unpinned chats by most recent update after the pinned ones", () => {
    const chats = [chat("stale", { updatedAt: 1 }), chat("fresh", { updatedAt: 9 }), chat("pinned", { pinned: true, pinnedAt: 1 })]

    expect(orderedChats(chats).map((item) => item.id)).toEqual(["pinned", "fresh", "stale"])
  })
})

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

describe("samePlace", () => {
  it("can match a place whose project and chat are both the same", () => {
    expect(samePlace({ projectId: "p1", chatId: "c1" }, { projectId: "p1", chatId: "c1" })).toBe(true)
  })

  it("can tell apart places that differ in chat", () => {
    expect(samePlace({ projectId: "p1", chatId: "c1" }, { projectId: "p1", chatId: "c2" })).toBe(false)
  })

  it("can tell apart a draft from a chat in the same project", () => {
    expect(samePlace({ projectId: "p1", chatId: null }, { projectId: "p1", chatId: "c1" })).toBe(false)
  })

  it("can tell apart places that differ in project", () => {
    expect(samePlace({ projectId: "p1", chatId: "c1" }, { projectId: "p2", chatId: "c1" })).toBe(false)
  })
})

describe("isDraftBecomingChat", () => {
  const draft = (chatIds: string[]) => ({ projectId: "p1", chatId: null, chatIds: new Set(chatIds) })

  it("can be true when a draft in the same project receives a chat it did not know", () => {
    expect(isDraftBecomingChat(draft(["c1"]), { projectId: "p1", chatId: "c2" })).toBe(true)
  })

  it("can be false when the chat already existed, so it was opened rather than created", () => {
    expect(isDraftBecomingChat(draft(["c1"]), { projectId: "p1", chatId: "c1" })).toBe(false)
  })

  it("can be false when the project changed", () => {
    expect(isDraftBecomingChat(draft([]), { projectId: "p2", chatId: "c2" })).toBe(false)
  })

  it("can be false when the previous place was a chat rather than a draft", () => {
    const previous = { projectId: "p1", chatId: "c1", chatIds: new Set(["c1"]) }

    expect(isDraftBecomingChat(previous, { projectId: "p1", chatId: "c2" })).toBe(false)
  })

  it("can be false when the next place is still a draft", () => {
    expect(isDraftBecomingChat(draft([]), { projectId: "p1", chatId: null })).toBe(false)
  })
})

describe("libraryContext", () => {
  it("can record the open place and the ids of the chats in the library", () => {
    const library: LibraryState = { projects: [], openProjectId: "p1", chats: [chat("c1"), chat("c2")], openChatId: "c1" }

    const context = libraryContext(library)

    expect(context.projectId).toBe("p1")
    expect(context.chatId).toBe("c1")
    expect([...context.chatIds]).toEqual(["c1", "c2"])
  })
})

describe("openProjectOf", () => {
  it("can return null when no project is open", () => {
    const library: LibraryState = { projects: [project("p1")], openProjectId: null, chats: [], openChatId: null }

    expect(openProjectOf(library)).toBeNull()
  })

  it("can return the open project", () => {
    const library: LibraryState = { projects: [project("p1"), project("p2")], openProjectId: "p2", chats: [], openChatId: null }

    expect(openProjectOf(library)?.id).toBe("p2")
  })
})

describe("pinnedProjects", () => {
  it("can list pinned projects other than the open one, the most recent pin first", () => {
    const projects = [
      project("older", { pinned: true, pinnedAt: 1 }),
      project("newer", { pinned: true, pinnedAt: 5 }),
      project("open", { pinned: true, pinnedAt: 9 }),
      project("unpinned"),
    ]

    expect(pinnedProjects(projects, "open").map((item) => item.id)).toEqual(["newer", "older"])
  })
})

describe("sortedProjects", () => {
  it("can list the most recently opened project first", () => {
    const projects = [project("old", { lastOpenedAt: 1 }), project("new", { lastOpenedAt: 9 })]

    expect(sortedProjects(projects).map((item) => item.id)).toEqual(["new", "old"])
  })
})

describe("projectStatus", () => {
  it("can be running while a chat in the project runs", () => {
    expect(projectStatus(project("p1", { running: true }))).toBe("running")
  })

  it("can be done while a finished chat has not been seen", () => {
    expect(projectStatus(project("p1", { attention: true }))).toBe("done")
  })

  it("can be idle when nothing is running or waiting to be seen", () => {
    expect(projectStatus(project("p1"))).toBe("idle")
  })

  it("can prefer running over an unseen finish", () => {
    expect(projectStatus(project("p1", { running: true, attention: true }))).toBe("running")
  })
})

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
