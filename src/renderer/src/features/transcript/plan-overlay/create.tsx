import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { RunStore } from "@/mirror/run-store/run-store"
import type { ComposerPort } from "@/state/composer-port/composer-port"
import type { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import { PlanOverlay } from "./plan-overlay"
import { PlanOverlayPresenter } from "./plan-overlay-presenter/plan-overlay-presenter"
import { PlanOverlayStore } from "./plan-overlay-store/plan-overlay-store"

export function createPlanOverlay({
  api,
  runStore,
  panelPresenter,
  composerPort,
  log,
}: {
  api: API
  runStore: RunStore
  panelPresenter: PanelPresenter
  composerPort: ComposerPort
  log: Log
}): ComponentType {
  const store = new PlanOverlayStore()
  const presenter = new PlanOverlayPresenter(store, runStore, panelPresenter, composerPort, api, log)
  presenter.start()

  return observer(function PlanOverlayHost() {
    if (!runStore.planProposal || store.dismissed) {
      return null
    }
    return <PlanOverlay approving={store.approving} onAccept={presenter.accept} onRevise={presenter.revise} onCancel={presenter.cancel} />
  })
}