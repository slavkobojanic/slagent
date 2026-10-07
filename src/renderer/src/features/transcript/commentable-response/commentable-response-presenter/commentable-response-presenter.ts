import { reaction } from "mobx"
import type { ReplyComment } from "@shared/types"
import type { RunStore } from "@/mirror/run-store/run-store"
import type { ReviewPresenter } from "@/state/review/review-presenter/review-presenter"
import type { ReviewStore } from "@/state/review/review-store/review-store"
import type { CommentMark, CommentUnit } from "@/features/transcript/commentable-response/comment-model"
import { findRange } from "@/features/transcript/commentable-response/comment-range"
import { normalize } from "@/features/transcript/commentable-response/comment-text"
import type { CommentableResponseStore } from "@/features/transcript/commentable-response/commentable-response-store/commentable-response-store"

// How long a hover card stays open after the pointer leaves it, so the pointer can reach it.
const CLOSE_DELAY_MS = 150

// The part of a unit's wrapper that holds its text. Highlights are measured inside it.
const TEXT_SELECTOR = "[data-comment-body]"

// Window leaves out the constructors and the CSS Highlight API that are declared as globals.
// These are read from the injected window only.
type DomWindow = Window & typeof globalThis

// One rendered unit: the text its highlights are measured in, the marks to place, the ranges found
// for them, and the observer that places them again when the text changes.
type Instance = {
  root: HTMLElement
  marks: CommentMark[]
  ranges: Map<string, Range>
  observer: MutationObserver | null
}

export class CommentableResponsePresenter {
  // Keyed by wrapper element, so two units that render the same markdown each keep their own text.
  private readonly instances = new Map<HTMLElement, Instance>()
  private readonly timers = new Map<string, number>()
  private readonly disposers: Array<() => void> = []
  private started = false

  constructor(
    private readonly store: CommentableResponseStore,
    private readonly reviewStore: ReviewStore,
    private readonly reviewPresenter: ReviewPresenter,
    private readonly runStore: RunStore,
    private readonly window: Window,
  ) {}

  start = () => {
    if (this.started) {
      return
    }
    this.started = true
    this.window.document.addEventListener("selectionchange", this.handleSelectionChange)
    this.disposers.push(reaction(() => this.runStore.transcriptChatId, this.reset))
  }

  stop = () => {
    if (!this.started) {
      return
    }
    this.started = false
    this.window.document.removeEventListener("selectionchange", this.handleSelectionChange)
    for (const dispose of this.disposers.splice(0)) {
      dispose()
    }
    for (const wrapper of [...this.instances.keys()]) {
      this.detach(wrapper)
    }
    this.clearTimers()
  }

  // The open chat changed, so the drafts, popovers, and cards belong to a transcript that is gone.
  reset = () => {
    this.store.reset()
    this.clearTimers()
  }

  // The ref of a unit's wrapper, made for each render with the marks that render calls for. React
  // calls the previous render's ref with null before this one, so a ref detaches the wrapper it
  // attached and the highlights are placed again whenever the marks change.
  wrapperRef = (marks: CommentMark[]) => {
    let attached: HTMLElement | null = null
    return (wrapper: HTMLElement | null) => {
      if (attached !== null) {
        this.detach(attached)
        attached = null
      }
      if (wrapper === null) {
        return
      }
      attached = wrapper
      this.attach(wrapper, marks)
    }
  }

  handleMouseUp = (unit: CommentUnit, wrapper: HTMLElement) => {
    if (!unit.enabled) {
      return
    }
    // The selection settles after mouseup.
    this.window.setTimeout(() => this.capturePending(unit.key, wrapper), 0)
  }

  handleMouseMove = (unit: CommentUnit, wrapper: HTMLElement, x: number, y: number) => {
    const excerpts = this.reviewStore.repliesFor(unit.messageId, unit.block).filter((reply) => reply.quote !== unit.block)
    if (excerpts.length === 0) {
      return
    }
    const found = this.instances.get(wrapper)?.ranges
    for (const reply of excerpts) {
      const range = found?.get(reply.id)
      if (range === undefined) {
        continue
      }
      for (const rect of range.getClientRects()) {
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
          continue
        }
        this.clearTimer(unit.key)
        if (this.store.cardOf(unit.key)?.commentId !== reply.id) {
          this.store.setCard(unit.key, { commentId: reply.id, ...this.offset(wrapper, range.getBoundingClientRect()) })
        }
        return
      }
    }
    this.scheduleClose(unit.key)
  }

  handleMouseLeave = (unit: CommentUnit) => {
    this.scheduleClose(unit.key)
  }

  handleCardEnter = (unit: CommentUnit) => {
    this.clearTimer(unit.key)
  }

  handleCardLeave = (unit: CommentUnit) => {
    this.scheduleClose(unit.key)
  }

  handleCardOpenChange = (unit: CommentUnit, open: boolean) => {
    this.store.setCardOpen(unit.key, open)
  }

  handleGutter = (unit: CommentUnit) => {
    this.store.setDraft(unit.key, { quote: unit.block })
  }

  handlePending = (unit: CommentUnit) => {
    const pending = this.store.pendingOf(unit.key)
    if (pending === null) {
      return
    }
    this.store.setDraft(unit.key, { quote: pending.quote, at: pending.at })
    this.store.setPending(unit.key, null)
    this.window.getSelection()?.removeAllRanges()
  }

  handleEdit = (unit: CommentUnit, comment: ReplyComment) => {
    this.closeCard(unit.key)
    this.store.setDraft(unit.key, { id: comment.id, quote: comment.quote, at: comment.at })
  }

  handleDelete = (unit: CommentUnit, id: string) => {
    this.closeCard(unit.key)
    this.reviewPresenter.removeReplyComment(id)
  }

  handleSave = (unit: CommentUnit, text: string) => {
    const draft = this.store.draftOf(unit.key)
    if (draft === null) {
      return
    }
    if (draft.id) {
      this.reviewPresenter.editReplyComment(draft.id, text)
    } else {
      const reply: ReplyComment = {
        id: this.window.crypto.randomUUID(),
        messageId: unit.messageId,
        block: unit.block,
        quote: draft.quote,
        text,
      }
      if (draft.at !== undefined) {
        reply.at = draft.at
      }
      this.reviewPresenter.addReplyComment(reply)
    }
    this.store.setDraft(unit.key, null)
  }

  handleCancel = (unit: CommentUnit) => {
    this.store.setDraft(unit.key, null)
  }

  private capturePending = (key: string, wrapper: HTMLElement) => {
    const root = this.instances.get(wrapper)?.root
    const selection = this.window.getSelection()
    if (root === undefined || selection === null || selection.isCollapsed || selection.rangeCount === 0) {
      return
    }
    if (!root.contains(selection.anchorNode) || !root.contains(selection.focusNode)) {
      return
    }
    const range = selection.getRangeAt(0)
    const quote = normalize(range.toString())
    if (quote === "") {
      return
    }
    const before = this.window.document.createRange()
    before.setStart(root, 0)
    before.setEnd(range.startContainer, range.startOffset)
    let at = normalize(before.toString()).length
    if (at > 0) {
      at += 1
    }
    this.store.setPending(key, { quote, at, ...this.offset(wrapper, range.getBoundingClientRect()) })
  }

  private handleSelectionChange = () => {
    const selection = this.window.getSelection()
    if (selection !== null && !selection.isCollapsed) {
      return
    }
    this.store.clearPending()
  }

  // Where a rect sits relative to the unit's wrapper, which the popovers are placed in.
  private offset = (wrapper: HTMLElement, rect: DOMRect) => {
    const box = wrapper.getBoundingClientRect()
    return { top: rect.top - box.top, left: rect.left - box.left + rect.width / 2 }
  }

  private attach = (wrapper: HTMLElement, marks: CommentMark[]) => {
    this.detach(wrapper)
    const root = wrapper.querySelector<HTMLElement>(TEXT_SELECTOR)
    if (root === null) {
      return
    }
    const instance: Instance = { root, marks, ranges: new Map(), observer: null }
    if (marks.length > 0) {
      // The text can change under the marks while it streams or reflows, so the marks are placed again.
      instance.observer = new (this.window as DomWindow).MutationObserver(() => this.measure(wrapper))
      instance.observer.observe(root, { childList: true, subtree: true, characterData: true })
    }
    this.instances.set(wrapper, instance)
    this.measure(wrapper)
  }

  private detach = (wrapper: HTMLElement) => {
    const instance = this.instances.get(wrapper)
    if (instance === undefined) {
      return
    }
    instance.observer?.disconnect()
    this.instances.delete(wrapper)
    if (instance.ranges.size > 0) {
      this.paint()
    }
  }

  // Rebuilds one unit's ranges from its rendered text, then repaints every commented range.
  private measure = (wrapper: HTMLElement) => {
    const instance = this.instances.get(wrapper)
    if (instance === undefined) {
      return
    }
    const found = new Map<string, Range>()
    for (const mark of instance.marks) {
      const range = mark.quote === "" ? this.wholeRange(instance.root) : findRange(instance.root, mark.quote, mark.at)
      if (range !== null) {
        found.set(mark.key, range)
      }
    }
    const hadRanges = instance.ranges.size > 0
    instance.ranges = found
    if (found.size > 0 || hadRanges) {
      this.paint()
    }
  }

  private wholeRange = (root: HTMLElement): Range => {
    const range = root.ownerDocument.createRange()
    range.selectNodeContents(root)
    return range
  }

  // Paints every commented range as one CSS Custom Highlight. Without the API nothing is painted.
  private paint = () => {
    const { CSS, Highlight } = this.window as DomWindow
    if (CSS === undefined || !("highlights" in CSS)) {
      return
    }
    const ranges = [...this.instances.values()].flatMap((instance) => [...instance.ranges.values()])
    CSS.highlights.set("reply-comment", new Highlight(...ranges))
  }

  private closeCard = (key: string) => {
    this.store.setCard(key, null)
    this.store.setCardOpen(key, false)
  }

  private scheduleClose = (key: string) => {
    this.clearTimer(key)
    const timer = this.window.setTimeout(() => {
      this.timers.delete(key)
      this.store.setCard(key, null)
    }, CLOSE_DELAY_MS)
    this.timers.set(key, timer)
  }

  private clearTimer = (key: string) => {
    const timer = this.timers.get(key)
    if (timer === undefined) {
      return
    }
    this.window.clearTimeout(timer)
    this.timers.delete(key)
  }

  private clearTimers = () => {
    for (const key of [...this.timers.keys()]) {
      this.clearTimer(key)
    }
  }
}
