import { makeAutoObservable, observableRef } from "mobx"
import type { Question, QuestionRequest } from "@shared/types"

// The answer to one question so far: the picked labels and the typed reply.
export type QuestionDraft = { selected: string[]; other: string }

// The direction of the last page change. The question block slides the way it moved.
export type Direction = 1 | -1

// A frame's measured height stays inside this range, as the old card clamped it.
const MIN_FRAME_HEIGHT = 48
const MAX_FRAME_HEIGHT = 480

export function emptyDraft(): QuestionDraft {
  return { selected: [], other: "" }
}

// A question is answered by a pick or by a typed reply.
function isComplete(draft: QuestionDraft): boolean {
  return draft.selected.length > 0 || draft.other.trim() !== ""
}

function clampFrameHeight(height: number): number {
  return Math.min(MAX_FRAME_HEIGHT, Math.max(MIN_FRAME_HEIGHT, Math.ceil(height)))
}

// The question card's state. The request is mirrored: the presenter keeps it in step with the open
// chat. Answers stay here until they are sent, and a new request starts with none.
export class QuestionStore {
  request: QuestionRequest | null = null
  drafts: Record<string, QuestionDraft> = {}
  page = 0
  direction: Direction = 1
  open = true
  busy = false
  error: string | null = null
  frameHeights: Record<string, number> = {}
  zoomed = false
  brokenImages: Record<string, boolean> = {}

  constructor() {
    makeAutoObservable(this, {
      request: observableRef,
      drafts: observableRef,
      frameHeights: observableRef,
      brokenImages: observableRef,
    })
  }

  get requestId(): string | null {
    if (this.request === null) {
      return null
    }
    return this.request.id
  }

  get count(): number {
    if (this.request === null) {
      return 0
    }
    return this.request.questions.length
  }

  // The page on screen, kept inside the questions that exist.
  get index(): number {
    return Math.max(0, Math.min(this.page, this.count - 1))
  }

  get question(): Question | null {
    if (this.request === null || this.count === 0) {
      return null
    }
    return this.request.questions[this.index]
  }

  get draft(): QuestionDraft {
    const question = this.question
    if (question === null) {
      return emptyDraft()
    }
    return this.draftOf(question.id)
  }

  get hasPrevious(): boolean {
    return this.index > 0
  }

  get hasNext(): boolean {
    return this.index < this.count - 1
  }

  // Every question has an answer, so the card can be sent.
  get ready(): boolean {
    if (this.request === null) {
      return false
    }
    for (const question of this.request.questions) {
      if (!isComplete(this.draftOf(question.id))) {
        return false
      }
    }
    return true
  }

  // The question on screen has an answer, so the card can move on.
  get stepReady(): boolean {
    const question = this.question
    if (question === null) {
      return false
    }
    return isComplete(this.draftOf(question.id))
  }

  draftOf(id: string): QuestionDraft {
    return this.drafts[id] ?? emptyDraft()
  }

  // A different request starts a fresh card. The same request keeps the answers already given.
  setRequest(request: QuestionRequest | null) {
    if (request?.id !== this.request?.id) {
      this.reset()
    }
    this.request = request
  }

  setDraft(id: string, draft: QuestionDraft) {
    this.drafts = { ...this.drafts, [id]: draft }
  }

  goTo(page: number) {
    this.direction = page > this.index ? 1 : -1
    this.page = page
  }

  setOpen(open: boolean) {
    this.open = open
  }

  setBusy(busy: boolean) {
    this.busy = busy
  }

  setError(message: string | null) {
    this.error = message
  }

  setZoomed(zoomed: boolean) {
    this.zoomed = zoomed
  }

  markBroken(src: string) {
    this.brokenImages = { ...this.brokenImages, [src]: true }
  }

  measureFrame(key: string, height: number) {
    const value = clampFrameHeight(height)
    if (this.frameHeights[key] === value) {
      return
    }
    this.frameHeights = { ...this.frameHeights, [key]: value }
  }

  private reset() {
    this.drafts = {}
    this.page = 0
    this.direction = 1
    this.open = true
    this.busy = false
    this.error = null
    this.frameHeights = {}
    this.zoomed = false
    this.brokenImages = {}
  }
}
