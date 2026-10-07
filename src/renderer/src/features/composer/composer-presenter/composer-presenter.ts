import { reaction } from "mobx"
import type { ChatSearchResult, FileMatch, PromptFile, PromptRequest, SlashCommand } from "@shared/types"
import type { ChatService } from "@/ipc/chat-service/chat-service"
import { errorText } from "@/lib/format"
import type { AttachmentsPresenter } from "@/features/composer/attachments-presenter/attachments-presenter"
import type { ComposerStore } from "@/features/composer/composer-store/composer-store"
import type { DraftsPresenter } from "@/features/composer/drafts-presenter/drafts-presenter"
import type { DraftsStore } from "@/features/composer/drafts-store/drafts-store"
import type { PromptHistoryPresenter } from "@/features/composer/prompt-history-presenter/prompt-history-presenter"
import type { PromptHistoryStore } from "@/features/composer/prompt-history-store/prompt-history-store"
import { chatMentionAt, mentionAt, slashAt } from "@/features/composer/prompt-text"
import type { SuggestionsPresenter } from "@/features/composer/suggestions-presenter/suggestions-presenter"
import type { AppEnv } from "@/state/app-deps"
import type { CommandRegistry } from "@/state/command-registry"
import type { ComposerPort } from "@/state/composer-port"
import type { ReviewPresenter, ReviewSnapshot } from "@/state/review-presenter"

// The parts of a DOM keyboard, input, or form event that the presenter reads. React events satisfy them.
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

export type ComposerPresenterDeps = {
  store: ComposerStore
  drafts: Pick<DraftsStore, "read">
  draftsPresenter: Pick<DraftsPresenter, "start" | "save" | "clear">
  history: Pick<PromptHistoryStore, "items">
  historyPresenter: Pick<PromptHistoryPresenter, "start" | "remember">
  suggestions: Pick<SuggestionsPresenter, "start" | "stop">
  attachments: Pick<AttachmentsPresenter, "take" | "clear" | "removeLast" | "toPromptFiles" | "stop">
  chat: Pick<ChatService, "prompt" | "abort" | "setPlanMode">
  review: Pick<ReviewPresenter, "takeForSubmit" | "restore">
  commands: Pick<CommandRegistry, "register">
  port: Pick<ComposerPort, "attach" | "focus">
  env: Pick<AppEnv, "window">
  notify: (message: string) => void
}

// The prompt box's behaviour: typing, keys, menus, history, submit, and the lifecycle that attaches
// it to the rest of the app. The text itself lives in the store.
export class ComposerPresenter {
  private attached = false
  private disposers: Array<() => void> = []
  private textarea: HTMLTextAreaElement | null = null
  private readonly store: ComposerStore
  private readonly drafts: Pick<DraftsStore, "read">
  private readonly draftsPresenter: Pick<DraftsPresenter, "start" | "save" | "clear">
  private readonly history: Pick<PromptHistoryStore, "items">
  private readonly historyPresenter: Pick<PromptHistoryPresenter, "start" | "remember">
  private readonly suggestions: Pick<SuggestionsPresenter, "start" | "stop">
  private readonly attachments: Pick<AttachmentsPresenter, "take" | "clear" | "removeLast" | "toPromptFiles" | "stop">
  private readonly chat: Pick<ChatService, "prompt" | "abort" | "setPlanMode">
  private readonly review: Pick<ReviewPresenter, "takeForSubmit" | "restore">
  private readonly commands: Pick<CommandRegistry, "register">
  private readonly port: Pick<ComposerPort, "attach" | "focus">
  private readonly env: Pick<AppEnv, "window">
  private readonly notify: (message: string) => void

  constructor({ store, drafts, draftsPresenter, history, historyPresenter, suggestions, attachments, chat, review, commands, port, env, notify }: ComposerPresenterDeps) {
    this.store = store
    this.drafts = drafts
    this.draftsPresenter = draftsPresenter
    this.history = history
    this.historyPresenter = historyPresenter
    this.suggestions = suggestions
    this.attachments = attachments
    this.chat = chat
    this.review = review
    this.commands = commands
    this.port = port
    this.env = env
    this.notify = notify
  }

  // Called when the textarea mounts or unmounts. A dialog or menu keeps the focus, so mounting only takes it when none is open.
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
    this.draftsPresenter.save(this.store.draftKey, value)
    if (this.store.historyQuery !== null) {
      this.store.setHistoryQuery(value)
      this.store.setActive(0)
      return
    }
    this.syncTriggers(value, selectionStart)
  }

  handleSelect = (event: TextEventLike) => {
    const { value, selectionStart } = event.currentTarget
    this.store.setCaret(selectionStart)
    if (this.store.historyQuery !== null) {
      return
    }
    this.syncTriggers(value, selectionStart)
  }

  handleCompositionStart = () => {
    this.store.setComposing(true)
  }

  handleCompositionEnd = () => {
    this.store.setComposing(false)
  }

  handleKeyDown = (event: KeyEventLike) => {
    this.store.setCaret(event.currentTarget.selectionStart)
    if (this.handleMenuKey(event)) {
      return
    }
    if (event.key === "Enter") {
      this.handleEnter(event)
      return
    }
    if (event.key === "Backspace" && this.store.text === "" && this.store.attachments.length > 0) {
      event.preventDefault()
      this.attachments.removeLast()
    }
  }

  handleSubmit = (event: SubmitEventLike) => {
    event.preventDefault()
    void this.send()
  }

  // The Stop button and Escape. A failed abort is reported like any other failed command.
  handleStop = async () => {
    try {
      await this.chat.abort()
    } catch (error) {
      this.notify(errorText(error))
    }
  }

  togglePlan = () => {
    if (this.store.streaming) {
      return
    }
    void this.chat.setPlanMode(!this.store.planMode).catch((error: unknown) => {
      this.notify(errorText(error))
    })
  }

  // Clicking or pressing Enter on a menu row runs the action for that row's menu.
  chooseSuggestion = (index: number) => {
    const kind = this.store.menu?.kind
    if (kind === "history") {
      const item = this.store.historyMatches[index]
      if (item === undefined) {
        return
      }
      this.chooseHistory(item)
      return
    }
    if (kind === "file") {
      const match = this.store.fileMatches[index]
      if (match === undefined) {
        return
      }
      this.chooseMention(match)
      return
    }
    if (kind === "chat") {
      const match = this.store.chatMatches[index]
      if (match === undefined) {
        return
      }
      this.chooseChatMention(match)
      return
    }
    if (kind === "command") {
      const command = this.store.commandMatches[index]
      if (command === undefined) {
        return
      }
      this.chooseCommand(command)
    }
  }

  hoverSuggestion = (index: number) => {
    this.store.setActive(index)
  }

  // Lets other features put the caret in the box. Deferred so the browser has finished the click or key that asked.
  focus = () => {
    this.env.window.requestAnimationFrame(() => {
      this.textarea?.focus()
    })
  }

  // Replaces the text and puts the caret at the end. Used by rewind and by a failed send.
  fill = (text: string) => {
    this.env.window.requestAnimationFrame(() => {
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
    this.draftsPresenter.start()
    this.historyPresenter.start()
    this.suggestions.start()
    this.restoreDraft()
    this.disposers = [
      reaction(() => this.store.draftKey, this.switchChat),
      this.port.attach({ focus: this.focus, fill: this.fill }),
      this.commands.register({
        id: "composer.abort",
        label: "Stop the run",
        group: "Actions",
        shortcut: { key: "Escape" },
        enabled: this.canAbort,
        run: this.abortRun,
      }),
      this.commands.register({
        id: "composer.focus",
        label: "Focus the composer",
        group: "Actions",
        shortcut: { key: "l", mod: true },
        inPalette: false,
        run: () => {
          this.port.focus()
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
    this.suggestions.stop()
    this.attachments.stop()
  }

  // Escape stops a run only when nothing else claims it: no dialog or menu open, and a run is streaming.
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
    return this.env.window.document.querySelector("[role=dialog], [role=menu]") !== null
  }

  // Each chat keeps its own unsent prompt. Switching chats loads that prompt and starts the menus over.
  private switchChat = () => {
    this.store.resetForChat()
    this.attachments.clear()
    this.restoreDraft()
    if (this.dialogOpen()) {
      return
    }
    this.focus()
  }

  private restoreDraft = () => {
    const text = this.drafts.read(this.store.draftKey)
    this.store.setText(text)
    this.store.setCaret(text.length)
    this.syncTriggers(text, text.length)
  }

  // Puts new text in the box as if it were typed: the draft is saved, and the menus follow the end of the text.
  private replaceText = (text: string, caret = text.length) => {
    this.store.setText(text)
    this.draftsPresenter.save(this.store.draftKey, text)
    if (this.store.historyQuery === null) {
      this.syncTriggers(text, text.length)
    }
    this.store.setCaret(caret)
    this.placeCaret(caret)
  }

  private placeCaret = (caret: number) => {
    this.env.window.requestAnimationFrame(() => {
      this.textarea?.setSelectionRange(caret, caret)
    })
  }

  private syncTriggers = (value: string, cursor: number) => {
    this.store.setTriggers({
      mention: mentionAt(value, cursor),
      chatMention: chatMentionAt(value, cursor),
      slash: slashAt(value, cursor),
    })
  }

  // Keys that belong to an open menu, or to history recall. Returns true when the key was used.
  private handleMenuKey = (event: KeyEventLike): boolean => {
    if (event.ctrlKey && event.key === "r") {
      event.preventDefault()
      this.store.toggleHistorySearch(this.store.text)
      return true
    }
    const count = this.store.suggestionCount
    if (this.store.historyQuery !== null && event.key === "Escape") {
      event.preventDefault()
      this.store.setHistoryQuery(null)
      return true
    }
    if (count === 0 && event.key === "Tab" && event.shiftKey) {
      event.preventDefault()
      this.togglePlan()
      return true
    }
    if (count === 0) {
      return this.handleIdleKey(event)
    }
    return this.handleOpenMenuKey(event, count)
  }

  // No menu is open: arrows recall history, and nothing else is claimed.
  private handleIdleKey = (event: KeyEventLike): boolean => {
    if (this.store.historyQuery !== null) {
      if (event.key !== "Enter") {
        return false
      }
      event.preventDefault()
      return true
    }
    if (event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) {
      return false
    }
    if (event.key === "ArrowUp") {
      return this.stepHistory(event, -1)
    }
    if (event.key === "ArrowDown") {
      return this.stepHistory(event, 1)
    }
    return false
  }

  private handleOpenMenuKey = (event: KeyEventLike, count: number): boolean => {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      this.store.setActive(Math.min(this.store.active + 1, count - 1))
      return true
    }
    if (event.key === "ArrowUp") {
      event.preventDefault()
      this.store.setActive(Math.max(this.store.active - 1, 0))
      return true
    }
    if (event.key === "Escape") {
      event.preventDefault()
      this.store.dismissTriggers()
      return true
    }
    if ((event.key === "Enter" && !event.shiftKey) || event.key === "Tab") {
      event.preventDefault()
      this.chooseSuggestion(this.store.active)
      return true
    }
    return false
  }

  private stepHistory = (event: KeyEventLike, direction: -1 | 1): boolean => {
    if (!this.browseHistory(direction)) {
      return false
    }
    event.preventDefault()
    return true
  }

  // Walks the sent prompts. The first step up keeps the unsent text, so stepping back down returns to it.
  private browseHistory = (direction: -1 | 1): boolean => {
    const items = this.history.items
    if (items.length === 0) {
      return false
    }
    const index = this.store.historyIndex
    const text = this.store.text
    const browsing = index !== null && text === items[index]
    if (direction === -1) {
      if (!browsing && text.slice(0, this.store.caret).includes("\n")) {
        return false
      }
      if (!browsing) {
        this.store.setHistoryDraft(text)
      }
      let next = items.length - 1
      if (browsing && index !== null) {
        next = index - 1
      }
      if (next < 0) {
        return true
      }
      this.store.setHistoryIndex(next)
      this.replaceText(items[next] ?? "")
      return true
    }
    if (!browsing || index === null) {
      return false
    }
    const next = index + 1
    if (next >= items.length) {
      this.store.setHistoryIndex(null)
      this.replaceText(this.store.historyDraft)
      return true
    }
    this.store.setHistoryIndex(next)
    this.replaceText(items[next] ?? "")
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

  private chooseHistory = (text: string) => {
    this.store.setHistoryQuery(null)
    this.replaceText(text)
  }

  private chooseMention = (match: FileMatch) => {
    const trigger = this.store.mention
    if (trigger === null) {
      return
    }
    const token = `@${match.name} `
    const { text, caret } = this.store
    this.replaceText(`${text.slice(0, trigger.start)}${token}${text.slice(caret)}`, trigger.start + token.length)
    this.store.closeMention()
    this.store.addMention({ path: match.path, name: match.name })
  }

  private chooseChatMention = (match: ChatSearchResult) => {
    const trigger = this.store.chatMention
    if (trigger === null) {
      return
    }
    const token = `$${match.title} `
    const { text, caret } = this.store
    this.replaceText(`${text.slice(0, trigger.start)}${token}${text.slice(caret)}`, trigger.start + token.length)
    this.store.closeChatMention()
    this.store.addChatMention({ projectId: match.projectId, chatId: match.chatId, title: match.title, updatedAt: match.updatedAt })
  }

  private chooseCommand = (command: SlashCommand) => {
    const token = `${command.insert} `
    const { text, caret } = this.store
    this.replaceText(`${token}${text.slice(caret).trimStart()}`, token.length)
    this.store.closeSlash()
  }

  // Takes the box's content and sends it. The box empties at once; the prompt is handed to the main
  // process and the call resolves only when the run ends, so the box is free before then.
  private send = async () => {
    const text = this.store.text
    const draftKey = this.store.draftKey
    const mentions = this.store.mentions.filter((item) => text.includes(`@${item.name}`))
    const chatMentions = this.store.chatMentions.filter((item) => text.includes(`$${item.title}`))
    const attached = this.attachments.take()
    const snapshot = this.review.takeForSubmit()
    this.store.setText("")
    this.store.setCaret(0)
    const files: PromptFile[] = await this.attachments.toPromptFiles(attached)
    if (!text.trim() && files.length === 0 && mentions.length === 0 && chatMentions.length === 0 && snapshot.diffComments.length === 0 && snapshot.replyComments.length === 0) {
      return
    }
    this.draftsPresenter.clear(draftKey)
    const request: PromptRequest = {
      text,
      mentions,
      chatMentions,
      files,
      comments: snapshot.diffComments,
      replies: snapshot.replyComments,
    }
    const sentKey = this.store.draftKey
    void this.chat.prompt(request).catch((error: unknown) => {
      this.restoreFailedSend(request, sentKey, snapshot, error)
    })
    this.historyPresenter.remember(text)
    this.store.resetAfterSend()
  }

  // A send the run dropped gives its content back: the review comments and the text, in the box while
  // the same chat is open, or saved as that chat's draft when it is not.
  private restoreFailedSend = (request: PromptRequest, sentKey: string, snapshot: ReviewSnapshot, error: unknown) => {
    const sameChat = sentKey === this.store.draftKey
    if (sameChat) {
      this.review.restore(snapshot)
    }
    this.notify(errorText(error))
    if (!request.text.trim()) {
      return
    }
    if (sameChat) {
      this.fill(request.text)
      return
    }
    this.draftsPresenter.save(sentKey, request.text)
  }
}
