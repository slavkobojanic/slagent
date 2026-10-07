import { reaction } from "mobx"
import type { Log } from "@/log/log"
import type { LibraryStore } from "@/mirror/library-store/library-store"
import type { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"
import type { PanelStore } from "@/state/panel/panel-store/panel-store"

type Place = { id: string; name: string } | null

// There is no router, so "navigation" is the open project and chat, the right panel, and the open overlay.
// This watches all of them in one place and logs { from, to } under the nav namespace.
export class NavLogPresenter {
  private disposers: (() => void)[] = []

  constructor(
    private readonly libraryStore: LibraryStore,
    private readonly panelStore: PanelStore,
    private readonly overlayStore: OverlayStore,
    private readonly log: Log,
  ) {}

  start = () => {
    if (this.disposers.length > 0) {
      return
    }
    this.disposers.push(
      reaction(this.project, (to, from) => this.log.info("project", { from, to }), { equals: samePlace }),
      reaction(this.chat, (to, from) => this.log.info("chat", { from, to }), { equals: samePlace }),
      reaction(this.panel, (to, from) => this.log.info("panel", { from, to })),
      reaction(this.file, (to, from) => this.log.info("file", { from, to })),
      reaction(this.overlay, (to, from) => this.log.info("overlay", { from, to })),
    )
  }

  stop = () => {
    for (const dispose of this.disposers) {
      dispose()
    }
    this.disposers = []
  }

  private project = (): Place => {
    const id = this.libraryStore.openProjectId
    if (id === null) {
      return null
    }
    const project = this.libraryStore.library.projects.find((item) => item.id === id)
    return { id, name: project?.name ?? "" }
  }

  private chat = (): Place => {
    const id = this.libraryStore.openChatId
    if (id === null) {
      return null
    }
    const chat = this.libraryStore.library.chats.find((item) => item.id === id)
    return { id, name: chat?.title ?? "" }
  }

  private panel = (): string => (this.panelStore.open ? this.panelStore.tab : "closed")

  private file = (): string | null => this.panelStore.viewedFile?.path ?? null

  private overlay = (): string | null => {
    if (this.overlayStore.settingsOpen) {
      return "settings"
    }
    if (this.overlayStore.modelOpen) {
      return "model"
    }
    if (this.overlayStore.paletteOpen) {
      return "palette"
    }
    return null
  }
}

// A rename changes the name but is not a move.
function samePlace(a: Place, b: Place): boolean {
  return a?.id === b?.id
}
