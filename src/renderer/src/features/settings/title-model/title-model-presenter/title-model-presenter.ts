import type { TitleModelStore } from "@/features/settings/title-model/title-model-store/title-model-store"
import type { API } from "@/ipc/api"
import { errorText } from "@/lib/format"
import type { Log } from "@/log/log"

export class TitleModelPresenter {
  constructor(
    private readonly store: TitleModelStore,
    private readonly api: API,
    private readonly log: Log,
  ) {}

  handleChange = async (modelId: string) => {
    this.log.action("set-title-model", { modelId })
    this.store.error = null
    try {
      await this.api.setTitleModel(modelId)
    } catch (error) {
      this.log.warn("set-title-model-failed", { error })
      this.store.error = errorText(error)
    }
  }
}
