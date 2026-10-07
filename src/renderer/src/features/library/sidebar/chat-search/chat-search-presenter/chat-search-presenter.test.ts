import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { ChatSearchResult } from "@shared/types"
import { ChatSearchPresenter } from "@/features/library/sidebar/chat-search/chat-search-presenter/chat-search-presenter"
import { ChatSearchStore } from "@/features/library/sidebar/chat-search/chat-search-store/chat-search-store"
import type { API } from "@/ipc/api"
import { JumpPort } from "@/state/jump-port/jump-port"
import { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import { LayoutPresenter } from "@/state/layout/layout-presenter/layout-presenter"
import { LayoutStore } from "@/state/layout/layout-store/layout-store"
import { createMockInstance, type MockInstance } from "@/test/create-mock-instance"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

const SEARCH_DELAY_MS = 150

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

function match(chatId: string, projectId = "p1", messageId: string | null = null): ChatSearchResult {
  return { projectId, projectName: "Atlas", chatId, title: chatId, snippet: "", messageId, updatedAt: 1 }
}

describe("ChatSearchPresenter", () => {
  let store: ChatSearchStore
  let api: MockInstance<API>
  let jump: JumpPort
  let layout: LayoutPresenter
  let registry: CommandRegistry
  let presenter: ChatSearchPresenter

  beforeEach(() => {
    vi.clearAllMocks()
    store = new ChatSearchStore()
    api = createMockInstance<API>(["openChat", "searchChats"])
    api.openChat.mockResolvedValue(undefined)
    api.searchChats.mockResolvedValue([])
    jump = new JumpPort()
    vi.spyOn(jump, "request")
    layout = new LayoutPresenter(new LayoutStore(), window)
    vi.spyOn(layout, "setSidebarOpen")
    registry = new CommandRegistry()
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0)
      return 0
    })
    presenter = new ChatSearchPresenter(store, api, window, jump, layout, registry)
  })

  afterEach(() => {
    presenter.stop()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe("start", () => {
    it("can register the search shortcut", () => {
      presenter.start()

      expect(registry.commands.find((command) => command.id === "search.open")?.shortcut).toEqual({ key: "f", mod: true, shift: true })
    })

    it("can open the sidebar and focus the search box when the search shortcut runs", () => {
      const input = document.createElement("input")
      input.id = "chat-search"
      document.body.append(input)
      presenter.start()

      registry.run("search.open")

      expect(layout.setSidebarOpen).toHaveBeenCalledWith(true)
      expect(document.activeElement).toBe(input)
      input.remove()
    })
  })

  describe("stop", () => {
    it("can remove the search shortcut", () => {
      presenter.start()

      presenter.stop()

      expect(registry.commands).toHaveLength(0)
    })
  })

  describe("search", () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    it("can wait before searching so each key does not start a search", () => {
      presenter.handleQueryChange("pl")

      expect(api.searchChats).not.toHaveBeenCalled()

      vi.advanceTimersByTime(SEARCH_DELAY_MS)

      expect(api.searchChats).toHaveBeenCalledWith("pl")
    })

    it("can show the matches once the search resolves", async () => {
      api.searchChats.mockResolvedValue([match("c1")])
      presenter.handleQueryChange("pl")

      await vi.advanceTimersByTimeAsync(SEARCH_DELAY_MS)

      expect(store.results).toEqual([match("c1")])
    })

    it("can clear the results when the query is blank", () => {
      store.setResults([match("c1")])

      presenter.handleQueryChange("   ")

      expect(store.results).toBeNull()
      expect(api.searchChats).not.toHaveBeenCalled()
    })

    it("can drop a search whose query has changed while it ran", async () => {
      let resolveFirst: (value: ChatSearchResult[]) => void = () => undefined
      api.searchChats.mockReturnValueOnce(
        new Promise<ChatSearchResult[]>((resolve) => {
          resolveFirst = resolve
        }),
      )
      presenter.handleQueryChange("a")
      await vi.advanceTimersByTimeAsync(SEARCH_DELAY_MS)
      presenter.handleQueryChange("ab")

      resolveFirst([match("stale")])
      await vi.advanceTimersByTimeAsync(0)

      expect(store.results).toBeNull()
    })

    it("can cancel a pending search when the query changes before the delay ends", () => {
      presenter.handleQueryChange("a")
      vi.advanceTimersByTime(SEARCH_DELAY_MS - 1)
      presenter.handleQueryChange("ab")

      vi.advanceTimersByTime(1)

      expect(api.searchChats).not.toHaveBeenCalledWith("a")
    })
  })

  describe("handleKeyDown", () => {
    it("can clear the query on Escape", () => {
      store.setQuery("pl")

      presenter.handleKeyDown("Escape")

      expect(store.query).toBe("")
    })

    it("can open the best match on Enter and clear the search", () => {
      store.setResults([match("c1", "p1", "m1")])
      store.setQuery("pl")

      presenter.handleKeyDown("Enter")

      expect(api.openChat).toHaveBeenCalledWith("c1", "p1", "m1")
      expect(store.query).toBe("")
    })

    it("can do nothing on Enter when there are no matches", () => {
      presenter.handleKeyDown("Enter")

      expect(api.openChat).not.toHaveBeenCalled()
    })
  })

  describe("handleOpen", () => {
    it("can open a match's chat at the message that matched", () => {
      presenter.handleOpen(match("c1", "p1", "m1"))

      expect(api.openChat).toHaveBeenCalledWith("c1", "p1", "m1")
    })

    it("can open a title-only match at the chat without a message", () => {
      presenter.handleOpen(match("c1", "p1", null))

      expect(api.openChat.mock.calls[0]?.[2]).toBeUndefined()
    })

    it("can ask the transcript to jump to the matched message once the chat has opened", async () => {
      presenter.handleOpen(match("c1", "p1", "m1"))
      await flush()

      expect(jump.request).toHaveBeenCalledWith("m1")
    })

    it("can wait for the chat to open before asking for the jump", async () => {
      let finishOpen: () => void = () => undefined
      api.openChat.mockReturnValueOnce(
        new Promise<void>((resolve) => {
          finishOpen = resolve
        }),
      )

      presenter.handleOpen(match("c1", "p1", "m1"))
      expect(jump.request).not.toHaveBeenCalled()

      finishOpen()
      await flush()

      expect(jump.request).toHaveBeenCalledWith("m1")
    })

    it("can skip the jump when the chat did not open", async () => {
      api.openChat.mockRejectedValue(new Error("Chat is gone"))

      presenter.handleOpen(match("c1", "p1", "m1"))
      await flush()

      expect(jump.request).not.toHaveBeenCalled()
    })

    it("can skip the jump for a title-only match, which has no message to scroll to", async () => {
      presenter.handleOpen(match("c1", "p1", null))
      await flush()

      expect(jump.request).not.toHaveBeenCalled()
    })
  })
})
