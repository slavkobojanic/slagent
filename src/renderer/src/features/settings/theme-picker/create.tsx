import { observer } from "mobx-react-lite"
import type { ThemePresenter } from "@/state/theme/theme-presenter/theme-presenter"
import type { ThemeStore } from "@/state/theme/theme-store/theme-store"
import { ThemePicker } from "./theme-picker"

export function createThemePicker({ themeStore, themePresenter }: { themeStore: ThemeStore; themePresenter: ThemePresenter }) {
  return observer(function ThemePickerHost() {
    return <ThemePicker value={themeStore.preference} onChange={themePresenter.setPreference} />
  })
}
