import { describe, expect, it } from "vitest"
import { MUSE_DEFAULT_ID, MUSE_MODELS, isMuseModel, museModel, museModelId } from "./muse-runtime"

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
