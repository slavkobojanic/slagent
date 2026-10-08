import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { ChatSummary, LibraryState } from "@shared/types"
import { NavHistoryPresenter } from "@/features/library/nav-history/nav-history-presenter/nav-history-presenter"
import { NavHistoryStore } from "@/features/library/nav-history/nav-history-store/nav-history-store"
import { LibraryStore } from "@/mirror/library-store/library-store"
import { ComposerPort } from "@/state/composer-port/composer-port"
import { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import { ChatSwitchPresenter } from "@/features/library/chat-switch/chat-switch-presenter/chat-switch-presenter"
import type { API } from "@/ipc/api"
import { nullLog } from "@/log/log"
import { RunStore } from "@/mirror/run-store/run-store"
import { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import { PanelStore } from "@/state/panel/panel-store/panel-store"
import { ReviewPresenter } from "@/state/review/review-presenter/review-presenter"
import { ReviewStore } from "@/state/review/review-store/review-store"
import { createMockInstance, type MockInstance } from "@/test/create-mock-instance"

function chat(id: string): ChatSummary {
  return { id, title: id, pinned: false, pinnedAt: 0, updatedAt: 0, running: false, status: "idle", finishedAt: null }
}

function place(projectId: string, chatId: string | null) {
  return { projectId, chatId }
}

function libraryState(openProjectId: string | null, openChatId: string | null, chats: ChatSummary[] = []): LibraryState {
  return { projects: [], openProjectId, chats, chatsByProject: {}, openChatId }
}

describe("NavHistoryPresenter", () => {
  let store: NavHistoryStore
  let mirror: LibraryStore
  let api: MockInstance<API>
  let composer: ComposerPort
  let registry: CommandRegistry
  let presenter: NavHistoryPresenter

  beforeEach(() => {
    store = new NavHistoryStore()
    mirror = new LibraryStore()
    api = createMockInstance<API>(["openChat", "openProject", "newChat"])
    composer = new ComposerPort()
    vi.spyOn(composer, "focus")
    registry = new CommandRegistry()
    const chatSwitch = new ChatSwitchPresenter(
      new LibraryStore(),
      new RunStore(),
      api,
      new PanelPresenter(new PanelStore(), api, nullLog()),
      new ReviewPresenter(new ReviewStore(), nullLog()),
      nullLog(),
    )
    presenter = new NavHistoryPresenter(store, api, window, mirror, composer, registry, chatSwitch, nullLog())
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0)
      return 0
    })
  })

  afterEach(() => {
    presenter.stop()
    vi.restoreAllMocks()
  })

  describe("start", () => {
    it("can record each place the library moves to", () => {
      presenter.start()

      mirror.setLibrary(libraryState("p1", "c1"))

      expect(store.entries).toEqual([place("p1", "c1")])
    })

    it("can skip a change that has no project open", () => {
      presenter.start()

      mirror.setLibrary(libraryState(null, null))

      expect(store.entries).toEqual([])
    })

    it("can skip a change that leaves the same place", () => {
      presenter.start()
      mirror.setLibrary(libraryState("p1", "c1"))

      mirror.setLibrary(libraryState("p1", "c1"))

      expect(store.entries).toHaveLength(1)
    })

    it("can replace a draft's entry when the draft receives its first chat", () => {
      presenter.start()
      mirror.setLibrary(libraryState("p1", null))

      mirror.setLibrary(libraryState("p1", "c9", [chat("c9")]))

      expect(store.entries).toEqual([place("p1", "c9")])
    })

    it("can record an existing chat opened from a draft as a new visit", () => {
      presenter.start()
      mirror.setLibrary(libraryState("p1", null, [chat("c1")]))

      mirror.setLibrary(libraryState("p1", "c1", [chat("c1")]))

      expect(store.entries).toEqual([place("p1", null), place("p1", "c1")])
    })

    it("can skip the library event for the place it is opening itself", () => {
      presenter.start()
      store.setPending(place("p1", "c5"))

      mirror.setLibrary(libraryState("p1", "c5"))

      expect(store.entries).toEqual([])
      expect(store.pending).toBeNull()
    })

    it("can skip the steps on the way to a pending place without recording them", () => {
      presenter.start()
      store.setPending(place("p1", "c5"))

      mirror.setLibrary(libraryState("p2", null))

      expect(store.entries).toEqual([])
      expect(store.pending).toEqual(place("p1", "c5"))
    })

    it("can stop recording once stopped", () => {
      presenter.start()
      presenter.stop()

      mirror.setLibrary(libraryState("p1", "c1"))

      expect(store.entries).toEqual([])
    })

    it("can register the back and forward shortcuts, kept out of the palette as the old one never listed them", () => {
      presenter.start()

      const back = registry.commands.find((command) => command.id === "history.back")
      const forward = registry.commands.find((command) => command.id === "history.forward")

      expect(back?.shortcut).toEqual({ key: "[", mod: true })
      expect(back?.inPalette).toBe(false)
      expect(forward?.shortcut).toEqual({ key: "]", mod: true })
      expect(forward?.inPalette).toBe(false)
    })
  })

  describe("back", () => {
    it("can open the previous chat in its project and focus the composer", async () => {
      store.record(place("p1", "c1"))
      store.record(place("p1", "c2"))
      mirror.setLibrary(libraryState("p1", "c2"))

      await presenter.back()

      expect(api.openChat).toHaveBeenCalledWith("c1", "p1")
      expect(store.index).toBe(0)
      expect(composer.focus).toHaveBeenCalledTimes(1)
    })

    it("can step over a place that is already on screen", async () => {
      store.record(place("p1", "c1"))
      store.record(place("p1", "c2"))
      store.record(place("p1", "c2"))
      mirror.setLibrary(libraryState("p1", "c2"))

      await presenter.back()

      expect(api.openChat).toHaveBeenCalledWith("c1", "p1")
      expect(store.index).toBe(0)
    })

    it("can drop a place that cannot be opened and try the one before it", async () => {
      store.record(place("p1", "c0"))
      store.record(place("p1", "c1"))
      store.record(place("p1", "c2"))
      mirror.setLibrary(libraryState("p1", "c2"))
      api.openChat.mockRejectedValueOnce(new Error("gone")).mockResolvedValueOnce(undefined)

      await presenter.back()

      expect(api.openChat.mock.calls.map((call) => call[0])).toEqual(["c1", "c0"])
      expect(store.entries).toEqual([place("p1", "c0"), place("p1", "c2")])
      expect(store.index).toBe(0)
    })

    it("can do nothing when already at the oldest place", async () => {
      store.record(place("p1", "c1"))
      mirror.setLibrary(libraryState("p1", "c1"))

      await presenter.back()

      expect(api.openChat).not.toHaveBeenCalled()
    })
  })

  describe("forward", () => {
    it("can open the next newer place", async () => {
      store.record(place("p1", "c1"))
      store.record(place("p1", "c2"))
      store.moveTo(0)
      mirror.setLibrary(libraryState("p1", "c1"))

      await presenter.forward()

      expect(api.openChat).toHaveBeenCalledWith("c2", "p1")
      expect(store.index).toBe(1)
    })

    it("can open a draft by opening its project and starting a new chat", async () => {
      store.record(place("p2", "c1"))
      store.record(place("p1", null))
      store.moveTo(0)
      mirror.setLibrary(libraryState("p2", "c1"))

      await presenter.forward()

      expect(api.openProject).toHaveBeenCalledWith("p1")
      expect(api.newChat).toHaveBeenCalledTimes(1)
      expect(store.index).toBe(1)
    })
  })
})
