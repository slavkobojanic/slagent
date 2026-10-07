import { afterEach, describe, expect, it, vi } from "vitest"
import type { Question, QuestionRequest } from "@shared/types"
import type { API } from "@/ipc/api"
import { QuestionCardPresenter } from "@/features/transcript/question-card/question-card-presenter/question-card-presenter"
import { QuestionCardStore } from "@/features/transcript/question-card/question-card-store/question-card-store"
import { RunStore, type RunTranscript } from "@/mirror/run-store/run-store"
import { createMockInstance } from "@/test/create-mock-instance"
import { nullLog } from "@/log/log"

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

function transcript(question: QuestionRequest | null): RunTranscript {
  return {
    chatId: "c1",
    messages: [],
    windowStart: 0,
    hasOlder: false,
    hasNewer: false,
    streaming: true,
    notice: null,
    queue: [],
    usage: null,
    todos: [],
    planMode: false,
    tasks: [],
    planProposal: null,
    question,
  }
}

const key = { shift: false, mod: false, alt: false, typing: false }

describe("QuestionCardPresenter", () => {
  const presenters: QuestionCardPresenter[] = []

  afterEach(() => {
    for (const presenter of presenters.splice(0)) {
      presenter.stop()
    }
    vi.useRealTimers()
  })

  function setup(request: QuestionRequest | null = null) {
    const api = createMockInstance<API>(["answerQuestion"])
    api.answerQuestion.mockResolvedValue(undefined)
    const run = new RunStore()
    run.setTranscript(transcript(request))
    const store = new QuestionCardStore()
    const presenter = new QuestionCardPresenter(store, run, api, window, nullLog())
    presenters.push(presenter)
    return { api, run, store, presenter }
  }

  describe("start", () => {
    it("can show the mirrored question as soon as it starts", () => {
      const { store, presenter } = setup(two)

      presenter.start()

      expect(store.requestId).toBe("req-1")
    })

    it("can follow a question the mirror receives later", () => {
      const { run, store, presenter } = setup(null)
      presenter.start()

      run.setTranscript(transcript(two))

      expect(store.requestId).toBe("req-1")
    })

    it("can start over when a different question arrives", () => {
      const { run, store, presenter } = setup(two)
      presenter.start()
      store.setDraft("a", { selected: ["React"], other: "" })

      run.setTranscript(transcript(one))

      expect(store.requestId).toBe("req-2")
      expect(store.drafts).toEqual({})
    })

    it("can keep the answers when the same question is mirrored again", () => {
      const { run, store, presenter } = setup(two)
      presenter.start()
      store.setDraft("a", { selected: ["React"], other: "" })

      run.setTranscript(transcript({ ...two }))

      expect(store.draftOf("a").selected).toEqual(["React"])
    })

    it("can stop following the mirror when it stops", () => {
      const { run, store, presenter } = setup(null)
      presenter.start()
      presenter.stop()

      run.setTranscript(transcript(two))

      expect(store.requestId).toBeNull()
    })
  })

  describe("handlePick", () => {
    it("can select an option and move on to the next question", () => {
      const { store, presenter } = setup(two)
      presenter.start()

      presenter.handlePick("React")

      expect(store.draftOf("a").selected).toEqual(["React"])
      expect(store.index).toBe(1)
    })

    it("can clear the pick when the same option is picked again", () => {
      const { store, presenter } = setup(two)
      presenter.start()
      presenter.handlePick("React")
      presenter.handleBack()

      presenter.handlePick("React")

      expect(store.draftOf("a").selected).toEqual([])
      expect(store.index).toBe(0)
    })

    it("can toggle an option on a multi-select question without moving on", () => {
      const { store, presenter } = setup(two)
      presenter.start()
      presenter.handlePick("React")

      presenter.handlePick("Lint")

      expect(store.draftOf("b").selected).toEqual(["Lint"])
      expect(store.index).toBe(1)
    })

    it("can send after a short delay when the last question is picked", () => {
      vi.useFakeTimers()
      const { api, store, presenter } = setup(one)
      presenter.start()

      presenter.handlePick("Vue")
      expect(api.answerQuestion).not.toHaveBeenCalled()
      vi.advanceTimersByTime(220)

      expect(store.requestId).toBe("req-2")
      expect(api.answerQuestion).toHaveBeenCalledWith("req-2", {
        skipped: false,
        answers: [{ questionId: "a", selected: ["Vue"], other: undefined }],
      })
    })

    it("can keep the delayed send when the same question is mirrored again", () => {
      vi.useFakeTimers()
      const { api, run, presenter } = setup(one)
      presenter.start()
      presenter.handlePick("Vue")

      run.setTranscript(transcript({ ...one }))
      vi.advanceTimersByTime(220)

      expect(api.answerQuestion).toHaveBeenCalledTimes(1)
    })

    it("can cancel the delayed send when the request changes", () => {
      vi.useFakeTimers()
      const { api, run, presenter } = setup(one)
      presenter.start()
      presenter.handlePick("Vue")

      run.setTranscript(transcript(two))
      vi.advanceTimersByTime(220)

      expect(api.answerQuestion).not.toHaveBeenCalled()
    })
  })

  describe("handleOtherChange", () => {
    it("can replace a pick with a typed reply on a single-choice question", () => {
      const { store, presenter } = setup(two)
      presenter.start()
      presenter.handlePick("React")
      presenter.handleBack()

      presenter.handleOtherChange("Svelte")

      expect(store.draftOf("a")).toEqual({ selected: [], other: "Svelte" })
    })

    it("can keep the picks when a reply is typed on a multi-select question", () => {
      const { store, presenter } = setup(two)
      presenter.start()
      presenter.handlePick("React")
      presenter.handlePick("Lint")

      presenter.handleOtherChange("Prettier")

      expect(store.draftOf("b")).toEqual({ selected: ["Lint"], other: "Prettier" })
    })
  })

  describe("handleNext", () => {
    it("can move on when the question on screen is answered", () => {
      const { store, presenter } = setup(two)
      presenter.start()
      store.setDraft("a", { selected: ["React"], other: "" })

      presenter.handleNext()

      expect(store.index).toBe(1)
    })

    it("can stay on the question while it is unanswered", () => {
      const { store, presenter } = setup(two)
      presenter.start()

      presenter.handleNext()

      expect(store.index).toBe(0)
    })
  })

  describe("handleBack", () => {
    it("can go back one question", () => {
      const { store, presenter } = setup(two)
      presenter.start()
      store.goTo(1)

      presenter.handleBack()

      expect(store.index).toBe(0)
    })
  })

  describe("handleSend", () => {
    it("can send every answer when every question is answered", () => {
      const { api, store, presenter } = setup(two)
      presenter.start()
      store.setDraft("a", { selected: ["React"], other: "" })
      store.setDraft("b", { selected: ["Lint"], other: "  extra  " })

      presenter.handleSend()

      expect(api.answerQuestion).toHaveBeenCalledWith("req-1", {
        skipped: false,
        answers: [
          { questionId: "a", selected: ["React"], other: undefined },
          { questionId: "b", selected: ["Lint"], other: "extra" },
        ],
      })
    })

    it("can leave the card unsent while a question is unanswered", () => {
      const { api, store, presenter } = setup(two)
      presenter.start()
      store.setDraft("a", { selected: ["React"], other: "" })

      presenter.handleSend()

      expect(api.answerQuestion).not.toHaveBeenCalled()
    })
  })

  describe("handleSkip", () => {
    it("can skip the request and send a skipped reply", () => {
      const { api, presenter } = setup(two)
      presenter.start()

      presenter.handleSkip()

      expect(api.answerQuestion).toHaveBeenCalledWith("req-1", { skipped: true })
    })
  })

  describe("send failures", () => {
    it("can record the error and stop being busy when the reply fails", async () => {
      const { api, store, presenter } = setup(two)
      presenter.start()
      api.answerQuestion.mockRejectedValue(new Error("Offline"))

      presenter.handleSkip()

      await vi.waitFor(() => expect(store.error).toBe("Offline"))
      expect(store.busy).toBe(false)
    })

    it("can ignore a second reply while one is in flight", () => {
      const { api, presenter } = setup(two)
      presenter.start()
      api.answerQuestion.mockReturnValue(new Promise<void>(() => {}))

      presenter.handleSkip()
      presenter.handleSkip()

      expect(api.answerQuestion).toHaveBeenCalledTimes(1)
    })
  })

  describe("handleKey", () => {
    it("can pick an option with its number key", () => {
      const { store, presenter } = setup(two)
      presenter.start()

      const handled = presenter.handleKey({ ...key, key: "1" })

      expect(handled).toBe(true)
      expect(store.draftOf("a").selected).toEqual(["React"])
    })

    it("can move forward with the right arrow key", () => {
      const { store, presenter } = setup(two)
      presenter.start()

      const handled = presenter.handleKey({ ...key, key: "ArrowRight" })

      expect(handled).toBe(true)
      expect(store.index).toBe(1)
    })

    it("can move back with the left arrow key", () => {
      const { store, presenter } = setup(two)
      presenter.start()
      store.goTo(1)

      presenter.handleKey({ ...key, key: "ArrowLeft" })

      expect(store.index).toBe(0)
    })

    it("can collapse the card with Escape", () => {
      const { store, presenter } = setup(two)
      presenter.start()

      const handled = presenter.handleKey({ ...key, key: "Escape" })

      expect(handled).toBe(true)
      expect(store.open).toBe(false)
    })

    it("can advance with Enter in the reply row", () => {
      const { store, presenter } = setup(two)
      presenter.start()
      store.setDraft("a", { selected: [], other: "Svelte" })

      const handled = presenter.handleKey({ ...key, key: "Enter", typing: true })

      expect(handled).toBe(true)
      expect(store.index).toBe(1)
    })

    it("can leave the typing keys to the reply row when they are not Enter", () => {
      const { store, presenter } = setup(two)
      presenter.start()

      const handled = presenter.handleKey({ ...key, key: "1", typing: true })

      expect(handled).toBe(false)
      expect(store.draftOf("a").selected).toEqual([])
    })

    it("can send with Command+Enter on the last question", () => {
      const { api, store, presenter } = setup(one)
      presenter.start()
      store.setDraft("a", { selected: ["Vue"], other: "" })

      presenter.handleKey({ ...key, key: "Enter", mod: true })

      expect(api.answerQuestion).toHaveBeenCalledWith("req-2", {
        skipped: false,
        answers: [{ questionId: "a", selected: ["Vue"], other: undefined }],
      })
    })

    it("can ignore number keys pressed with Alt", () => {
      const { store, presenter } = setup(two)
      presenter.start()

      const handled = presenter.handleKey({ ...key, key: "1", alt: true })

      expect(handled).toBe(false)
      expect(store.draftOf("a").selected).toEqual([])
    })
  })

  describe("attachQuestion", () => {
    it("can focus a question as it mounts", () => {
      const { presenter } = setup(two)
      const element = document.createElement("div")
      element.tabIndex = -1
      document.body.append(element)

      presenter.attachQuestion(element)

      expect(document.activeElement).toBe(element)
      element.remove()
    })

    it("can focus the question again when the card opens or closes", () => {
      const { presenter } = setup(two)
      presenter.start()
      const element = document.createElement("div")
      document.body.append(element)
      const focus = vi.spyOn(element, "focus")
      presenter.attachQuestion(element)

      presenter.handleToggleOpen()

      expect(focus).toHaveBeenLastCalledWith({ preventScroll: true })
      element.remove()
    })
  })

  describe("frame reports", () => {
    it("can record the height a frame reports under its key", () => {
      const { store, presenter } = setup(two)
      presenter.start()

      window.dispatchEvent(new MessageEvent("message", { data: { slagentFrameKey: "a:media", slagentFrameHeight: 200 }, source: window }))

      expect(store.frameHeights).toEqual({ "a:media": 200 })
    })

    it("can ignore a message that did not come from a frame", () => {
      const { store, presenter } = setup(two)
      presenter.start()

      window.dispatchEvent(new MessageEvent("message", { data: { slagentFrameKey: "a:media", slagentFrameHeight: 200 }, source: null }))

      expect(store.frameHeights).toEqual({})
    })

    it("can ignore a message that is not a frame report", () => {
      const { store, presenter } = setup(two)
      presenter.start()

      window.dispatchEvent(new MessageEvent("message", { data: { hello: 1 }, source: window }))

      expect(store.frameHeights).toEqual({})
    })
  })
})
