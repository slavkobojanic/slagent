import { describe, expect, it } from "vitest"
import type { TaskEntry } from "@shared/types"
import { StatusBarStore } from "@/features/shell/status-bar/status-bar-store/status-bar-store"
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

function libraryState() {
  return {
    projects: [
      {
        id: "p1",
        path: "/work/atlas",
        name: "Atlas",
        pinned: false,
        pinnedAt: 0,
        lastOpenedAt: 0,
        running: false,
        attention: false,
        color: "blue",
      },
    ],
    openProjectId: "p1",
    chats: [],
    chatsByProject: {},
    openChatId: null,
    tasks: [task],
  }
}

describe("StatusBarStore", () => {
  it("can list the drawer's tabs as terminal chips", () => {
    const terminalTabs = new TerminalStore()
    terminalTabs.addTab({ id: "terminal-1", title: "zsh", cwd: "/work/atlas" })
    const store = new StatusBarStore(terminalTabs, new LibraryStore())

    expect(store.terminals).toEqual([{ id: "terminal-1", title: "zsh", exited: false, origin: "user", color: null }])
  })

  it("can tint the terminal chips with the open project's colour", () => {
    const terminalTabs = new TerminalStore()
    terminalTabs.addTab({ id: "terminal-1", title: "zsh", cwd: "/work/atlas" })
    const library = new LibraryStore()
    library.setLibrary(libraryState())
    const store = new StatusBarStore(terminalTabs, library)

    expect(store.terminals[0]?.color).toBe("#3b82f6")
  })

  it("can tint each task chip with its own project's colour", () => {
    const library = new LibraryStore()
    library.setLibrary(libraryState())
    const store = new StatusBarStore(new TerminalStore(), library)
    store.setNow(61_000)

    expect(store.tasks).toEqual([
      { id: "task-1", label: "dev server", status: "running", statusText: "1s", projectName: "Atlas", color: "#3b82f6", exitCode: null },
    ])
  })

  it("can say whether a task already owns a drawer tab", () => {
    const terminalTabs = new TerminalStore()
    terminalTabs.addTab({ id: "task-1", title: "dev server", cwd: "" }, "task")
    const store = new StatusBarStore(terminalTabs, new LibraryStore())

    expect(store.hasTerminal("task-1")).toBe(true)
    expect(store.hasTerminal("task-2")).toBe(false)
  })

  it("can look a task up by id", () => {
    const library = new LibraryStore()
    library.setLibrary(libraryState())
    const store = new StatusBarStore(new TerminalStore(), library)

    expect(store.task("task-1")?.label).toBe("dev server")
    expect(store.task("task-9")).toBe(null)
  })

  it("can say whether any task is still running", () => {
    const library = new LibraryStore()
    library.setLibrary(libraryState())
    const store = new StatusBarStore(new TerminalStore(), library)

    expect(store.anyRunning).toBe(true)
  })
})
