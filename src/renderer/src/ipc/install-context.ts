import type { SlagentApi } from "@shared/types"

export type InstallContext = { mode: "fake" } | { mode: "real"; api: SlagentApi }

// The only file that reads window.slagent. Resolves on every call and caches nothing,
// so the mode can change between calls (tests stub the flag, the bridge, or DEV).
export function getInstallContext(): InstallContext {
  if (import.meta.env.VITE_USE_FAKE_IPC === "1") {
    return { mode: "fake" }
  }
  if (window.slagent !== undefined) {
    return { mode: "real", api: window.slagent }
  }
  if (import.meta.env.DEV) {
    return { mode: "fake" }
  }
  throw new Error("slagent preload bridge is missing")
}
