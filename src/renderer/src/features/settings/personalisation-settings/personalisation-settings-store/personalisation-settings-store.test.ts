import { describe, expect, it } from "vitest"
import { EMPTY_PERSONALISATION, type Personalisation } from "@shared/types"
import { PersonalisationSettingsStore } from "@/features/settings/personalisation-settings/personalisation-settings-store/personalisation-settings-store"

const saved: Personalisation = { ...EMPTY_PERSONALISATION, tone: "friendly", notes: "Keep it short." }

describe("PersonalisationSettingsStore", () => {
  describe("reset", () => {
    it("can take the saved settings as the draft and clear the error", () => {
      const store = new PersonalisationSettingsStore()
      store.setError("Failed")

      store.reset(saved)

      expect(store.draft).toEqual(saved)
      expect(store.error).toBeNull()
    })
  })

  describe("patch", () => {
    it("can merge a field into the draft and clear the error", () => {
      const store = new PersonalisationSettingsStore()
      store.reset(saved)
      store.setError("Failed")

      store.patch({ brevity: "terse" })

      expect(store.draft).toEqual({ ...saved, brevity: "terse" })
      expect(store.error).toBeNull()
    })
  })

  describe("isDirty", () => {
    it("can be false while the draft matches the saved settings", () => {
      const store = new PersonalisationSettingsStore()
      store.reset(saved)

      expect(store.isDirty(saved)).toBe(false)
    })

    it("can be true once a field differs from the saved settings", () => {
      const store = new PersonalisationSettingsStore()
      store.reset(saved)
      store.patch({ tone: "direct" })

      expect(store.isDirty(saved)).toBe(true)
    })
  })

  describe("canSave", () => {
    it("can be false while nothing has changed", () => {
      const store = new PersonalisationSettingsStore()
      store.reset(saved)

      expect(store.canSave(saved)).toBe(false)
    })

    it("can be false while a save is running", () => {
      const store = new PersonalisationSettingsStore()
      store.reset(saved)
      store.patch({ tone: "direct" })
      store.setSaving(true)

      expect(store.canSave(saved)).toBe(false)
    })

    it("can be true when a field differs and no save is running", () => {
      const store = new PersonalisationSettingsStore()
      store.reset(saved)
      store.patch({ tone: "direct" })

      expect(store.canSave(saved)).toBe(true)
    })
  })

  describe("setError", () => {
    it("can record a save error", () => {
      const store = new PersonalisationSettingsStore()

      store.setError("Disk full")

      expect(store.error).toBe("Disk full")
    })
  })
})
