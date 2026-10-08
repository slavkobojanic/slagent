import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { EMPTY_PERSONALISATION, type AppMeta, type UsageState } from "@shared/types"
import type { API } from "@/ipc/api"
import { nullLog } from "@/log/log"
import { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import { MetaStore } from "@/mirror/meta-store/meta-store"
import { RunStore } from "@/mirror/run-store/run-store"
import { UsageMeterPresenter } from "@/features/composer/run-status/usage-meter/usage-meter-presenter/usage-meter-presenter"
import { UsageMeterStore } from "@/features/composer/run-status/usage-meter/usage-meter-store/usage-meter-store"
import { createMockInstance } from "@/test/create-mock-instance"

const usage: UsageState = {
  contextTokens: 42_000,
  contextWindow: 200_000,
  percent: 21,
  inputTokens: 1_200,
  outputTokens: 800,
  cacheTokens: 300,
  totalTokens: 2_000,
  cost: 0.12,
}

const meta: AppMeta = {
  ready: true,
  error: null,
  cwd: "/work",
  agentDir: "/agent",
  modelId: "model",
  modelName: "Model",
  modelProvider: null,
  models: [],
  openRouter: { configured: true, source: null, type: null, envKey: false },
  extensions: [],
  extensionErrors: [],
  usageTotals: { tokens: 0, cost: 0, chats: 0 },
  routing: "balance",
  effort: "medium",
  titleModelId: null,
  titleModels: [],
  personalisation: EMPTY_PERSONALISATION,
}

describe("UsageMeterPresenter", () => {
  let run: RunStore
  let store: UsageMeterStore
  let api: ReturnType<typeof createMockInstance<API>>
  let commands: CommandRegistry
  let presenter: UsageMeterPresenter

  beforeEach(() => {
    run = new RunStore()
    run.usage = usage
    const metaStore = new MetaStore()
    metaStore.setMeta(meta)
    store = new UsageMeterStore(run, metaStore)
    api = createMockInstance<API>(["compact"])
    commands = new CommandRegistry()
    presenter = new UsageMeterPresenter(store, api, commands, nullLog())
  })

  afterEach(() => {
    presenter.stop()
    vi.restoreAllMocks()
  })

  describe("handleCompact", () => {
    it("can ask the main process to summarize earlier messages", async () => {
      api.compact.mockResolvedValue(undefined)

      await presenter.handleCompact()

      expect(api.compact).toHaveBeenCalledTimes(1)
    })

    it("can leave the chat alone while a run streams", async () => {
      run.streaming = true

      await presenter.handleCompact()

      expect(api.compact).not.toHaveBeenCalled()
    })

    it("can set the error when summarizing fails", async () => {
      api.compact.mockRejectedValue(new Error("Compact failed"))

      await presenter.handleCompact()

      expect(store.error).toBe("Compact failed")
    })
  })

  describe("start", () => {
    it("can register the summarize command in the Actions group", () => {
      presenter.start()

      expect(commands.commands).toEqual([expect.objectContaining({ id: "compact", label: "Summarize earlier messages", group: "Actions" })])
    })

    it("can enable the command only while the meter has usage and no run is live", () => {
      presenter.start()
      const command = commands.commands[0]

      expect(command?.enabled?.()).toBe(true)

      run.streaming = true
      expect(command?.enabled?.()).toBe(false)

      run.streaming = false
      run.usage = null
      expect(command?.enabled?.()).toBe(false)
    })

    it("can run the summary from the command", () => {
      api.compact.mockResolvedValue(undefined)
      presenter.start()

      commands.run("compact")

      expect(api.compact).toHaveBeenCalledTimes(1)
    })
  })

  describe("stop", () => {
    it("can remove the command it registered", () => {
      presenter.start()

      presenter.stop()

      expect(commands.commands).toEqual([])
    })
  })
})
