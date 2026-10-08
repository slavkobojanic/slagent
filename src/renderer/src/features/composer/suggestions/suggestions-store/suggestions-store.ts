import { makeAutoObservable } from "mobx"
import type { ChatMention, ChatSearchResult, FileMatch, PromptMention, SlashCommand } from "@shared/types"
import { BUILT_IN_COMMANDS } from "@/features/composer/builtins"
import { filterCommands, kindLabel, type Trigger } from "@/features/composer/prompt-text"

export type Triggers = { mention: Trigger | null; chatMention: Trigger | null; slash: Trigger | null; hash?: Trigger | null }

export type SuggestionItem = { key: string; label: string; detail: string }

export type SuggestionMenu = {
  kind: "file" | "chat" | "command"
  title: string | null
  empty: string | null
  items: SuggestionItem[]
}

// The @file, $chat and slash menus over the prompt box, and the mentions picked from them for the next send.
export class SuggestionsStore {
  mentions: PromptMention[] = []
  chatMentions: ChatMention[] = []
  mention: Trigger | null = null
  chatMention: Trigger | null = null
  slash: Trigger | null = null
  hash: Trigger | null = null
  fileMatches: FileMatch[] = []
  chatMatches: ChatSearchResult[] = []
  commands: SlashCommand[] = []
  active = 0

  constructor() {
    makeAutoObservable(this)
  }

  get commandMatches(): SlashCommand[] {
    if (this.slash === null) {
      return []
    }
    // Built-ins only ever show behind their own "#" prefix.
    const withoutBuiltins = this.commands.filter((command) => command.kind !== "builtin")
    return filterCommands(withoutBuiltins, this.slash.query)
  }

  get builtinMatches(): SlashCommand[] {
    if (this.hash === null) {
      return []
    }
    return filterCommands(BUILT_IN_COMMANDS, this.hash.query)
  }

  // One menu at a time: @file, then $chat, then slash commands.
  get menu(): SuggestionMenu | null {
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
    if (this.hash !== null) {
      if (this.builtinMatches.length === 0) {
        return null
      }
      return {
        kind: "command",
        title: null,
        empty: null,
        items: this.builtinMatches.map((command) => ({
          key: command.insert,
          label: command.insert,
          detail: command.description || kindLabel(command.kind),
        })),
      }
    }
    return null
  }

  get count(): number {
    return this.menu?.items.length ?? 0
  }

  setTriggers(triggers: Triggers) {
    this.mention = triggers.mention
    this.chatMention = triggers.chatMention
    this.slash = triggers.slash
    this.hash = triggers.hash ?? null
    this.active = 0
  }

  dismiss() {
    this.mention = null
    this.chatMention = null
    this.slash = null
    this.hash = null
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

  closeHash() {
    this.hash = null
  }

  setActive(index: number) {
    this.active = index
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

  resetAfterSend() {
    this.mentions = []
    this.mention = null
    this.chatMentions = []
    this.chatMention = null
    this.slash = null
    this.hash = null
  }

  resetForChat() {
    this.resetAfterSend()
    this.fileMatches = []
    this.chatMatches = []
    this.active = 0
  }
}
