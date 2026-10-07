import { describe, expect, it } from "vitest"
import type { TaskInfo } from "@shared/types"
import { RunStore } from "@/mirror/run-store"
import { TasksStore } from "@/features/run-status/tasks/tasks-store/tasks-store"

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

function setup(tasks: TaskInfo[]) {
  const run = new RunStore()
  run.tasks = tasks
  const store = new TasksStore(run)
  return { run, store }
}

describe("TasksStore", () => {
  describe("anyRunning", () => {
    it("can be true while a task runs", () => {
      const { store } = setup([task()])

      expect(store.anyRunning).toBe(true)
    })

    it("can be false once every task has ended", () => {
      const { store } = setup([task({ status: "done", endedAt: START + 5 })])

      expect(store.anyRunning).toBe(false)
    })
  })

  describe("chips", () => {
    it("can list only the running tasks", () => {
      const { store } = setup([
        task({ id: "a" }),
        task({ id: "b", status: "failed", exitCode: 1, endedAt: START + 5 }),
      ])

      expect(store.chips.map((chip) => chip.id)).toEqual(["a"])
    })

    it("can show the elapsed time of a running task in seconds", () => {
      const { store } = setup([task()])
      store.setNow(START + 42_000)

      expect(store.chips[0]?.statusText).toBe("42s")
    })

    it("can show the elapsed time in minutes once a minute has passed", () => {
      const { store } = setup([task()])
      store.setNow(START + 125_000)

      expect(store.chips[0]?.statusText).toBe("2m")
    })

    it("can show the elapsed time in hours and minutes once an hour has passed", () => {
      const { store } = setup([task()])
      store.setNow(START + 3_900_000)

      expect(store.chips[0]?.statusText).toBe("1h 5m")
    })
  })

  describe("current", () => {
    it("can be null when no task is open", () => {
      const { store } = setup([task()])

      expect(store.current).toBeNull()
    })

    it("can return the viewed task with the status it has now", () => {
      const { run, store } = setup([task()])
      store.openTask("t1")
      run.tasks = [task({ status: "done", endedAt: START + 9 })]

      expect(store.current?.status).toBe("done")
    })

    it("can fall back to the snapshot once the run no longer lists the task", () => {
      const { run, store } = setup([task()])
      store.openTask("t1")
      run.tasks = []

      expect(store.current?.label).toBe("build")
    })

    it("can say how a failed task exited", () => {
      const { store } = setup([task({ status: "failed", exitCode: 2, endedAt: START + 9 })])
      store.openTask("t1")

      expect(store.current?.statusText).toBe("exit 2")
    })

    it("can say done for a task that finished cleanly", () => {
      const { store } = setup([task({ status: "done", exitCode: 0, endedAt: START + 9 })])
      store.openTask("t1")

      expect(store.current?.statusText).toBe("done")
    })

    it("can say stopped for a task that was stopped", () => {
      const { store } = setup([task({ status: "stopped", endedAt: START + 9 })])
      store.openTask("t1")

      expect(store.current?.statusText).toBe("stopped")
    })
  })

  describe("openTask", () => {
    it("can open the task with the given id", () => {
      const { store } = setup([task()])

      store.openTask("t1")

      expect(store.viewingId).toBe("t1")
    })

    it("can leave the dialog closed when no task has that id", () => {
      const { store } = setup([task()])

      store.openTask("missing")

      expect(store.viewingId).toBeNull()
    })
  })

  describe("closeTask", () => {
    it("can clear the viewed task", () => {
      const { store } = setup([task()])
      store.openTask("t1")

      store.closeTask()

      expect(store.current).toBeNull()
    })
  })

  describe("outputText", () => {
    it("can show a placeholder while the output is empty", () => {
      const { store } = setup([task()])

      expect(store.outputText).toBe("No output yet.")
    })

    it("can show the output once it has been read", () => {
      const { store } = setup([task()])

      store.setOutput("line 1\nline 2")

      expect(store.outputText).toBe("line 1\nline 2")
    })
  })

  describe("setError", () => {
    it("can set the error and clear it again", () => {
      const { store } = setup([task()])

      store.setError("stop failed")
      expect(store.error).toBe("stop failed")

      store.setError(null)
      expect(store.error).toBeNull()
    })
  })
})
