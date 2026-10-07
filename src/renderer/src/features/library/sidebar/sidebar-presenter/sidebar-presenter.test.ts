import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest"
import { DONE_WINDOW_MS, type ChatSearchResult, type ChatSummary, type LibraryState, type ProjectSummary } from "@shared/types"
import type { LibraryPresenter } from "@/features/library/library-presenter/library-presenter"
import { chatDisplayStatus } from "@/features/library/library-utils"
import { SidebarPresenter } from "@/features/library/sidebar/sidebar-presenter/sidebar-presenter"
import { SidebarStore } from "@/features/library/sidebar/sidebar-store/sidebar-store"
import { LibraryStore } from "@/mirror/library-store"
import { CommandRegistry } from "@/state/command-registry"
import { createMockInstance } from "@/test/create-mock-instance"

const SEARCH_DELAY_MS = 150

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

function chat(id: string, overrides: Partial<ChatSummary> = {}): ChatSummary {
  return { id, title: id, pinned: false, pinnedAt: 0, updatedAt: 0, running: false, status: "idle", finishedAt: null, ...overrides }
}

function project(id: string, overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return { id, path: `/work/${id}`, name: id, pinned: false, pinnedAt: 0, lastOpenedAt: 0, running: false, attention: false, ...overrides }
}

function libraryState(openProjectId: string | null, openChatId: string | null = null, chats: ChatSummary[] = []): LibraryState {
  return { projects: [], openProjectId, chats, openChatId }
}

function match(chatId: string, projectId = "p1", messageId: string | null = null): ChatSearchResult {
  return { projectId, projectName: "Atlas", chatId, title: chatId, snippet: "", messageId, updatedAt: 1 }
}

// jsdom has no matchMedia. The stub controls the reduced-motion setting and lets a test fire its change event.
function stubMedia(matches: boolean) {
  let listener: ((event: { matches: boolean }) => void) | null = null
  const media = {
    matches,
    addEventListener: vi.fn((_type: string, next: (event: { matches: boolean }) => void) => {
      listener = next
    }),
    removeEventListener: vi.fn(),
  }
  Object.defineProperty(window, "matchMedia", { configurable: true, writable: true, value: vi.fn(() => media) })
  return {
    media,
    change: (value: boolean) => {
      listener?.({ matches: value })
    },
  }
}

describe("SidebarPresenter", () => {
  let store: SidebarStore
  let mirror: LibraryStore
  let library: { [K in keyof LibraryPresenter]: Mock }
  let layout: { setSidebarOpen: Mock }
  let jump: { request: Mock }
  let chatDeletion: { handleRequest: Mock }
  let projectRemoval: { handleRequest: Mock }
  let registry: CommandRegistry
  let presenter: SidebarPresenter

  beforeEach(() => {
    vi.clearAllMocks()
    store = new SidebarStore()
    mirror = new LibraryStore()
    library = createMockInstance<LibraryPresenter>([
      "openChat",
      "openProject",
      "newChat",
      "pinProject",
      "pinChat",
      "renameChat",
      "searchChats",
      "copyTranscript",
      "chooseFolder",
    ])
    library.searchChats.mockResolvedValue([])
    layout = { setSidebarOpen: vi.fn() }
    jump = { request: vi.fn() }
    chatDeletion = { handleRequest: vi.fn() }
    projectRemoval = { handleRequest: vi.fn() }
    registry = new CommandRegistry()
    stubMedia(false)
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0)
      return 0
    })
    presenter = new SidebarPresenter(store, library, layout, jump, chatDeletion, projectRemoval, mirror, registry, { window })
  })

  afterEach(() => {
    presenter.stop()
    vi.useRealTimers()
    vi.restoreAllMocks()
    Reflect.deleteProperty(window, "matchMedia")
  })

  describe("start", () => {
    it("can read the reduced-motion preference when started", () => {
      stubMedia(true)

      presenter.start()

      expect(store.reduceMotion).toBe(true)
    })

    it("can follow the system when the reduced-motion preference changes", () => {
      const media = stubMedia(false)
      presenter.start()

      media.change(true)

      expect(store.reduceMotion).toBe(true)
    })

    it("can show every chat again when another project opens", () => {
      presenter.start()
      mirror.setLibrary(libraryState("p1"))
      store.setShowAll(true)

      mirror.setLibrary(libraryState("p2"))

      expect(store.showAll).toBe(false)
    })

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
    it("can stop following the library and the motion preference", () => {
      const media = stubMedia(false)
      presenter.start()

      presenter.stop()
      store.setShowAll(true)
      mirror.setLibrary(libraryState("p2"))

      expect(media.media.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function))
      expect(store.showAll).toBe(true)
    })
  })

  describe("search", () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    it("can wait before searching so each key does not start a search", () => {
      presenter.handleQueryChange("pl")

      expect(library.searchChats).not.toHaveBeenCalled()

      vi.advanceTimersByTime(SEARCH_DELAY_MS)

      expect(library.searchChats).toHaveBeenCalledWith("pl")
    })

    it("can show the matches once the search resolves", async () => {
      library.searchChats.mockResolvedValue([match("c1")])
      presenter.handleQueryChange("pl")

      await vi.advanceTimersByTimeAsync(SEARCH_DELAY_MS)

      expect(store.results).toEqual([match("c1")])
    })

    it("can clear the results when the query is blank", () => {
      store.setResults([match("c1")])

      presenter.handleQueryChange("   ")

      expect(store.results).toBeNull()
      expect(library.searchChats).not.toHaveBeenCalled()
    })

    it("can drop a search whose query has changed while it ran", async () => {
      let resolveFirst: (value: ChatSearchResult[]) => void = () => undefined
      library.searchChats.mockReturnValueOnce(
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

      expect(library.searchChats).not.toHaveBeenCalledWith("a")
    })
  })

  describe("handleSearchKeyDown", () => {
    it("can clear the query on Escape", () => {
      store.setQuery("pl")

      presenter.handleSearchKeyDown("Escape")

      expect(store.query).toBe("")
    })

    it("can open the best match on Enter and clear the search", () => {
      store.setResults([match("c1", "p1", "m1")])
      store.setQuery("pl")

      presenter.handleSearchKeyDown("Enter")

      expect(library.openChat).toHaveBeenCalledWith("c1", "p1", "m1")
      expect(store.query).toBe("")
    })

    it("can do nothing on Enter when there are no matches", () => {
      presenter.handleSearchKeyDown("Enter")

      expect(library.openChat).not.toHaveBeenCalled()
    })
  })

  describe("openResult", () => {
    it("can open a match's chat at the message that matched", () => {
      presenter.openResult(match("c1", "p1", "m1"))

      expect(library.openChat).toHaveBeenCalledWith("c1", "p1", "m1")
    })

    it("can open a title-only match at the chat without a message", () => {
      presenter.openResult(match("c1", "p1", null))

      expect(library.openChat.mock.calls[0]?.[2]).toBeUndefined()
    })

    it("can ask the transcript to jump to the matched message once the chat has opened", async () => {
      library.openChat.mockResolvedValue(true)

      presenter.openResult(match("c1", "p1", "m1"))
      await flush()

      expect(jump.request).toHaveBeenCalledWith("m1")
    })

    it("can wait for the chat to open before asking for the jump", async () => {
      let finishOpen: (opened: boolean) => void = () => undefined
      library.openChat.mockReturnValueOnce(
        new Promise<boolean>((resolve) => {
          finishOpen = resolve
        }),
      )

      presenter.openResult(match("c1", "p1", "m1"))
      expect(jump.request).not.toHaveBeenCalled()

      finishOpen(true)
      await flush()

      expect(jump.request).toHaveBeenCalledWith("m1")
    })

    it("can skip the jump when the chat did not open", async () => {
      library.openChat.mockResolvedValue(false)

      presenter.openResult(match("c1", "p1", "m1"))
      await flush()

      expect(jump.request).not.toHaveBeenCalled()
    })

    it("can skip the jump for a title-only match, which has no message to scroll to", async () => {
      library.openChat.mockResolvedValue(true)

      presenter.openResult(match("c1", "p1", null))
      await flush()

      expect(jump.request).not.toHaveBeenCalled()
    })
  })

  describe("chat and project actions", () => {
    it("can open a chat by its id", () => {
      presenter.openChat(chat("c1"))

      expect(library.openChat).toHaveBeenCalledWith("c1")
    })

    it("can pin an unpinned chat and unpin a pinned one", () => {
      presenter.pinChat(chat("c1"))
      presenter.pinChat(chat("c2", { pinned: true }))

      expect(library.pinChat).toHaveBeenNthCalledWith(1, "c1", true)
      expect(library.pinChat).toHaveBeenNthCalledWith(2, "c2", false)
    })

    it("can ask the delete confirmation to confirm a chat", () => {
      const target = chat("c1")

      presenter.deleteChat(target)

      expect(chatDeletion.handleRequest).toHaveBeenCalledWith(target)
    })

    it("can copy a chat's transcript through the library", () => {
      const target = chat("c1")

      presenter.copyTranscript(target)

      expect(library.copyTranscript).toHaveBeenCalledWith(target)
    })

    it("can open a project by its id", () => {
      presenter.openProject(project("p1"))

      expect(library.openProject).toHaveBeenCalledWith("p1")
    })

    it("can start a chat in a project", () => {
      presenter.newChat(project("p1"))

      expect(library.newChat).toHaveBeenCalledWith("p1")
    })

    it("can pin an unpinned project and unpin a pinned one", () => {
      presenter.pinProject(project("p1"))
      presenter.pinProject(project("p2", { pinned: true }))

      expect(library.pinProject).toHaveBeenNthCalledWith(1, "p1", true)
      expect(library.pinProject).toHaveBeenNthCalledWith(2, "p2", false)
    })

    it("can ask the remove confirmation to confirm a project", () => {
      const target = project("p1")

      presenter.removeProject(target)

      expect(projectRemoval.handleRequest).toHaveBeenCalledWith(target)
    })

    it("can choose a folder through the library", () => {
      presenter.chooseFolder()

      expect(library.chooseFolder).toHaveBeenCalledTimes(1)
    })
  })

  describe("rename", () => {
    it("can start renaming a chat with its current title", () => {
      presenter.startRename(chat("c1", { title: "Plan" }))

      expect(store.renamingId).toBe("c1")
      expect(store.draft).toBe("Plan")
    })

    it("can save the trimmed title and stop renaming", () => {
      presenter.startRename(chat("c1"))
      presenter.handleDraftChange("  Launch plan  ")

      presenter.saveRename(chat("c1"))

      expect(library.renameChat).toHaveBeenCalledWith("c1", "Launch plan")
      expect(store.renamingId).toBeNull()
    })

    it("can stop renaming without saving when the title is blank", () => {
      presenter.startRename(chat("c1"))
      presenter.handleDraftChange("   ")

      presenter.saveRename(chat("c1"))

      expect(library.renameChat).not.toHaveBeenCalled()
      expect(store.renamingId).toBeNull()
    })

    it("can leave the title alone when Escape cancelled the rename", () => {
      presenter.startRename(chat("c1"))
      presenter.handleDraftChange("Other")
      presenter.cancelRename()

      presenter.saveRename(chat("c1"))

      expect(library.renameChat).not.toHaveBeenCalled()
    })

    it("can save the next rename after an earlier one was cancelled", () => {
      presenter.startRename(chat("c1"))
      presenter.cancelRename()
      presenter.startRename(chat("c1"))
      presenter.handleDraftChange("New")

      presenter.saveRename(chat("c1"))

      expect(library.renameChat).toHaveBeenCalledWith("c1", "New")
    })

    it("can ignore a save for a row that is not the one being renamed", () => {
      presenter.startRename(chat("c2"))

      presenter.saveRename(chat("c1"))

      expect(library.renameChat).not.toHaveBeenCalled()
      expect(store.renamingId).toBe("c2")
    })
  })

  describe("setChatMenuOpen", () => {
    it("can mark a chat's menu as open", () => {
      presenter.setChatMenuOpen(chat("c1"), true)

      expect(store.menuChatId).toBe("c1")
    })

    it("can close only the menu that is open", () => {
      presenter.setChatMenuOpen(chat("c1"), true)

      presenter.setChatMenuOpen(chat("c2"), false)
      expect(store.menuChatId).toBe("c1")

      presenter.setChatMenuOpen(chat("c1"), false)
      expect(store.menuChatId).toBeNull()
    })
  })

  describe("collapse and show more", () => {
    it("can collapse and then expand the open project's chat list", () => {
      presenter.toggleProject(project("p1"))
      expect(store.isCollapsed("p1")).toBe(true)

      presenter.toggleProject(project("p1"))
      expect(store.isCollapsed("p1")).toBe(false)
    })

    it("can show every chat and then return to the limited list", () => {
      presenter.handleShowAll()
      expect(store.showAll).toBe(true)

      presenter.handleShowLess()
      expect(store.showAll).toBe(false)
    })
  })

  describe("done window clock", () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(1_000_000))
    })

    it("can move a finished chat to idle when its window closes", () => {
      const finished = chat("c1", { status: "done", finishedAt: 1_000_000 })
      presenter.start()

      mirror.setLibrary(libraryState("p1", null, [finished]))
      expect(store.now).toBe(1_000_000)

      vi.advanceTimersByTime(DONE_WINDOW_MS + 50)

      expect(store.now).toBe(1_000_000 + DONE_WINDOW_MS + 50)
      expect(chatDisplayStatus(finished, store.now)).toBe("idle")
    })

    it("can leave the clock alone when no finished chat is waiting", () => {
      presenter.start()

      vi.advanceTimersByTime(60_000)

      expect(store.now).toBe(1_000_000)
    })
  })
})
