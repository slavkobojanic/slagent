import { reaction } from "mobx"
import type { CommandService } from "@/ipc/command-service/command-service"
import type { FileService } from "@/ipc/file-service/file-service"
import type { LibraryService } from "@/ipc/library-service/library-service"
import type { ComposerStore } from "@/features/composer/composer-store/composer-store"
import type { Trigger } from "@/features/composer/prompt-text"
import type { AppEnv } from "@/state/app-deps"

// Searches wait this long after the last keystroke, so typing does not send one request per letter.
const SEARCH_DELAY_MS = 80

export type SuggestionsDeps = {
  store: ComposerStore
  files: Pick<FileService, "searchFiles">
  library: Pick<LibraryService, "searchChats">
  commands: Pick<CommandService, "listCommands">
  env: Pick<AppEnv, "window">
}

// Fills the @file, $chat and slash-command menus. Each answer only counts if its request is still the latest one.
export class SuggestionsPresenter {
  private attached = false
  private disposers: Array<() => void> = []
  private fileTimer: number | null = null
  private chatTimer: number | null = null
  private fileRequest = 0
  private chatRequest = 0
  private commandRequest = 0
  private readonly store: ComposerStore
  private readonly files: Pick<FileService, "searchFiles">
  private readonly library: Pick<LibraryService, "searchChats">
  private readonly commands: Pick<CommandService, "listCommands">
  private readonly env: Pick<AppEnv, "window">

  constructor({ store, files, library, commands, env }: SuggestionsDeps) {
    this.store = store
    this.files = files
    this.library = library
    this.commands = commands
    this.env = env
  }

  start = () => {
    if (this.attached) {
      return
    }
    this.attached = true
    this.disposers = [
      reaction(() => this.store.mention, this.searchFiles),
      reaction(() => this.store.chatMention, this.searchChats),
      reaction(() => this.store.slash !== null, this.loadCommands),
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

  private searchFiles = (trigger: Trigger | null) => {
    this.cancelFileSearch()
    if (trigger === null) {
      this.store.setFileMatches([])
      return
    }
    const request = this.fileRequest
    this.fileTimer = this.env.window.setTimeout(() => {
      this.fileTimer = null
      this.files.searchFiles(trigger.query).then(
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
    this.chatTimer = this.env.window.setTimeout(() => {
      this.chatTimer = null
      this.library.searchChats(trigger.query).then(
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

  // Opening the slash menu loads the command list. Closing it drops any answer still on its way.
  private loadCommands = (open: boolean) => {
    this.commandRequest += 1
    if (!open) {
      return
    }
    const request = this.commandRequest
    this.commands.listCommands().then(
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
      this.env.window.clearTimeout(this.fileTimer)
      this.fileTimer = null
    }
    this.fileRequest += 1
  }

  private cancelChatSearch = () => {
    if (this.chatTimer !== null) {
      this.env.window.clearTimeout(this.chatTimer)
      this.chatTimer = null
    }
    this.chatRequest += 1
  }
}
