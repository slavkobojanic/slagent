import type { SettingsStore } from "@/features/settings/settings-store/settings-store"
import type { SettingsTab } from "@/features/settings/settings-tab"
import type { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import type { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"

export class SettingsPresenter {
  private disposeCommand: (() => void) | null = null

  constructor(
    private readonly store: SettingsStore,
    private readonly overlayStore: OverlayStore,
    private readonly commandRegistry: CommandRegistry,
  ) {}

  start = () => {
    if (this.disposeCommand !== null) {
      return
    }
    this.disposeCommand = this.commandRegistry.register({
      id: "settings.open",
      label: "Settings",
      group: "Actions",
      shortcut: { key: ",", mod: true },
      run: () => {
        this.overlayStore.setOpen("settings", true)
      },
    })
  }

  stop = () => {
    this.disposeCommand?.()
    this.disposeCommand = null
  }

  handleTabChange = (tab: SettingsTab) => {
    this.store.setTab(tab)
  }

  handleOpenChange = (open: boolean) => {
    this.overlayStore.setOpen("settings", open)
  }
}
