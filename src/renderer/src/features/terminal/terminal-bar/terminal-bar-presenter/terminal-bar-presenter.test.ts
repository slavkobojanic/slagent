import { beforeEach, describe, expect, it } from "vitest"
import type { TaskEntry } from "@shared/types"
import type { TerminalPresenter } from "@/features/terminal/terminal-presenter/terminal-presenter"
import { TerminalBarPresenter } from "@/features/terminal/terminal-bar/terminal-bar-presenter/terminal-bar-presenter"
import { TerminalBarStore } from "@/features/terminal/terminal-bar/terminal-bar-store/terminal-bar-store"
import { TerminalStore } from "@/features/terminal/terminal-store/terminal-store"
import { LibraryStore } from "@/mirror/library-store/library-store"
import { nullLog } from "@/log/log"
import { createMockInstance } from "@/test/create-mock-instance"

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

function libraryWith(tasks: TaskEntry[]) {
  const library = new LibraryStore()
  library.setLibrary({
    projects: [
      { id: "p1", path: "/work/atlas", name: "Atlas", pinned: false, pinnedAt: 0, lastOpenedAt: 0, running: false, attention: false },
    ],
    openProjectId: "p1",
    chats: [],
    chatsByProject: {},
    openChatId: null,
    tasks,
  })
  return library
}

describe("TerminalBarPresenter", () => {
  let terminalTabs: TerminalStore
  let terminalPresenter: ReturnType<typeof createMockInstance<TerminalPresenter>>
  let store: TerminalBarStore
  let presenter: TerminalBarPresenter

  beforeEach(() => {
    terminalTabs = new TerminalStore()
    terminalPresenter = createMockInstance<TerminalPresenter>(["reveal", "adoptTask", "closeTab", "create", "toggle"])
    store = new TerminalBarStore(terminalTabs, libraryWith([task]))
    presenter = new TerminalBarPresenter(store, terminalPresenter as unknown as TerminalPresenter, nullLog())
  })

  it("can reveal a terminal the drawer already has", () => {
    terminalTabs.addTab({ id: "terminal-1", title: "zsh", cwd: "" })

    presenter.handleSelect("terminal-1")

    expect(terminalPresenter.reveal).toHaveBeenCalledWith("terminal-1")
  })

  it("can adopt a task's shell on the first select, then open it", () => {
    presenter.handleSelect("task-1")

    expect(terminalPresenter.adoptTask).toHaveBeenCalledWith({ id: "task-1", title: "dev server", cwd: "" }, false, null)
    expect(terminalPresenter.reveal).toHaveBeenCalledWith("task-1")
  })

  it("can skip adopting an unknown chip", () => {
    presenter.handleSelect("gone")

    expect(terminalPresenter.adoptTask).not.toHaveBeenCalled()
    expect(terminalPresenter.reveal).not.toHaveBeenCalled()
  })

  it("can close a chip's terminal through the terminal presenter", () => {
    presenter.handleClose("terminal-1")

    expect(terminalPresenter.closeTab).toHaveBeenCalledWith("terminal-1")
  })

  it("can start a new shell through the terminal presenter", () => {
    presenter.handleCreate()

    expect(terminalPresenter.create).toHaveBeenCalled()
  })

  it("can toggle the drawer through the terminal presenter", () => {
    presenter.handleToggle()

    expect(terminalPresenter.toggle).toHaveBeenCalled()
  })
})
