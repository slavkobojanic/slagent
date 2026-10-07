import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { ChatSearchResult, FileMatch, SlashCommand } from "@shared/types"
import type { API } from "@/ipc/api"
import { nullLog } from "@/log/log"
import { PromptHistoryStore } from "@/features/composer/prompt-history/prompt-history-store/prompt-history-store"
import { type MenuKeyEvent, SuggestionsPresenter } from "@/features/composer/suggestions/suggestions-presenter/suggestions-presenter"
import { SuggestionsStore } from "@/features/composer/suggestions/suggestions-store/suggestions-store"
import { createMockInstance } from "@/test/create-mock-instance"

const file: FileMatch = { path: "src/a.ts", name: "a.ts" }
const other: FileMatch = { path: "src/ab.ts", name: "ab.ts" }
const chat: ChatSearchResult = { projectId: "p1", projectName: "Work", chatId: "c1", title: "Plan", snippet: "", messageId: null, updatedAt: 1 }
const command: SlashCommand = { name: "review", insert: "/review", description: "Review the diff", kind: "skill" }

function keyEvent(key: string, shiftKey = false): MenuKeyEvent {
  return { key, shiftKey, preventDefault: vi.fn() }
}

// Lets resolved promises run their callbacks.
async function flush() {
  for (let index = 0; index < 5; index += 1) {
    await Promise.resolve()
  }
}

describe("SuggestionsPresenter", () => {
  let store: SuggestionsStore
  let history: PromptHistoryStore
  let api: ReturnType<typeof createMockInstance<API>>
  let presenter: SuggestionsPresenter

  beforeEach(() => {
    vi.useFakeTimers()
    store = new SuggestionsStore()
    history = new PromptHistoryStore()
    api = createMockInstance<API>(["searchFiles", "searchChats", "listCommands"])
    api.searchFiles.mockResolvedValue([])
    api.searchChats.mockResolvedValue([])
    api.listCommands.mockResolvedValue([])
    presenter = new SuggestionsPresenter(store, history, api, window, nullLog())
  })

  afterEach(() => {
    presenter.stop()
    vi.useRealTimers()
  })

  describe("file mentions", () => {
    it("can search files once the mention has been still for 80ms", async () => {
      api.searchFiles.mockResolvedValue([file])
      presenter.start()

      store.setTriggers({ mention: { query: "a", start: 0 }, chatMention: null, slash: null })
      await vi.advanceTimersByTimeAsync(79)
      expect(api.searchFiles).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(1)
      expect(api.searchFiles).toHaveBeenCalledWith("a")
      expect(store.fileMatches).toEqual([file])
    })

    it("can search only the latest query when the mention changes within the delay", async () => {
      presenter.start()

      store.setTriggers({ mention: { query: "a", start: 0 }, chatMention: null, slash: null })
      await vi.advanceTimersByTimeAsync(40)
      store.setTriggers({ mention: { query: "ab", start: 0 }, chatMention: null, slash: null })
      await vi.advanceTimersByTimeAsync(80)

      expect(api.searchFiles.mock.calls).toEqual([["ab"]])
    })

    it("can ignore an answer that arrives after the mention moved on", async () => {
      let resolveFirst: (matches: FileMatch[]) => void = () => undefined
      api.searchFiles.mockImplementationOnce(() => new Promise<FileMatch[]>((resolve) => {
        resolveFirst = resolve
      }))
      api.searchFiles.mockResolvedValueOnce([other])
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

      expect(api.searchFiles).not.toHaveBeenCalled()
    })

    it("can clear the matches when the search fails", async () => {
      api.searchFiles.mockRejectedValue(new Error("offline"))
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
      api.searchChats.mockResolvedValue([chat])
      presenter.start()

      store.setTriggers({ mention: null, chatMention: { query: "pl", start: 0 }, slash: null })
      await vi.advanceTimersByTimeAsync(80)
      await flush()

      expect(api.searchChats).toHaveBeenCalledWith("pl")
      expect(store.chatMatches).toEqual([chat])
    })
  })

  describe("slash commands", () => {
    it("can load the command list when the slash menu opens", async () => {
      api.listCommands.mockResolvedValue([command])
      presenter.start()

      store.setTriggers({ mention: null, chatMention: null, slash: "" })
      await flush()

      expect(api.listCommands).toHaveBeenCalledTimes(1)
      expect(store.commands).toEqual([command])
    })

    it("can keep the same list while the slash query changes", async () => {
      presenter.start()

      store.setTriggers({ mention: null, chatMention: null, slash: "" })
      store.setTriggers({ mention: null, chatMention: null, slash: "r" })
      await flush()

      expect(api.listCommands).toHaveBeenCalledTimes(1)
    })

    it("can ignore a list that arrives after the menu closed", async () => {
      let resolveCommands: (list: SlashCommand[]) => void = () => undefined
      api.listCommands.mockImplementationOnce(() => new Promise<SlashCommand[]>((resolve) => {
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
      api.listCommands.mockRejectedValue(new Error("offline"))
      store.setCommands([command])
      presenter.start()

      store.setTriggers({ mention: null, chatMention: null, slash: "" })
      await flush()

      expect(store.commands).toEqual([command])
    })
  })

  describe("history search", () => {
    it("can close the menus when the history search opens", () => {
      presenter.start()
      store.setTriggers({ mention: { query: "a", start: 0 }, chatMention: null, slash: "x" })

      history.toggleSearch("")

      expect([store.mention, store.slash]).toEqual([null, null])
    })
  })

  describe("sync", () => {
    it("can open the menu for the trigger under the caret", () => {
      presenter.sync("see @a", 6)

      expect(store.mention).toEqual({ query: "a", start: 4 })
    })

    it("can leave the menus closed while the history search is open", () => {
      history.setQuery("")

      presenter.sync("@a", 2)

      expect(store.mention).toBeNull()
    })
  })

  describe("handleMenuKey", () => {
    function openFileMenu() {
      store.setTriggers({ mention: { query: "a", start: 0 }, chatMention: null, slash: null })
      store.setFileMatches([file, other])
    }

    it("can leave the key alone while no menu is open", () => {
      const apply = vi.fn()

      expect(presenter.handleMenuKey(keyEvent("ArrowDown"), "", 0, apply)).toBe(false)
    })

    it("can move the selection with the arrow keys, stopping at each end", () => {
      openFileMenu()

      presenter.handleMenuKey(keyEvent("ArrowDown"), "@a", 2, vi.fn())
      presenter.handleMenuKey(keyEvent("ArrowDown"), "@a", 2, vi.fn())
      expect(store.active).toBe(1)

      presenter.handleMenuKey(keyEvent("ArrowUp"), "@a", 2, vi.fn())
      presenter.handleMenuKey(keyEvent("ArrowUp"), "@a", 2, vi.fn())
      expect(store.active).toBe(0)
    })

    it("can close every menu on Escape", () => {
      openFileMenu()
      const event = keyEvent("Escape")

      expect(presenter.handleMenuKey(event, "@a", 2, vi.fn())).toBe(true)
      expect(store.mention).toBeNull()
      expect(event.preventDefault).toHaveBeenCalledTimes(1)
    })

    it("can pick the selected row on Enter or Tab", () => {
      openFileMenu()
      const apply = vi.fn()

      presenter.handleMenuKey(keyEvent("Tab"), "@a", 2, apply)

      expect(apply).toHaveBeenCalledWith("@a.ts ", 6)
    })

    it("can leave Shift+Enter to the box", () => {
      openFileMenu()

      expect(presenter.handleMenuKey(keyEvent("Enter", true), "@a", 2, vi.fn())).toBe(false)
    })
  })

  describe("choose", () => {
    it("can replace the @ token with the file, close the menu and keep the mention", () => {
      store.setTriggers({ mention: { query: "a", start: 4 }, chatMention: null, slash: null })
      store.setFileMatches([file])
      const apply = vi.fn()

      presenter.choose(0, "see @a now", 6, apply)

      expect(apply).toHaveBeenCalledWith("see @a.ts  now", 10)
      expect(store.mention).toBeNull()
      expect(store.mentions).toEqual([{ path: "src/a.ts", name: "a.ts" }])
    })

    it("can replace the $ token with the chat and keep the chat mention", () => {
      store.setTriggers({ mention: null, chatMention: { query: "pl", start: 0 }, slash: null })
      store.setChatMatches([chat])
      const apply = vi.fn()

      presenter.choose(0, "$pl", 3, apply)

      expect(apply).toHaveBeenCalledWith("$Plan ", 6)
      expect(store.chatMentions).toEqual([{ projectId: "p1", chatId: "c1", title: "Plan", updatedAt: 1 }])
    })

    it("can put the command at the start of the box", () => {
      store.setTriggers({ mention: null, chatMention: null, slash: "re" })
      store.setCommands([command])
      const apply = vi.fn()

      presenter.choose(0, "/re  rest", 3, apply)

      expect(apply).toHaveBeenCalledWith("/review rest", 8)
      expect(store.slash).toBeNull()
    })

    it("can ignore a choice with no row at that index", () => {
      store.setTriggers({ mention: { query: "a", start: 0 }, chatMention: null, slash: null })
      store.setFileMatches([file])
      const apply = vi.fn()

      presenter.choose(5, "@a", 2, apply)

      expect(apply).not.toHaveBeenCalled()
    })
  })

  describe("mentionsIn", () => {
    it("can keep only the mentions whose token is still in the text", () => {
      store.addMention({ path: "src/a.ts", name: "a.ts" })
      store.addMention({ path: "src/b.ts", name: "b.ts" })
      store.addChatMention({ projectId: "p1", chatId: "c1", title: "Plan", updatedAt: 1 })

      expect(presenter.mentionsIn("fix @a.ts")).toEqual({ mentions: [{ path: "src/a.ts", name: "a.ts" }], chatMentions: [] })
    })
  })

  describe("stop", () => {
    it("can cancel a search that is still waiting for its delay", async () => {
      presenter.start()
      store.setTriggers({ mention: { query: "a", start: 0 }, chatMention: null, slash: null })
      presenter.stop()
      await vi.advanceTimersByTimeAsync(200)

      expect(api.searchFiles).not.toHaveBeenCalled()
    })

    it("can stop reacting to the composer once stopped", async () => {
      presenter.start()
      presenter.stop()
      store.setTriggers({ mention: { query: "a", start: 0 }, chatMention: null, slash: null })
      await vi.advanceTimersByTimeAsync(200)

      expect(api.searchFiles).not.toHaveBeenCalled()
    })
  })
})
