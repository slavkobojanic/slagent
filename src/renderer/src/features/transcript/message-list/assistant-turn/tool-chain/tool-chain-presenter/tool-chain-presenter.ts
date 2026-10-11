import type { ToolChainStore } from "@/features/transcript/message-list/assistant-turn/tool-chain/tool-chain-store/tool-chain-store"

// How long the steps stay quiet before a running chain settles closed.
const QUIET_MS = 1000

export class ToolChainPresenter {
  private timers = new Map<string, ReturnType<typeof setTimeout>>()

  constructor(
    private readonly store: ToolChainStore,
    private readonly window: Window,
  ) {}

  mount = (id: string, mountedWhileRunning: boolean) => {
    if (this.store.isMounted(id)) return
    this.store.mount(id, mountedWhileRunning)
  }

  handleOpenChange = (id: string, value: boolean | null) => {
    this.store.setUserOpen(id, value)
  }

  // A chain that mounted while a step ran stays open so the progress shows, and settles closed
  // once the steps have been quiet for a moment, leaving the header summary to carry what the
  // turn did. A manual toggle wins.
  handleAnyActiveChange = (id: string, anyActive: boolean) => {
    if (!this.store.mountedWhileRunning(id)) return
    this.clearTimer(id)
    if (anyActive) {
      this.store.setAutoOpen(id, true)
      return
    }
    this.timers.set(
      id,
      this.window.setTimeout(() => {
        this.timers.delete(id)
        this.store.setAutoOpen(id, false)
      }, QUIET_MS),
    )
  }

  toggleStepExpanded = (id: string, stepId: string, output: boolean, active: boolean, error: boolean) => {
    if (output && !active && !error) {
      this.store.toggleStep(id, stepId)
    }
  }

  stop = () => {
    for (const id of [...this.timers.keys()]) {
      this.clearTimer(id)
    }
  }

  private clearTimer(id: string) {
    const timer = this.timers.get(id)
    if (timer === undefined) return
    this.window.clearTimeout(timer)
    this.timers.delete(id)
  }
}
