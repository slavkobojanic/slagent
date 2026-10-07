import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import type { LibraryState, ProjectSummary } from "@shared/types"
import { ProjectRemovalStore } from "@/features/library/project-removal/project-removal-store/project-removal-store"
import { ProjectRowPresenter } from "@/features/library/sidebar/project-row/project-row-presenter/project-row-presenter"
import type { API } from "@/ipc/api"
import { LibraryStore } from "@/mirror/library-store/library-store"
import { ComposerPort } from "@/state/composer-port/composer-port"
import { CommandRegistry, type Command } from "@/state/keyboard/command-registry/command-registry"
import { createMockInstance, type MockInstance } from "@/test/create-mock-instance"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

function project(id: string, overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return { id, path: `/work/${id}`, name: id, pinned: false, pinnedAt: 0, lastOpenedAt: 0, running: false, attention: false, ...overrides }
}

function libraryState(overrides: Partial<LibraryState> = {}): LibraryState {
  return { projects: [], openProjectId: null, chats: [], openChatId: null, ...overrides }
}

function commandNamed(registry: CommandRegistry, id: string): Command {
  const command = registry.commands.find((item) => item.id === id)
  if (command === undefined) {
    throw new Error(`no command ${id}`)
  }
  return command
}

describe("ProjectRowPresenter", () => {
  let api: MockInstance<API>
  let libraryStore: LibraryStore
  let composer: ComposerPort
  let registry: CommandRegistry
  let removal: ProjectRemovalStore
  let presenter: ProjectRowPresenter

  beforeEach(() => {
    vi.clearAllMocks()
    api = createMockInstance<API>(["openProject", "newChat", "pinProject"])
    api.openProject.mockResolvedValue(undefined)
    api.newChat.mockResolvedValue(undefined)
    api.pinProject.mockResolvedValue(undefined)
    libraryStore = new LibraryStore()
    composer = new ComposerPort()
    vi.spyOn(composer, "focus")
    registry = new CommandRegistry()
    removal = new ProjectRemovalStore()
    presenter = new ProjectRowPresenter(api, window, libraryStore, composer, registry, removal)
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
    it("can enable the new chat command only while a project is open", () => {
      presenter.start()
      const command = commandNamed(registry, "chat.new")

      expect(command.enabled?.()).toBe(false)
      libraryStore.setLibrary(libraryState({ openProjectId: "p1" }))

      expect(command.enabled?.()).toBe(true)
    })

    it("can register its command only once when started twice", () => {
      presenter.start()
      presenter.start()

      expect(registry.commands).toHaveLength(1)
    })

    it("can start a draft in the open project when the new chat command runs", async () => {
      presenter.start()
      libraryStore.setLibrary(libraryState({ openProjectId: "p1" }))

      commandNamed(registry, "chat.new").run()
      await flush()

      expect(api.openProject).not.toHaveBeenCalled()
      expect(api.newChat).toHaveBeenCalledTimes(1)
    })
  })

  describe("stop", () => {
    it("can remove its command from the registry", () => {
      presenter.start()

      presenter.stop()

      expect(registry.commands).toHaveLength(0)
    })
  })

  describe("handleNewChat", () => {
    it("can open the project first when it is not the open one", async () => {
      libraryStore.setLibrary(libraryState({ openProjectId: "p1" }))

      await presenter.handleNewChat(project("p2"))

      expect(api.openProject).toHaveBeenCalledWith("p2")
      expect(api.newChat).toHaveBeenCalledTimes(1)
    })

    it("can start a draft in the open project without opening it again", async () => {
      libraryStore.setLibrary(libraryState({ openProjectId: "p1" }))

      await presenter.handleNewChat(project("p1"))

      expect(api.openProject).not.toHaveBeenCalled()
      expect(api.newChat).toHaveBeenCalledTimes(1)
    })

    it("can focus the composer once the draft starts", async () => {
      await presenter.handleNewChat(project("p1"))

      expect(composer.focus).toHaveBeenCalledTimes(1)
    })

    it("can show a toast and still focus the composer when the draft cannot start", async () => {
      api.newChat.mockRejectedValue(new Error("No folder"))

      await presenter.handleNewChat(project("p1"))

      expect(toast.error).toHaveBeenCalledWith("No folder")
      expect(composer.focus).toHaveBeenCalledTimes(1)
    })
  })

  describe("handlePin", () => {
    it("can pin an unpinned project and unpin a pinned one", async () => {
      await presenter.handlePin(project("p1"))
      await presenter.handlePin(project("p2", { pinned: true }))

      expect(api.pinProject).toHaveBeenNthCalledWith(1, "p1", true)
      expect(api.pinProject).toHaveBeenNthCalledWith(2, "p2", false)
    })
  })

  describe("handleRemove", () => {
    it("can ask the remove confirmation to confirm a project", () => {
      const target = project("p1")

      presenter.handleRemove(target)

      expect(removal.target).toEqual(target)
    })
  })
})
