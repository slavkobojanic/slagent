import { describe, expect, it } from "vitest"
import type { ComputerPermissions } from "@shared/types"
import { PermissionsWizardPresenter } from "@/features/permissions-wizard/permissions-wizard-presenter/permissions-wizard-presenter"
import { PermissionsWizardStore } from "@/features/permissions-wizard/permissions-wizard-store/permissions-wizard-store"
import type { API } from "@/ipc/api"
import { nullLog } from "@/log/log"
import { PermissionsStore } from "@/state/permissions/permissions-store/permissions-store"
import { createMockInstance } from "@/test/create-mock-instance"

const MISSING: ComputerPermissions = { accessibility: false, screenRecording: false, error: null }
const ACCESSIBILITY_GRANTED: ComputerPermissions = { accessibility: true, screenRecording: false, error: null }
const SCREEN_GRANTED: ComputerPermissions = { accessibility: true, screenRecording: true, error: null }

function setup(known: ComputerPermissions | null = MISSING) {
  const permissions = new PermissionsStore("darwin")
  permissions.setPermissions(known)
  const store = new PermissionsWizardStore(permissions, "26.0.0")
  const api = createMockInstance<API>(["requestAccessibility", "requestScreenRecording", "openPermissionSettings"])
  const presenter = new PermissionsWizardPresenter(store, api, permissions, nullLog())
  return { permissions, store, api, presenter }
}

describe("PermissionsWizardPresenter", () => {
  describe("handleAllowAccessibility", () => {
    it("can write the grant it returns to the permissions store", async () => {
      const { permissions, api, presenter } = setup()
      api.requestAccessibility.mockResolvedValue(ACCESSIBILITY_GRANTED)

      await presenter.handleAllowAccessibility()

      expect(permissions.permissions).toEqual(ACCESSIBILITY_GRANTED)
    })

    it("can do nothing before the permissions are known", async () => {
      const { api, presenter } = setup(null)

      await presenter.handleAllowAccessibility()

      expect(api.requestAccessibility).not.toHaveBeenCalled()
    })

    it("can show the failure and leave the permissions alone when the request throws", async () => {
      const { store, permissions, api, presenter } = setup()
      api.requestAccessibility.mockRejectedValue(new Error("Request denied"))

      await presenter.handleAllowAccessibility()

      expect(store.error).toBe("Request denied")
      expect(permissions.permissions).toEqual(MISSING)
    })
  })

  describe("handleAllowScreenRecording", () => {
    it("can write the grant it returns to the permissions store", async () => {
      const { permissions, api, presenter } = setup(ACCESSIBILITY_GRANTED)
      api.requestScreenRecording.mockResolvedValue(SCREEN_GRANTED)

      await presenter.handleAllowScreenRecording()

      expect(permissions.permissions).toEqual(SCREEN_GRANTED)
    })

    it("can do nothing while another request is in flight", async () => {
      const { store, api, presenter } = setup(ACCESSIBILITY_GRANTED)
      api.requestScreenRecording.mockResolvedValue(SCREEN_GRANTED)

      const first = presenter.handleAllowScreenRecording()
      expect(store.busy).toBe(true)
      await presenter.handleAllowScreenRecording()
      await first

      expect(api.requestScreenRecording).toHaveBeenCalledTimes(1)
    })
  })

  describe("handleOpenSettings", () => {
    it("can open the settings pane it is asked for", async () => {
      const { api, presenter } = setup()

      await presenter.handleOpenSettings("screen")

      expect(api.openPermissionSettings).toHaveBeenCalledWith("screen")
    })

    it("can show the failure when the settings pane cannot open", async () => {
      const { store, api, presenter } = setup()
      api.openPermissionSettings.mockRejectedValue(new Error("No Settings app"))

      await presenter.handleOpenSettings("accessibility")

      expect(store.error).toBe("No Settings app")
    })
  })
})
