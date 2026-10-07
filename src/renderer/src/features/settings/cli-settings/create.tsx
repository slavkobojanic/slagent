import { observer } from "mobx-react-lite"
import type { SettingsStore } from "@/features/settings/settings-store/settings-store"
import type { AppDeps } from "@/state/app-deps"
import { CliSettings } from "./cli-settings"
import { CliSettingsPresenter } from "./cli-settings-presenter/cli-settings-presenter"
import { CliSettingsStore } from "./cli-settings-store/cli-settings-store"

export function createCliSettings({ services, shared, tabs }: AppDeps & { tabs: SettingsStore }) {
  const store = new CliSettingsStore()
  const presenter = new CliSettingsPresenter(store, services.cli, shared.overlay, tabs)
  presenter.start()

  return observer(function CliSettingsHost() {
    return (
      <CliSettings
        status={store.status}
        ownsCommand={store.ownsCommand}
        canInstall={store.canInstall}
        canUninstall={store.canUninstall}
        installing={store.installing}
        uninstalling={store.uninstalling}
        error={store.error}
        onInstall={presenter.handleInstall}
        onUninstall={presenter.handleUninstall}
      />
    )
  })
}
