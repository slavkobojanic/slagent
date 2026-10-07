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

  describe("showInstall", () => {
    it("can be true before the status loads", () => {
      expect(new CliSettingsStore().showInstall).toBe(true)
    })

    it("can be true for a missing or outdated command", () => {
      expect(withStatus("missing").showInstall).toBe(true)
      expect(withStatus("outdated").showInstall).toBe(true)
    })

    it("can be false for an installed command or an unsupported platform", () => {
      expect(withStatus("installed").showInstall).toBe(false)
      expect(withStatus("unsupported").showInstall).toBe(false)
    })
  })

  describe("installLabel", () => {
    it("can offer to install a missing command", () => {
      expect(withStatus("missing").installLabel).toBe("Install command")
    })

    it("can offer to update an outdated command", () => {
      expect(withStatus("outdated").installLabel).toBe("Update command")
    })

    it("can say the command is installing while an install runs", () => {
      const store = withStatus("outdated")
      store.setBusy("install")

      expect(store.installLabel).toBe("Installing")
    })
  })

  describe("uninstallLabel", () => {
    it("can offer to uninstall when nothing runs", () => {
      expect(withStatus("installed").uninstallLabel).toBe("Uninstall")
    })

    it("can say the command is being removed while an uninstall runs", () => {
      const store = withStatus("installed")
      store.setBusy("uninstall")

      expect(store.uninstallLabel).toBe("Removing")
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
