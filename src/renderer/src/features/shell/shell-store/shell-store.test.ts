import { describe, expect, it } from "vitest"
import { ShellStore } from "@/features/shell/shell-store/shell-store"

describe("ShellStore", () => {
  describe("setError", () => {
    it("can hold a header action's error until it is cleared", () => {
      const store = new ShellStore()

      store.setError("Folder not found")
      expect(store.error).toBe("Folder not found")

      store.setError(null)
      expect(store.error).toBeNull()
    })
  })
})
