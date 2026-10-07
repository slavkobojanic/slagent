import { toast } from "sonner"
import type { ProjectRemovalStore } from "@/features/library/project-removal/project-removal-store/project-removal-store"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import { errorText } from "@/lib/format"

export class ProjectRemovalPresenter {
  constructor(
    private readonly store: ProjectRemovalStore,
    private readonly api: API,
    private readonly log: Log,
  ) {}

  handleCancel = () => {
    if (this.store.busy) {
      return
    }
    this.log.action("cancel-remove-project", { projectId: this.store.target?.id })
    this.store.setTarget(null)
  }

  handleTypedChange = (value: string) => {
    this.store.setTyped(value)
  }

  handleConfirm = async () => {
    const target = this.store.target
    if (!this.store.canConfirm || target === null) {
      return
    }

    // The main process checks the typed name again, so it is sent as typed.
    const typed = this.store.typed
    this.log.action("remove-project", { projectId: target.id, name: target.name })
    this.store.setBusy(true)
    try {
      await this.api.removeProject(target.id, typed)
      this.store.setTarget(null)
    } catch (error) {
      this.log.warn("remove-project-failed", { projectId: target.id, error })
      toast.error(errorText(error))
    } finally {
      this.store.setBusy(false)
    }
  }
}
