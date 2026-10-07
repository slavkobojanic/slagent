import { describe, expect, it, vi } from "vitest"
import { EMPTY_PERSONALISATION, type AppMeta, type ModelOption } from "@shared/types"
import { ModelDialogPresenter } from "@/features/models/model-dialog/model-dialog-presenter/model-dialog-presenter"
import { ModelDialogStore } from "@/features/models/model-dialog/model-dialog-store/model-dialog-store"
import type { SettingsService } from "@/ipc/settings-service/settings-service"
import { MetaStore } from "@/mirror/meta-store"
import { RunStore, type RunTranscript } from "@/mirror/run-store"
import { CommandRegistry } from "@/state/command-registry"
import type { ComposerPort } from "@/state/composer-port"
import { OverlayStore } from "@/state/overlay-store"
import { createMockInstance } from "@/test/create-mock-instance"

const KEEPS_MODEL = "This chat keeps its model until the run finishes."

const sonnet: ModelOption = { id: "claude-sonnet", name: "Claude Sonnet", contextWindow: 200000, reasoning: true, provider: "claude-code" }

function metaWith(overrides: Partial<AppMeta>): AppMeta {
  return {
    ready: true,
    error: null,
    cwd: "/work",
    agentDir: "/agent",
    modelId: null,
    modelName: null,
    modelProvider: null,
    models: [sonnet],
    openRouter: { configured: false, source: null, type: null, envKey: false },
    extensions: [],
    extensionErrors: [],
    usageTotals: { tokens: 0, cost: 0, chats: 0 },
    personalisation: EMPTY_PERSONALISATION,
    ...overrides,
  }
}

const idleTranscript: RunTranscript = {
  chatId: null,
  messages: [],
  windowStart: 0,
  hasOlder: false,
  hasNewer: false,
  streaming: false,
  notice: null,
  queue: [],
  usage: null,
  todos: [],
  planMode: false,
  tasks: [],
  planProposal: null,
  question: null,
}

function setup({ ready = true, streaming = false } = {}) {
  const meta = new MetaStore()
  meta.setMeta(metaWith({ ready }))
  const run = new RunStore()
  run.setTranscript({ ...idleTranscript, streaming })
  const store = new ModelDialogStore(meta, run)
  const overlay = new OverlayStore()
  overlay.setOpen("model", true)
  const settings = createMockInstance<SettingsService>(["setModel"])
  const composer = createMockInstance<ComposerPort>(["focus"])
  const commands = new CommandRegistry()
  const notify = vi.fn()
  const presenter = new ModelDialogPresenter(store, overlay, settings, composer, commands, notify)
  return { store, overlay, settings, composer, commands, notify, presenter }
}

describe("ModelDialogPresenter", () => {
  describe("handleSelect", () => {
    it("can apply the picked model, close the dialog, and return focus to the composer", async () => {
      const { overlay, settings, composer, notify, presenter } = setup()
      settings.setModel.mockResolvedValue({ applied: true })

      await presenter.handleSelect("claude-sonnet")

      expect(settings.setModel).toHaveBeenCalledWith("claude-sonnet")
      expect(overlay.modelOpen).toBe(false)
      expect(composer.focus).toHaveBeenCalledTimes(1)
      expect(notify).not.toHaveBeenCalled()
    })

    it("can tell the user the chat keeps its model when the change is not applied", async () => {
      const { overlay, settings, notify, presenter } = setup()
      settings.setModel.mockResolvedValue({ applied: false })

      await presenter.handleSelect("claude-sonnet")

      expect(notify).toHaveBeenCalledWith(KEEPS_MODEL)
      expect(overlay.modelOpen).toBe(false)
    })

    it("can keep the dialog open and show the failure when the change throws", async () => {
      const { store, overlay, settings, composer, presenter } = setup()
      settings.setModel.mockRejectedValue(new Error("Offline"))

      await presenter.handleSelect("claude-sonnet")

      expect(store.error).toBe("Offline")
      expect(store.busy).toBe(false)
      expect(overlay.modelOpen).toBe(true)
      expect(composer.focus).not.toHaveBeenCalled()
    })

    it("can do nothing while the app is not ready", async () => {
      const { settings, presenter } = setup({ ready: false })

      await presenter.handleSelect("claude-sonnet")

      expect(settings.setModel).not.toHaveBeenCalled()
    })

    it("can ignore a second pick while a change is in flight", async () => {
      const { store, settings, presenter } = setup()
      settings.setModel.mockResolvedValue({ applied: true })

      const first = presenter.handleSelect("claude-sonnet")
      expect(store.busy).toBe(true)
      await presenter.handleSelect("openai/gpt-x")
      await first

      expect(settings.setModel).toHaveBeenCalledTimes(1)
      expect(settings.setModel).toHaveBeenCalledWith("claude-sonnet")
    })
  })

  describe("handleOpenChange", () => {
    it("can clear the search and close the dialog when it asks to close", () => {
      const { store, overlay, presenter } = setup()
      store.setQuery("gpt")

      presenter.handleOpenChange(false)

      expect(store.query).toBe("")
      expect(overlay.modelOpen).toBe(false)
    })

    it("can open the dialog without touching the search", () => {
      const { store, overlay, presenter } = setup()
      overlay.setOpen("model", false)
      store.setQuery("gpt")

      presenter.handleOpenChange(true)

      expect(overlay.modelOpen).toBe(true)
      expect(store.query).toBe("gpt")
    })
  })

  describe("handleQueryChange", () => {
    it("can store the search text as the user types", () => {
      const { store, presenter } = setup()

      presenter.handleQueryChange("son")

      expect(store.query).toBe("son")
    })
  })

  describe("start", () => {
    it("can register the Change model command in the Actions group", () => {
      const { commands, presenter } = setup()

      presenter.start()

      const command = commands.commands.find((item) => item.id === "models.open")
      expect(command).toMatchObject({ label: "Change model", group: "Actions" })
      presenter.stop()
    })

    it("can enable the command while the app is ready and idle", () => {
      const { commands, presenter } = setup()

      presenter.start()

      expect(commands.commands.find((item) => item.id === "models.open")?.enabled?.()).toBe(true)
      presenter.stop()
    })

    it("can disable the command while a run is streaming", () => {
      const { commands, presenter } = setup({ streaming: true })

      presenter.start()

      expect(commands.commands.find((item) => item.id === "models.open")?.enabled?.()).toBe(false)
      presenter.stop()
    })

    it("can open the dialog when the command runs", () => {
      const { overlay, commands, presenter } = setup()
      overlay.setOpen("model", false)
      presenter.start()

      commands.run("models.open")

      expect(overlay.modelOpen).toBe(true)
      presenter.stop()
    })

    it("can register the command once when it is started twice", () => {
      const { commands, presenter } = setup()

      presenter.start()
      presenter.start()

      expect(commands.commands).toHaveLength(1)
      presenter.stop()
    })
  })

  describe("stop", () => {
    it("can remove the command it registered", () => {
      const { commands, presenter } = setup()
      presenter.start()

      presenter.stop()

      expect(commands.commands).toHaveLength(0)
    })
  })
})
