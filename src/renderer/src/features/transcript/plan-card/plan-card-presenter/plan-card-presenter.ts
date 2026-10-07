import { toast } from "sonner"
import type { API } from "@/ipc/api"
import { errorText } from "@/lib/format"
import type { Log } from "@/log/log"
import type { PlanCardStore } from "@/features/transcript/plan-card/plan-card-store/plan-card-store"

export class PlanCardPresenter {
  constructor(
    private readonly store: PlanCardStore,
    private readonly api: API,
    private readonly log: Log,
  ) {}

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
