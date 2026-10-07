import { useEffect, useSyncExternalStore } from "react"

export type ThemePreference = "system" | "light" | "dark"
export type ResolvedTheme = "light" | "dark"

const STORAGE_KEY = "slagent-theme"
const CHANGE_EVENT = "slagent:theme"
const media = window.matchMedia("(prefers-color-scheme: dark)")

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === "light" || value === "dark" || value === "system") return value
  } catch {
    // Storage can be unavailable; fall through to the default.
  }
  return "system"
}

function resolve(preference: ThemePreference): ResolvedTheme {
  if (preference !== "system") return preference
  return media.matches ? "dark" : "light"
}

function apply(): void {
  const theme = resolve(readPreference())
  const root = document.documentElement
  root.classList.toggle("dark", theme === "dark")
  root.classList.toggle("light", theme === "light")
}

export function setThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, preference)
  } catch {
    // Not persisted, but still applied for this session.
  }
  apply()
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback)
  media.addEventListener("change", callback)
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback)
    media.removeEventListener("change", callback)
  }
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, readPreference)
}

export function useResolvedTheme(): ResolvedTheme {
  const theme = useSyncExternalStore(subscribe, () => resolve(readPreference()))
  // Follow the OS while the preference is "system".
  useEffect(() => apply(), [theme])
  return theme
}

apply()
