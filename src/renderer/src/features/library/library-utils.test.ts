import { describe, expect, it } from "vitest"
import type { ChatSummary, LibraryState, ProjectSummary } from "@shared/types"
import { chatOf, isDraftBecomingChat, libraryContext, orderedChats, projectOfChat, samePlace } from "@/features/library/library-utils"
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

describe("chatOf", () => {
  it("can find a chat of the open project", () => {
    const library: LibraryState = { projects: [], openProjectId: "p1", chats: [chat("c1")], chatsByProject: {}, openChatId: "c1" }

    expect(chatOf(library, "c1")?.id).toBe("c1")
  })

  it("can find a chat of a project that is not open", () => {
    const library: LibraryState = { projects: [], openProjectId: "p1", chats: [], chatsByProject: { p2: [chat("c2")] }, openChatId: "c2" }

    expect(chatOf(library, "c2")?.id).toBe("c2")
  })

  it("can return undefined for a chat the library does not list", () => {
    const library: LibraryState = { projects: [], openProjectId: "p1", chats: [], chatsByProject: {}, openChatId: null }

    expect(chatOf(library, "gone")).toBeUndefined()
  })
})

describe("projectOfChat", () => {
  it("can name the open project for its own chats", () => {
    const library: LibraryState = { projects: [], openProjectId: "p1", chats: [chat("c1")], chatsByProject: {}, openChatId: "c1" }

    expect(projectOfChat(library, "c1")).toBe("p1")
  })

  it("can name a project that is not open", () => {
    const library: LibraryState = { projects: [], openProjectId: "p1", chats: [], chatsByProject: { p2: [chat("c2")] }, openChatId: null }

    expect(projectOfChat(library, "c2")).toBe("p2")
  })

  it("can return undefined for a chat the library does not list", () => {
    const library: LibraryState = { projects: [], openProjectId: "p1", chats: [], chatsByProject: {}, openChatId: null }

    expect(projectOfChat(library, "gone")).toBeUndefined()
  })
})

describe("libraryContext", () => {
  it("can record the open place and the ids of the chats in the library", () => {
    const library: LibraryState = { projects: [], openProjectId: "p1", chats: [chat("c1"), chat("c2")], chatsByProject: {}, openChatId: "c1" }

    const context = libraryContext(library)

    expect(context.projectId).toBe("p1")
    expect(context.chatId).toBe("c1")
    expect([...context.chatIds]).toEqual(["c1", "c2"])
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
