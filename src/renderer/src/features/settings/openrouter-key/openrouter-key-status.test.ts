import { describe, expect, it } from "vitest"
import type { OpenRouterStatus } from "@shared/types"
import { authFilePath, canRemoveSavedKey } from "@/features/settings/openrouter-key/openrouter-key-status"

const unconfigured: OpenRouterStatus = { configured: false, source: null, type: null, envKey: false }

describe("canRemoveSavedKey", () => {
  it("can be false when OpenRouter is not configured", () => {
    expect(canRemoveSavedKey(unconfigured)).toBe(false)
  })

  it("can be false for a key from the environment", () => {
    const status: OpenRouterStatus = { configured: true, source: "OPENROUTER_API_KEY", type: "api_key", envKey: true }

    expect(canRemoveSavedKey(status)).toBe(false)
  })

  it("can be true for a key saved in slagent", () => {
    const status: OpenRouterStatus = { configured: true, source: "stored credential", type: "api_key", envKey: false }

    expect(canRemoveSavedKey(status)).toBe(true)
  })
})

describe("authFilePath", () => {
  it("can join the agent folder with auth.json", () => {
    expect(authFilePath("/Users/me/.slagent")).toBe("/Users/me/.slagent/auth.json")
  })

  it("can fall back to an empty folder before the meta arrives", () => {
    expect(authFilePath(undefined)).toBe("/auth.json")
  })
})
