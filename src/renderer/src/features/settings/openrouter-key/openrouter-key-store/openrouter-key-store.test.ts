import { describe, expect, it } from "vitest"
import { OpenRouterKeyStore } from "@/features/settings/openrouter-key/openrouter-key-store/openrouter-key-store"

describe("OpenRouterKeyStore", () => {
  describe("canSave", () => {
    it("can be false while the key is blank", () => {
      const store = new OpenRouterKeyStore()
      store.setApiKey("   ")

      expect(store.canSave).toBe(false)
    })

    it("can be false while a save is running", () => {
      const store = new OpenRouterKeyStore()
      store.setApiKey("sk-or-1")
      store.setSaving(true)

      expect(store.canSave).toBe(false)
    })

    it("can be true once a key is typed and no save is running", () => {
      const store = new OpenRouterKeyStore()

      store.setApiKey("sk-or-1")

      expect(store.canSave).toBe(true)
    })
  })

  describe("setApiKey", () => {
    it("can clear an earlier error when the key changes", () => {
      const store = new OpenRouterKeyStore()
      store.setError("Invalid key")

      store.setApiKey("sk-or-2")

      expect(store.error).toBeNull()
    })
  })

  describe("toggleVisible", () => {
    it("can show the key and hide it again", () => {
      const store = new OpenRouterKeyStore()

      store.toggleVisible()
      expect(store.visible).toBe(true)
      store.toggleVisible()

      expect(store.visible).toBe(false)
    })
  })

  describe("clear", () => {
    it("can empty the key and the error after a save", () => {
      const store = new OpenRouterKeyStore()
      store.setApiKey("sk-or-1")
      store.setError("Failed")

      store.clear()

      expect(store.apiKey).toBe("")
      expect(store.error).toBeNull()
    })
  })

  describe("reset", () => {
    it("can empty the key and hide it when the section is shown again", () => {
      const store = new OpenRouterKeyStore()
      store.setApiKey("sk-or-1")
      store.toggleVisible()

      store.reset()

      expect(store.apiKey).toBe("")
      expect(store.visible).toBe(false)
    })
  })
})
