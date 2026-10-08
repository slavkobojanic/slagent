import { describe, expect, it } from "vitest"
import { EMPTY_PERSONALISATION, type AppMeta, type ModelOption } from "@shared/types"
import { ModelsStore } from "@/features/models/models-store/models-store"
import { MetaStore } from "@/mirror/meta-store/meta-store"
import { RunStore, type RunTranscript } from "@/mirror/run-store/run-store"

const sonnet: ModelOption = { id: "claude-sonnet", name: "Claude Sonnet", contextWindow: 200000, reasoning: true, provider: "claude-code" }
const gpt: ModelOption = { id: "openai/gpt-x", name: "GPT X", contextWindow: 128000, reasoning: false, provider: "openrouter" }

function metaWith(overrides: Partial<AppMeta>): AppMeta {
  return {
    ready: true,
    error: null,
    cwd: "/work",
    agentDir: "/agent",
    modelId: null,
    modelName: null,
    modelProvider: null,
    models: [],
    openRouter: { configured: false, source: null, type: null, envKey: false },
    extensions: [],
    extensionErrors: [],
    usageTotals: { tokens: 0, cost: 0, chats: 0 },
    routing: "balance",
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

function setup(overrides: Partial<AppMeta> = {}, streaming = false) {
  const meta = new MetaStore()
  meta.setMeta(metaWith(overrides))
  const run = new RunStore()
  run.setTranscript({ ...idleTranscript, streaming })
  return { meta, run, store: new ModelsStore(meta, run) }
}

describe("ModelsStore", () => {
  describe("canSelect", () => {
    it("can be false before the first meta arrives", () => {
      const store = new ModelsStore(new MetaStore(), new RunStore())

      expect(store.canSelect).toBe(false)
    })

    it("can be false while the app is not ready", () => {
      const { store } = setup({ ready: false })

      expect(store.canSelect).toBe(false)
    })

    it("can be false while a change is in flight", () => {
      const { store } = setup()

      store.setBusy(true)

      expect(store.canSelect).toBe(false)
    })

    it("can be true once the app is ready and no change is in flight", () => {
      const { store } = setup()

      expect(store.canSelect).toBe(true)
    })
  })

  describe("canOpen", () => {
    it("can be false before the first meta arrives", () => {
      const store = new ModelsStore(new MetaStore(), new RunStore())

      expect(store.canOpen).toBe(false)
    })

    it("can be false while the app is not ready", () => {
      const { store } = setup({ ready: false })

      expect(store.canOpen).toBe(false)
    })

    it("can be false while a run is streaming", () => {
      const { store } = setup({}, true)

      expect(store.canOpen).toBe(false)
    })

    it("can be true when the app is ready and no run is streaming", () => {
      const { store } = setup()

      expect(store.canOpen).toBe(true)
    })
  })

  describe("groups", () => {
    it("can list the mirrored models with the current one first", () => {
      const { store } = setup({ models: [gpt, sonnet], modelId: "openai/gpt-x" })

      expect(store.groups.sections.map((section) => section.provider)).toEqual(["claude-code", "openrouter"])
      expect(store.groups.sections[1]?.rows[0]).toMatchObject({ id: "openai/gpt-x", selected: true })
    })

    it("can narrow the list to the search text", () => {
      const { store } = setup({ models: [gpt, sonnet] })

      store.setQuery("sonnet")

      expect(store.groups.sections.map((section) => section.provider)).toEqual(["claude-code"])
    })
  })

  describe("setQuery", () => {
    it("can hold the search text", () => {
      const { store } = setup()

      store.setQuery("gpt")

      expect(store.query).toBe("gpt")
    })
  })

  describe("setError", () => {
    it("can hold a failure message until it is cleared", () => {
      const { store } = setup()

      store.setError("Offline")
      expect(store.error).toBe("Offline")

      store.setError(null)
      expect(store.error).toBeNull()
    })
  })

  describe("reset", () => {
    it("can clear the search and any failure", () => {
      const { store } = setup()
      store.setQuery("gpt")
      store.setError("Offline")

      store.reset()

      expect(store.query).toBe("")
      expect(store.error).toBeNull()
    })

    it("can leave a change in flight running", () => {
      const { store } = setup()
      store.setBusy(true)

      store.reset()

      expect(store.busy).toBe(true)
    })
  })
})
