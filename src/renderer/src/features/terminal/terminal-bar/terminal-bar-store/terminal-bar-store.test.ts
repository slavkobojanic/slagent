import { describe, expect, it } from "vitest"
import type { TaskEntry } from "@shared/types"
import { TerminalBarStore } from "@/features/terminal/terminal-bar/terminal-bar-store/terminal-bar-store"
import { TerminalStore } from "@/features/terminal/terminal-store/terminal-store"
import { LibraryStore } from "@/mirror/library-store/library-store"

const task: TaskEntry = {
  id: "task-1",
  label: "dev server",
  command: "pnpm dev",
  status: "running",
  exitCode: null,
  startedAt: 60_000,
  endedAt: null,
  projectId: "p1",
}

function libraryState(tasks: TaskEntry[], openProjectId: string | null = "p1") {
  return {
    projects: [
      { id: "p1", path: "/work/atlas", name: "Atlas", pinned: false, pinnedAt: 0, lastOpenedAt: 0, running: false, attention: false, color: "blue" },
    ],
    openProjectId,
    chats: [],
    chatsByProject: {},
    openChatId: null,
    tasks,
  }
}

describe("TerminalBarStore", () => {
  it("can list the user's shells and the agent's task shells in one list", () => {
    const terminalTabs = new TerminalStore()
    terminalTabs.addTab({ id: "terminal-1", title: "zsh", cwd: "/work/atlas" })
    terminalTabs.addTab({ id: "task-1", title: "dev server", cwd: "" }, "task")
    const library = new LibraryStore()
    library.setLibrary(libraryState([task]))
    const store = new TerminalBarStore(terminalTabs, library)

    expect(store.chips.map((chip) => chip.id)).toEqual(["terminal-1", "task-1"])
  })

  it("can chip a task whose shell is not in the drawer yet", () => {
    const library = new LibraryStore()
    library.setLibrary(libraryState([task]))
    const store = new TerminalBarStore(new TerminalStore(), library)

    expect(store.chips).toEqual([
      { id: "task-1", title: "dev server", active: false, exited: false, origin: "task", color: "#3b82f6" },
    ])
  })

  it("can skip the chip once the task's shell is adopted", () => {
    const terminalTabs = new TerminalStore()
    terminalTabs.addTab({ id: "task-1", title: "dev server", cwd: "" }, "task")
    const library = new LibraryStore()
    library.setLibrary(libraryState([task]))
    const store = new TerminalBarStore(terminalTabs, library)

    expect(store.chips.map((chip) => chip.origin)).toEqual(["task"])
    expect(store.chips).toHaveLength(1)
  })

  it("can tint a task chip with its own project's colour and user chips with the open project's", () => {
    const terminalTabs = new TerminalStore()
    terminalTabs.addTab({ id: "terminal-1", title: "zsh", cwd: "/work/atlas" })
    const library = new LibraryStore()
    library.setLibrary(libraryState([task]))
    const store = new TerminalBarStore(terminalTabs, library)

    expect(store.chips[0]?.color).toBe("#3b82f6")
  })

  it("can mark the open shell active", () => {
    const terminalTabs = new TerminalStore()
    terminalTabs.addTab({ id: "terminal-1", title: "zsh", cwd: "" })
    terminalTabs.addTab({ id: "terminal-2", title: "node", cwd: "" })
    const store = new TerminalBarStore(terminalTabs, new LibraryStore())

    expect(store.chips.map((chip) => chip.active)).toEqual([false, true])
  })

  it("can say whether a task already owns a drawer tab", () => {
    const terminalTabs = new TerminalStore()
    terminalTabs.addTab({ id: "task-1", title: "dev server", cwd: "" }, "task")
    const store = new TerminalBarStore(terminalTabs, new LibraryStore())

    expect(store.hasTerminal("task-1")).toBe(true)
    expect(store.hasTerminal("task-2")).toBe(false)
  })

  it("can look a task up by id", () => {
    const library = new LibraryStore()
    library.setLibrary(libraryState([task]))
    const store = new TerminalBarStore(new TerminalStore(), library)

    expect(store.task("task-1")?.label).toBe("dev server")
    expect(store.task("task-9")).toBe(null)
  })
})
