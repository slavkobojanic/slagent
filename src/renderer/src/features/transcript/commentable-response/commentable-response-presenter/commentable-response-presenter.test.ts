import { runInAction } from "mobx"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { ReplyComment } from "@shared/types"
import type { CommentMark, CommentUnit } from "@/features/transcript/commentable-response/comment-model"
import { CommentableResponsePresenter } from "@/features/transcript/commentable-response/commentable-response-presenter/commentable-response-presenter"
import { CommentableResponseStore } from "@/features/transcript/commentable-response/commentable-response-store/commentable-response-store"
import { RunStore } from "@/mirror/run-store/run-store"
import { ReviewPresenter } from "@/state/review/review-presenter/review-presenter"
import { ReviewStore } from "@/state/review/review-store/review-store"

const block = "Use a map."
const unit: CommentUnit = { key: "m1\nUse a map.", messageId: "m1", block, enabled: true }
const excerpt: ReplyComment = { id: "e1", messageId: "m1", block, quote: "a map", at: 4, text: "why" }

// The rect every range reports. jsdom has no layout, so ranges are given one.
const rect = { top: 30, right: 90, bottom: 46, left: 50, width: 40, height: 16, x: 50, y: 30, toJSON: () => ({}) }

// The CSS Custom Highlight API, which jsdom does not have. Each highlight keeps its ranges.
class FakeHighlight {
  readonly ranges: AbstractRange[]
  constructor(...ranges: AbstractRange[]) {
    this.ranges = ranges
  }
}

function setup() {
  const store = new CommentableResponseStore()
  const reviewStore = new ReviewStore()
  const review = new ReviewPresenter(reviewStore)
  const run = new RunStore()
  const presenter = new CommentableResponsePresenter(store, reviewStore, review, run, window)
  return { store, reviewStore, review, run, presenter }
}

// Mounts a unit the way the view does: a wrapper around its text, with the wrapper's ref
// given the marks to place. Returns the wrapper, the text inside it, and the ref that
// attached it, which is the ref that must be called to unmount it.
function mount(presenter: CommentableResponsePresenter, marks: CommentMark[] = [], html = "<p>Use a map.</p>") {
  const wrapper = document.createElement("div")
  const body = document.createElement("div")
  body.setAttribute("data-comment-body", "")
  body.innerHTML = html
  wrapper.appendChild(body)
  document.body.appendChild(wrapper)
  const ref = presenter.wrapperRef(marks)
  ref(wrapper)
  return { wrapper, body, ref }
}

function select(node: Node, start: number, end: number) {
  const range = document.createRange()
  range.setStart(node, start)
  range.setEnd(node, end)
  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)
}

const nextTick = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

describe("CommentableResponsePresenter", () => {
  beforeEach(() => {
    Object.defineProperty(Range.prototype, "getBoundingClientRect", { configurable: true, value: () => rect })
    Object.defineProperty(Range.prototype, "getClientRects", { configurable: true, value: () => [rect] })
  })

  afterEach(() => {
    Reflect.deleteProperty(Range.prototype, "getBoundingClientRect")
    Reflect.deleteProperty(Range.prototype, "getClientRects")
    Reflect.deleteProperty(window, "CSS")
    Reflect.deleteProperty(window, "Highlight")
    window.getSelection()?.removeAllRanges()
    document.body.innerHTML = ""
    vi.useRealTimers()
  })

  describe("handleGutter", () => {
    it("can open a draft quoting the whole block", () => {
      const { store, presenter } = setup()

      presenter.handleGutter(unit)

      expect(store.draftOf(unit.key)).toEqual({ quote: block })
    })
  })

  describe("handleSave", () => {
    it("can add a reply on the block quoting the selected words at their offset", () => {
      const { store, reviewStore, presenter } = setup()
      store.setDraft(unit.key, { quote: "a map", at: 4 })

      presenter.handleSave(unit, "why")

      expect(reviewStore.replyComments).toEqual([
        { id: expect.any(String), messageId: "m1", block, quote: "a map", at: 4, text: "why" },
      ])
      expect(store.draftOf(unit.key)).toBeNull()
    })

    it("can add a whole-block reply without an offset", () => {
      const { store, reviewStore, presenter } = setup()
      store.setDraft(unit.key, { quote: block })

      presenter.handleSave(unit, "all of it")

      expect(reviewStore.replyComments).toHaveLength(1)
      expect(reviewStore.replyComments[0]).not.toHaveProperty("at")
      expect(reviewStore.replyComments[0]?.quote).toBe(block)
    })

    it("can change the words of the comment being edited", () => {
      const { store, reviewStore, review, presenter } = setup()
      review.addReplyComment(excerpt)
      store.setDraft(unit.key, { id: "e1", quote: "a map", at: 4 })

      presenter.handleSave(unit, "use a set")

      expect(reviewStore.replyComments).toEqual([{ ...excerpt, text: "use a set" }])
      expect(store.draftOf(unit.key)).toBeNull()
    })

    it("can leave the replies alone when no draft is open", () => {
      const { reviewStore, presenter } = setup()

      presenter.handleSave(unit, "why")

      expect(reviewStore.replyComments).toEqual([])
    })
  })

  describe("handleCancel", () => {
    it("can close the draft without saving it", () => {
      const { store, reviewStore, presenter } = setup()
      store.setDraft(unit.key, { quote: block })

      presenter.handleCancel(unit)

      expect(store.draftOf(unit.key)).toBeNull()
      expect(reviewStore.replyComments).toEqual([])
    })
  })

  describe("handleEdit", () => {
    it("can open the draft on a comment with its quote and offset, and close its card", () => {
      const { store, presenter } = setup()
      store.setCard(unit.key, { commentId: "e1", top: 5, left: 9 })
      store.setCardOpen(unit.key, true)

      presenter.handleEdit(unit, excerpt)

      expect(store.draftOf(unit.key)).toEqual({ id: "e1", quote: "a map", at: 4 })
      expect(store.cardOf(unit.key)).toBeNull()
      expect(store.isCardOpen(unit.key)).toBe(false)
    })
  })

  describe("handleDelete", () => {
    it("can remove the comment and close its card", () => {
      const { store, reviewStore, review, presenter } = setup()
      review.addReplyComment(excerpt)
      store.setCard(unit.key, { commentId: "e1", top: 5, left: 9 })

      presenter.handleDelete(unit, "e1")

      expect(reviewStore.replyComments).toEqual([])
      expect(store.cardOf(unit.key)).toBeNull()
    })
  })

  describe("handlePending", () => {
    it("can turn the pending selection into a draft and clear the selection", () => {
      const { store, presenter } = setup()
      const { body } = mount(presenter)
      select(body.querySelector("p")?.firstChild as Node, 4, 9)
      store.setPending(unit.key, { quote: "a map", at: 4, top: 10, left: 20 })

      presenter.handlePending(unit)

      expect(store.draftOf(unit.key)).toEqual({ quote: "a map", at: 4 })
      expect(store.pendingOf(unit.key)).toBeNull()
      expect(window.getSelection()?.rangeCount).toBe(0)
    })
  })

  describe("handleMouseUp", () => {
    it("can offer a comment on the words selected in the block", async () => {
      const { store, presenter } = setup()
      const { wrapper, body } = mount(presenter)
      select(body.querySelector("p")?.firstChild as Node, 4, 9)

      presenter.handleMouseUp(unit, wrapper)
      await nextTick()

      expect(store.pendingOf(unit.key)).toEqual({ quote: "a map", at: 4, top: 30, left: 70 })
    })

    it("can leave the selection alone when it is outside the block", async () => {
      const { store, presenter } = setup()
      const { wrapper } = mount(presenter)
      const outside = document.createElement("p")
      outside.textContent = "Elsewhere."
      document.body.appendChild(outside)
      select(outside.firstChild as Node, 0, 4)

      presenter.handleMouseUp(unit, wrapper)
      await nextTick()

      expect(store.pendingOf(unit.key)).toBeNull()
    })

    it("can ignore the mouse up on a block that cannot take comments", async () => {
      const { store, presenter } = setup()
      const { wrapper, body } = mount(presenter)
      select(body.querySelector("p")?.firstChild as Node, 4, 9)

      presenter.handleMouseUp({ ...unit, enabled: false }, wrapper)
      await nextTick()

      expect(store.pendingOf(unit.key)).toBeNull()
    })
  })

  describe("handleMouseMove", () => {
    it("can open the card of a commented excerpt under the pointer", () => {
      const { store, review, presenter } = setup()
      review.addReplyComment(excerpt)
      const { wrapper } = mount(presenter, [{ key: "e1", quote: "a map", at: 4 }])

      presenter.handleMouseMove(unit, wrapper, 60, 35)

      expect(store.cardOf(unit.key)).toEqual({ commentId: "e1", top: 30, left: 70 })
    })

    it("can close the card after the pointer leaves the excerpt", () => {
      vi.useFakeTimers()
      const { store, review, presenter } = setup()
      review.addReplyComment(excerpt)
      const { wrapper } = mount(presenter, [{ key: "e1", quote: "a map", at: 4 }])
      presenter.handleMouseMove(unit, wrapper, 60, 35)

      presenter.handleMouseMove(unit, wrapper, 500, 500)
      vi.advanceTimersByTime(150)

      expect(store.cardOf(unit.key)).toBeNull()
    })

    it("can keep the card open when the pointer returns to it before it closes", () => {
      vi.useFakeTimers()
      const { store, review, presenter } = setup()
      review.addReplyComment(excerpt)
      const { wrapper } = mount(presenter, [{ key: "e1", quote: "a map", at: 4 }])
      presenter.handleMouseMove(unit, wrapper, 60, 35)
      presenter.handleMouseLeave(unit)

      presenter.handleCardEnter(unit)
      vi.advanceTimersByTime(150)

      expect(store.cardOf(unit.key)).toEqual({ commentId: "e1", top: 30, left: 70 })
    })
  })

  describe("highlights", () => {
    function paintedRanges(): AbstractRange[] {
      const registry = (window as unknown as { CSS: { highlights: Map<string, FakeHighlight> } }).CSS.highlights
      return registry.get("reply-comment")?.ranges ?? []
    }

    function installHighlightApi() {
      const registry = new Map<string, FakeHighlight>()
      Object.assign(window, { CSS: { highlights: registry }, Highlight: FakeHighlight })
    }

    it("can paint the commented words as the reply-comment highlight", () => {
      installHighlightApi()
      const { presenter } = setup()

      mount(presenter, [{ key: "e1", quote: "a map", at: 4 }])

      expect(paintedRanges().map((range) => range.toString())).toEqual(["a map"])
    })

    it("can paint the whole block when the block carries a whole-block comment", () => {
      installHighlightApi()
      const { presenter } = setup()

      mount(presenter, [{ key: "whole", quote: "" }])

      expect(paintedRanges().map((range) => range.toString())).toEqual(["Use a map."])
    })

    it("can paint each of two units that render the same markdown", () => {
      installHighlightApi()
      const { presenter } = setup()

      mount(presenter, [{ key: "whole", quote: "" }])
      mount(presenter, [{ key: "whole", quote: "" }])

      expect(paintedRanges()).toHaveLength(2)
    })

    it("can repaint the words when the rendered text changes underneath them", async () => {
      installHighlightApi()
      const { presenter } = setup()
      const { body } = mount(presenter, [{ key: "e1", quote: "a map", at: 4 }], "<p>Use a set.</p>")
      expect(paintedRanges()).toEqual([])

      body.querySelector("p")?.replaceChildren("Use a map.")
      await nextTick()

      expect(paintedRanges().map((range) => range.toString())).toEqual(["a map"])
    })

    it("can drop the unit's highlights when its wrapper unmounts", () => {
      installHighlightApi()
      const { presenter } = setup()
      const { ref } = mount(presenter, [{ key: "e1", quote: "a map", at: 4 }])
      expect(paintedRanges()).toHaveLength(1)

      ref(null)

      expect(paintedRanges()).toEqual([])
    })

    it("can place the highlights again when the marks change on a later render", () => {
      installHighlightApi()
      const { presenter } = setup()
      const { wrapper, ref } = mount(presenter, [{ key: "e1", quote: "a map", at: 4 }])
      expect(paintedRanges()).toHaveLength(1)

      // React calls the previous render's ref with null, then the new render's ref with the element.
      ref(null)
      presenter.wrapperRef([{ key: "whole", quote: "" }])(wrapper)

      expect(paintedRanges().map((range) => range.toString())).toEqual(["Use a map."])
    })

    it("can leave the page unpainted where the highlight API is missing", () => {
      const { presenter } = setup()

      expect(() => mount(presenter, [{ key: "e1", quote: "a map", at: 4 }])).not.toThrow()
    })
  })

  describe("selection change", () => {
    it("can clear the pending selection when the selection collapses", () => {
      const { store, presenter } = setup()
      presenter.start()
      store.setPending(unit.key, { quote: "a map", at: 4, top: 10, left: 20 })

      window.getSelection()?.removeAllRanges()
      document.dispatchEvent(new Event("selectionchange"))
      presenter.stop()

      expect(store.pendingOf(unit.key)).toBeNull()
    })

    it("can stop clearing the pending selection once stopped", () => {
      const { store, presenter } = setup()
      presenter.start()
      presenter.stop()
      store.setPending(unit.key, { quote: "a map", at: 4, top: 10, left: 20 })

      window.getSelection()?.removeAllRanges()
      document.dispatchEvent(new Event("selectionchange"))

      expect(store.pendingOf(unit.key)).not.toBeNull()
    })
  })

  describe("reset", () => {
    it("can clear the drafts and cards when the open chat's transcript changes", () => {
      const { store, run, presenter } = setup()
      presenter.start()
      store.setDraft(unit.key, { quote: block })
      store.setCardOpen(unit.key, true)

      runInAction(() => {
        run.transcriptChatId = "chat-2"
      })
      presenter.stop()

      expect(store.draftOf(unit.key)).toBeNull()
      expect(store.isCardOpen(unit.key)).toBe(false)
    })
  })
})
