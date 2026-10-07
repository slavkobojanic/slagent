import { toastFailure } from "@/features/library/toast-failure"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"

export class ChooseFolderPresenter {
  private disposer: (() => void) | null = null

  constructor(
    private readonly api: API,
    private readonly commandRegistry: CommandRegistry,
    private readonly log: Log,
  ) {}

  start = () => {
    if (this.disposer !== null) {
      return
    }
    this.disposer = this.commandRegistry.register({
      id: "folder.open",
      label: "Open folder",
      group: "Actions",
      run: () => {
        void this.handleChooseFolder()
      },
    })
  }

  stop = () => {
    this.disposer?.()
    this.disposer = null
  }

  handleChooseFolder = () => {
    this.log.action("choose-folder")
    return toastFailure(() => this.api.chooseFolder())
  }
}
