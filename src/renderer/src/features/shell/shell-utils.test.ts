import { describe, expect, it } from "vitest"
import type { ChatSummary, LibraryState, ProjectSummary } from "@shared/types"
import { openChatOf, openProjectOf, panelToggleTitle, sidebarToggleTitle } from "@/features/shell/shell-utils"

function project(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return { id: "p1", path: "/work/app", name: "app", pinned: false, pinnedAt: 0, lastOpenedAt: 0, running: false, attention: false, ...overrides }
}

function chat(overrides: Partial<ChatSummary> = {}): ChatSummary {
  return { id: "c1", title: "Fix the build", pinned: false, pinnedAt: 0, updatedAt: 0, running: false, status: "idle", finishedAt: null, ...overrides }
}

function library(overrides: Partial<LibraryState> = {}): LibraryState {
  return { projects: [project()], openProjectId: "p1", chats: [chat()], openChatId: "c1", ...overrides }
}

describe("openProjectOf", () => {
  it("can return the project the library has open", () => {
    expect(openProjectOf(library())?.name).toBe("app")
  })

  it("can return null when no project is open", () => {
    expect(openProjectOf(library({ openProjectId: null }))).toBeNull()
  })

  it("can return null when the open project is not in the list", () => {
    expect(openProjectOf(library({ openProjectId: "gone" }))).toBeNull()
  })
})

describe("openChatOf", () => {
  it("can return the chat the library has open", () => {
    expect(openChatOf(library())?.title).toBe("Fix the build")
  })

  it("can return null for a draft with no chat open", () => {
    expect(openChatOf(library({ openChatId: null }))).toBeNull()
  })
})

describe("sidebarToggleTitle", () => {
  it("can offer to hide the sidebar while it is open", () => {
    expect(sidebarToggleTitle(true, "⌘")).toBe("Hide sidebar (⌘B)")
  })

  it("can offer to show the sidebar while it is closed", () => {
    expect(sidebarToggleTitle(false, "Ctrl+")).toBe("Show sidebar (Ctrl+B)")
  })
})

describe("panelToggleTitle", () => {
  it("can offer to hide the panel while it is open", () => {
    expect(panelToggleTitle(true, "⌘")).toBe("Hide panel (⌘⇧D)")
  })

  it("can offer to show the panel while it is closed", () => {
    expect(panelToggleTitle(false, "Ctrl+")).toBe("Show panel (Ctrl+⇧D)")
  })
})
