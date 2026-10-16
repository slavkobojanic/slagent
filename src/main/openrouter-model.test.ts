import type { ModelRuntime } from "@earendil-works/pi-coding-agent"
import { describe, expect, it, vi } from "vitest"
import type { AgentModel } from "./chat-runtime"
import { isOpenRouterModelId, resolveOpenRouterModel } from "./openrouter-model"

const template = {
  id: "existing/model",
  name: "Existing model",
  api: "openai-completions",
  provider: "openrouter",
  baseUrl: "https://openrouter.ai/api/v1",
  input: ["text"],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  reasoning: false,
  contextWindow: 128_000,
  maxTokens: 4_096,
} as AgentModel

function runtime(models: AgentModel[] = [template]): ModelRuntime {
  return {
    getModel: vi.fn((provider: string, id: string) => models.find((model) => model.provider === provider && model.id === id)),
    getModels: vi.fn(() => models),
  } as unknown as ModelRuntime
}

describe("OpenRouter custom model ids", () => {
  it("accepts provider/model tags and optional variants", () => {
    expect(isOpenRouterModelId("google/gemini-4-argon")).toBe(true)
    expect(isOpenRouterModelId("google/gemini-4-argon:free")).toBe(true)
    expect(isOpenRouterModelId("not a model")).toBe(false)
    expect(isOpenRouterModelId("missing-provider")).toBe(false)
  })

  it("resolves catalog models directly", () => {
    const found = resolveOpenRouterModel(runtime(), "existing/model")

    expect(found).toBe(template)
  })

  it("builds an uncatalogued model from an OpenRouter model template", () => {
    const found = resolveOpenRouterModel(runtime(), "google/gemini-4-argon")

    expect(found).toMatchObject({
      id: "google/gemini-4-argon",
      name: "google/gemini-4-argon",
      api: "openai-completions",
      baseUrl: "https://openrouter.ai/api/v1",
    })
  })

  it("does not resolve invalid or batch models", () => {
    expect(resolveOpenRouterModel(runtime(), "invalid")).toBeUndefined()
    expect(resolveOpenRouterModel(runtime(), "existing/model:batch")).toBeUndefined()
    expect(resolveOpenRouterModel(runtime([]), "google/gemini-4-argon")).toBeUndefined()
  })
})
