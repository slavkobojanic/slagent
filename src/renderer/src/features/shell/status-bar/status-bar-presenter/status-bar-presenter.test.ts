import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { TaskEntry } from "@shared/types"
import type { StatusTask } from "@/features/shell/status-bar/status-bar-store/status-bar-store"
import type { TerminalPresenter } from "@/features/terminal/terminal-presenter/terminal-presenter"
import { TerminalStore } from "@/features/terminal/terminal-store/terminal-store"
import { StatusBarPresenter } from "@/features/shell/status-bar/status-bar-presenter/status-bar-presenter"
import { StatusBarStore } from "@/features/shell/status-bar/status-bar-store/status-bar-store"
import { LibraryStore } from "@/mirror/library-store/library-store"
import type { API } from "@/ipc/api"
import { nullLog } from "@/log/log"
import { createMockInstance } from "@/test/create-mock-instance"

const task: StatusTask = {
  id: "task-1",
  label: "dev server",
  status: "running",
  statusText: "3m",
  projectName: "Atlas",
  color: null,
  exitCode: null,
}

const taskEntry: TaskEntry = {
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

describe("StatusBarPresenter", () => {
  let terminalTabs: TerminalStore
  let terminalPresenter: ReturnType<typeof createMockInstance<TerminalPresenter>>
  let api: ReturnType<typeof createMockInstance<API>>
  let store: StatusBarStore
  let presenter: StatusBarPresenter

  beforeEach(() => {
    terminalTabs = new TerminalStore()
    terminalPresenter = createMockInstance<TerminalPresenter>(["reveal", "adoptTask"])
    api = createMockInstance<API>(["taskOutput", "stopTask"])
    store = new StatusBarStore(terminalTabs, libraryWith([taskEntry]))
    presenter = new StatusBarPresenter(store, terminalPresenter as unknown as TerminalPresenter, api, window, nullLog())
  })

  afterEach(() => {
    presenter.stop()
    vi.restoreAllMocks()
  })

  it("can reveal a terminal the user already has", () => {
    presenter.handleTerminal("terminal-1")

    expect(terminalPresenter.reveal).toHaveBeenCalledWith("terminal-1")
  })

  it("can reveal a task's terminal the agent already started", () => {
    terminalTabs.addTab({ id: "task-1", title: "dev server", cwd: "" }, "task")

    presenter.handleTaskTerminal(task)

    expect(terminalPresenter.reveal).toHaveBeenCalledWith("task-1")
  })

  it("can adopt a task's terminal on the first reveal, then open it", () => {
    presenter.handleTaskTerminal(task)

    expect(terminalPresenter.adoptTask).toHaveBeenCalledWith({ id: "task-1", title: "dev server", cwd: "" }, false, null)
    expect(terminalPresenter.reveal).toHaveBeenCalledWith("task-1")
  })

  it("can open the viewer for a task", () => {
    presenter.handleOpenTask("task-1")

    expect(store.viewingId).toBe("task-1")
    expect(store.outputText).toBe("No output yet.")
  })

  it("can read the output of the task it opened", async () => {
    api.taskOutput.mockResolvedValue("ready")
    presenter.start()
    presenter.handleOpenTask("task-1")
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(store.output).toBe("ready")
  })

  it("can close the viewer", () => {
    presenter.handleOpenTask("task-1")

    presenter.handleCloseTask()

    expect(store.viewingId).toBe(null)
  })

  it("can stop a task", async () => {
    await presenter.handleStop("task-1")

    expect(api.stopTask).toHaveBeenCalledWith("task-1")
    expect(store.error).toBe(null)
  })

  it("can show a stop failure on its store", async () => {
    api.stopTask.mockRejectedValue(new Error("No connection."))

    await presenter.handleStop("task-1")

    expect(store.error).toBe("No connection.")
  })
})
