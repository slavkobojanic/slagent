import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ThemePresenter } from "@/state/theme/theme-presenter/theme-presenter"
import { ThemeStore } from "@/state/theme/theme-store/theme-store"

const STORAGE_KEY = "slagent-theme"

// jsdom has no matchMedia, so the test supplies one whose OS setting it controls.
function stubSystemTheme(dark: boolean) {
  const media = { matches: dark, addEventListener: vi.fn(), removeEventListener: vi.fn() }
  Object.defineProperty(window, "matchMedia", { configurable: true, writable: true, value: vi.fn(() => media) })
  return media
}

function html() {
  return document.documentElement.classList
}

describe("ThemePresenter", () => {
  let store: ThemeStore
  let presenter: ThemePresenter

  beforeEach(() => {
    window.localStorage.clear()
    store = new ThemeStore()
    presenter = new ThemePresenter(store, window)
  })

  afterEach(() => {
    presenter.stop()
    Reflect.deleteProperty(window, "matchMedia")
    html().remove("dark", "light")
  })

  describe("start", () => {
    it("can apply the dark class when the system is dark and no preference is stored", () => {
      stubSystemTheme(true)

      presenter.start()

      expect(html().contains("dark")).toBe(true)
      expect(html().contains("light")).toBe(false)
    })

    it("can apply the light class when the system is light and no preference is stored", () => {
      stubSystemTheme(false)

      presenter.start()

      expect(html().contains("light")).toBe(true)
      expect(html().contains("dark")).toBe(false)
    })

    it("can read the stored preference and apply it over the system theme", () => {
      stubSystemTheme(false)
      window.localStorage.setItem(STORAGE_KEY, "dark")

      presenter.start()

      expect(store.preference).toBe("dark")
      expect(html().contains("dark")).toBe(true)
    })

    it("can fall back to following the system when the stored value is unknown", () => {
      stubSystemTheme(true)
      window.localStorage.setItem(STORAGE_KEY, "purple")

      presenter.start()

      expect(store.preference).toBe("system")
      expect(html().contains("dark")).toBe(true)
    })
  })

  describe("setPreference", () => {
    it("can persist the preference under the slagent-theme key", () => {
      stubSystemTheme(false)
      presenter.start()

      presenter.setPreference("light")

      expect(window.localStorage.getItem(STORAGE_KEY)).toBe("light")
    })

    it("can apply the chosen theme over the system theme", () => {
      stubSystemTheme(true)
      presenter.start()

      presenter.setPreference("light")

      expect(html().contains("light")).toBe(true)
      expect(html().contains("dark")).toBe(false)
    })
  })

  describe("system change", () => {
    it("can follow the system when it switches to dark while the preference is system", () => {
      const media = stubSystemTheme(false)
      presenter.start()
      const [, onChange] = media.addEventListener.mock.calls[0] ?? []

      onChange({ matches: true })

      expect(html().contains("dark")).toBe(true)
    })
  })

  describe("stop", () => {
    it("can remove the matchMedia listener it added", () => {
      const media = stubSystemTheme(false)
      presenter.start()
      const [, onChange] = media.addEventListener.mock.calls[0] ?? []

      presenter.stop()

      expect(media.removeEventListener).toHaveBeenCalledWith("change", onChange)
    })
  })
})
