import { describe, expect, it } from "vitest"
import type { ComputerPermissions } from "@shared/types"
import type { PermissionService } from "@/ipc/permission-service/permission-service"
import { PermissionsWizardPresenter } from "@/features/models/permissions-wizard/permissions-wizard-presenter/permissions-wizard-presenter"
import { PermissionsWizardStore } from "@/features/models/permissions-wizard/permissions-wizard-store/permissions-wizard-store"
import { PermissionsStore } from "@/state/permissions-store"
import { createMockInstance } from "@/test/create-mock-instance"

const MISSING: ComputerPermissions = { accessibility: false, screenRecording: false, error: null }
const ACCESSIBILITY_GRANTED: ComputerPermissions = { accessibility: true, screenRecording: false, error: null }
const SCREEN_GRANTED: ComputerPermissions = { accessibility: true, screenRecording: true, error: null }

function setup(known: ComputerPermissions | null = MISSING) {
  const permissions = new PermissionsStore("darwin")
  permissions.setPermissions(known)
  const store = new PermissionsWizardStore(permissions, "26.0.0")
  const service = createMockInstance<PermissionService>(["requestAccessibility", "requestScreenRecording", "openPermissionSettings"])
  const presenter = new PermissionsWizardPresenter(store, permissions, service)
  return { permissions, store, service, presenter }
}

describe("PermissionsWizardPresenter", () => {
  describe("handleAllowAccessibility", () => {
    it("can write the grant it returns to the permissions store", async () => {
      const { permissions, service, presenter } = setup()
      service.requestAccessibility.mockResolvedValue(ACCESSIBILITY_GRANTED)

      await presenter.handleAllowAccessibility()

      expect(permissions.permissions).toEqual(ACCESSIBILITY_GRANTED)
    })

    it("can do nothing before the permissions are known", async () => {
      const { service, presenter } = setup(null)

      await presenter.handleAllowAccessibility()

      expect(service.requestAccessibility).not.toHaveBeenCalled()
    })

    it("can show the failure and leave the permissions alone when the request throws", async () => {
      const { store, permissions, service, presenter } = setup()
      service.requestAccessibility.mockRejectedValue(new Error("Request denied"))

      await presenter.handleAllowAccessibility()

      expect(store.error).toBe("Request denied")
      expect(permissions.permissions).toEqual(MISSING)
    })
  })

  describe("handleAllowScreenRecording", () => {
    it("can write the grant it returns to the permissions store", async () => {
      const { permissions, service, presenter } = setup(ACCESSIBILITY_GRANTED)
      service.requestScreenRecording.mockResolvedValue(SCREEN_GRANTED)

      await presenter.handleAllowScreenRecording()

      expect(permissions.permissions).toEqual(SCREEN_GRANTED)
    })

    it("can do nothing while another request is in flight", async () => {
      const { store, service, presenter } = setup(ACCESSIBILITY_GRANTED)
      service.requestScreenRecording.mockResolvedValue(SCREEN_GRANTED)

      const first = presenter.handleAllowScreenRecording()
      expect(store.busy).toBe(true)
      await presenter.handleAllowScreenRecording()
      await first

      expect(service.requestScreenRecording).toHaveBeenCalledTimes(1)
    })
  })

  describe("handleOpenSettings", () => {
    it("can open the settings pane it is asked for", async () => {
      const { service, presenter } = setup()

      await presenter.handleOpenSettings("screen")

      expect(service.openPermissionSettings).toHaveBeenCalledWith("screen")
    })

    it("can show the failure when the settings pane cannot open", async () => {
      const { store, service, presenter } = setup()
      service.openPermissionSettings.mockRejectedValue(new Error("No Settings app"))

      await presenter.handleOpenSettings("accessibility")

      expect(store.error).toBe("No Settings app")
    })
  })
})
