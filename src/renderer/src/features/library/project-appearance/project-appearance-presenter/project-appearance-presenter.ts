import { errorText } from "@/lib/format"
import type { ProjectAppearanceStore } from "@/features/library/project-appearance/project-appearance-store/project-appearance-store"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"

export class ProjectAppearancePresenter {
  constructor(
    private readonly store: ProjectAppearanceStore,
    private readonly api: API,
    private readonly log: Log,
  ) {}

  handleClose = () => {
    if (this.store.busy) {
      return
    }
    this.store.setTarget(null)
  }

  handleIcon = (icon: string | null) => {
    this.store.setIcon(icon)
  }

  handleColor = (color: string | null) => {
    this.store.setColor(color)
  }

  handleConfirm = async () => {
    if (!this.store.canConfirm || this.store.target === null) {
      return
    }
    this.log.action("set-appearance", { projectId: this.store.target.id, icon: this.store.icon, color: this.store.color })
    this.store.setBusy(true)
    try {
      await this.api.setProjectAppearance(this.store.target.id, { icon: this.store.icon, color: this.store.color })
      // The library event restyles the sidebar; the dialog just closes.
      this.store.setTarget(null)
    } catch (error) {
      this.log.warn("set-appearance-failed", { error })
      this.store.setError(errorText(error))
    } finally {
      this.store.setBusy(false)
    }
  }
}
