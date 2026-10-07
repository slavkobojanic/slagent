import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { ChatSummary, LibraryState } from "@shared/types"
import { ChatListPresenter } from "@/features/library/sidebar/open-project/chat-list/chat-list-presenter/chat-list-presenter"
import { ChatListStore } from "@/features/library/sidebar/open-project/chat-list/chat-list-store/chat-list-store"
import { ChatSwitchPresenter } from "@/features/library/chat-switch/chat-switch-presenter/chat-switch-presenter"
import type { API } from "@/ipc/api"
import { nullLog } from "@/log/log"
import { RunStore } from "@/mirror/run-store/run-store"
import { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import { PanelStore } from "@/state/panel/panel-store/panel-store"
import { ReviewPresenter } from "@/state/review/review-presenter/review-presenter"
import { ReviewStore } from "@/state/review/review-store/review-store"
import { LibraryStore } from "@/mirror/library-store/library-store"
import { ComposerPort } from "@/state/composer-port/composer-port"
import { CommandRegistry, type Command } from "@/state/keyboard/command-registry/command-registry"
import { createMockInstance, type MockInstance } from "@/test/create-mock-instance"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

function chat(id: string, overrides: Partial<ChatSummary> = {}): ChatSummary {
  return { id, title: id, pinned: false, pinnedAt: 0, updatedAt: 0, running: false, status: "idle", finishedAt: null, ...overrides }
}

function libraryState(openProjectId: string | null, chats: ChatSummary[] = []): LibraryState {
  return { projects: [], openProjectId, chats, openChatId: null }
}

function commandNamed(registry: CommandRegistry, id: string): Command {
  const command = registry.commands.find((item) => item.id === id)
  if (command === undefined) {
    throw new Error(`no command ${id}`)
  }
  return command
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

describe("ChatListPresenter", () => {
  let libraryStore: LibraryStore
  let store: ChatListStore
  let api: MockInstance<API>
  let composer: ComposerPort
  let registry: CommandRegistry
  let presenter: ChatListPresenter

  beforeEach(() => {
    vi.clearAllMocks()
    libraryStore = new LibraryStore()
    store = new ChatListStore(libraryStore)
    api = createMockInstance<API>(["openChat"])
    api.openChat.mockResolvedValue(undefined)
    composer = new ComposerPort()
    vi.spyOn(composer, "focus")
    registry = new CommandRegistry()
    stubMedia(false)
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0)
      return 0
    })
    const chatSwitch = new ChatSwitchPresenter(
      new LibraryStore(),
      new RunStore(),
      api,
      new PanelPresenter(new PanelStore(), api, nullLog()),
      new ReviewPresenter(new ReviewStore(), nullLog()),
      nullLog(),
    )
    presenter = new ChatListPresenter(store, libraryStore, window, composer, registry, chatSwitch, nullLog())
  })

  afterEach(() => {
    presenter.stop()
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

    it("can go back to the limited list when another project opens", () => {
      presenter.start()
      libraryStore.setLibrary(libraryState("p1"))
      store.setShowAll(true)

      libraryStore.setLibrary(libraryState("p2"))

      expect(store.showAll).toBe(false)
    })

    it("can register a number command for each of the first nine chat positions", () => {
      presenter.start()

      const shortcuts = Array.from({ length: 9 }, (_, index) => commandNamed(registry, `chat.open.${index + 1}`).shortcut)

      expect(shortcuts[0]).toEqual({ key: "1", mod: true })
      expect(shortcuts[8]).toEqual({ key: "9", mod: true })
    })

    it("can keep the number commands out of the palette, since the chat list already shows their hints", () => {
      presenter.start()

      expect(commandNamed(registry, "chat.open.1").inPalette).toBe(false)
      expect(commandNamed(registry, "chat.open.9").inPalette).toBe(false)
    })

    it("can leave a number command disabled when no chat sits at its position", () => {
      presenter.start()
      libraryStore.setLibrary(libraryState("p1", [chat("c1")]))

      expect(commandNamed(registry, "chat.open.1").enabled?.()).toBe(true)
      expect(commandNamed(registry, "chat.open.2").enabled?.()).toBe(false)
    })

    it("can register its commands only once when started twice", () => {
      presenter.start()
      presenter.start()

      expect(registry.commands).toHaveLength(9)
    })

    it("can open the chat at its position in the ordered list and focus the composer", async () => {
      presenter.start()
      libraryStore.setLibrary(libraryState("p1", [chat("old", { updatedAt: 1 }), chat("new", { updatedAt: 9 })]))

      commandNamed(registry, "chat.open.1").run()
      await flush()

      expect(api.openChat).toHaveBeenCalledWith("new")
      expect(composer.focus).toHaveBeenCalledTimes(1)
    })
  })

  describe("stop", () => {
    it("can stop following the library and the motion preference, and drop its commands", () => {
      const media = stubMedia(false)
      presenter.start()

      presenter.stop()
      store.setShowAll(true)
      libraryStore.setLibrary(libraryState("p2"))

      expect(media.media.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function))
      expect(store.showAll).toBe(true)
      expect(registry.commands).toHaveLength(0)
    })
  })

  describe("handleShowAll and handleShowLess", () => {
    it("can show every chat and then return to the limited list", () => {
      presenter.handleShowAll()
      expect(store.showAll).toBe(true)

      presenter.handleShowLess()
      expect(store.showAll).toBe(false)
    })
  })
})
