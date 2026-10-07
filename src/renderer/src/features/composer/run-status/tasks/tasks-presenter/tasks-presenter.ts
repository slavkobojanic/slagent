import { compareStructural } from "mobx"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { TasksStore } from "@/features/composer/run-status/tasks/tasks-store/tasks-store"
import { errorText } from "@/lib/format"

const TICK_MS = 1000
const POLL_MS = 1000

type Viewed = { id: string; running: boolean }

// Elapsed times tick while any task runs. The output dialog reads its task's output when it
// opens, again every second while the task runs, and once more when the task ends.
export class TasksPresenter {
  private disposers: (() => void)[] = []
  private cancelTick: (() => void) | null = null
  private cancelPoll: (() => void) | null = null
  private bottom: HTMLDivElement | null = null
  private started = false

  constructor(
    private readonly store: TasksStore,
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
      this.log.reaction("any-running", () => this.store.anyRunning, this.handleRunningChange, { fireImmediately: true }),
      this.log.reaction("viewed", this.viewed, this.handleViewedChange, { equals: compareStructural, fireImmediately: true }),
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

  handleOpen = (id: string) => {
    this.log.action("open-task", { id })
    this.store.openTask(id)
  }

  handleClose = () => {
    this.log.action("close-task")
    this.store.closeTask()
  }

  handleStop = async (id: string) => {
    this.log.action("stop-task", { id })
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
    const current = this.store.current
    if (current === null) {
      return null
    }
    return { id: current.id, running: current.status === "running" }
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
    // The dialog may have closed, or moved to another task, while the read was in flight.
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
