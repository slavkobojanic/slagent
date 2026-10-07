import { toast } from "sonner"
import type { API } from "@/ipc/api"
import { errorText } from "@/lib/format"
import type { PlanCardStore } from "@/features/transcript/plan-card/plan-card-store/plan-card-store"

export class PlanCardPresenter {
  constructor(
    private readonly store: PlanCardStore,
    private readonly api: API,
  ) {}

  approvePlan = async () => {
    this.store.setApproving(true)
    try {
      await this.api.approvePlan()
    } catch (error) {
      toast.error(errorText(error))
    } finally {
      this.store.setApproving(false)
    }
  }
}
