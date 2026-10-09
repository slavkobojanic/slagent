import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { LibraryStore } from "@/mirror/library-store/library-store"
import type { TerminalPresenter } from "@/features/terminal/terminal-presenter/terminal-presenter"
import type { TerminalStore } from "@/features/terminal/terminal-store/terminal-store"
import { StatusBar } from "./status-bar"
import { StatusBarPresenter } from "./status-bar-presenter/status-bar-presenter"
import { StatusBarStore } from "./status-bar-store/status-bar-store"
import { TaskViewer } from "./task-viewer/task-viewer"

export function createStatusBar({
  api,
  window,
  libraryStore,
  terminalStore,
  terminalPresenter,
  log,
}: {
  api: API
  window: Window
  libraryStore: LibraryStore
  terminalStore: TerminalStore
  terminalPresenter: TerminalPresenter
  log: Log
}): ComponentType {
  const store = new StatusBarStore(terminalStore, libraryStore)
  const presenter = new StatusBarPresenter(store, terminalPresenter, api, window, log)
  presenter.start()

  return observer(function StatusBarHost() {
    const viewing = store.viewing
    return (
      <>
        <StatusBar
          terminals={store.terminals}
          tasks={store.tasks}
          onTerminal={presenter.handleTerminal}
          onTask={presenter.handleOpenTask}
          onTaskTerminal={presenter.handleTaskTerminal}
          onStopTask={(id) => void presenter.handleStop(id)}
        />
        <TaskViewer
          task={
            viewing === null
              ? null
              : {
                  id: viewing.id,
                  label: viewing.label,
                  command: viewing.command,
                  status: viewing.status,
                  statusText: store.tasks.find((task) => task.id === viewing.id)?.statusText ?? "",
                  projectName: store.tasks.find((task) => task.id === viewing.id)?.projectName ?? viewing.projectId,
                }
          }
          output={store.outputText}
          error={store.error}
          onClose={presenter.handleCloseTask}
          onStop={(id) => void presenter.handleStop(id)}
          bindBottom={presenter.attachBottom}
        />
      </>
    )
  })
}
