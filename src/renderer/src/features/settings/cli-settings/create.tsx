import { observer } from "mobx-react-lite"
import type { SettingsStore } from "@/features/settings/settings-store/settings-store"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"
import { CliSettings } from "./cli-settings"
import { CliSettingsPresenter } from "./cli-settings-presenter/cli-settings-presenter"
import { CliSettingsStore } from "./cli-settings-store/cli-settings-store"
import { createInstallCommand } from "./install-command/create"
import { createUninstallCommand } from "./uninstall-command/create"

export function createCliSettings({
  api,
  overlayStore,
  settingsStore,
  log,
}: {
  api: API
  overlayStore: OverlayStore
  settingsStore: SettingsStore
  log: Log
}) {
  const cliSettingsStore = new CliSettingsStore()
  const cliSettingsPresenter = new CliSettingsPresenter(cliSettingsStore, api, overlayStore, settingsStore, log)
  cliSettingsPresenter.start()

  const InstallCommand = createInstallCommand({ cliSettingsStore, cliSettingsPresenter })
  const UninstallCommand = createUninstallCommand({ cliSettingsStore, cliSettingsPresenter })

  return observer(function CliSettingsHost() {
    return (
      <CliSettings
        status={cliSettingsStore.status}
        error={cliSettingsStore.error}
        InstallCommand={InstallCommand}
        UninstallCommand={UninstallCommand}
      />
    )
  })
}
