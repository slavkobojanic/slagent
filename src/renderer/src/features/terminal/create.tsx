import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import { createTerminalEmulator } from "@/features/terminal/terminal-emulator"
import { Terminal } from "./terminal"
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
    const surfaces = store.tabs.map((tab) => (
      <TerminalView key={tab.id} active={tab.id === store.activeId} onAttach={(element) => presenter.attachSession(tab.id, element)} />
    ))
    return (
      <Terminal
        open={store.open}
        height={layoutStore.terminalHeight}
        resizing={layoutStore.resizing === "terminal"}
        surfaces={surfaces}
        empty={store.empty}
        error={store.error}
        onResizeStart={presenter.handleResizeStart}
        onResizeReset={presenter.handleResizeReset}
      />
    )
  })

  // The drawer's tab bar is the app-wide bottom bar, fed by the same store.
  const Bar = createTerminalBar({ store, presenter, libraryStore, log: log.child("terminal-bar") })

  return { Terminal: TerminalHost, Bar, store, presenter }
}
