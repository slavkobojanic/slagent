import type { ModelRouting } from "@shared/types"
import type { ProviderRoutingStore } from "@/features/settings/provider-routing/provider-routing-store/provider-routing-store"
import type { API } from "@/ipc/api"
import { errorText } from "@/lib/format"
import type { Log } from "@/log/log"

export class ProviderRoutingPresenter {
  constructor(
    private readonly store: ProviderRoutingStore,
    private readonly api: API,
    private readonly log: Log,
  ) {}

  handleChange = async (routing: ModelRouting) => {
    this.log.action("set-routing", { routing })
    this.store.error = null
    try {
      await this.api.setRouting(routing)
    } catch (error) {
      this.log.warn("set-routing-failed", { error })
      this.store.error = errorText(error)
    }
  }
}
