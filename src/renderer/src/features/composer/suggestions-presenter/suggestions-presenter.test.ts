import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { ChatSearchResult, FileMatch, SlashCommand } from "@shared/types"
import type { CommandService } from "@/ipc/command-service/command-service"
import type { FileService } from "@/ipc/file-service/file-service"
import type { LibraryService } from "@/ipc/library-service/library-service"
import { ComposerStore } from "@/features/composer/composer-store/composer-store"
import { SuggestionsPresenter } from "@/features/composer/suggestions-presenter/suggestions-presenter"
import { PromptHistoryStore } from "@/features/composer/prompt-history-store/prompt-history-store"
import { LibraryStore } from "@/mirror/library-store"
import { MetaStore } from "@/mirror/meta-store"
import { RunStore } from "@/mirror/run-store"
import { ReviewStore } from "@/state/review-store"
import { createMockInstance } from "@/test/create-mock-instance"

const file: FileMatch = { path: "src/a.ts", name: "a.ts" }
const other: FileMatch = { path: "src/ab.ts", name: "ab.ts" }
const chat: ChatSearchResult = { projectId: "p1", projectName: "Work", chatId: "c1", title: "Plan", snippet: "", messageId: null, updatedAt: 1 }
const command: SlashCommand = { name: "review", insert: "/review", description: "Review the diff", kind: "skill" }

function composerStore() {
  return new ComposerStore({
    mirror: { library: new LibraryStore(), meta: new MetaStore(), run: new RunStore() },
    review: new ReviewStore(),
    history: new PromptHistoryStore(),
  })
}

// Lets resolved promises run their callbacks.
async function flush() {
  for (let index = 0; index < 5; index += 1) {
    await Promise.resolve()
  }
}

describe("SuggestionsPresenter", () => {
  let store: ComposerStore
  let files: ReturnType<typeof createMockInstance<FileService>>
  let library: ReturnType<typeof createMockInstance<LibraryService>>
  let commands: ReturnType<typeof createMockInstance<CommandService>>
  let presenter: SuggestionsPresenter

  beforeEach(() => {
    vi.useFakeTimers()
    store = composerStore()
    files = createMockInstance<FileService>(["searchFiles"])
    library = createMockInstance<LibraryService>(["searchChats"])
    commands = createMockInstance<CommandService>(["listCommands"])
    files.searchFiles.mockResolvedValue([])
    library.searchChats.mockResolvedValue([])
    commands.listCommands.mockResolvedValue([])
    presenter = new SuggestionsPresenter({ store, files, library, commands, env: { window } })
  })

  afterEach(() => {
    presenter.stop()
    vi.useRealTimers()
  })

  describe("file mentions", () => {
    it("can search files once the mention has been still for 80ms", async () => {
      files.searchFiles.mockResolvedValue([file])
      presenter.start()

      store.setTriggers({ mention: { query: "a", start: 0 }, chatMention: null, slash: null })
      await vi.advanceTimersByTimeAsync(79)
      expect(files.searchFiles).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(1)
      expect(files.searchFiles).toHaveBeenCalledWith("a")
      expect(store.fileMatches).toEqual([file])
    })

    it("can search only the latest query when the mention changes within the delay", async () => {
      presenter.start()

      store.setTriggers({ mention: { query: "a", start: 0 }, chatMention: null, slash: null })
      await vi.advanceTimersByTimeAsync(40)
      store.setTriggers({ mention: { query: "ab", start: 0 }, chatMention: null, slash: null })
      await vi.advanceTimersByTimeAsync(80)

      expect(files.searchFiles.mock.calls).toEqual([["ab"]])
    })

    it("can ignore an answer that arrives after the mention moved on", async () => {
      let resolveFirst: (matches: FileMatch[]) => void = () => undefined
      files.searchFiles.mockImplementationOnce(() => new Promise<FileMatch[]>((resolve) => {
        resolveFirst = resolve
      }))
      files.searchFiles.mockResolvedValueOnce([other])
      presenter.start()

      store.setTriggers({ mention: { query: "a", start: 0 }, chatMention: null, slash: null })
      await vi.advanceTimersByTimeAsync(80)
      store.setTriggers({ mention: { query: "ab", start: 0 }, chatMention: null, slash: null })
      await vi.advanceTimersByTimeAsync(80)
      resolveFirst([file])
      await flush()

      expect(store.fileMatches).toEqual([other])
    })

    it("can clear the file matches when the mention closes", async () => {
      store.setFileMatches([file])
      presenter.start()

      store.setTriggers({ mention: { query: "a", start: 0 }, chatMention: null, slash: null })
      store.setTriggers({ mention: null, chatMention: null, slash: null })

      expect(store.fileMatches).toEqual([])
    })

    it("can cancel the search when the mention closes before its delay ends", async () => {
      presenter.start()

      store.setTriggers({ mention: { query: "a", start: 0 }, chatMention: null, slash: null })
      store.setTriggers({ mention: null, chatMention: null, slash: null })
      await vi.advanceTimersByTimeAsync(200)

      expect(files.searchFiles).not.toHaveBeenCalled()
    })

    it("can clear the matches when the search fails", async () => {
      files.searchFiles.mockRejectedValue(new Error("offline"))
      store.setFileMatches([file])
      presenter.start()

      store.setTriggers({ mention: { query: "a", start: 0 }, chatMention: null, slash: null })
      await vi.advanceTimersByTimeAsync(80)
      await flush()

      expect(store.fileMatches).toEqual([])
    })
  })

  describe("chat mentions", () => {
    it("can search chats for a $ mention once it has been still for 80ms", async () => {
      library.searchChats.mockResolvedValue([chat])
      presenter.start()

      store.setTriggers({ mention: null, chatMention: { query: "pl", start: 0 }, slash: null })
      await vi.advanceTimersByTimeAsync(80)
      await flush()

      expect(library.searchChats).toHaveBeenCalledWith("pl")
      expect(store.chatMatches).toEqual([chat])
    })
  })

  describe("slash commands", () => {
    it("can load the command list when the slash menu opens", async () => {
      commands.listCommands.mockResolvedValue([command])
      presenter.start()

      store.setTriggers({ mention: null, chatMention: null, slash: "" })
      await flush()

      expect(commands.listCommands).toHaveBeenCalledTimes(1)
      expect(store.commands).toEqual([command])
    })

    it("can keep the same list while the slash query changes", async () => {
      presenter.start()

      store.setTriggers({ mention: null, chatMention: null, slash: "" })
      store.setTriggers({ mention: null, chatMention: null, slash: "r" })
      await flush()

      expect(commands.listCommands).toHaveBeenCalledTimes(1)
    })

    it("can ignore a list that arrives after the menu closed", async () => {
      let resolveCommands: (list: SlashCommand[]) => void = () => undefined
      commands.listCommands.mockImplementationOnce(() => new Promise<SlashCommand[]>((resolve) => {
        resolveCommands = resolve
      }))
      presenter.start()

      store.setTriggers({ mention: null, chatMention: null, slash: "" })
      store.setTriggers({ mention: null, chatMention: null, slash: null })
      resolveCommands([command])
      await flush()

      expect(store.commands).toEqual([])
    })

    it("can keep the commands it had when loading fails", async () => {
      commands.listCommands.mockRejectedValue(new Error("offline"))
      store.setCommands([command])
      presenter.start()

      store.setTriggers({ mention: null, chatMention: null, slash: "" })
      await flush()

      expect(store.commands).toEqual([command])
    })
  })

  describe("stop", () => {
    it("can cancel a search that is still waiting for its delay", async () => {
      presenter.start()
      store.setTriggers({ mention: { query: "a", start: 0 }, chatMention: null, slash: null })
      presenter.stop()
      await vi.advanceTimersByTimeAsync(200)

      expect(files.searchFiles).not.toHaveBeenCalled()
    })

    it("can stop reacting to the composer once stopped", async () => {
      presenter.start()
      presenter.stop()
      store.setTriggers({ mention: { query: "a", start: 0 }, chatMention: null, slash: null })
      await vi.advanceTimersByTimeAsync(200)

      expect(files.searchFiles).not.toHaveBeenCalled()
    })
  })
})
