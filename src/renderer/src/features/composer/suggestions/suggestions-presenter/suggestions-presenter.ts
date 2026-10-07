import { reaction } from "mobx"
import type { ChatMention, ChatSearchResult, FileMatch, PromptMention, SlashCommand } from "@shared/types"
import type { API } from "@/ipc/api"
import type { PromptHistoryStore } from "@/features/composer/prompt-history/prompt-history-store/prompt-history-store"
import { chatMentionAt, mentionAt, slashAt, type Trigger } from "@/features/composer/prompt-text"
import type { SuggestionsStore } from "@/features/composer/suggestions/suggestions-store/suggestions-store"

// Searches wait this long after the last keystroke, so typing does not send one request per letter.
const SEARCH_DELAY_MS = 80

export type MenuKeyEvent = {
  key: string
  shiftKey: boolean
  preventDefault: () => void
}

// The composer owns the text box. A pick hands it the new text and caret, then closes the menu it came from.
export type ApplyText = (text: string, caret: number) => void

// Search answers only count if their request is still the latest one.
export class SuggestionsPresenter {
  private attached = false
  private disposers: Array<() => void> = []
  private fileTimer: number | null = null
  private chatTimer: number | null = null
  private fileRequest = 0
  private chatRequest = 0
  private commandRequest = 0

  constructor(
    private readonly store: SuggestionsStore,
    private readonly promptHistoryStore: PromptHistoryStore,
    private readonly api: API,
    private readonly window: Window,
  ) {}

  start = () => {
    if (this.attached) {
      return
    }
    this.attached = true
    this.disposers = [
      reaction(() => this.store.mention, this.searchFiles),
      reaction(() => this.store.chatMention, this.searchChats),
      reaction(() => this.store.slash !== null, this.loadCommands),
      // The history search takes over the box, so the other menus close while it is open.
      reaction(
        () => this.promptHistoryStore.searching,
        (searching) => {
          if (searching) {
            this.store.dismiss()
          }
        },
      ),
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
    this.cancelFileSearch()
    this.cancelChatSearch()
    this.commandRequest += 1
  }

  // The menus follow the trigger under the caret. They stay closed while the history search is open.
  sync = (text: string, caret: number) => {
    if (this.promptHistoryStore.searching) {
      return
    }
    this.store.setTriggers({
      mention: mentionAt(text, caret),
      chatMention: chatMentionAt(text, caret),
      slash: slashAt(text, caret),
    })
  }

  hover = (index: number) => {
    this.store.setActive(index)
  }

  // Returns true when an open menu used the key.
  handleMenuKey = (event: MenuKeyEvent, text: string, caret: number, apply: ApplyText): boolean => {
    const count = this.store.count
    if (count === 0) {
      return false
    }
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
      this.store.dismiss()
      return true
    }
    if ((event.key === "Enter" && !event.shiftKey) || event.key === "Tab") {
      event.preventDefault()
      this.choose(this.store.active, text, caret, apply)
      return true
    }
    return false
  }

  choose = (index: number, text: string, caret: number, apply: ApplyText) => {
    const kind = this.store.menu?.kind
    if (kind === "file") {
      const match = this.store.fileMatches[index]
      if (match === undefined) {
        return
      }
      this.chooseMention(match, text, caret, apply)
      return
    }
    if (kind === "chat") {
      const match = this.store.chatMatches[index]
      if (match === undefined) {
        return
      }
      this.chooseChatMention(match, text, caret, apply)
      return
    }
    if (kind === "command") {
      const command = this.store.commandMatches[index]
      if (command === undefined) {
        return
      }
      this.chooseCommand(command, text, caret, apply)
    }
  }

  // Only the mentions whose token is still in the text go with the prompt.
  mentionsIn = (text: string): { mentions: PromptMention[]; chatMentions: ChatMention[] } => {
    return {
      mentions: this.store.mentions.filter((item) => text.includes(`@${item.name}`)),
      chatMentions: this.store.chatMentions.filter((item) => text.includes(`$${item.title}`)),
    }
  }

  reset = () => {
    this.store.resetAfterSend()
  }

  resetForChat = () => {
    this.store.resetForChat()
  }

  private chooseMention = (match: FileMatch, text: string, caret: number, apply: ApplyText) => {
    const trigger = this.store.mention
    if (trigger === null) {
      return
    }
    const token = `@${match.name} `
    apply(`${text.slice(0, trigger.start)}${token}${text.slice(caret)}`, trigger.start + token.length)
    this.store.closeMention()
    this.store.addMention({ path: match.path, name: match.name })
  }

  private chooseChatMention = (match: ChatSearchResult, text: string, caret: number, apply: ApplyText) => {
    const trigger = this.store.chatMention
    if (trigger === null) {
      return
    }
    const token = `$${match.title} `
    apply(`${text.slice(0, trigger.start)}${token}${text.slice(caret)}`, trigger.start + token.length)
    this.store.closeChatMention()
    this.store.addChatMention({ projectId: match.projectId, chatId: match.chatId, title: match.title, updatedAt: match.updatedAt })
  }

  private chooseCommand = (command: SlashCommand, text: string, caret: number, apply: ApplyText) => {
    const token = `${command.insert} `
    apply(`${token}${text.slice(caret).trimStart()}`, token.length)
    this.store.closeSlash()
  }

  private searchFiles = (trigger: Trigger | null) => {
    this.cancelFileSearch()
    if (trigger === null) {
      this.store.setFileMatches([])
      return
    }
    const request = this.fileRequest
    this.fileTimer = this.window.setTimeout(() => {
      this.fileTimer = null
      this.api.searchFiles(trigger.query).then(
        (matches) => {
          if (request === this.fileRequest) {
            this.store.setFileMatches(matches)
          }
        },
        () => {
          if (request === this.fileRequest) {
            this.store.setFileMatches([])
          }
        },
      )
    }, SEARCH_DELAY_MS)
  }

  private searchChats = (trigger: Trigger | null) => {
    this.cancelChatSearch()
    if (trigger === null) {
      this.store.setChatMatches([])
      return
    }
    const request = this.chatRequest
    this.chatTimer = this.window.setTimeout(() => {
      this.chatTimer = null
      this.api.searchChats(trigger.query).then(
        (matches) => {
          if (request === this.chatRequest) {
            this.store.setChatMatches(matches)
          }
        },
        () => {
          if (request === this.chatRequest) {
            this.store.setChatMatches([])
          }
        },
      )
    }, SEARCH_DELAY_MS)
  }

  // Closing the slash menu drops any answer still on its way.
  private loadCommands = (open: boolean) => {
    this.commandRequest += 1
    if (!open) {
      return
    }
    const request = this.commandRequest
    this.api.listCommands().then(
      (commands) => {
        if (request === this.commandRequest) {
          this.store.setCommands(commands)
        }
      },
      () => {
        // The menu keeps the list it already had.
      },
    )
  }

  private cancelFileSearch = () => {
    if (this.fileTimer !== null) {
      this.window.clearTimeout(this.fileTimer)
      this.fileTimer = null
    }
    this.fileRequest += 1
  }

  private cancelChatSearch = () => {
    if (this.chatTimer !== null) {
      this.window.clearTimeout(this.chatTimer)
      this.chatTimer = null
    }
    this.chatRequest += 1
  }
}
