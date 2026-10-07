import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import type { UsageMeterStore } from "@/features/composer/run-status/usage-meter/usage-meter-store/usage-meter-store"
import { errorText } from "@/lib/format"

export class UsageMeterPresenter {
  private unregister: (() => void) | null = null
  private started = false

  constructor(
    private readonly store: UsageMeterStore,
    private readonly api: API,
    private readonly commandRegistry: CommandRegistry,
    private readonly log: Log,
  ) {}

  start = () => {
    if (this.started) {
      return
    }
    this.started = true
    this.unregister = this.commandRegistry.register({
      id: "compact",
      label: "Summarize earlier messages",
      group: "Actions",
      enabled: () => this.store.visible && this.store.canCompact,
      run: () => {
        void this.handleCompact()
      },
    })
  }

  stop = () => {
    this.unregister?.()
    this.unregister = null
    this.started = false
  }

  handleCompact = async () => {
    if (!this.store.canCompact) {
      return
    }
    this.log.action("compact")
    this.store.setError(null)
    try {
      await this.api.compact()
    } catch (error) {
      this.log.warn("compact-failed", { error })
      this.store.setError(errorText(error))
    }
  }
}
