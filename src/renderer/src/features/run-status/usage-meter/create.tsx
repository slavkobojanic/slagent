import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { AppDeps } from "@/state/app-deps"
import { UsageMeterPresenter } from "@/features/run-status/usage-meter/usage-meter-presenter/usage-meter-presenter"
import { UsageMeterStore } from "@/features/run-status/usage-meter/usage-meter-store/usage-meter-store"
import { UsageMeter } from "./usage-meter"

// Owning: called once at boot. The presenter starts here, registering the palette command for summarizing.
export function createUsageMeter({ services, mirror, shared }: Pick<AppDeps, "services" | "mirror" | "shared">): ComponentType {
  const store = new UsageMeterStore(mirror.run, mirror.meta)
  const presenter = new UsageMeterPresenter(store, services.chat, shared.commands)
  presenter.start()

  return observer(function UsageMeterHost() {
    return <UsageMeter usage={store.model} error={store.error} onCompact={presenter.handleCompact} />
  })
}
