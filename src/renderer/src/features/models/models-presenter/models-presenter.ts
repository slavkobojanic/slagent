import type { ModelsStore } from "@/features/models/models-store/models-store"
import type { API } from "@/ipc/api"
import { errorText } from "@/lib/format"
import type { Log } from "@/log/log"
import type { ComposerPort } from "@/state/composer-port/composer-port"
import type { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import type { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"

const KEEPS_MODEL_NOTICE = "This chat keeps its model until the run finishes."

export class ModelsPresenter {
  private unregister: (() => void) | null = null

  constructor(
    private readonly store: ModelsStore,
    private readonly api: API,
    private readonly overlayStore: OverlayStore,
    private readonly composerPort: ComposerPort,
    private readonly commandRegistry: CommandRegistry,
    private readonly notify: (message: string) => void,
    private readonly log: Log,
  ) {}

  start = () => {
    if (this.unregister !== null) {
      return
    }
    this.unregister = this.commandRegistry.register({
      id: "models.open",
      label: "Change model",
      group: "Actions",
      enabled: () => this.store.canOpen,
      run: this.handleOpen,
    })
  }

  stop = () => {
    this.unregister?.()
    this.unregister = null
  }

  handleOpen = () => {
    this.log.action("open-models")
    this.overlayStore.setOpen("model", true)
  }

  handleOpenChange = (open: boolean) => {
    this.log.action("set-open", { open })
    if (!open) {
      this.store.reset()
    }
    this.overlayStore.setOpen("model", open)
  }

  handleQueryChange = (value: string) => {
    this.store.setQuery(value)
  }

  // A chat keeps the model it started with, so a change that is not applied says so and
  // still closes the dialog.
  handleSelect = async (modelId: string) => {
    if (!this.store.canSelect) {
      return
    }
    this.log.action("select-model", { modelId })

    this.store.setBusy(true)
    this.store.setError(null)
    try {
      const change = await this.api.setModel(modelId)
      if (!change.applied) {
        this.notify(KEEPS_MODEL_NOTICE)
      }
      this.overlayStore.setOpen("model", false)
      this.composerPort.focus()
    } catch (error) {
      this.log.warn("select-model-failed", { modelId, error })
      this.store.setError(errorText(error))
    } finally {
      this.store.setBusy(false)
    }
  }
}
