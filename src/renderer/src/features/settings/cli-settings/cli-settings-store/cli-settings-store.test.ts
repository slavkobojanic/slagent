import { describe, expect, it } from "vitest"
import type { CliStatus } from "@shared/types"
import { CliSettingsStore } from "@/features/settings/cli-settings/cli-settings-store/cli-settings-store"

const path = "/usr/local/bin/slagent"

function withStatus(state: CliStatus["state"]): CliSettingsStore {
  const store = new CliSettingsStore()
  store.setStatus({ path, state })
  return store
}

describe("CliSettingsStore", () => {
  describe("ownsCommand", () => {
    it("can be false before the status loads", () => {
      expect(new CliSettingsStore().ownsCommand).toBe(false)
    })

    it("can be true for an installed or outdated command", () => {
      expect(withStatus("installed").ownsCommand).toBe(true)
      expect(withStatus("outdated").ownsCommand).toBe(true)
    })

    it("can be false for a missing command or another program's file", () => {
      expect(withStatus("missing").ownsCommand).toBe(false)
      expect(withStatus("conflict").ownsCommand).toBe(false)
    })
  })

  describe("installing and uninstalling", () => {
    it("can follow the action that is running", () => {
      const store = new CliSettingsStore()

      store.setBusy("install")
      expect(store.installing).toBe(true)
      expect(store.uninstalling).toBe(false)
      store.setBusy("uninstall")

      expect(store.installing).toBe(false)
      expect(store.uninstalling).toBe(true)
    })
  })

  describe("canInstall", () => {
    it("can be false before the status loads", () => {
      expect(new CliSettingsStore().canInstall).toBe(false)
    })

    it("can be false while another action runs", () => {
      const store = withStatus("missing")
      store.setBusy("uninstall")

      expect(store.canInstall).toBe(false)
    })

    it("can be false when another program holds the path", () => {
      expect(withStatus("conflict").canInstall).toBe(false)
    })

    it("can be false on a platform that does not support the command", () => {
      expect(withStatus("unsupported").canInstall).toBe(false)
    })

    it("can be true for a missing command", () => {
      expect(withStatus("missing").canInstall).toBe(true)
    })
  })

  describe("canUninstall", () => {
    it("can be false for a command that is not ours", () => {
      expect(withStatus("missing").canUninstall).toBe(false)
    })

    it("can be false while an install runs", () => {
      const store = withStatus("installed")
      store.setBusy("install")

      expect(store.canUninstall).toBe(false)
    })

    it("can be true for our installed command when nothing runs", () => {
      expect(withStatus("installed").canUninstall).toBe(true)
    })
  })

  describe("reset", () => {
    it("can clear the status and the error", () => {
      const store = withStatus("installed")
      store.setError("Failed")

      store.reset()

      expect(store.status).toBeNull()
      expect(store.error).toBeNull()
    })
  })
})
