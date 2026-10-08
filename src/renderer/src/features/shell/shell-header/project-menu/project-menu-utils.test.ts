import { describe, expect, it } from "vitest"
import type { LibraryState, ProjectSummary } from "@shared/types"
import { openProjectOf } from "@/features/shell/shell-header/project-menu/project-menu-utils"

function project(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return { id: "p1", path: "/work/app", name: "app", pinned: false, pinnedAt: 0, lastOpenedAt: 0, running: false, attention: false, ...overrides }
}

function library(overrides: Partial<LibraryState> = {}): LibraryState {
  return { projects: [project()], openProjectId: "p1", chats: [], chatsByProject: {}, openChatId: null, ...overrides }
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
