import type { EffortLevel } from "@shared/types"
import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import { EffortSwitcher } from "./effort-switcher"

// The switcher only applies to models that reason. A model without reasoning,
// or no model at all, renders nothing.
export function createEffortSwitcher({ api, metaStore, log }: { api: API; metaStore: MetaStore; log: Log }): ComponentType {
  async function handleChange(effort: EffortLevel) {
    log.action("set-effort", { effort })
    try {
      await api.setEffort(effort)
    } catch (error) {
      log.warn("set-effort-failed", { error })
    }
  }

  return observer(function EffortSwitcherHost() {
    const meta = metaStore.meta
    if (!meta?.modelId) return null
    const model = meta.models.find((option) => option.id === meta.modelId)
    if (!model?.reasoning) return null
    return <EffortSwitcher effort={meta.effort} onValueChange={handleChange} />
  })
}