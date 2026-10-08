import { observer } from "mobx-react-lite"
import { useEffect, type ComponentType } from "react"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import { UsageSettings } from "./usage-settings"
import { UsageSettingsPresenter } from "./usage-settings-presenter/usage-settings-presenter"
import { UsageSettingsStore } from "./usage-settings-store/usage-settings-store"

export function createUsageSettings({ api, log }: { api: API; log: Log }): ComponentType {
  const store = new UsageSettingsStore()
  const presenter = new UsageSettingsPresenter(store, api, log)

  return observer(function UsageSettingsHost() {
    // The section mounts on each open of the tab, so the log re-reads there.
    useEffect(() => {
      presenter.start()
      return () => presenter.stop()
    }, [presenter])

    return (
      <UsageSettings
        stats={store.stats}
        metric={store.metric}
        cells={store.cells}
        sortedModels={store.sortedModels}
        sort={store.sort}
        onMetric={presenter.handleMetric}
        onSort={presenter.handleSort}
      />
    )
  })
}