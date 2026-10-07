import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import type { CliStatus } from "@shared/types"
import { CliSettingsPresenter } from "@/features/settings/cli-settings/cli-settings-presenter/cli-settings-presenter"
import { CliSettingsStore } from "@/features/settings/cli-settings/cli-settings-store/cli-settings-store"
import { SettingsStore } from "@/features/settings/settings-store/settings-store"
import type { API } from "@/ipc/api"
import { nullLog } from "@/log/log"
import { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"
import { createMockInstance } from "@/test/create-mock-instance"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const path = "/usr/local/bin/slagent"
const missing: CliStatus = { path, state: "missing" }
const installed: CliStatus = { path, state: "installed" }
const conflict: CliStatus = { path, state: "conflict" }

function setup() {
  const api = createMockInstance<API>(["cliStatus", "installCli", "uninstallCli"])
  const store = new CliSettingsStore()
  const overlay = new OverlayStore()
  const tabs = new SettingsStore()
  const presenter = new CliSettingsPresenter(store, api, overlay, tabs, nullLog())
  return { api, store, overlay, tabs, presenter }
}

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

describe("CliSettingsPresenter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("start", () => {
    it("can load the command status when the CLI section is shown", async () => {
      const { api, store, overlay, tabs, presenter } = setup()
      api.cliStatus.mockResolvedValue(missing)
      presenter.start()
      tabs.setTab("cli")

      overlay.setOpen("settings", true)
      await flush()

      expect(api.cliStatus).toHaveBeenCalledOnce()
      expect(store.status).toEqual(missing)
      presenter.stop()
    })

    it("can clear the old status while the status is read again", () => {
      const { api, store, overlay, tabs, presenter } = setup()
      api.cliStatus.mockReturnValue(new Promise(() => undefined))
      store.setStatus(installed)
      presenter.start()
      tabs.setTab("cli")

      overlay.setOpen("settings", true)

      expect(store.status).toBeNull()
      presenter.stop()
    })

    it("can show the error when the status fails to load", async () => {
      const { api, store, overlay, tabs, presenter } = setup()
      api.cliStatus.mockRejectedValue(new Error("Permission denied"))
      presenter.start()
      tabs.setTab("cli")

      overlay.setOpen("settings", true)
      await flush()

      expect(store.error).toBe("Permission denied")
      expect(store.status).toBeNull()
      presenter.stop()
    })

    it("can leave the status unread while another section is shown", async () => {
      const { api, overlay, presenter } = setup()
      presenter.start()

      overlay.setOpen("settings", true)
      await flush()

      expect(api.cliStatus).not.toHaveBeenCalled()
      presenter.stop()
    })
  })

  describe("stop", () => {
    it("can stop reading the status when the CLI section is shown", async () => {
      const { api, overlay, tabs, presenter } = setup()
      presenter.start()
      presenter.stop()
      tabs.setTab("cli")

      overlay.setOpen("settings", true)
      await flush()

      expect(api.cliStatus).not.toHaveBeenCalled()
    })
  })

  describe("handleInstall", () => {
    it("can install the command, store the new status and report it", async () => {
      const { api, store, presenter } = setup()
      store.setStatus(missing)
      api.installCli.mockResolvedValue(installed)

      await presenter.handleInstall()

      expect(api.installCli).toHaveBeenCalledOnce()
      expect(store.status).toEqual(installed)
      expect(store.busy).toBeNull()
      expect(toast.success).toHaveBeenCalledWith("slagent command installed")
    })

    it("can show the error when installing fails", async () => {
      const { api, store, presenter } = setup()
      store.setStatus(missing)
      api.installCli.mockRejectedValue(new Error("Password required"))

      await presenter.handleInstall()

      expect(store.error).toBe("Password required")
      expect(store.status).toEqual(missing)
      expect(store.busy).toBeNull()
      expect(toast.success).not.toHaveBeenCalled()
    })

    it("can ignore an install while another program holds the path", async () => {
      const { api, store, presenter } = setup()
      store.setStatus(conflict)

      await presenter.handleInstall()

      expect(api.installCli).not.toHaveBeenCalled()
    })
  })

  describe("handleUninstall", () => {
    it("can remove the command, store the new status and report it", async () => {
      const { api, store, presenter } = setup()
      store.setStatus(installed)
      api.uninstallCli.mockResolvedValue(missing)

      await presenter.handleUninstall()

      expect(api.uninstallCli).toHaveBeenCalledOnce()
      expect(store.status).toEqual(missing)
      expect(toast.success).toHaveBeenCalledWith("slagent command removed")
    })

    it("can ignore an uninstall for a command that is not ours", async () => {
      const { api, store, presenter } = setup()
      store.setStatus(missing)

      await presenter.handleUninstall()

      expect(api.uninstallCli).not.toHaveBeenCalled()
    })
  })
})
