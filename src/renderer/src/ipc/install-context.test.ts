import { afterEach, describe, expect, it, vi } from "vitest"
import type { SlagentApi } from "@shared/types"
import { getInstallContext } from "@/ipc/install-context"
import { createMockInstance } from "@/test/create-mock-instance"

describe("getInstallContext", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("can return fake mode when VITE_USE_FAKE_IPC is 1, even if a bridge is present", () => {
    vi.stubEnv("VITE_USE_FAKE_IPC", "1")
    vi.stubGlobal("slagent", createMockInstance<SlagentApi>(["getSnapshot"]))

    expect(getInstallContext()).toEqual({ mode: "fake" })
  })

  it("can return real mode when window.slagent is present", () => {
    vi.stubEnv("VITE_USE_FAKE_IPC", undefined)
    const api = createMockInstance<SlagentApi>(["getSnapshot"])
    vi.stubGlobal("slagent", api)

    expect(getInstallContext()).toEqual({ mode: "real", api })
  })

  it("can return fake mode when DEV is set and no bridge is present", () => {
    vi.stubEnv("VITE_USE_FAKE_IPC", undefined)
    vi.stubEnv("DEV", true)

    expect(getInstallContext()).toEqual({ mode: "fake" })
  })

  it("can throw when no bridge is present outside DEV", () => {
    vi.stubEnv("VITE_USE_FAKE_IPC", undefined)
    vi.stubEnv("DEV", false)

    expect(() => getInstallContext()).toThrow("slagent preload bridge is missing")
  })
})
