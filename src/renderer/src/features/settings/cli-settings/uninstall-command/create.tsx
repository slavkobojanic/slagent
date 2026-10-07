import { observer } from "mobx-react-lite"
import type { CliSettingsPresenter } from "@/features/settings/cli-settings/cli-settings-presenter/cli-settings-presenter"
import type { CliSettingsStore } from "@/features/settings/cli-settings/cli-settings-store/cli-settings-store"
import { UninstallCommand } from "./uninstall-command"

export function createUninstallCommand({
  cliSettingsStore,
  cliSettingsPresenter,
}: {
  cliSettingsStore: CliSettingsStore
  cliSettingsPresenter: CliSettingsPresenter
}) {
  return observer(function UninstallCommandHost() {
    return (
      <UninstallCommand
        visible={cliSettingsStore.ownsCommand}
        canUninstall={cliSettingsStore.canUninstall}
        label={cliSettingsStore.uninstallLabel}
        onUninstall={cliSettingsPresenter.handleUninstall}
      />
    )
  })
}
