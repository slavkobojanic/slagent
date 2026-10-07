import { describe, expect, it } from "vitest"
import type { TodoItem } from "@shared/types"
import { RunStore } from "@/mirror/run-store/run-store"
import { TodosStore } from "@/features/composer/run-status/todos/todos-store/todos-store"

const done: TodoItem = { text: "plan", status: "completed" }
const current: TodoItem = { text: "write tests", status: "in_progress" }
const pending: TodoItem = { text: "ship", status: "pending" }

function setup(todos: TodoItem[], streaming = false) {
  const run = new RunStore()
  run.todos = todos
  run.streaming = streaming
  return new TodosStore(run)
}

describe("TodosStore", () => {
  describe("panel", () => {
    it("can be null when there are no todos", () => {
      const store = setup([])

      expect(store.panel).toBeNull()
    })

    it("can be null when every todo is done and no run is live", () => {
      const store = setup([done, { text: "ship", status: "completed" }])

      expect(store.panel).toBeNull()
    })

    it("can stay visible when every todo is done while a run is live", () => {
      const store = setup([done, { text: "ship", status: "completed" }], true)

      expect(store.panel?.countText).toBe("2/2")
    })

    it("can count the done todos against the total", () => {
      const store = setup([done, current, pending])

      expect(store.panel?.countText).toBe("1/3")
    })

    it("can show the text of the todo in progress", () => {
      const store = setup([done, current, pending])

      expect(store.panel?.currentText).toBe("write tests")
    })

    it("can show Tasks when no todo is in progress", () => {
      const store = setup([done, pending])

      expect(store.panel?.currentText).toBe("Tasks")
    })

    it("can key each row by its position and its text", () => {
      const store = setup([done, current])

      expect(store.panel?.rows.map((row) => row.key)).toEqual(["0:plan", "1:write tests"])
    })

    it("can label each row by its status", () => {
      const store = setup([done, pending], true)

      expect(store.panel?.rows.map((row) => row.iconLabel)).toEqual(["Done", "To do"])
    })

    it("can spin an in-progress todo while a run is live", () => {
      const store = setup([current], true)

      expect(store.panel?.rows[0]?.spinning).toBe(true)
      expect(store.panel?.rows[0]?.iconLabel).toBe("In progress")
    })

    it("can label an in-progress todo as not confirmed done when no run is live", () => {
      const store = setup([current], false)

      expect(store.panel?.rows[0]?.spinning).toBe(false)
      expect(store.panel?.rows[0]?.iconLabel).toBe("Not confirmed done")
    })
  })
})
