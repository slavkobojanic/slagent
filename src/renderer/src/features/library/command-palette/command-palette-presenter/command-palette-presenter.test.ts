import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import type { ChatSummary, ProjectSummary, SlashCommand } from "@shared/types"
import { CommandPalettePresenter } from "@/features/library/command-palette/command-palette-presenter/command-palette-presenter"
import { CommandPaletteStore } from "@/features/library/command-palette/command-palette-store/command-palette-store"
import type { API } from "@/ipc/api"
import { CommandRegistry, type Command } from "@/state/keyboard/command-registry/command-registry"
import { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"
import { ComposerPort } from "@/state/composer-port/composer-port"
import { createMockInstance, type MockInstance } from "@/test/create-mock-instance"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

const review: SlashCommand = { name: "review", insert: "/review", description: "Review the changes", kind: "prompt" }

function chat(id: string): ChatSummary {
  return { id, title: id, pinned: false, pinnedAt: 0, updatedAt: 0, running: false, status: "idle", finishedAt: null }
}

function project(id: string): ProjectSummary {
  return { id, path: `/work/${id}`, name: id, pinned: false, pinnedAt: 0, lastOpenedAt: 0, running: false, attention: false }
}

function commandNamed(registry: CommandRegistry, id: string): Command {
  const command = registry.commands.find((item) => item.id === id)
  if (command === undefined) {
    throw new Error(`no command ${id}`)
  }
  return command
}

describe("CommandPalettePresenter", () => {
  let store: CommandPaletteStore
  let overlay: OverlayStore
  let api: MockInstance<API>
  let registry: CommandRegistry
  let composer: ComposerPort
  let presenter: CommandPalettePresenter

  beforeEach(() => {
    vi.clearAllMocks()
    store = new CommandPaletteStore()
    overlay = new OverlayStore()
    api = createMockInstance<API>(["openChat", "openProject", "listCommands", "setModel"])
    api.openChat.mockResolvedValue(undefined)
    api.openProject.mockResolvedValue(undefined)
    api.listCommands.mockResolvedValue([review])
    api.setModel.mockResolvedValue({ applied: true })
    registry = new CommandRegistry()
    composer = new ComposerPort()
    vi.spyOn(composer, "fill")
    presenter = new CommandPalettePresenter(store, api, window, overlay, registry, composer)
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
    it("can open and close the palette from the toggle shortcut", () => {
      presenter.start()

      commandNamed(registry, "palette.toggle").run()
      expect(overlay.paletteOpen).toBe(true)

      commandNamed(registry, "palette.toggle").run()
      expect(overlay.paletteOpen).toBe(false)
    })

    it("can register the toggle as a keyboard command that the palette does not list", () => {
      presenter.start()

      expect(commandNamed(registry, "palette.toggle").shortcut).toEqual({ key: "k", mod: true })
      expect(commandNamed(registry, "palette.toggle").inPalette).toBe(false)
    })

    it("can load the skills and slash commands when the palette opens", async () => {
      presenter.start()

      overlay.setOpen("palette", true)
      await flush()

      expect(api.listCommands).toHaveBeenCalledTimes(1)
      expect(store.slashCommands).toEqual([review])
    })

    it("can keep the last list when loading the skills fails", async () => {
      api.listCommands.mockRejectedValue(new Error("offline"))
      store.setSlashCommands([review])
      presenter.start()

      overlay.setOpen("palette", true)
      await flush()

      expect(store.slashCommands).toEqual([review])
    })

    it("can stop loading skills and drop the toggle once stopped", () => {
      presenter.start()

      presenter.stop()
      overlay.setOpen("palette", true)

      expect(api.listCommands).not.toHaveBeenCalled()
      expect(registry.commands).toHaveLength(0)
    })
  })

  describe("handleOpenChange", () => {
    it("can close the palette when it is asked to close", () => {
      overlay.setOpen("palette", true)

      presenter.handleOpenChange(false)

      expect(overlay.paletteOpen).toBe(false)
    })
  })

  describe("handleRunCommand", () => {
    it("can close the palette and then run the chosen command", () => {
      const run = vi.fn()
      registry.register({ id: "pick", label: "Pick", group: "Actions", run })
      overlay.setOpen("palette", true)

      presenter.handleRunCommand("pick")

      expect(overlay.paletteOpen).toBe(false)
      expect(run).toHaveBeenCalledTimes(1)
    })
  })

  describe("handleOpenChat", () => {
    it("can close the palette and open the chosen chat", () => {
      overlay.setOpen("palette", true)

      presenter.handleOpenChat(chat("c1"))

      expect(overlay.paletteOpen).toBe(false)
      expect(api.openChat).toHaveBeenCalledWith("c1")
    })
  })

  describe("handleOpenProject", () => {
    it("can close the palette and open the chosen project", () => {
      overlay.setOpen("palette", true)

      presenter.handleOpenProject(project("p1"))

      expect(overlay.paletteOpen).toBe(false)
      expect(api.openProject).toHaveBeenCalledWith("p1")
    })
  })

  describe("handleFillCommand", () => {
    it("can close the palette and put the skill into the prompt box with a trailing space", () => {
      overlay.setOpen("palette", true)

      presenter.handleFillCommand("/review")

      expect(overlay.paletteOpen).toBe(false)
      expect(composer.fill).toHaveBeenCalledWith("/review ")
    })
  })

  describe("handleQueryChange", () => {
    it("can keep the query the user typed, which decides whether the models group shows", () => {
      presenter.handleQueryChange("gp")

      expect(store.query).toBe("gp")
    })
  })

  describe("opening", () => {
    it("can start each opening from an empty query", () => {
      presenter.start()
      store.setQuery("old")

      overlay.setOpen("palette", true)

      expect(store.query).toBe("")
    })
  })

  describe("handleSelectModel", () => {
    it("can close the palette and then switch to the chosen model", () => {
      overlay.setOpen("palette", true)

      presenter.handleSelectModel("m2")

      expect(overlay.paletteOpen).toBe(false)
      expect(api.setModel).toHaveBeenCalledWith("m2")
    })

    it("can show a toast when the model cannot be switched", async () => {
      api.setModel.mockRejectedValue(new Error("Not signed in"))

      presenter.handleSelectModel("m2")
      await flush()

      expect(toast.error).toHaveBeenCalledWith("Not signed in")
    })
  })
})
