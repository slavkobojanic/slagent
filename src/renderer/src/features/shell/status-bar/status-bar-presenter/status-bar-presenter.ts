import { compareStructural } from "mobx"
import type { StatusTask } from "@/features/shell/status-bar/status-bar-store/status-bar-store"
import type { StatusBarStore } from "@/features/shell/status-bar/status-bar-store/status-bar-store"
import type { TerminalPresenter } from "@/features/terminal/terminal-presenter/terminal-presenter"
import { errorText } from "@/lib/format"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"

const TICK_MS = 1000
const POLL_MS = 1000

type Viewed = { id: string; running: boolean }

// Runs the status bar: reveals the user's terminals in the drawer, opens the
// task viewer, and ticks and polls while something runs. The polling follows
// the task strip's presenter, so both stay in step.
export class StatusBarPresenter {
  private disposers: (() => void)[] = []
  private cancelTick: (() => void) | null = null
  private cancelPoll: (() => void) | null = null
  private bottom: HTMLDivElement | null = null
  private started = false

  constructor(
    private readonly store: StatusBarStore,
    private readonly terminalPresenter: TerminalPresenter,
    private readonly api: API,
    private readonly window: Window,
    private readonly log: Log,
  ) {}

  start = () => {
    if (this.started) {
      return
    }
    this.started = true
    this.disposers = [
      this.log.reaction("status-any-running", () => this.store.anyRunning, this.handleRunningChange, { fireImmediately: true }),
      this.log.reaction("status-viewed", this.viewed, this.handleViewedChange, { equals: compareStructural, fireImmediately: true }),
    ]
  }

  stop = () => {
    if (!this.started) {
      return
    }
    for (const dispose of this.disposers) {
      dispose()
    }
    this.disposers = []
    this.endTick()
    this.endPoll()
    this.started = false
  }

  handleTerminal = (id: string) => {
    this.log.action("status-reveal-terminal", { id })
    this.terminalPresenter.reveal(id)
  }

  // A terminal a task owns: the shell the agent started. Clicking adopts it
  // into the drawer the first time, then reveals it like any other tab.
  handleTaskTerminal = (task: StatusTask) => {
    if (!this.store.hasTerminal(task.id)) {
      this.terminalPresenter.adoptTask({ id: task.id, title: task.label, cwd: "" }, task.status !== "running", task.exitCode)
    }
    this.handleTerminal(task.id)
  }

  handleOpenTask = (id: string) => {
    this.log.action("status-open-task", { id })
    this.store.setViewing(this.store.task(id))
  }

  handleCloseTask = () => {
    this.log.action("status-close-task")
    this.store.setViewing(null)
  }

  handleStop = async (id: string) => {
    this.log.action("status-stop-task", { id })
    this.store.setError(null)
    try {
      await this.api.stopTask(id)
    } catch (error) {
      this.log.warn("stop-task-failed", { error })
      this.store.setError(errorText(error))
    }
  }

  attachBottom = (element: HTMLDivElement | null) => {
    this.bottom = element
  }

  private viewed = (): Viewed | null => {
    if (this.store.viewing === null) {
      return null
    }
    const viewed = this.store.viewing
    return { id: viewed.id, running: viewed.status === "running" }
  }

  private handleRunningChange = (running: boolean) => {
    this.endTick()
    if (!running) {
      return
    }
    this.cancelTick = this.every(TICK_MS, () => {
      this.store.setNow(Date.now())
    })
  }

  private handleViewedChange = (viewed: Viewed | null) => {
    this.endPoll()
    if (viewed === null) {
      return
    }
    void this.loadOutput(viewed.id)
    if (!viewed.running) {
      return
    }
    this.cancelPoll = this.every(POLL_MS, () => {
      void this.loadOutput(viewed.id)
    })
  }

  private loadOutput = async (id: string) => {
    let output: string
    try {
      output = await this.api.taskOutput(id)
    } catch (error) {
      if (this.store.viewingId === id) {
        this.log.warn("task-output-failed", { id, error })
        this.store.setError(errorText(error))
      }
      return
    }
    // The viewer may have closed, or moved to another task, while the read was in flight.
    if (this.store.viewingId !== id) {
      return
    }
    this.store.setOutput(output)
    this.window.requestAnimationFrame(() => {
      this.bottom?.scrollIntoView({ block: "end" })
    })
  }

  private every = (ms: number, run: () => void): (() => void) => {
    const handle = this.window.setInterval(run, ms)
    return () => {
      this.window.clearInterval(handle)
    }
  }

  private endTick = () => {
    this.cancelTick?.()
    this.cancelTick = null
  }

  private endPoll = () => {
    this.cancelPoll?.()
    this.cancelPoll = null
  }
}
