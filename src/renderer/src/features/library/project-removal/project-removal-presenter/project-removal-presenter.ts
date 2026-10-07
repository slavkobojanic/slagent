import { toast } from "sonner"
import type { ProjectSummary } from "@shared/types"
import type { LibraryService } from "@/ipc/library-service/library-service"
import type { ProjectRemovalStore } from "@/features/library/project-removal/project-removal-store/project-removal-store"
import { errorText } from "@/lib/format"

export class ProjectRemovalPresenter {
  constructor(
    private readonly store: ProjectRemovalStore,
    private readonly library: Pick<LibraryService, "removeProject">,
  ) {}

  handleRequest = (project: ProjectSummary) => {
    this.store.setTarget(project)
  }

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
      await this.library.removeProject(target.id, typed)
      this.store.setTarget(null)
    } catch (error) {
      toast.error(errorText(error))
    } finally {
      this.store.setBusy(false)
    }
  }
}
