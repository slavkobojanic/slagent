import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { RunStore } from "@/mirror/run-store/run-store"
import { UsageMeter } from "./usage-meter"
import { UsageMeterStore } from "./usage-meter-store/usage-meter-store"

export function createUsageMeter({
  runStore,
  metaStore,
}: {
  runStore: RunStore
  metaStore: MetaStore
}): ComponentType {
  const store = new UsageMeterStore(runStore, metaStore)

  return observer(function UsageMeterHost() {
    return <UsageMeter usage={store.model} />
  })
}
