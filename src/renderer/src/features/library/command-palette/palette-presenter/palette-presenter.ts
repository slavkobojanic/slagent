import { reaction } from "mobx"
import { toast } from "sonner"
import type { ChatSummary, ProjectSummary } from "@shared/types"
import type { LibraryPresenter } from "@/features/library/library-presenter/library-presenter"
import type { PaletteStore } from "@/features/library/command-palette/palette-store/palette-store"
import type { CommandService } from "@/ipc/command-service/command-service"
import type { SettingsService } from "@/ipc/settings-service/settings-service"
import { errorText } from "@/lib/format"
import type { AppEnv } from "@/state/app-deps"
import type { CommandRegistry } from "@/state/command-registry"
import type { ComposerPort } from "@/state/composer-port"
import type { OverlayStore } from "@/state/overlay-store"

// Cmd+K opens the palette. Choosing an item closes it first, then acts. Commands run from the registry,
// so each slice's own actions appear without this presenter knowing them.
export class PalettePresenter {
  private started = false
  private disposers: (() => void)[] = []

  constructor(
    private readonly store: PaletteStore,
    private readonly overlay: Pick<OverlayStore, "setOpen" | "paletteOpen">,
    private readonly library: Pick<LibraryPresenter, "openChat" | "openProject">,
    private readonly commands: Pick<CommandService, "listCommands">,
    private readonly settings: Pick<SettingsService, "setModel">,
    private readonly registry: CommandRegistry,
    private readonly composer: Pick<ComposerPort, "fill">,
    private readonly env: AppEnv,
  ) {}

  start = () => {
    if (this.started) {
      return
    }
    this.started = true
    this.disposers.push(
      this.registry.register({
        id: "palette.toggle",
        label: "Command palette",
        group: "Actions",
        shortcut: { key: "k", mod: true },
        // The palette does not list itself.
        inPalette: false,
        run: this.toggle,
      }),
    )
    this.disposers.push(
      reaction(
        () => this.overlay.paletteOpen,
        (open) => {
          if (open) {
            // Each opening starts from an empty query, as the old palette did.
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
    this.overlay.setOpen("palette", open)
  }

  handleRunCommand = (id: string) => {
    this.close()
    this.registry.run(id)
  }

  handleOpenChat = (chat: ChatSummary) => {
    this.close()
    void this.library.openChat(chat.id)
  }

  handleOpenProject = (project: ProjectSummary) => {
    this.close()
    void this.library.openProject(project.id)
  }

  // A skill or slash command goes into the prompt box, followed by a space, for the user to finish.
  handleFillCommand = (insert: string) => {
    this.close()
    this.env.window.requestAnimationFrame(() => {
      this.composer.fill(`${insert} `)
    })
  }

  handleQueryChange = (value: string) => {
    this.store.setQuery(value)
  }

  // Closes the palette, then switches the model. A failed switch shows a toast, as the old palette did.
  handleSelectModel = (modelId: string) => {
    this.close()
    void this.setModel(modelId)
  }

  private setModel = async (modelId: string) => {
    try {
      await this.settings.setModel(modelId)
    } catch (error) {
      toast.error(errorText(error))
    }
  }

  private close = () => {
    this.overlay.setOpen("palette", false)
  }

  private toggle = () => {
    this.overlay.setOpen("palette", !this.overlay.paletteOpen)
  }

  // A failed listing keeps the last list, as the palette always has.
  private loadSlashCommands = () => {
    void this.commands.listCommands().then(
      (next) => {
        this.store.setSlashCommands(next)
      },
      () => undefined,
    )
  }
}
