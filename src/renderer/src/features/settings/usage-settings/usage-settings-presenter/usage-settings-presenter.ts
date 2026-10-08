import type { UsageSettingsStore } from "@/features/settings/usage-settings/usage-settings-store/usage-settings-store"
import type { UsageSortKey } from "@/features/settings/usage-settings/usage-settings-store/usage-settings-store"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"

export class UsageSettingsPresenter {
  constructor(
    private readonly store: UsageSettingsStore,
    private readonly api: API,
    private readonly log: Log,
  ) {}

  // The settings tab mounts this section, so every open re-reads the log.
  start = () => {
    void this.load()
  }

  stop = () => undefined

  load = async () => {
    try {
      this.store.setStats(await this.api.usageStats())
    } catch (error) {
      this.log.warn("usage-stats-failed", { error })
    }
  }

  handleMetric = () => {
    this.log.action("usage-metric-toggle", { metric: this.store.metric === "tokens" ? "dollars" : "tokens" })
    this.store.toggleMetric()
  }

  handleSort = (key: UsageSortKey) => {
    this.log.action("usage-sort", { key })
    this.store.setSort(key)
  }
}