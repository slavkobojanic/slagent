import { describe, expect, it } from "vitest"
import { EMPTY_PERSONALISATION, type AppMeta } from "@shared/types"
import { MetaStore } from "@/mirror/meta-store/meta-store"

function metaWith(overrides: Partial<AppMeta>): AppMeta {
  return {
    ready: false,
    error: null,
    cwd: "",
    agentDir: "/agent",
    modelId: null,
    modelName: null,
    modelProvider: null,
    models: [],
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

describe("MetaStore", () => {
  describe("ready", () => {
    it("can be false before any meta has been set", () => {
      expect(new MetaStore().ready).toBe(false)
    })

    it("can follow the ready flag of the meta that was set", () => {
      const store = new MetaStore()

      store.setMeta(metaWith({ ready: true }))

      expect(store.ready).toBe(true)
    })
  })

  describe("configured", () => {
    it("can be false before any meta has been set", () => {
      expect(new MetaStore().configured).toBe(false)
    })

    it("can be true when OpenRouter is configured", () => {
      const store = new MetaStore()

      store.setMeta(metaWith({ openRouter: { configured: true, source: "OAuth", type: "oauth", envKey: false } }))

      expect(store.configured).toBe(true)
    })

    it("can be true for a Claude Code model without an OpenRouter key", () => {
      const store = new MetaStore()

      store.setMeta(metaWith({ modelProvider: "claude-code" }))

      expect(store.configured).toBe(true)
    })

    it("can be false for an OpenRouter model without a key", () => {
      const store = new MetaStore()

      store.setMeta(metaWith({ modelProvider: "openrouter" }))

      expect(store.configured).toBe(false)
    })
  })
})
