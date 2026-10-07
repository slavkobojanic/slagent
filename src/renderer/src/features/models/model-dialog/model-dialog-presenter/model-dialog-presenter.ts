import type { ModelDialogStore } from "@/features/models/model-dialog/model-dialog-store/model-dialog-store"
import type { SettingsService } from "@/ipc/settings-service/settings-service"
import { errorText } from "@/lib/format"
import type { CommandRegistry } from "@/state/command-registry"
import type { ComposerPort } from "@/state/composer-port"
import type { OverlayStore } from "@/state/overlay-store"

const KEEPS_MODEL_NOTICE = "This chat keeps its model until the run finishes."

export class ModelDialogPresenter {
  private unregister: (() => void) | null = null

  constructor(
    private readonly store: ModelDialogStore,
    private readonly overlay: Pick<OverlayStore, "setOpen">,
    private readonly settings: Pick<SettingsService, "setModel">,
    private readonly composer: Pick<ComposerPort, "focus">,
    private readonly commands: Pick<CommandRegistry, "register">,
    private readonly notify: (message: string) => void,
  ) {}

  // Registers "Change model" for the palette. Legacy had no keyboard shortcut for it.
  start = () => {
    if (this.unregister !== null) {
      return
    }
    this.unregister = this.commands.register({
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
    this.overlay.setOpen("model", true)
  }

  handleOpenChange = (open: boolean) => {
    if (!open) {
      this.store.reset()
    }
    this.overlay.setOpen("model", open)
  }

  handleQueryChange = (value: string) => {
    this.store.setQuery(value)
  }

  // A chat keeps the model it started with, so a change that is not applied says so and
  // still closes the dialog. The composer takes focus back either way.
  handleSelect = async (modelId: string) => {
    if (!this.store.canSelect) {
      return
    }

    this.store.setBusy(true)
    this.store.setError(null)
    try {
      const change = await this.settings.setModel(modelId)
      if (!change.applied) {
        this.notify(KEEPS_MODEL_NOTICE)
      }
      this.overlay.setOpen("model", false)
      this.composer.focus()
    } catch (error) {
      this.store.setError(errorText(error))
    } finally {
      this.store.setBusy(false)
    }
  }
}
