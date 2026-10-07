import { toast } from "sonner"
import type { ProjectRemovalStore } from "@/features/library/project-removal/project-removal-store/project-removal-store"
import type { API } from "@/ipc/api"
import { errorText } from "@/lib/format"

export class ProjectRemovalPresenter {
  constructor(
    private readonly store: ProjectRemovalStore,
    private readonly api: API,
  ) {}

  handleCancel = () => {
    if (this.store.busy) {
      return
    }
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
    this.store.setBusy(true)
    try {
      await this.api.removeProject(target.id, typed)
      this.store.setTarget(null)
    } catch (error) {
      toast.error(errorText(error))
    } finally {
      this.store.setBusy(false)
    }
  }
}
