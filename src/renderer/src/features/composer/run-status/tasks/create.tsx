import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { API } from "@/ipc/api"
import type { RunStore } from "@/mirror/run-store/run-store"
import { TaskStrip } from "./tasks"
import { TasksPresenter } from "./tasks-presenter/tasks-presenter"
import { TasksStore } from "./tasks-store/tasks-store"

export function createTaskStrip({ api, window, runStore }: { api: API; window: Window; runStore: RunStore }): ComponentType {
  const store = new TasksStore(runStore)
  const presenter = new TasksPresenter(store, api, window)
  presenter.start()

  return observer(function TaskStripHost() {
    return (
      <TaskStrip
        chips={store.chips}
        error={store.error}
        viewing={store.current}
        output={store.outputText}
        onOpen={presenter.handleOpen}
        onStop={presenter.handleStop}
        onClose={presenter.handleClose}
        bindBottom={presenter.attachBottom}
      />
    )
  })
}
