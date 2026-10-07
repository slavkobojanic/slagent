import type { AppEnv } from "@/state/app-deps"
import type { ThemePreference, ThemeStore } from "@/state/theme-store"

const STORAGE_KEY = "slagent-theme"
const DARK_QUERY = "(prefers-color-scheme: dark)"

// Applies the theme to <html>. The dark class is the one views and Tailwind read; the
// light class is kept for the stylesheet that inverts the palette.
export class ThemePresenter {
  private media: MediaQueryList | null = null

  constructor(
    private readonly store: ThemeStore,
    private readonly env: AppEnv,
  ) {}

  setPreference = (value: ThemePreference) => {
    try {
      this.env.window.localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // Not persisted, but still applied for this session.
    }
    this.store.setPreference(value)
    this.apply()
  }

  start = () => {
    if (this.media !== null) {
      return
    }
    const media = this.env.window.matchMedia(DARK_QUERY)
    this.media = media
    this.store.setPreference(this.readPreference())
    this.store.setSystemDark(media.matches)
    media.addEventListener("change", this.handleSystemChange)
    this.apply()
  }

  stop = () => {
    this.media?.removeEventListener("change", this.handleSystemChange)
    this.media = null
  }

  private readPreference = (): ThemePreference => {
    try {
      const value = this.env.window.localStorage.getItem(STORAGE_KEY)
      if (value === "light" || value === "dark" || value === "system") {
        return value
      }
    } catch {
      // Storage can be unavailable; fall through to the default.
    }
    return "system"
  }

  private handleSystemChange = (event: MediaQueryListEvent) => {
    this.store.setSystemDark(event.matches)
    this.apply()
  }

  private apply = () => {
    const root = this.env.window.document.documentElement
    root.classList.toggle("dark", this.store.resolved === "dark")
    root.classList.toggle("light", this.store.resolved === "light")
  }
}
