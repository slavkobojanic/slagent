import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { RunStore } from "@/mirror/run-store/run-store"
import type { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import { PlanCard } from "./plan-card"
import { PlanCardPresenter } from "./plan-card-presenter/plan-card-presenter"
import { PlanCardStore } from "./plan-card-store/plan-card-store"

export function createPlanCard({ api, runStore, panelPresenter, log }: { api: API; runStore: RunStore; panelPresenter: PanelPresenter; log: Log }): ComponentType {
  const store = new PlanCardStore()
  const presenter = new PlanCardPresenter(store, runStore, panelPresenter, api, log)
  presenter.start()

  return observer(function PlanCardHost() {
    // With newer turns outside the window, the live end of the chat is not on screen.
    if (runStore.transcriptPage.hasNewer || !runStore.planProposal) {
      return null
    }
    return <PlanCard plan={runStore.planProposal} approving={store.approving} onApprove={presenter.approvePlan} />
  })
}
