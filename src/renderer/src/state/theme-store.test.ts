import { describe, expect, it } from "vitest"
import { ThemeStore } from "@/state/theme-store"

describe("ThemeStore", () => {
  describe("resolved", () => {
    it("can be light when the preference is system and the OS is light", () => {
      const store = new ThemeStore()

      store.setSystemDark(false)

      expect(store.resolved).toBe("light")
    })

    it("can be dark when the preference is system and the OS is dark", () => {
      const store = new ThemeStore()

      store.setSystemDark(true)

      expect(store.resolved).toBe("dark")
    })

    it("can ignore the OS when the preference is light", () => {
      const store = new ThemeStore()
      store.setPreference("light")

      store.setSystemDark(true)

      expect(store.resolved).toBe("light")
    })

    it("can ignore the OS when the preference is dark", () => {
      const store = new ThemeStore()
      store.setPreference("dark")

      store.setSystemDark(false)

      expect(store.resolved).toBe("dark")
    })
  })
})
