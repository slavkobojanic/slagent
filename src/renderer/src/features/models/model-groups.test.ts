import { describe, expect, it } from "vitest"
import type { ModelOption, ModelProvider } from "@shared/types"
import { groupModels, OPENROUTER_LIMIT, providerOf } from "@/features/models/model-groups"

const sonnet: ModelOption = { id: "claude-sonnet", name: "Claude Sonnet", contextWindow: 200000, reasoning: true, provider: "claude-code" }
const gpt: ModelOption = { id: "openai/gpt-x", name: "GPT X", contextWindow: 128000, reasoning: false, provider: "openrouter" }
const llama: ModelOption = { id: "meta/llama", name: "Llama", contextWindow: 8000, reasoning: false, provider: "openrouter" }

function openRouterModels(count: number): ModelOption[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `or/${index}`,
    name: `Model ${index}`,
    contextWindow: 1000000,
    reasoning: false,
    provider: "openrouter" as ModelProvider,
  }))
}

function rowIds(models: ModelOption[], modelId: string | null, query: string, provider: ModelProvider): string[] {
  const section = groupModels(models, modelId, query).sections.find((item) => item.provider === provider)
  return section?.rows.map((row) => row.id) ?? []
}

describe("groupModels", () => {
  describe("sections", () => {
    it("can list Claude Code models above OpenRouter models", () => {
      const { sections } = groupModels([gpt, sonnet], null, "")

      expect(sections.map((section) => section.provider)).toEqual(["claude-code", "openrouter"])
    })

    it("can leave out a provider that has no models", () => {
      const { sections } = groupModels([gpt], null, "")

      expect(sections.map((section) => section.provider)).toEqual(["openrouter"])
    })

    it("can return no sections when there are no models", () => {
      const { sections } = groupModels([], null, "")

      expect(sections).toEqual([])
    })

    it("can label a Claude Code section with its hint alone", () => {
      const { sections } = groupModels([sonnet], null, "")

      expect(sections[0]?.label).toBe("Claude Code")
      expect(sections[0]?.summary).toBe("Runs your Claude Code install with its login, such as a Claude subscription.")
    })

    it("can count every OpenRouter model in the OpenRouter summary", () => {
      const { sections } = groupModels([gpt, llama, sonnet], null, "gpt")

      expect(sections.find((section) => section.provider === "openrouter")?.summary).toBe(
        "Billed per token to your OpenRouter key. 2 models.",
      )
    })
  })

  describe("ordering", () => {
    it("can put the current model first when there is no search", () => {
      expect(rowIds([gpt, llama], "meta/llama", "", "openrouter")).toEqual(["meta/llama", "openai/gpt-x"])
    })

    it("can keep the model order while searching", () => {
      expect(rowIds([gpt, llama], "meta/llama", "o", "openrouter")).toEqual(["openai/gpt-x", "meta/llama"])
    })

    it("can mark the current model as selected", () => {
      const { sections } = groupModels([gpt, llama], "meta/llama", "")

      expect(sections[0]?.rows.find((row) => row.id === "meta/llama")?.selected).toBe(true)
      expect(sections[0]?.rows.find((row) => row.id === "openai/gpt-x")?.selected).toBe(false)
    })
  })

  describe("search", () => {
    it("can match the provider label, ignoring case", () => {
      const { sections } = groupModels([gpt, llama, sonnet], null, "CLAUDE")

      expect(sections.map((section) => section.provider)).toEqual(["claude-code"])
    })

    it("can match the model id", () => {
      expect(rowIds([gpt, llama], null, "meta/", "openrouter")).toEqual(["meta/llama"])
    })

    it("can ignore spaces around the search text", () => {
      expect(rowIds([gpt, llama], null, "  llama  ", "openrouter")).toEqual(["meta/llama"])
    })

    it("can return no sections when nothing matches", () => {
      const { sections } = groupModels([gpt, llama, sonnet], null, "zzz")

      expect(sections).toEqual([])
    })
  })

  describe("overflowNotice", () => {
    it("can cut OpenRouter models at the limit and say so", () => {
      const { sections, overflowNotice } = groupModels(openRouterModels(OPENROUTER_LIMIT + 5), null, "")

      expect(sections[0]?.rows).toHaveLength(OPENROUTER_LIMIT)
      expect(overflowNotice).toBe("Showing 40 OpenRouter models. Refine the search to see more.")
    })

    it("can show every OpenRouter model without a notice when they fit the limit", () => {
      const { sections, overflowNotice } = groupModels(openRouterModels(OPENROUTER_LIMIT), null, "")

      expect(sections[0]?.rows).toHaveLength(OPENROUTER_LIMIT)
      expect(overflowNotice).toBeNull()
    })
  })

  describe("providerOf", () => {
    it("can treat a model without a provider as OpenRouter", () => {
      expect(providerOf({})).toBe("openrouter")
    })

    it("can keep a Claude Code model on Claude Code", () => {
      expect(providerOf(sonnet)).toBe("claude-code")
    })
  })
})
