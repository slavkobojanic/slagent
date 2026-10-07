import { observer } from "mobx-react-lite"
import type { AppDeps } from "@/state/app-deps"
import { ThemePicker } from "./theme-picker"

// Reads the preference from the shared theme store and writes it through the shared presenter.
// The picker has no state of its own, so it has no store or presenter.
export function createThemePicker({ shared: { theme, themePresenter } }: Pick<AppDeps, "shared">) {
  return observer(function ThemePickerHost() {
    return <ThemePicker value={theme.preference} onChange={themePresenter.setPreference} />
  })
}
