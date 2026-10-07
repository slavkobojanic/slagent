import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest"
import type { TaskInfo } from "@shared/types"
import type { TaskService } from "@/ipc/task-service/task-service"
import { TasksPresenter } from "@/features/run-status/tasks/tasks-presenter/tasks-presenter"
import { TasksStore } from "@/features/run-status/tasks/tasks-store/tasks-store"
import { RunStore } from "@/mirror/run-store"
import { createMockInstance } from "@/test/create-mock-instance"

const START = 1_000_000

function task(overrides: Partial<TaskInfo> = {}): TaskInfo {
  return {
    id: "t1",
    label: "build",
    command: "pnpm build",
    status: "running",
    exitCode: null,
    startedAt: START,
    endedAt: null,
    ...overrides,
  }
}

// Lets the promise chains of a presenter call settle before the test reads the store.
async function settle() {
  for (let turn = 0; turn < 5; turn += 1) {
    await Promise.resolve()
  }
}

// Puts the clock under the test's control. Date.now and the window's intervals read it, and
// advance() moves it on and fires every interval once. The clock never moves on its own.
function controlClock(start: number) {
  let clock = start
  let lastHandle = 0
  const intervals = new Map<number, TimerHandler>()
  vi.spyOn(Date, "now").mockImplementation(() => clock)
  vi.spyOn(window, "setInterval").mockImplementation((handler) => {
    lastHandle += 1
    intervals.set(lastHandle, handler)
    return lastHandle
  })
  vi.spyOn(window, "clearInterval").mockImplementation((handle) => {
    if (handle !== undefined) {
      intervals.delete(handle)
    }
  })
  return {
    advance(ms: number) {
      clock += ms
      for (const handler of [...intervals.values()]) {
        if (typeof handler === "function") {
          handler()
        }
      }
    },
  }
}

describe("TasksPresenter", () => {
  let run: RunStore
  let store: TasksStore
  let tasks: { taskOutput: Mock; stopTask: Mock }
  let presenter: TasksPresenter
  let clock: { advance: (ms: number) => void }

  beforeEach(() => {
    clock = controlClock(START)
    run = new RunStore()
    store = new TasksStore(run)
    tasks = createMockInstance<TaskService>(["taskOutput", "stopTask"])
    presenter = new TasksPresenter(store, tasks, { window })
  })

  afterEach(() => {
    presenter.stop()
    vi.restoreAllMocks()
  })

  describe("handleOpen", () => {
    it("can open the dialog on the task with the given id", () => {
      run.tasks = [task()]

      presenter.handleOpen("t1")

      expect(store.viewingId).toBe("t1")
    })

    it("can leave the dialog closed when the task is not listed", () => {
      run.tasks = [task()]

      presenter.handleOpen("missing")

      expect(store.viewingId).toBeNull()
    })
  })

  describe("handleClose", () => {
    it("can close the dialog", () => {
      run.tasks = [task()]
      presenter.handleOpen("t1")

      presenter.handleClose()

      expect(store.viewingId).toBeNull()
    })
  })

  describe("handleStop", () => {
    it("can ask the task service to stop the task", async () => {
      tasks.stopTask.mockResolvedValue(undefined)

      await presenter.handleStop("t1")

      expect(tasks.stopTask).toHaveBeenCalledWith("t1")
    })

    it("can set the error when stopping fails", async () => {
      tasks.stopTask.mockRejectedValue(new Error("Task is gone"))

      await presenter.handleStop("t1")

      expect(store.error).toBe("Task is gone")
    })

    it("can clear an earlier error before it asks again", async () => {
      store.setError("earlier failure")
      tasks.stopTask.mockResolvedValue(undefined)

      await presenter.handleStop("t1")

      expect(store.error).toBeNull()
    })
  })

  describe("start", () => {
    it("can tick the elapsed time every second while a task runs", () => {
      run.tasks = [task()]

      presenter.start()
      clock.advance(1000)

      expect(store.now).toBe(START + 1000)
    })

    it("can leave the clock alone when no task runs", () => {
      run.tasks = [task({ status: "done", endedAt: START + 1 })]

      presenter.start()
      clock.advance(3000)

      expect(store.now).toBe(START)
    })

    it("can read the output of the open task when the dialog opens", async () => {
      tasks.taskOutput.mockResolvedValue("hello")
      run.tasks = [task({ status: "done", endedAt: START + 1 })]
      presenter.start()

      presenter.handleOpen("t1")
      await settle()

      expect(tasks.taskOutput).toHaveBeenCalledWith("t1")
      expect(store.output).toBe("hello")
    })

    it("can read the output again every second while the open task runs", async () => {
      tasks.taskOutput.mockResolvedValue("running")
      run.tasks = [task()]
      presenter.start()
      presenter.handleOpen("t1")
      await settle()
      expect(tasks.taskOutput).toHaveBeenCalledTimes(1)

      clock.advance(1000)

      expect(tasks.taskOutput).toHaveBeenCalledTimes(2)
    })

    it("can read the output once more when the open task ends, and then stop reading", async () => {
      tasks.taskOutput.mockResolvedValue("running")
      run.tasks = [task()]
      presenter.start()
      presenter.handleOpen("t1")
      await settle()

      run.tasks = [task({ status: "done", endedAt: START + 10 })]
      await settle()
      expect(tasks.taskOutput).toHaveBeenCalledTimes(2)

      clock.advance(5000)

      expect(tasks.taskOutput).toHaveBeenCalledTimes(2)
    })

    it("can leave the output unread while no dialog is open", () => {
      run.tasks = [task()]

      presenter.start()
      clock.advance(3000)

      expect(tasks.taskOutput).not.toHaveBeenCalled()
    })

    it("can ignore an output read that finishes after the dialog moved to another task", async () => {
      let finishFirst: (text: string) => void = () => undefined
      tasks.taskOutput.mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            finishFirst = resolve
          }),
      )
      tasks.taskOutput.mockResolvedValueOnce("second")
      run.tasks = [
        task({ id: "a", status: "done", endedAt: START + 1 }),
        task({ id: "b", status: "done", endedAt: START + 2 }),
      ]
      presenter.start()
      presenter.handleOpen("a")
      presenter.handleOpen("b")
      await settle()

      finishFirst("first")
      await settle()

      expect(store.output).toBe("second")
    })

    it("can set the error when reading the output fails", async () => {
      tasks.taskOutput.mockRejectedValue(new Error("Log is missing"))
      run.tasks = [task({ status: "done", endedAt: START + 1 })]
      presenter.start()

      presenter.handleOpen("t1")
      await settle()

      expect(store.error).toBe("Log is missing")
    })

    it("can scroll the newest output into view once it loads", async () => {
      vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
        callback(0)
        return 0
      })
      const bottom = document.createElement("div")
      bottom.scrollIntoView = vi.fn()
      presenter.attachBottom(bottom)
      tasks.taskOutput.mockResolvedValue("done")
      run.tasks = [task({ status: "done", endedAt: START + 1 })]
      presenter.start()

      presenter.handleOpen("t1")
      await settle()

      expect(bottom.scrollIntoView).toHaveBeenCalledWith({ block: "end" })
    })
  })

  describe("stop", () => {
    it("can dispose the reactions so later changes read nothing", () => {
      tasks.taskOutput.mockResolvedValue("hello")
      run.tasks = [task()]
      presenter.start()
      presenter.stop()

      presenter.handleOpen("t1")

      expect(tasks.taskOutput).not.toHaveBeenCalled()
    })

    it("can stop the elapsed ticker", () => {
      run.tasks = [task()]
      presenter.start()
      presenter.stop()

      clock.advance(3000)

      expect(store.now).toBe(START)
    })
  })
})
