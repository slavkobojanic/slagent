import { describe, expect, it } from "vitest"
import { PermissionsStore } from "@/state/permissions/permissions-store/permissions-store"

describe("PermissionsStore", () => {
  describe("locked", () => {
    it("can be unlocked outside macOS, whatever the permissions", () => {
      const store = new PermissionsStore("linux")

      expect(store.locked).toBe(false)
    })

    it("can be locked on macOS before the permissions are known", () => {
      const store = new PermissionsStore("darwin")

      expect(store.locked).toBe(true)
    })

    it("can be locked on macOS while accessibility is missing", () => {
      const store = new PermissionsStore("darwin")

      store.setPermissions({ accessibility: false, screenRecording: true, error: null })

      expect(store.locked).toBe(true)
    })

    it("can be locked on macOS while screen recording is missing", () => {
      const store = new PermissionsStore("darwin")

      store.setPermissions({ accessibility: true, screenRecording: false, error: null })

      expect(store.locked).toBe(true)
    })

    it("can be unlocked on macOS once both permissions are granted", () => {
      const store = new PermissionsStore("darwin")

      store.setPermissions({ accessibility: true, screenRecording: true, error: null })

      expect(store.locked).toBe(false)
    })
  })

  describe("setPermissions", () => {
    it("can keep the error text the permission check reported", () => {
      const store = new PermissionsStore("darwin")

      store.setPermissions({ accessibility: false, screenRecording: false, error: "Bridge is down" })

      expect(store.permissions?.error).toBe("Bridge is down")
    })

    it("can relock on macOS when the permissions are reset to unknown", () => {
      const store = new PermissionsStore("darwin")
      store.setPermissions({ accessibility: true, screenRecording: true, error: null })

      store.setPermissions(null)

      expect(store.locked).toBe(true)
    })
  })
})
