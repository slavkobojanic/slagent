import type { SettingsStore } from "@/features/settings/settings-store/settings-store"
import type { SettingsTab } from "@/features/settings/settings-tab"
import type { CommandRegistry } from "@/state/command-registry"
import type { OverlayStore } from "@/state/overlay-store"

// Owns the dialog's section and its keyboard command. Whether the dialog is open lives in the overlay store.
export class SettingsPresenter {
  private disposeCommand: (() => void) | null = null

  constructor(
    private readonly store: SettingsStore,
    private readonly overlay: Pick<OverlayStore, "setOpen">,
    private readonly commands: Pick<CommandRegistry, "register">,
  ) {}

  start = () => {
    if (this.disposeCommand !== null) {
      return
    }
    this.disposeCommand = this.commands.register({
      id: "settings.open",
      label: "Settings",
      group: "Actions",
      shortcut: { key: ",", mod: true },
      run: () => {
        this.overlay.setOpen("settings", true)
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
    this.overlay.setOpen("settings", open)
  }
}
