import { describe, expect, it } from "vitest"
import type { Question, QuestionRequest } from "@shared/types"
import { QuestionStore } from "@/features/agent/question-store/question-store"

const single: Question = {
  id: "a",
  question: "Which library?",
  multiSelect: false,
  options: [{ label: "React" }, { label: "Vue" }],
}

const multi: Question = {
  id: "b",
  question: "Which tools?",
  multiSelect: true,
  options: [{ label: "Lint" }, { label: "Test" }],
}

const two: QuestionRequest = { id: "req-1", questions: [single, multi] }
const one: QuestionRequest = { id: "req-2", questions: [single] }

describe("QuestionStore", () => {
  describe("setRequest", () => {
    it("can show the first question of a new request", () => {
      const store = new QuestionStore()

      store.setRequest(two)

      expect(store.question?.id).toBe("a")
      expect(store.count).toBe(2)
      expect(store.index).toBe(0)
    })

    it("can keep the answers when the same request is set again", () => {
      const store = new QuestionStore()
      store.setRequest(two)
      store.setDraft("a", { selected: ["React"], other: "" })

      store.setRequest({ ...two })

      expect(store.draftOf("a").selected).toEqual(["React"])
    })

    it("can start over when a different request arrives", () => {
      const store = new QuestionStore()
      store.setRequest(two)
      store.setDraft("a", { selected: ["React"], other: "" })
      store.goTo(1)
      store.setBusy(true)
      store.setError("Offline")
      store.setZoomed(true)
      store.measureFrame("a:media", 200)

      store.setRequest(one)

      expect(store.drafts).toEqual({})
      expect(store.index).toBe(0)
      expect(store.busy).toBe(false)
      expect(store.error).toBeNull()
      expect(store.zoomed).toBe(false)
      expect(store.frameHeights).toEqual({})
      expect(store.open).toBe(true)
    })

    it("can drop the request when it is set to null", () => {
      const store = new QuestionStore()
      store.setRequest(two)

      store.setRequest(null)

      expect(store.question).toBeNull()
      expect(store.count).toBe(0)
    })
  })

  describe("index", () => {
    it("can clamp the page to the questions that exist", () => {
      const store = new QuestionStore()
      store.setRequest(one)
      store.goTo(1)

      expect(store.index).toBe(0)
    })
  })

  describe("goTo", () => {
    it("can move forward and face the new page forward", () => {
      const store = new QuestionStore()
      store.setRequest(two)

      store.goTo(1)

      expect(store.index).toBe(1)
      expect(store.direction).toBe(1)
    })

    it("can move back and face the new page backward", () => {
      const store = new QuestionStore()
      store.setRequest(two)
      store.goTo(1)

      store.goTo(0)

      expect(store.index).toBe(0)
      expect(store.direction).toBe(-1)
    })
  })

  describe("ready", () => {
    it("can be false while a question has no answer", () => {
      const store = new QuestionStore()
      store.setRequest(two)
      store.setDraft("a", { selected: ["React"], other: "" })

      expect(store.ready).toBe(false)
    })

    it("can be true once every question has a pick or a typed reply", () => {
      const store = new QuestionStore()
      store.setRequest(two)
      store.setDraft("a", { selected: ["React"], other: "" })
      store.setDraft("b", { selected: [], other: "Both" })

      expect(store.ready).toBe(true)
    })
  })

  describe("stepReady", () => {
    it("can judge only the question on screen", () => {
      const store = new QuestionStore()
      store.setRequest(two)
      store.setDraft("b", { selected: ["Lint"], other: "" })

      expect(store.stepReady).toBe(false)

      store.setDraft("a", { selected: [], other: "Svelte" })
      expect(store.stepReady).toBe(true)
    })
  })

  describe("hasPrevious and hasNext", () => {
    it("can report a next question but no previous one on the first page", () => {
      const store = new QuestionStore()
      store.setRequest(two)

      expect(store.hasPrevious).toBe(false)
      expect(store.hasNext).toBe(true)
    })

    it("can report a previous question but no next one on the last page", () => {
      const store = new QuestionStore()
      store.setRequest(two)
      store.goTo(1)

      expect(store.hasPrevious).toBe(true)
      expect(store.hasNext).toBe(false)
    })
  })

  describe("draft", () => {
    it("can give the answer to the question on screen", () => {
      const store = new QuestionStore()
      store.setRequest(two)
      store.setDraft("a", { selected: ["Vue"], other: "" })

      expect(store.draft).toEqual({ selected: ["Vue"], other: "" })
    })
  })

  describe("measureFrame", () => {
    it("can store a measured height rounded up to a whole pixel", () => {
      const store = new QuestionStore()

      store.measureFrame("a:media", 200.2)

      expect(store.frameHeights["a:media"]).toBe(201)
    })

    it("can keep a measured height inside the frame range", () => {
      const store = new QuestionStore()

      store.measureFrame("small", 10)
      store.measureFrame("large", 900)

      expect(store.frameHeights).toEqual({ small: 48, large: 480 })
    })

    it("can keep the same record when the height has not changed", () => {
      const store = new QuestionStore()
      store.measureFrame("a:media", 200)
      const before = store.frameHeights

      store.measureFrame("a:media", 199.2)

      expect(store.frameHeights).toBe(before)
    })
  })

  describe("markBroken", () => {
    it("can record an image that failed to load", () => {
      const store = new QuestionStore()

      store.markBroken("missing.png")

      expect(store.brokenImages).toEqual({ "missing.png": true })
    })
  })

  describe("setOpen", () => {
    it("can collapse and expand the card", () => {
      const store = new QuestionStore()

      store.setOpen(false)

      expect(store.open).toBe(false)
    })
  })

  describe("setError", () => {
    it("can hold the error text and clear it", () => {
      const store = new QuestionStore()

      store.setError("Offline")
      expect(store.error).toBe("Offline")

      store.setError(null)
      expect(store.error).toBeNull()
    })
  })
})
