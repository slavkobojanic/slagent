import { compareStructural, reaction } from "mobx"
import type { TaskService } from "@/ipc/task-service/task-service"
import type { TasksStore } from "@/features/run-status/tasks/tasks-store/tasks-store"
import type { AppEnv } from "@/state/app-deps"
import { errorText } from "@/lib/format"

const TICK_MS = 1000
const POLL_MS = 1000

// What the output dialog needs to decide whether to read the output: which task, and whether it still runs.
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
    private readonly tasks: Pick<TaskService, "taskOutput" | "stopTask">,
    private readonly env: AppEnv,
  ) {}

  start = () => {
    if (this.started) {
      return
    }
    this.started = true
    this.disposers = [
      reaction(() => this.store.anyRunning, this.handleRunningChange, { fireImmediately: true }),
      reaction(this.viewed, this.handleViewedChange, { equals: compareStructural, fireImmediately: true }),
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
    this.store.openTask(id)
  }

  handleClose = () => {
    this.store.closeTask()
  }

  handleStop = async (id: string) => {
    this.store.setError(null)
    try {
      await this.tasks.stopTask(id)
    } catch (error) {
      this.store.setError(errorText(error))
    }
  }

  // Receives the marker at the end of the output box, so a new output can scroll into view.
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
      output = await this.tasks.taskOutput(id)
    } catch (error) {
      if (this.store.viewingId === id) {
        this.store.setError(errorText(error))
      }
      return
    }
    // The dialog may have closed, or moved to another task, while the read was in flight.
    if (this.store.viewingId !== id) {
      return
    }
    this.store.setOutput(output)
    this.env.window.requestAnimationFrame(() => {
      this.bottom?.scrollIntoView({ block: "end" })
    })
  }

  private every = (ms: number, run: () => void): (() => void) => {
    const handle = this.env.window.setInterval(run, ms)
    return () => {
      this.env.window.clearInterval(handle)
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
