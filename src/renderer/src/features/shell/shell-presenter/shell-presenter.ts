import type { LibraryService } from "@/ipc/library-service/library-service"
import { errorText } from "@/lib/format"
import type { ShellStore } from "@/features/shell/shell-store/shell-store"
import type { OverlayStore } from "@/state/overlay-store"
import type { PanelPresenter } from "@/state/panel-presenter"
import type { PanelStore } from "@/state/panel-store"

// The header's commands. Project switching is a service call, so a failure goes to the shell
// store. The dialogs and the panel are shared state, so the presenter only flips their flags.
export class ShellPresenter {
  constructor(
    private readonly store: ShellStore,
    private readonly overlay: Pick<OverlayStore, "setOpen">,
    private readonly panel: Pick<PanelStore, "open">,
    private readonly panelPresenter: Pick<PanelPresenter, "setOpen">,
    private readonly library: Pick<LibraryService, "openProject" | "chooseFolder">,
  ) {}

  openProject = async (projectId: string) => {
    this.store.setError(null)
    try {
      await this.library.openProject(projectId)
    } catch (error) {
      this.store.setError(errorText(error))
    }
  }

  chooseFolder = async () => {
    this.store.setError(null)
    try {
      await this.library.chooseFolder()
    } catch (error) {
      this.store.setError(errorText(error))
    }
  }

  togglePanel = () => {
    this.panelPresenter.setOpen(!this.panel.open)
  }

  openModel = () => {
    this.overlay.setOpen("model", true)
  }

  openSettings = () => {
    this.overlay.setOpen("settings", true)
  }
}
