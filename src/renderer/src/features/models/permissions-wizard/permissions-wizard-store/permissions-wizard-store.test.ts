import { describe, expect, it } from "vitest"
import { PermissionsWizardStore } from "@/features/models/permissions-wizard/permissions-wizard-store/permissions-wizard-store"
import { PermissionsStore } from "@/state/permissions-store"

const MISSING = { accessibility: false, screenRecording: false, error: null }

function setup(systemVersion = "25.6.0", platform = "darwin") {
  const permissions = new PermissionsStore(platform)
  const store = new PermissionsWizardStore(permissions, systemVersion)
  return { permissions, store }
}

describe("PermissionsWizardStore", () => {
  describe("open", () => {
    it("can be open while the permissions lock the window", () => {
      const { store } = setup()

      expect(store.open).toBe(true)
    })

    it("can be closed once both permissions are granted", () => {
      const { permissions, store } = setup()

      permissions.setPermissions({ accessibility: true, screenRecording: true, error: null })

      expect(store.open).toBe(false)
    })
  })

  describe("step", () => {
    it("can ask for Accessibility while it is missing", () => {
      const { store } = setup()

      expect(store.step).toBe("accessibility")
    })

    it("can ask for Screen Recording once Accessibility is granted", () => {
      const { permissions, store } = setup()

      permissions.setPermissions({ accessibility: true, screenRecording: false, error: null })

      expect(store.step).toBe("screen")
    })
  })

  describe("accessibilityPane", () => {
    it("can use the older name before macOS 26", () => {
      const { store } = setup("25.6.0")

      expect(store.accessibilityPane).toBe("Accessibility")
    })

    it("can use the renamed pane from macOS 26 onward", () => {
      const { store } = setup("26.0.1")

      expect(store.accessibilityPane).toBe("Device Control and Data Access")
    })
  })

  describe("screenPane", () => {
    it("can use the older name before macOS 26", () => {
      const { store } = setup("15.0.0")

      expect(store.screenPane).toBe("Screen Recording")
    })

    it("can use the renamed pane from macOS 26 onward", () => {
      const { store } = setup("27.1.0")

      expect(store.screenPane).toBe("Screen & System Audio Recording")
    })
  })

  describe("canAllowAccessibility", () => {
    it("can be false until the permissions are known", () => {
      const { store } = setup()

      expect(store.canAllowAccessibility).toBe(false)
    })

    it("can be false while a request is in flight", () => {
      const { permissions, store } = setup()
      permissions.setPermissions(MISSING)
      store.setBusy(true)

      expect(store.canAllowAccessibility).toBe(false)
    })

    it("can be true once the permissions are known and idle", () => {
      const { permissions, store } = setup()
      permissions.setPermissions(MISSING)

      expect(store.canAllowAccessibility).toBe(true)
    })
  })

  describe("canAllowScreenRecording", () => {
    it("can be false while a request is in flight", () => {
      const { store } = setup()
      store.setBusy(true)

      expect(store.canAllowScreenRecording).toBe(false)
    })

    it("can be true while idle", () => {
      const { store } = setup()

      expect(store.canAllowScreenRecording).toBe(true)
    })
  })

  describe("error", () => {
    it("can show a failed request before the permission check's own error", () => {
      const { permissions, store } = setup()
      permissions.setPermissions({ accessibility: false, screenRecording: false, error: "Check failed" })
      store.setError("Request denied")

      expect(store.error).toBe("Request denied")
    })

    it("can show the permission check's error when no request failed", () => {
      const { permissions, store } = setup()

      permissions.setPermissions({ accessibility: false, screenRecording: false, error: "Check failed" })

      expect(store.error).toBe("Check failed")
    })

    it("can be null when nothing failed", () => {
      const { permissions, store } = setup()
      permissions.setPermissions(MISSING)

      expect(store.error).toBeNull()
    })
  })
})
