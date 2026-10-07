import { toast } from "sonner"
import type { API } from "@/ipc/api"
import { errorText } from "@/lib/format"
import type { Log } from "@/log/log"
import type { RunStore } from "@/mirror/run-store/run-store"
import type { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import type { PlanCardStore } from "@/features/transcript/plan-card/plan-card-store/plan-card-store"

export class PlanCardPresenter {
  private disposeOpenPlan: (() => void) | null = null

  constructor(
    private readonly store: PlanCardStore,
    private readonly runStore: RunStore,
    private readonly panelPresenter: PanelPresenter,
    private readonly api: API,
    private readonly log: Log,
  ) {}

  start = () => {
    if (this.disposeOpenPlan !== null) {
      return
    }
    this.disposeOpenPlan = this.log.reaction("plan-proposal", () => this.runStore.planProposal, this.openPlan)
  }

  stop = () => {
    this.disposeOpenPlan?.()
    this.disposeOpenPlan = null
  }

  // A finished plan opens the right panel on the plan document, where the full markdown is easier to read than the card.
  private openPlan = (plan: string | null) => {
    if (plan === null) {
      return
    }
    this.panelPresenter.showPlan()
  }

  approvePlan = async () => {
    this.log.action("approve-plan")
    this.store.setApproving(true)
    try {
      await this.api.approvePlan()
    } catch (error) {
      this.log.warn("approve-plan-failed", { error })
      toast.error(errorText(error))
    } finally {
      this.store.setApproving(false)
    }
  }
}