import { describe, expect, it } from "vitest"
import type { QueuedMessage } from "@shared/types"
import { RunStore } from "@/mirror/run-store/run-store"
import { QueueStore } from "@/features/composer/run-status/queue/queue-store/queue-store"

function setup(queue: QueuedMessage[]) {
  const run = new RunStore()
  run.queue = queue
  return new QueueStore(run)
}

describe("QueueStore", () => {
  describe("rows", () => {
    it("can offer to switch a follow-up message to steer", () => {
      const store = setup([{ id: "q1", text: "next", mode: "follow-up", detail: "" }])

      expect(store.rows[0]).toEqual({ id: "q1", content: "next", switchLabel: "Steer", nextMode: "steer" })
    })

    it("can offer to switch a steer message back to follow-up", () => {
      const store = setup([{ id: "q1", text: "next", mode: "steer", detail: "" }])

      expect(store.rows[0]).toEqual({ id: "q1", content: "next", switchLabel: "Follow-up", nextMode: "follow-up" })
    })

    it("can use the detail as the content when the message has no text", () => {
      const store = setup([{ id: "q1", text: "", mode: "follow-up", detail: "Read the file" }])

      expect(store.rows[0]?.content).toBe("Read the file")
    })
  })

  describe("setError", () => {
    it("can set the error and clear it again", () => {
      const store = setup([])

      store.setError("Queue is busy")
      expect(store.error).toBe("Queue is busy")

      store.setError(null)
      expect(store.error).toBeNull()
    })
  })
})
