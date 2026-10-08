import { toast } from "sonner"
import type { PromptFile, PromptRequest, SlashCommand } from "@shared/types"
import { builtinAtStart } from "@/features/composer/builtins"
import type { API } from "@/ipc/api"
import { errorText } from "@/lib/format"
import type { Log, LogData } from "@/log/log"
import type { AttachmentsPresenter } from "@/features/composer/attachments/attachments-presenter/attachments-presenter"
import type { ComposerStore } from "@/features/composer/composer-store/composer-store"
import type { PromptHistoryPresenter } from "@/features/composer/prompt-history/prompt-history-presenter/prompt-history-presenter"
import type { SuggestionsPresenter } from "@/features/composer/suggestions/suggestions-presenter/suggestions-presenter"
import type { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import type { ComposerPort } from "@/state/composer-port/composer-port"
import type { ReviewPresenter, ReviewSnapshot } from "@/state/review/review-presenter/review-presenter"

const DRAFTS_KEY = "slagent:composer-drafts"

export type KeyEventLike = {
  key: string
  shiftKey: boolean
  altKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  currentTarget: Pick<HTMLTextAreaElement, "selectionStart">
  nativeEvent: { isComposing: boolean }
  preventDefault: () => void
}

export type TextEventLike = { currentTarget: Pick<HTMLTextAreaElement, "value" | "selectionStart"> }
export type SubmitEventLike = { preventDefault: () => void }

type EndTimer = (more?: LogData) => void

// A built-in command runs in the app: it gets the text typed after it as guidance.
export type BuiltinRunner = (command: SlashCommand, guidance: string) => void

export class ComposerPresenter {
  private attached = false
  private disposers: Array<() => void> = []
  private textarea: HTMLTextAreaElement | null = null
  private endFirstToken: EndTimer | null = null

  constructor(
    private readonly store: ComposerStore,
    private readonly promptHistoryPresenter: PromptHistoryPresenter,
    private readonly suggestionsPresenter: SuggestionsPresenter,
    private readonly attachmentsPresenter: AttachmentsPresenter,
    private readonly reviewPresenter: ReviewPresenter,
    private readonly api: API,
    private readonly commandRegistry: CommandRegistry,
    private readonly composerPort: ComposerPort,
    private readonly window: Window,
    private readonly log: Log,
    private readonly onBuiltin?: BuiltinRunner,
  ) {}

  // A dialog or menu keeps the focus, so mounting only takes it when none is open.
  attachTextarea = (element: HTMLTextAreaElement | null) => {
    this.textarea = element
    if (element === null || this.dialogOpen()) {
      return
    }
    this.focus()
  }

  handleChange = (event: TextEventLike) => {
    const { value, selectionStart } = event.currentTarget
    this.store.setText(value)
    this.store.setCaret(selectionStart)
    this.saveDraft(this.store.draftKey, value)
    if (this.promptHistoryPresenter.search(value)) {
      return
    }
    this.suggestionsPresenter.sync(value, selectionStart)
  }

  handleSelect = (event: TextEventLike) => {
    const { value, selectionStart } = event.currentTarget
    this.store.setCaret(selectionStart)
    this.suggestionsPresenter.sync(value, selectionStart)
  }

  handleCompositionStart = () => {
    this.store.setComposing(true)
  }

  handleCompositionEnd = () => {
    this.store.setComposing(false)
  }

  // The history search and the open menus get the key first, then plan mode, recall, send, and attachments.
  handleKeyDown = (event: KeyEventLike) => {
    this.store.setCaret(event.currentTarget.selectionStart)
    const { text, caret } = this.store
    const history = this.promptHistoryPresenter.handleSearchKey(event, text)
    if (history.handled) {
      this.applyHistory(history.text)
      return
    }
    if (this.suggestionsPresenter.handleMenuKey(event, text, caret, this.replaceText)) {
      return
    }
    if (event.key === "Tab" && event.shiftKey) {
      event.preventDefault()
      this.togglePlan()
      return
    }
    if (this.handleRecallKey(event)) {
      return
    }
    if (event.key === "Enter") {
      this.handleEnter(event)
      return
    }
    if (event.key === "Backspace" && text === "" && this.attachmentsPresenter.removeLast()) {
      event.preventDefault()
    }
  }

  handleSubmit = (event: SubmitEventLike) => {
    event.preventDefault()
    void this.send()
  }

  handleStop = async () => {
    this.log.action("stop-run")
    try {
      await this.api.abort()
    } catch (error) {
      this.log.warn("stop-run-failed", { error })
      toast.error(errorText(error))
    }
  }

  togglePlan = () => {
    if (this.store.streaming) {
      return
    }
    this.log.action("toggle-plan-mode", { enabled: !this.store.planMode })
    void this.api.setPlanMode(!this.store.planMode).catch((error: unknown) => {
      this.log.warn("toggle-plan-mode-failed", { error })
      toast.error(errorText(error))
    })
  }

  chooseHistory = (index: number) => {
    this.applyHistory(this.promptHistoryPresenter.choose(index))
  }

  chooseSuggestion = (index: number) => {
    this.suggestionsPresenter.choose(index, this.store.text, this.store.caret, this.replaceText)
  }

  // Deferred so the browser has finished the click or key that asked.
  focus = () => {
    this.window.requestAnimationFrame(() => {
      this.textarea?.focus()
    })
  }

  fill = (text: string) => {
    this.window.requestAnimationFrame(() => {
      if (this.textarea === null) {
        return
      }
      this.replaceText(text)
      this.textarea.focus()
    })
  }

  start = () => {
    if (this.attached) {
      return
    }
    this.attached = true
    this.store.replaceDrafts(this.loadDrafts())
    this.promptHistoryPresenter.start()
    this.restoreDraft()
    this.disposers = [
      this.log.reaction("draft-key", () => this.store.draftKey, this.switchChat),
      this.composerPort.attach({ focus: this.focus, fill: this.fill }),
      this.commandRegistry.register({
        id: "composer.abort",
        label: "Stop the run",
        group: "Actions",
        shortcut: { key: "Escape" },
        enabled: this.canAbort,
        run: this.abortRun,
      }),
      this.commandRegistry.register({
        id: "composer.focus",
        label: "Focus the composer",
        group: "Actions",
        shortcut: { key: "l", mod: true },
        inPalette: false,
        run: () => {
          this.log.action("focus-composer")
          this.composerPort.focus()
        },
      }),
    ]
  }

  stop = () => {
    if (!this.attached) {
      return
    }
    this.attached = false
    for (const dispose of this.disposers) {
      dispose()
    }
    this.disposers = []
    this.endFirstToken = null
    this.attachmentsPresenter.stop()
  }

  // Escape stops a run only when nothing else claims it.
  private canAbort = (): boolean => {
    if (!this.store.streaming) {
      return false
    }
    if (this.dialogOpen()) {
      return false
    }
    return true
  }

  private abortRun = () => {
    void this.handleStop()
  }

  private dialogOpen = (): boolean => {
    return this.window.document.querySelector("[role=dialog], [role=menu]") !== null
  }

  private switchChat = () => {
    this.suggestionsPresenter.resetForChat()
    this.promptHistoryPresenter.resetForChat()
    // The attachments stay with their chat, like the draft text does.
    this.attachmentsPresenter.follow(this.store.draftKey)
    this.restoreDraft()
    if (this.dialogOpen()) {
      return
    }
    this.focus()
  }

  private restoreDraft = () => {
    const text = this.store.draft(this.store.draftKey)
    this.store.setText(text)
    this.store.setCaret(text.length)
    this.suggestionsPresenter.sync(text, text.length)
  }

  // As if it were typed: the draft is saved, and the menus follow the end of the text.
  private replaceText = (text: string, caret = text.length) => {
    this.store.setText(text)
    this.saveDraft(this.store.draftKey, text)
    this.suggestionsPresenter.sync(text, text.length)
    this.store.setCaret(caret)
    this.window.requestAnimationFrame(() => {
      this.textarea?.setSelectionRange(caret, caret)
    })
  }

  private applyHistory = (text: string | null) => {
    if (text === null) {
      return
    }
    this.replaceText(text)
  }

  // Plain ArrowUp and ArrowDown walk the sent prompts.
  private handleRecallKey = (event: KeyEventLike): boolean => {
    if (event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) {
      return false
    }
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
      return false
    }
    const history = this.promptHistoryPresenter.step(event.key === "ArrowUp" ? -1 : 1, this.store.text, this.store.caret)
    if (!history.handled) {
      return false
    }
    event.preventDefault()
    this.applyHistory(history.text)
    return true
  }

  private handleEnter = (event: KeyEventLike) => {
    if (this.store.composing || event.nativeEvent.isComposing || event.shiftKey) {
      return
    }
    event.preventDefault()
    if (this.store.submitDisabled) {
      return
    }
    void this.send()
  }

  // The box empties at once: the prompt call resolves only when the run ends, and the box is free before then.
  private send = async () => {
    const text = this.store.text
    // A command chosen mid-sentence leads the prompt, since pi only runs it from the start.
    const sentText = this.suggestionsPresenter.hoistCommand(text)
    const draftKey = this.store.draftKey
    const chatId = this.store.chatId
    // A built-in never reaches the model: the box resets like a send, and the app runs it.
    const builtin = builtinAtStart(sentText)
    if (builtin !== null) {
      this.store.setText("")
      this.store.setCaret(0)
      this.saveDraft(draftKey, "")
      this.promptHistoryPresenter.remember(text)
      this.promptHistoryPresenter.reset()
      this.suggestionsPresenter.reset()
      this.log.action("run-builtin", { command: builtin.command.insert, guidance: builtin.rest })
      this.onBuiltin?.(builtin.command, builtin.rest)
      return
    }
    // A prompt sent mid-run is queued, so its first token is not the next output.
    const queued = this.store.streaming
    const endFirstToken = this.log.time("first-token", { chatId })
    const { mentions, chatMentions } = this.suggestionsPresenter.mentionsIn(text)
    const attached = this.attachmentsPresenter.take()
    this.attachmentsPresenter.forget(draftKey)
    const snapshot = this.reviewPresenter.takeForSubmit()
    this.store.setText("")
    this.store.setCaret(0)
    const files: PromptFile[] = await this.attachmentsPresenter.toPromptFiles(attached)
    if (!text.trim() && files.length === 0 && mentions.length === 0 && chatMentions.length === 0 && snapshot.diffComments.length === 0 && snapshot.replyComments.length === 0) {
      return
    }
    this.saveDraft(draftKey, "")
    const request: PromptRequest = {
      text: sentText,
      mentions,
      chatMentions,
      files,
      comments: snapshot.diffComments,
      replies: snapshot.replyComments,
    }
    this.log.action("send", { chatId, text, files: files.length, mentions: mentions.length, chatMentions: chatMentions.length, comments: snapshot.diffComments.length, replies: snapshot.replyComments.length, queued })
    const finish = queued ? null : this.waitForFirstToken(endFirstToken, chatId)
    const sentKey = this.store.draftKey
    void this.api.prompt(request).catch((error: unknown) => {
      if (finish !== null && this.endFirstToken === finish) {
        finish({ failed: true })
      }
      this.restoreFailedSend(request, sentKey, snapshot, error)
    })
    this.promptHistoryPresenter.remember(text)
    this.promptHistoryPresenter.reset()
    this.suggestionsPresenter.reset()
  }

  // Ends the timer at the first reply output in the sent chat. A newer send ends a pending one as superseded.
  private waitForFirstToken = (end: EndTimer, chatId: string | null): EndTimer => {
    this.endFirstToken?.({ superseded: true })
    const dispose = this.log.reaction(
      "reply-id",
      () => this.store.replyId,
      (replyId) => {
        if (replyId === null) {
          return
        }
        // A new chat has no id until the main process makes one, so any transcript counts.
        if (chatId !== null && this.store.transcriptChatId !== chatId) {
          return
        }
        finish({ replyId })
      },
    )
    const cancel = () => {
      dispose()
      this.endFirstToken = null
    }
    const finish: EndTimer = (more) => {
      cancel()
      this.disposers = this.disposers.filter((item) => item !== cancel)
      end(more)
    }
    this.endFirstToken = finish
    this.disposers.push(cancel)
    return finish
  }

  // The text goes back in the box while the same chat is open, or is saved as that chat's draft when it is not.
  private restoreFailedSend = (request: PromptRequest, sentKey: string, snapshot: ReviewSnapshot, error: unknown) => {
    this.log.warn("send-failed", { error })
    const sameChat = sentKey === this.store.draftKey
    if (sameChat) {
      this.reviewPresenter.restore(snapshot)
    }
    toast.error(errorText(error))
    if (!request.text.trim()) {
      return
    }
    if (sameChat) {
      this.fill(request.text)
      return
    }
    this.saveDraft(sentKey, request.text)
  }

  private saveDraft = (key: string, text: string) => {
    if (!this.store.writeDraft(key, text)) {
      return
    }
    try {
      this.window.localStorage.setItem(DRAFTS_KEY, JSON.stringify(this.store.drafts))
    } catch {
      // Drafts are a convenience, so a full or blocked storage is fine.
    }
  }

  private loadDrafts = (): Record<string, string> => {
    try {
      const parsed: unknown = JSON.parse(this.window.localStorage.getItem(DRAFTS_KEY) ?? "null")
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return {}
      }
      return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
    } catch {
      return {}
    }
  }
}
