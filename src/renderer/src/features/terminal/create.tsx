import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import { createTerminalEmulator } from "@/features/terminal/terminal-emulator"
import { Terminal } from "./terminal"
import { TerminalPresenter } from "./terminal-presenter/terminal-presenter"
import { TerminalStore } from "./terminal-store/terminal-store"
import { TerminalTab } from "./terminal-tab/terminal-tab"
import { TerminalView } from "./terminal-view/terminal-view"
import { projectColor } from "@/components/project-appearance"
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
}): { Terminal: ComponentType; store: TerminalStore; presenter: TerminalPresenter } {
  const store = new TerminalStore()
  const presenter = new TerminalPresenter(store, api, layoutPresenter, commandRegistry, composerPort, window, createTerminalEmulator, log)
  presenter.start()

  const TerminalHost = observer(function TerminalHost() {
    const tabs = store.tabs.map((tab) => {
      const project = libraryStore.library.projects.find((candidate) => candidate.id === libraryStore.library.openProjectId)
      return (
        <TerminalTab
          key={tab.id}
          title={tab.title}
          active={tab.id === store.activeId}
          exited={tab.exited}
          origin={tab.origin}
          color={project ? projectColor(project) : null}
          onSelect={() => presenter.select(tab.id)}
          onClose={() => presenter.closeTab(tab.id)}
        />
      )
    })
    const surfaces = store.tabs.map((tab) => (
      <TerminalView key={tab.id} active={tab.id === store.activeId} onAttach={(element) => presenter.attachSession(tab.id, element)} />
    ))
    return (
      <Terminal
        open={store.open}
        height={layoutStore.terminalHeight}
        resizing={layoutStore.resizing === "terminal"}
        tabs={tabs}
        surfaces={surfaces}
        empty={store.empty}
        error={store.error}
        canCreate={store.canCreate}
        onCreate={() => void presenter.create()}
        onClose={presenter.close}
        onResizeStart={presenter.handleResizeStart}
        onResizeReset={presenter.handleResizeReset}
      />
    )
  })

  return { Terminal: TerminalHost, store, presenter }
}
