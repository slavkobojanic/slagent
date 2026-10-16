// @vitest-environment node
import { describe, expect, it } from "vitest"
import { turnUsage } from "./usage"
import { catalogModel, MUSE_COST } from "./models"

describe("turnUsage", () => {
  it("can map a Muse completion's counters with a zero cost", () => {
    expect(
      turnUsage({ inputTokens: 100, outputTokens: 50, cachedTokens: 12, reasoningTokens: 8 }),
    ).toEqual({
      input: 100,
      output: 50,
      cacheRead: 12,
      cacheWrite: 0,
      reasoning: 8,
      totalTokens: 162,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    })
  })

  it("can zero out a turn without usage", () => {
    expect(turnUsage(undefined)).toEqual({
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 0,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    })
  })
})

describe("catalogModel", () => {
  it("can map a catalog row to a pi model with zero rates", () => {
    const model = catalogModel({
      modelId: "muse-wonder-1.0",
      displayLabel: "Muse Wonder",
      contextLimit: 1_007_997,
      outputLimit: 65_536,
      cost: null,
      description: null,
      isActive: false,
      isDefault: true,
      profileId: null,
      providerId: "meta",
      releaseDate: null,
    })
    expect(model).toEqual({
      id: "muse-wonder-1.0",
      name: "Muse Wonder",
      api: "muse-msp",
      provider: "muse-bridge",
      baseUrl: "",
      input: ["text", "image"],
      cost: MUSE_COST,
      reasoning: true,
      contextWindow: 1_007_997,
      maxTokens: 65_536,
    })
  })

  it("can fall back to Muse Code's window when the catalog has none", () => {
    const model = catalogModel({
      modelId: "muse-spark-1.3",
      displayLabel: "",
      contextLimit: null,
      outputLimit: null,
      cost: null,
      description: null,
      isActive: false,
      isDefault: false,
      profileId: null,
      providerId: "meta",
      releaseDate: null,
    })
    expect(model.name).toBe("muse-spark-1.3")
    expect(model.contextWindow).toBe(1_007_997)
    expect(model.maxTokens).toBe(65_536)
  })
})
