import { makeAutoObservable } from "mobx"
import type { LibraryStore } from "@/mirror/library-store/library-store"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { RunStore } from "@/mirror/run-store/run-store"

const DRAFT_LIMIT = 100

export class ComposerStore {
  text = ""
  caret = 0
  composing = false
  drafts: Record<string, string> = {}

  constructor(
    private readonly libraryStore: LibraryStore,
    private readonly metaStore: MetaStore,
    private readonly runStore: RunStore,
  ) {
    makeAutoObservable(this)
  }

  get streaming(): boolean {
    return this.runStore.streaming
  }

  get planMode(): boolean {
    return this.runStore.planMode
  }

  get chatId(): string | null {
    return this.libraryStore.openChatId
  }

  get transcriptChatId(): string | null {
    return this.runStore.transcriptChatId
  }

  // The newest message since the last prompt that shows output, so the presenter can time the first token.
  get replyId(): string | null {
    const { messages } = this.runStore
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i]
      if (message.role === "user") {
        return null
      }
      if (message.role === "tool" || message.text !== "" || message.thinking !== "") {
        return message.id
      }
    }
    return null
  }

  // Drafts are kept per project and chat. A new chat in a project shares the "new" key.
  get draftKey(): string {
    const { openProjectId, openChatId } = this.libraryStore
    return `${openProjectId ?? "none"}:${openChatId ?? "new"}`
  }

  get disabled(): boolean {
    if (!this.metaStore.ready || !this.metaStore.configured) {
      return true
    }
    const app = this.metaStore.meta
    if (app === null || !app.modelId || !app.cwd) {
      return true
    }
    return false
  }

  get placeholder(): string {
    if (!this.metaStore.ready) {
      return "Starting"
    }
    if (!this.metaStore.meta?.cwd) {
      return "Choose a folder"
    }
    if (!this.metaStore.configured) {
      return "Connect OpenRouter to start"
    }
    if (this.runStore.question !== null) {
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

  setText(text: string) {
    this.text = text
  }

  setCaret(caret: number) {
    this.caret = caret
  }

  setComposing(value: boolean) {
    this.composing = value
  }

  draft(key: string): string {
    return this.drafts[key] ?? ""
  }

  replaceDrafts(drafts: Record<string, string>) {
    this.drafts = drafts
  }

  // Returns true when the drafts changed, so the presenter knows to persist them.
  writeDraft(key: string, text: string): boolean {
    if (text.trim() === "") {
      return this.removeDraft(key)
    }
    const next: Record<string, string> = { ...this.drafts, [key]: text }
    const keys = Object.keys(next)
    for (const stale of keys.slice(0, Math.max(0, keys.length - DRAFT_LIMIT))) {
      delete next[stale]
    }
    this.drafts = next
    return true
  }

  private removeDraft(key: string): boolean {
    if (!Object.hasOwn(this.drafts, key)) {
      return false
    }
    const next = { ...this.drafts }
    delete next[key]
    this.drafts = next
    return true
  }
}
