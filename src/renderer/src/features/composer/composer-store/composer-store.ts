import { makeAutoObservable, observableRef } from "mobx"
import type { ChatMention, ChatSearchResult, DiffComment, FileMatch, PromptMention, ReplyComment, SlashCommand } from "@shared/types"
import type { AppDeps } from "@/state/app-deps"
import type { ReviewStore } from "@/state/review-store"
import type { PromptHistoryStore } from "@/features/composer/prompt-history-store/prompt-history-store"
import { filterCommands, kindLabel, pendingLabel, type Trigger } from "@/features/composer/prompt-text"

// A file on its way into the next prompt. The preview URL is released when the file leaves the list.
export type ComposerAttachment = {
  id: string
  name: string
  mimeType: string
  url: string
  // The disk path, when the platform gives one for the file. Empty when it does not.
  path: string
  file: File
}

export type Triggers = { mention: Trigger | null; chatMention: Trigger | null; slash: string | null }

export type SuggestionItem = { key: string; label: string; detail: string }

export type SuggestionMenu = {
  kind: "history" | "file" | "chat" | "command"
  title: string | null
  empty: string | null
  items: SuggestionItem[]
}

export type AttachmentChip = { id: string; name: string; imageUrl: string | null }
export type PendingReply = { id: string; quote: string; text: string }
export type PendingDiff = { id: string; location: string; text: string }

export type ComposerSource = {
  mirror: AppDeps["mirror"]
  review: ReviewStore
  history: PromptHistoryStore
}

// The prompt box: what is typed, the menu open over it, the mentions in the text, and the files
// attached to it. The getters are the rules for when the box is closed and what it says.
export class ComposerStore {
  text = ""
  caret = 0
  composing = false
  attachments: ComposerAttachment[] = []
  mentions: PromptMention[] = []
  chatMentions: ChatMention[] = []
  mention: Trigger | null = null
  chatMention: Trigger | null = null
  slash: string | null = null
  fileMatches: FileMatch[] = []
  chatMatches: ChatSearchResult[] = []
  commands: SlashCommand[] = []
  active = 0
  historyQuery: string | null = null
  historyIndex: number | null = null
  historyDraft = ""

  constructor(private readonly source: ComposerSource) {
    makeAutoObservable<ComposerStore, "source">(this, {
      source: false,
      attachments: observableRef,
      mentions: observableRef,
      chatMentions: observableRef,
      fileMatches: observableRef,
      chatMatches: observableRef,
      commands: observableRef,
    })
  }

  get streaming(): boolean {
    return this.source.mirror.run.streaming
  }

  get planMode(): boolean {
    return this.source.mirror.run.planMode
  }

  // Drafts are kept per project and chat. A new chat in a project shares the "new" key.
  get draftKey(): string {
    const { openProjectId, openChatId } = this.source.mirror.library
    return `${openProjectId ?? "none"}:${openChatId ?? "new"}`
  }

  // The box is closed until the app is ready, a provider is configured, a model is chosen, and a folder is open.
  get disabled(): boolean {
    const meta = this.source.mirror.meta
    if (!meta.ready || !meta.configured) {
      return true
    }
    const app = meta.meta
    if (app === null || !app.modelId || !app.cwd) {
      return true
    }
    return false
  }

  get placeholder(): string {
    const meta = this.source.mirror.meta
    if (!meta.ready) {
      return "Starting"
    }
    if (!meta.meta?.cwd) {
      return "Choose a folder"
    }
    if (!meta.configured) {
      return "Connect OpenRouter to start"
    }
    if (this.source.mirror.run.question !== null) {
      return "Answer in your own words"
    }
    if (this.streaming) {
      return "Queue a follow-up"
    }
    if (this.planMode) {
      return "Describe what to plan"
    }
    return "Describe a change"
  }

  // While a run streams, the button stops it. A send then queues a follow-up instead.
  get submitStatus(): "ready" | "streaming" {
    if (this.streaming) {
      return "streaming"
    }
    return "ready"
  }

  get submitDisabled(): boolean {
    if (this.streaming) {
      return false
    }
    return this.disabled
  }

  get planDisabled(): boolean {
    if (this.disabled || this.streaming) {
      return true
    }
    return false
  }

  get pendingCount(): number {
    return this.source.review.diffComments.length + this.source.review.replyComments.length
  }

  get pendingLabel(): string {
    return pendingLabel(this.source.review.diffComments.length, this.source.review.replyComments.length)
  }

  get pendingReplies(): PendingReply[] {
    return this.source.review.replyComments.map((comment: ReplyComment) => ({
      id: comment.id,
      quote: comment.quote.replace(/\s+/g, " "),
      text: comment.text,
    }))
  }

  get pendingDiffs(): PendingDiff[] {
    return this.source.review.diffComments.map((comment: DiffComment) => ({
      id: comment.id,
      location: `${comment.path.split("/").pop() ?? comment.path}:${comment.line}`,
      text: comment.text,
    }))
  }

  get attachmentChips(): AttachmentChip[] {
    return this.attachments.map((item) => ({
      id: item.id,
      name: item.name || "file",
      imageUrl: item.mimeType.startsWith("image/") && item.url ? item.url : null,
    }))
  }

  get historyMatches(): string[] {
    if (this.historyQuery === null) {
      return []
    }
    return this.source.history.search(this.historyQuery)
  }

  get commandMatches(): SlashCommand[] {
    if (this.slash === null) {
      return []
    }
    return filterCommands(this.commands, this.slash)
  }

  // One menu at a time. History search wins, then @file, then $chat, then slash commands.
  get menu(): SuggestionMenu | null {
    if (this.historyQuery !== null) {
      return {
        kind: "history",
        title: `History search${this.historyQuery ? `: ${this.historyQuery}` : ""}`,
        empty: "No matching prompts",
        items: this.historyMatches.map((item, index) => ({
          key: `${index}:${item}`,
          label: item.replace(/\s+/g, " "),
          detail: "",
        })),
      }
    }
    if (this.mention !== null) {
      if (this.fileMatches.length === 0) {
        return null
      }
      return {
        kind: "file",
        title: null,
        empty: null,
        items: this.fileMatches.map((match) => ({ key: match.path, label: `@${match.name}`, detail: match.path })),
      }
    }
    if (this.chatMention !== null) {
      if (this.chatMatches.length === 0) {
        return null
      }
      return {
        kind: "chat",
        title: null,
        empty: null,
        items: this.chatMatches.map((match) => ({ key: match.chatId, label: `$${match.title}`, detail: match.projectName })),
      }
    }
    if (this.slash !== null) {
      if (this.commandMatches.length === 0) {
        return null
      }
      return {
        kind: "command",
        title: null,
        empty: null,
        items: this.commandMatches.map((command) => ({
          key: command.insert,
          label: command.insert,
          detail: command.description || kindLabel(command.kind),
        })),
      }
    }
    return null
  }

  get suggestionCount(): number {
    return this.menu?.items.length ?? 0
  }

  setText(text: string) {
    this.text = text
  }

  setCaret(caret: number) {
    this.caret = caret
  }

  setComposing(value: boolean) {
    this.composing = value
  }

  setAttachments(items: ComposerAttachment[]) {
    this.attachments = items
  }

  // Typing moves the menus to the caret, and a fresh menu starts at its first item.
  setTriggers(triggers: Triggers) {
    this.mention = triggers.mention
    this.chatMention = triggers.chatMention
    this.slash = triggers.slash
    this.active = 0
  }

  // Escape closes every menu at once.
  dismissTriggers() {
    this.mention = null
    this.chatMention = null
    this.slash = null
    this.historyQuery = null
  }

  closeMention() {
    this.mention = null
  }

  closeChatMention() {
    this.chatMention = null
  }

  closeSlash() {
    this.slash = null
  }

  setActive(index: number) {
    this.active = index
  }

  // Ctrl+R opens the history search with the current text as its query, or closes it.
  toggleHistorySearch(text: string) {
    this.historyQuery = this.historyQuery === null ? text : null
    this.active = 0
  }

  setHistoryQuery(query: string | null) {
    this.historyQuery = query
  }

  setHistoryIndex(index: number | null) {
    this.historyIndex = index
  }

  setHistoryDraft(text: string) {
    this.historyDraft = text
  }

  setFileMatches(matches: FileMatch[]) {
    this.fileMatches = matches
  }

  setChatMatches(matches: ChatSearchResult[]) {
    this.chatMatches = matches
  }

  setCommands(commands: SlashCommand[]) {
    this.commands = commands
  }

  addMention(mention: PromptMention) {
    if (this.mentions.some((item) => item.path === mention.path)) {
      return
    }
    this.mentions = [...this.mentions, mention]
  }

  addChatMention(mention: ChatMention) {
    if (this.chatMentions.some((item) => item.chatId === mention.chatId)) {
      return
    }
    this.chatMentions = [...this.chatMentions, mention]
  }

  // After a send, the menus and the mentions start over. The text is cleared by the presenter.
  resetAfterSend() {
    this.historyIndex = null
    this.historyQuery = null
    this.mentions = []
    this.mention = null
    this.chatMentions = []
    this.chatMention = null
    this.slash = null
  }

  // A different chat opens with the menus, mentions and history position of a fresh box.
  resetForChat() {
    this.resetAfterSend()
    this.fileMatches = []
    this.chatMatches = []
    this.active = 0
    this.historyDraft = ""
  }
}
