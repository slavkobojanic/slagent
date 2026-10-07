import { makeAutoObservable } from "mobx"

export type ThemePreference = "system" | "light" | "dark"
export type ResolvedTheme = "light" | "dark"

// The theme the user picked, and whether the OS is in dark mode. The presenter writes both.
export class ThemeStore {
  preference: ThemePreference = "system"
  systemDark = false

  constructor() {
    makeAutoObservable(this)
  }

  // "system" follows the OS; the other two are fixed.
  get resolved(): ResolvedTheme {
    if (this.preference !== "system") {
      return this.preference
    }
    return this.systemDark ? "dark" : "light"
  }

  setPreference(value: ThemePreference) {
    this.preference = value
  }

  setSystemDark(value: boolean) {
    this.systemDark = value
  }
}
