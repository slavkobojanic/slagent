import { describe, expect, it } from "vitest"
import { MUSE_DEFAULT_ID, MUSE_MODELS, isMuseModel, museModel, museModelId, subscriptionUsage } from "./muse-runtime"

describe("muse model ids", () => {
  it("can recognize Muse model ids", () => {
    expect(isMuseModel("muse/muse-wonder-1.0")).toBe(true)
    expect(isMuseModel("muse/default")).toBe(true)
    expect(isMuseModel("claude-code/sonnet")).toBe(false)
    expect(isMuseModel("openai/gpt-x")).toBe(false)
    expect(isMuseModel(null)).toBe(false)
  })

  it("can prefix a raw catalog id", () => {
    expect(museModelId("muse-wonder-1.0")).toBe("muse/muse-wonder-1.0")
    expect(museModelId("muse/muse-wonder-1.0")).toBe("muse/muse-wonder-1.0")
  })

  it("can keep the host default as its own model", () => {
    expect(museModel(MUSE_DEFAULT_ID)).toEqual(MUSE_MODELS[0])
    expect(MUSE_MODELS[0]?.provider).toBe("muse")
  })
})

describe("subscriptionUsage", () => {
  it("can map the wire's windows to the shared shape", () => {
    expect(
      subscriptionUsage({
        observedAtMs: 1_700_000_000_000,
        tier: "power",
        weekly: { usedPercent: 40, resetsAtMs: 1_700_060_000_000 },
        window: { usedPercent: 12, resetsAtMs: 1_700_030_000_000, windowDurationMins: 300 },
      }),
    ).toEqual({
      tier: "power",
      weekly: { usedPercent: 40, resetsAtMs: 1_700_060_000_000 },
      window: { usedPercent: 12, resetsAtMs: 1_700_030_000_000, windowDurationMins: 300 },
      observedAtMs: 1_700_000_000_000,
    })
  })

  it("can keep the window's length", () => {
    const mapped = subscriptionUsage({
      observedAtMs: 1,
      tier: "t",
      weekly: { usedPercent: 0, resetsAtMs: 2 },
      window: { usedPercent: 0, resetsAtMs: 3, windowDurationMins: 300 },
    })
    expect(mapped.window.windowDurationMins).toBe(300)
  })
})
