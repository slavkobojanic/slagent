import { reaction } from "mobx"
import { toast } from "sonner"
import type { ChatSummary, ProjectSummary } from "@shared/types"
import type { CommandPaletteStore } from "@/features/library/command-palette/command-palette-store/command-palette-store"
import { toastFailure } from "@/features/library/toast-failure"
import type { API } from "@/ipc/api"
import { errorText } from "@/lib/format"
import type { ComposerPort } from "@/state/composer-port/composer-port"
import type { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import type { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"

// Choosing an item closes the palette first, then acts.
export class CommandPalettePresenter {
  private started = false
  private disposers: (() => void)[] = []

  constructor(
    private readonly store: CommandPaletteStore,
    private readonly api: API,
    private readonly window: Window,
    private readonly overlayStore: OverlayStore,
    private readonly commandRegistry: CommandRegistry,
    private readonly composerPort: ComposerPort,
  ) {}

  start = () => {
    if (this.started) {
      return
    }
    this.started = true
    this.disposers.push(
      this.commandRegistry.register({
        id: "palette.toggle",
        label: "Command palette",
        group: "Actions",
        shortcut: { key: "k", mod: true },
        inPalette: false,
        run: this.toggle,
      }),
    )
    this.disposers.push(
      reaction(
        () => this.overlayStore.paletteOpen,
        (open) => {
          if (open) {
            this.store.setQuery("")
            this.loadSlashCommands()
          }
        },
      ),
    )
  }

  stop = () => {
    for (const dispose of this.disposers) {
      dispose()
    }
    this.disposers = []
    this.started = false
  }

  handleOpenChange = (open: boolean) => {
    this.overlayStore.setOpen("palette", open)
  }

  handleRunCommand = (id: string) => {
    this.close()
    this.commandRegistry.run(id)
  }

  handleOpenChat = (chat: ChatSummary) => {
    this.close()
    void toastFailure(() => this.api.openChat(chat.id))
  }

  handleOpenProject = (project: ProjectSummary) => {
    this.close()
    void toastFailure(() => this.api.openProject(project.id))
  }

  // The trailing space leaves the caret ready for the user to finish the command.
  handleFillCommand = (insert: string) => {
    this.close()
    this.window.requestAnimationFrame(() => {
      this.composerPort.fill(`${insert} `)
    })
  }

  handleQueryChange = (value: string) => {
    this.store.setQuery(value)
  }

  handleSelectModel = (modelId: string) => {
    this.close()
    void this.setModel(modelId)
  }

  private setModel = async (modelId: string) => {
    try {
      await this.api.setModel(modelId)
    } catch (error) {
      toast.error(errorText(error))
    }
  }

  private close = () => {
    this.overlayStore.setOpen("palette", false)
  }

  private toggle = () => {
    this.overlayStore.setOpen("palette", !this.overlayStore.paletteOpen)
  }

  // A failed listing keeps the last list.
  private loadSlashCommands = () => {
    void this.api.listCommands().then(
      (next) => {
        this.store.setSlashCommands(next)
      },
      () => undefined,
    )
  }
}
