import { toast } from "sonner"
import type { API } from "@/ipc/api"
import { errorText } from "@/lib/format"
import type { Log } from "@/log/log"
import type { RunStore } from "@/mirror/run-store/run-store"
import type { ComposerPort } from "@/state/composer-port/composer-port"
import type { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import type { PlanOverlayStore } from "@/features/transcript/plan-overlay/plan-overlay-store/plan-overlay-store"

export class PlanOverlayPresenter {
  private disposeProposal: (() => void) | null = null

  constructor(
    private readonly store: PlanOverlayStore,
    private readonly runStore: RunStore,
    private readonly panelPresenter: PanelPresenter,
    private readonly composerPort: ComposerPort,
    private readonly api: API,
    private readonly log: Log,
  ) {}

  start = () => {
    if (this.disposeProposal !== null) {
      return
    }
    this.disposeProposal = this.log.reaction("plan-proposal", () => this.runStore.planProposal, this.onProposal)
  }

  stop = () => {
    this.disposeProposal?.()
    this.disposeProposal = null
  }

  // A finished plan opens the right panel on the plan document, where the full markdown is easier to read
  // than anything the overlay could show. Every new proposal gets fresh buttons.
  private onProposal = (plan: string | null) => {
    this.store.reset()
    if (plan === null) {
      return
    }
    this.panelPresenter.showPlan()
  }

  accept = async () => {
    this.log.action("accept-plan")
    this.store.setApproving(true)
    try {
      await this.api.approvePlan()
    } catch (error) {
      this.log.warn("accept-plan-failed", { error })
      toast.error(errorText(error))
    } finally {
      this.store.setApproving(false)
    }
  }

  // Revising is a reply in plan mode: dismiss the overlay and put the cursor in the composer.
  revise = () => {
    this.log.action("revise-plan")
    this.store.dismiss()
    this.composerPort.focus()
  }

  cancel = async () => {
    this.log.action("cancel-plan")
    try {
      await this.api.setPlanMode(false)
    } catch (error) {
      this.log.warn("cancel-plan-failed", { error })
      toast.error(errorText(error))
    }
  }
}