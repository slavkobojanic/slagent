import { describe, expect, it, vi } from "vitest"
import { EMPTY_PERSONALISATION, type AppMeta, type ModelOption } from "@shared/types"
import { ModelsPresenter } from "@/features/models/models-presenter/models-presenter"
import { ModelsStore } from "@/features/models/models-store/models-store"
import type { API } from "@/ipc/api"
import { nullLog } from "@/log/log"
import { MetaStore } from "@/mirror/meta-store/meta-store"
import { RunStore, type RunTranscript } from "@/mirror/run-store/run-store"
import { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import { ComposerPort } from "@/state/composer-port/composer-port"
import { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"
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
    server: null,
    routing: "balance",
    effort: "medium",
    titleModelId: null,
    titleModels: [],
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
  const store = new ModelsStore(meta, run)
  const overlay = new OverlayStore()
  overlay.setOpen("model", true)
  const api = createMockInstance<API>(["setModel"])
  const composer = { focus: vi.fn(), fill: vi.fn() }
  const composerPort = new ComposerPort()
  composerPort.attach(composer)
  const commands = new CommandRegistry()
  const notify = vi.fn()
  const presenter = new ModelsPresenter(store, api, overlay, composerPort, commands, notify, nullLog())
  return { store, overlay, api, composer, commands, notify, presenter }
}

describe("ModelsPresenter", () => {
  describe("handleSelect", () => {
    it("can apply the picked model, close the dialog, and return focus to the composer", async () => {
      const { overlay, api, composer, notify, presenter } = setup()
      api.setModel.mockResolvedValue({ applied: true })

      await presenter.handleSelect("claude-sonnet")

      expect(api.setModel).toHaveBeenCalledWith("claude-sonnet")
      expect(overlay.modelOpen).toBe(false)
      expect(composer.focus).toHaveBeenCalledTimes(1)
      expect(notify).not.toHaveBeenCalled()
    })

    it("can tell the user the chat keeps its model when the change is not applied", async () => {
      const { overlay, api, notify, presenter } = setup()
      api.setModel.mockResolvedValue({ applied: false })

      await presenter.handleSelect("claude-sonnet")

      expect(notify).toHaveBeenCalledWith(KEEPS_MODEL)
      expect(overlay.modelOpen).toBe(false)
    })

    it("can keep the dialog open and show the failure when the change throws", async () => {
      const { store, overlay, api, composer, presenter } = setup()
      api.setModel.mockRejectedValue(new Error("Offline"))

      await presenter.handleSelect("claude-sonnet")

      expect(store.error).toBe("Offline")
      expect(store.busy).toBe(false)
      expect(overlay.modelOpen).toBe(true)
      expect(composer.focus).not.toHaveBeenCalled()
    })

    it("can do nothing while the app is not ready", async () => {
      const { api, presenter } = setup({ ready: false })

      await presenter.handleSelect("claude-sonnet")

      expect(api.setModel).not.toHaveBeenCalled()
    })

    it("can ignore a second pick while a change is in flight", async () => {
      const { store, api, presenter } = setup()
      api.setModel.mockResolvedValue({ applied: true })

      const first = presenter.handleSelect("claude-sonnet")
      expect(store.busy).toBe(true)
      await presenter.handleSelect("openai/gpt-x")
      await first

      expect(api.setModel).toHaveBeenCalledTimes(1)
      expect(api.setModel).toHaveBeenCalledWith("claude-sonnet")
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
