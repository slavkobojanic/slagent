import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import { createTerminalEmulator } from "@/features/terminal/terminal-emulator"
import { Terminal } from "./terminal"
import type { TerminalPane } from "./terminal"
import { TerminalPresenter } from "./terminal-presenter/terminal-presenter"
import { TerminalStore } from "./terminal-store/terminal-store"
import { TerminalView } from "./terminal-view/terminal-view"
import { createTerminalBar } from "./terminal-bar/create"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { LibraryStore } from "@/mirror/library-store/library-store"
import type { ComposerPort } from "@/state/composer-port/composer-port"
import type { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import type { LayoutPresenter } from "@/state/layout/layout-presenter/layout-presenter"
import type { LayoutStore } from "@/state/layout/layout-store/layout-store"

export function createTerminal({
  api,
  window,
  libraryStore,
  layoutStore,
  layoutPresenter,
  commandRegistry,
  composerPort,
  log,
}: {
  api: API
  window: Window & typeof globalThis
  libraryStore: LibraryStore
  layoutStore: LayoutStore
  layoutPresenter: LayoutPresenter
  commandRegistry: CommandRegistry
  composerPort: ComposerPort
  log: Log
}): { Terminal: ComponentType; Bar: ComponentType; store: TerminalStore; presenter: TerminalPresenter } {
  const store = new TerminalStore()
  const presenter = new TerminalPresenter(store, api, layoutPresenter, commandRegistry, composerPort, window, createTerminalEmulator, log)
  presenter.start()

  const TerminalHost = observer(function TerminalHost() {
    // The active group's tabs sit side by side; every other tab stays mounted
    // and hidden so its scrollback survives.
    const visible = new Set(store.activeGroup.map((tab) => tab.id))
    const panes: TerminalPane[] = store.activeGroup.map((tab) => ({
      id: tab.id,
      groupId: tab.groupId,
      surface: surface(tab.id),
    }))
    const hiddenSurfaces = store.tabs.filter((tab) => !visible.has(tab.id)).map((tab) => surface(tab.id))
    return (
      <Terminal
        open={store.open}
        height={layoutStore.terminalHeight}
        resizing={layoutStore.resizing === "terminal"}
        panes={panes}
        hiddenSurfaces={hiddenSurfaces}
        splitRatio={(groupId) => store.splitRatio(groupId)}
        error={store.error}
        onPaneSelect={presenter.select}
        onMenuSplit={presenter.handleMenuSplit}
        onMenuRename={presenter.handleMenuRename}
        onMenuClose={presenter.handleMenuClose}
        onDividerStart={presenter.handleDividerDragStart}
        onResizeStart={presenter.handleResizeStart}
        onResizeReset={presenter.handleResizeReset}
      />
    )

    function surface(id: string) {
      return <TerminalView key={id} active={visible.has(id)} onAttach={(element) => presenter.attachSession(id, element)} />
    }
  })

  // The drawer's tab bar is the app-wide bottom bar, fed by the same store.
  const Bar = createTerminalBar({ store, presenter, libraryStore, log: log.child("terminal-bar") })

  return { Terminal: TerminalHost, Bar, store, presenter }
}
