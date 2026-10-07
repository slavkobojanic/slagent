import { makeAutoObservable } from "mobx"

export type ThemePreference = "system" | "light" | "dark"
export type ResolvedTheme = "light" | "dark"

export class ThemeStore {
  preference: ThemePreference = "system"
  systemDark = false

  constructor() {
    makeAutoObservable(this)
  }

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
