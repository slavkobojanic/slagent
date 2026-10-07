import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { API } from "@/ipc/api"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { RunStore } from "@/mirror/run-store/run-store"
import type { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import { UsageMeter } from "./usage-meter"
import { UsageMeterPresenter } from "./usage-meter-presenter/usage-meter-presenter"
import { UsageMeterStore } from "./usage-meter-store/usage-meter-store"

export function createUsageMeter({
  api,
  runStore,
  metaStore,
  commandRegistry,
}: {
  api: API
  runStore: RunStore
  metaStore: MetaStore
  commandRegistry: CommandRegistry
}): ComponentType {
  const store = new UsageMeterStore(runStore, metaStore)
  const presenter = new UsageMeterPresenter(store, api, commandRegistry)
  presenter.start()

  return observer(function UsageMeterHost() {
    return <UsageMeter usage={store.model} error={store.error} onCompact={presenter.handleCompact} />
  })
}
