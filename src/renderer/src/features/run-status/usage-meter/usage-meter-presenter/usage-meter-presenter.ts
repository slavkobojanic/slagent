import type { ChatService } from "@/ipc/chat-service/chat-service"
import type { CommandRegistry } from "@/state/command-registry"
import type { UsageMeterStore } from "@/features/run-status/usage-meter/usage-meter-store/usage-meter-store"
import { errorText } from "@/lib/format"

// Summarizes earlier messages. The meter's menu and the palette command both run it.
export class UsageMeterPresenter {
  private unregister: (() => void) | null = null
  private started = false

  constructor(
    private readonly store: UsageMeterStore,
    private readonly chat: Pick<ChatService, "compact">,
    private readonly commands: Pick<CommandRegistry, "register">,
  ) {}

  start = () => {
    if (this.started) {
      return
    }
    this.started = true
    this.unregister = this.commands.register({
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
    this.store.setError(null)
    try {
      await this.chat.compact()
    } catch (error) {
      this.store.setError(errorText(error))
    }
  }
}
