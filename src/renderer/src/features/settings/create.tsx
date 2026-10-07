import { observer } from "mobx-react-lite"
import type { AppDeps } from "@/state/app-deps"
import type { SettingsSlots } from "@/state/slots"
import { createCliSettings } from "./cli-settings/create"
import { createMcpSettings } from "./mcp-settings/create"
import { createOpenRouterKey } from "./openrouter-key/create"
import { createPersonalisationSettings } from "./personalisation-settings/create"
import { SettingsDialog } from "./settings-dialog"
import { SettingsPresenter } from "./settings-presenter/settings-presenter"
import { SettingsStore } from "./settings-store/settings-store"
import { createThemePicker } from "./theme-picker/create"

// Owning create: called once at boot. It builds the dialog's section store and presenter, then
// each section. A section owns its own store and presenter, and reads the section store to
// know when it is shown.
export function createSettings(deps: AppDeps): SettingsSlots {
  const { shared } = deps
  const tabs = new SettingsStore()
  const presenter = new SettingsPresenter(tabs, shared.overlay, shared.commands)
  const sectionDeps = { ...deps, tabs }

  const ThemePicker = createThemePicker(deps)
  const OpenRouterKey = createOpenRouterKey(sectionDeps)
  const PersonalisationSettings = createPersonalisationSettings(sectionDeps)
  const McpSettings = createMcpSettings(sectionDeps)
  const CliSettings = createCliSettings(sectionDeps)

  presenter.start()

  return {
    SettingsDialog: observer(function SettingsDialogHost() {
      return (
        <SettingsDialog
          open={shared.overlay.settingsOpen}
          tab={tabs.tab}
          onTabChange={presenter.handleTabChange}
          onOpenChange={presenter.handleOpenChange}
          ThemePicker={ThemePicker}
          OpenRouterKey={OpenRouterKey}
          PersonalisationSettings={PersonalisationSettings}
          McpSettings={McpSettings}
          CliSettings={CliSettings}
        />
      )
    }),
  }
}
