import { reaction } from "mobx"
import type { QuestionAnswer, QuestionReply, QuestionRequest } from "@shared/types"
import type { API } from "@/ipc/api"
import type { RunStore } from "@/mirror/run-store/run-store"
import { errorText } from "@/lib/format"
import { parseFrameReport } from "@/features/transcript/question-card/frame-document"
import type { QuestionKeyPress } from "@/features/transcript/question-card/question-keys"
import { emptyDraft, type QuestionDraft, type QuestionCardStore } from "@/features/transcript/question-card/question-card-store/question-card-store"

// How long the card waits after the last pick before it sends, so the picked state shows first.
const SEND_DELAY_MS = 220

export class QuestionCardPresenter {
  private stopListening: (() => void) | null = null
  private sendTimer: number | null = null
  private questionElement: HTMLElement | null = null

  constructor(
    private readonly store: QuestionCardStore,
    private readonly runStore: RunStore,
    private readonly api: API,
    private readonly window: Window,
  ) {}

  start = () => {
    if (this.stopListening !== null) {
      return
    }
    const stopRequest = reaction(() => this.runStore.question, this.handleRequest, { fireImmediately: true })
    this.window.addEventListener("message", this.handleMessage)
    this.stopListening = () => {
      stopRequest()
      this.window.removeEventListener("message", this.handleMessage)
    }
  }

  stop = () => {
    this.cancelSend()
    this.stopListening?.()
    this.stopListening = null
  }

  // Called as the question element mounts. The question takes focus, so number keys answer it at once.
  attachQuestion = (element: HTMLElement | null) => {
    if (element === null) {
      return
    }
    this.questionElement = element
    this.focusQuestion()
  }

  // Returns true when the card used the key, so the view stops the default action.
  handleKey = (press: QuestionKeyPress): boolean => {
    if (press.typing) {
      // Enter in the free-text row advances or sends. Every other key is typing.
      if (press.key !== "Enter" || press.shift) {
        return false
      }
      this.advance()
      return true
    }
    if (press.mod) {
      if (press.key !== "Enter") {
        return false
      }
      this.advance()
      return true
    }
    if (press.alt) {
      return false
    }
    if (press.key === "ArrowLeft" && this.store.hasPrevious) {
      this.store.goTo(this.store.index - 1)
      return true
    }
    if (press.key === "ArrowRight" && this.store.hasNext) {
      this.store.goTo(this.store.index + 1)
      return true
    }
    if (press.key === "Escape") {
      this.setOpen(false)
      return true
    }
    return this.pickByNumber(press.key)
  }

  // A pick on a single-choice question selects it and moves on. The last question sends after a short delay.
  handlePick = (label: string) => {
    this.cancelSend()
    const question = this.store.question
    if (question === null) {
      return
    }
    const draft = this.store.draftOf(question.id)
    if (question.multiSelect) {
      const selected = draft.selected.includes(label) ? draft.selected.filter((item) => item !== label) : [...draft.selected, label]
      this.store.setDraft(question.id, { ...draft, selected })
      return
    }
    const selected = draft.selected[0] === label ? [] : [label]
    // A pick replaces a typed reply on a single-choice question.
    this.store.setDraft(question.id, { ...draft, selected, other: selected.length > 0 ? "" : draft.other })
    if (selected.length === 0) {
      return
    }
    if (this.store.hasNext) {
      this.store.goTo(this.store.index + 1)
      return
    }
    const drafts = { ...this.store.drafts }
    this.sendTimer = this.window.setTimeout(() => {
      this.sendTimer = null
      this.submit(drafts)
    }, SEND_DELAY_MS)
  }

  handleOtherChange = (value: string) => {
    const question = this.store.question
    if (question === null) {
      return
    }
    const draft = this.store.draftOf(question.id)
    // Typing a reply replaces the pick on a single-choice question.
    const selected = !question.multiSelect && value.trim() !== "" ? [] : draft.selected
    this.store.setDraft(question.id, { ...draft, other: value, selected })
  }

  handleBack = () => {
    if (!this.store.hasPrevious) {
      return
    }
    this.store.goTo(this.store.index - 1)
  }

  handleNext = () => {
    if (!this.store.hasNext || !this.store.stepReady) {
      return
    }
    this.store.goTo(this.store.index + 1)
  }

  handleToggleOpen = () => {
    this.setOpen(!this.store.open)
  }

  handleSend = () => {
    if (!this.store.ready) {
      return
    }
    this.submit(this.store.drafts)
  }

  handleSkip = () => {
    this.cancelSend()
    void this.send({ skipped: true })
  }

  handleZoomChange = (open: boolean) => {
    this.store.setZoomed(open)
  }

  handleImageError = (src: string) => {
    this.store.markBroken(src)
  }

  // A different request starts a fresh card, so a send still waiting for the old one is dropped.
  private handleRequest = (request: QuestionRequest | null) => {
    if (request?.id !== this.store.request?.id) {
      this.cancelSend()
    }
    this.store.setRequest(request)
  }

  private handleMessage = (event: MessageEvent) => {
    if (!isChildWindow(event.source, this.window)) {
      return
    }
    const report = parseFrameReport(event.data)
    if (report === null) {
      return
    }
    this.store.measureFrame(report.key, report.height)
  }

  // Enter moves to the next question when this one is answered. On the last question it sends when all are.
  private advance = () => {
    if (this.store.hasNext) {
      this.handleNext()
      return
    }
    this.handleSend()
  }

  private submit = (drafts: Record<string, QuestionDraft>) => {
    const request = this.store.request
    if (request === null) {
      return
    }
    const answers: QuestionAnswer[] = request.questions.map((question) => {
      const draft = drafts[question.id] ?? emptyDraft()
      return { questionId: question.id, selected: [...draft.selected], other: draft.other.trim() || undefined }
    })
    void this.send({ skipped: false, answers })
  }

  // One reply at a time. After a reply is accepted the card stays busy until the mirror drops the question.
  private send = async (reply: QuestionReply) => {
    const id = this.store.requestId
    if (this.store.busy || id === null) {
      return
    }
    this.store.setError(null)
    this.store.setBusy(true)
    try {
      await this.api.answerQuestion(id, reply)
    } catch (error) {
      this.store.setError(errorText(error))
      this.store.setBusy(false)
    }
  }

  private setOpen = (open: boolean) => {
    this.store.setOpen(open)
    this.focusQuestion()
  }

  private focusQuestion = () => {
    this.questionElement?.focus({ preventScroll: true })
  }

  private cancelSend = () => {
    if (this.sendTimer === null) {
      return
    }
    this.window.clearTimeout(this.sendTimer)
    this.sendTimer = null
  }

  // Keys 1 to 9 pick the option with that number. Any other key does nothing here.
  private pickByNumber = (key: string): boolean => {
    const question = this.store.question
    if (question === null) {
      return false
    }
    const option = question.options[Number(key) - 1]
    if (option === undefined) {
      return false
    }
    this.handlePick(option.label)
    return true
  }
}

// A frame reports to the window it sits in, so the sender's parent is the app's window. Any other
// sender is not one of the card's frames.
function isChildWindow(source: MessageEventSource | null, parent: Window): boolean {
  if (source === null || !("parent" in source)) {
    return false
  }
  return source.parent === parent
}
