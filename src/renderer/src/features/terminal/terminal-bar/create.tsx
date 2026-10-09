import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import { TerminalBar } from "./terminal-bar"
import { TerminalBarPresenter } from "./terminal-bar-presenter/terminal-bar-presenter"
import { TerminalBarStore } from "./terminal-bar-store/terminal-bar-store"
import type { TerminalStore } from "@/features/terminal/terminal-store/terminal-store"
import type { TerminalPresenter } from "@/features/terminal/terminal-presenter/terminal-presenter"
import type { LibraryStore } from "@/mirror/library-store/library-store"
import type { Log } from "@/log/log"

export function createTerminalBar({
  store,
  presenter,
  libraryStore,
  log,
}: {
  store: TerminalStore
  presenter: TerminalPresenter
  libraryStore: LibraryStore
  log: Log
}): ComponentType {
  const barStore = new TerminalBarStore(store, libraryStore)
  const barPresenter = new TerminalBarPresenter(barStore, presenter, log)

  return observer(function TerminalBarHost() {
    return (
      <TerminalBar
        chips={barStore.chips}
        open={barStore.open}
        canCreate={barStore.canCreate}
        onSelect={barPresenter.handleSelect}
        onClose={barPresenter.handleClose}
        onCreate={barPresenter.handleCreate}
        onToggle={barPresenter.handleToggle}
      />
    )
  })
}
