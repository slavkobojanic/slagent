import { observer } from "mobx-react-lite"
import type { CliSettingsPresenter } from "@/features/settings/cli-settings/cli-settings-presenter/cli-settings-presenter"
import type { CliSettingsStore } from "@/features/settings/cli-settings/cli-settings-store/cli-settings-store"
import { InstallCommand } from "./install-command"

export function createInstallCommand({
  cliSettingsStore,
  cliSettingsPresenter,
}: {
  cliSettingsStore: CliSettingsStore
  cliSettingsPresenter: CliSettingsPresenter
}) {
  return observer(function InstallCommandHost() {
    return (
      <InstallCommand
        visible={cliSettingsStore.showInstall}
        canInstall={cliSettingsStore.canInstall}
        installing={cliSettingsStore.installing}
        label={cliSettingsStore.installLabel}
        onInstall={cliSettingsPresenter.handleInstall}
      />
    )
  })
}
