import { describe, expect, it } from "vitest"
import { EMPTY_PERSONALISATION, type AppMeta, type UsageState, type UsageTotals } from "@shared/types"
import { MetaStore } from "@/mirror/meta-store/meta-store"
import { RunStore } from "@/mirror/run-store/run-store"
import { UsageMeterStore } from "@/features/composer/run-status/usage-meter/usage-meter-store/usage-meter-store"

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

const noChats: UsageTotals = { tokens: 0, cost: 0, chats: 0 }

function metaWith(usageTotals: UsageTotals): AppMeta {
  return {
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
    usageTotals,
    server: null,
    routing: "balance",
    effort: "medium",
    titleModelId: null,
    titleModels: [],
    personalisation: EMPTY_PERSONALISATION,
  }
}

function setup(current: UsageState | null, totals: UsageTotals = noChats) {
  const run = new RunStore()
  run.usage = current
  const meta = new MetaStore()
  meta.setMeta(metaWith(totals))
  return { run, store: new UsageMeterStore(run, meta) }
}

describe("UsageMeterStore", () => {
  describe("visible", () => {
    it("can be false when the run has no usage yet", () => {
      const { store } = setup(null)

      expect(store.visible).toBe(false)
    })

    it("can be true once the run reports usage", () => {
      const { store } = setup(usage)

      expect(store.visible).toBe(true)
    })
  })

  describe("canCompact", () => {
    it("can be false while a run streams", () => {
      const { run, store } = setup(usage)
      run.streaming = true

      expect(store.canCompact).toBe(false)
    })

    it("can be true when no run is live", () => {
      const { store } = setup(usage)

      expect(store.canCompact).toBe(true)
    })
  })

  describe("model", () => {
    it("can be null when the run has no usage", () => {
      const { store } = setup(null)

      expect(store.model).toBeNull()
    })

    it("can show the context against its window, with the cost", () => {
      const { store } = setup(usage)

      expect(store.model?.contextText).toBe("42k of 200k context")
      expect(store.model?.ariaLabel).toBe("42k of 200k context, $0.12 spent")
      expect(store.model?.costText).toBe("$0.12")
      expect(store.model?.percentText).toBe("21%")
      expect(store.model?.ringPercent).toBe(21)
    })

    it("can say the context is not measured yet while its count is unknown", () => {
      const { store } = setup({ ...usage, contextTokens: null })

      expect(store.model?.contextText).toBe("Context not measured yet")
    })

    it("can show a dash for the percent while the window is unknown", () => {
      const { store } = setup({ ...usage, percent: null })

      expect(store.model?.percentText).toBe("–")
      expect(store.model?.ringPercent).toBe(0)
    })

    it("can leave the cost off the trigger while nothing has been spent", () => {
      const { store } = setup({ ...usage, cost: 0 })

      expect(store.model?.costText).toBeNull()
    })

    it("can show a cost under a cent as less than a cent", () => {
      const { store } = setup({ ...usage, cost: 0.004 })

      expect(store.model?.costText).toBe("<$0.01")
    })

    it("can cap the ring at a full circle while the number keeps counting", () => {
      const { store } = setup({ ...usage, percent: 150 })

      expect(store.model?.ringPercent).toBe(100)
      expect(store.model?.percentText).toBe("150%")
    })

    it("can stay normal below 70 percent", () => {
      const { store } = setup({ ...usage, percent: 69 })

      expect(store.model?.level).toBe("normal")
    })

    it("can turn to a warning from 70 percent", () => {
      const { store } = setup({ ...usage, percent: 70 })

      expect(store.model?.level).toBe("warning")
    })

    it("can stay a warning below 90 percent", () => {
      const { store } = setup({ ...usage, percent: 89 })

      expect(store.model?.level).toBe("warning")
    })

    it("can turn critical from 90 percent", () => {
      const { store } = setup({ ...usage, percent: 90 })

      expect(store.model?.level).toBe("critical")
    })

    it("can show the all-chats totals once chats have run", () => {
      const { store } = setup(usage, { tokens: 1_500_000, cost: 3.5, chats: 4 })

      expect(store.model?.rows.at(-1)).toEqual({ label: "All chats", value: "1.5M tokens · $3.50" })
    })

    it("can leave the all-chats line out when no chat has run", () => {
      const { store } = setup(usage, noChats)

      expect(store.model?.rows.some((row) => row.label === "All chats")).toBe(false)
    })

    it("can show this chat's tokens and its split between input, output and cache", () => {
      const { store } = setup(usage)

      expect(store.model?.rows).toEqual([
        { label: "This chat", value: "2k tokens · $0.12" },
        { label: "Tokens", value: "1k in · 800 out · 300 cached" },
      ])
    })

    it("can show a context window of a million or more in millions", () => {
      const { store } = setup({ ...usage, contextWindow: 2_000_000 })

      expect(store.model?.contextText).toBe("42k of 2.0M context")
    })

    it("can say the chat cannot be summarized while a run streams", () => {
      const { run, store } = setup(usage)
      run.streaming = true

      expect(store.model?.canCompact).toBe(false)
    })
  })

  describe("setError", () => {
    it("can set the error and clear it again", () => {
      const { store } = setup(usage)

      store.setError("Compact failed")
      expect(store.error).toBe("Compact failed")

      store.setError(null)
      expect(store.error).toBeNull()
    })
  })
})
