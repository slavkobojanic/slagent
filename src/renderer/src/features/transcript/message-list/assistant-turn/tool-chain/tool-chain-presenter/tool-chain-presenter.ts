import type { Log } from "@/log/log"
import type { ToolChainStore } from "../tool-chain-store/tool-chain-store"

export class ToolChainPresenter {
  private timer: ReturnType<typeof setTimeout> | null = null
  private mountedWhileRunning: boolean

  constructor(
    private readonly store: ToolChainStore,
    private readonly window: Window,
    mountedWhileRunning: boolean,
    private readonly log: Log,
  ) {
    this.mountedWhileRunning = mountedWhileRunning
  }

  handleAnyActiveChange = (anyActive: boolean) => {
    if (!this.mountedWhileRunning) return
    if (anyActive) {
      if (this.timer !== null) {
        this.window.clearTimeout(this.timer)
        this.timer = null
      }
      this.store.setAutoOpen(true)
      return
    }
    this.timer = this.window.setTimeout(() => {
      this.store.setAutoOpen(false)
      this.timer = null
    }, 1000)
  }

  handleStepActiveChange = (stepId: string, active: boolean) => {
    if (active) {
      this.store.setStepExpanded(stepId, false)
    }
  }

  toggleStepExpanded = (stepId: string, output: boolean, active: boolean, error: boolean) => {
    if (output && !active && !error) {
      this.store.toggleStep(stepId)
    }
  }

  stop = () => {
    if (this.timer !== null) {
      this.window.clearTimeout(this.timer)
      this.timer = null
    }
  }
}
