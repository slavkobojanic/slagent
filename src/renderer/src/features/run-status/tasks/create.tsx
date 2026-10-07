import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { AppDeps } from "@/state/app-deps"
import { TasksPresenter } from "@/features/run-status/tasks/tasks-presenter/tasks-presenter"
import { TasksStore } from "@/features/run-status/tasks/tasks-store/tasks-store"
import { TaskStrip } from "./tasks"

// Owning: called once at boot. The presenter starts here, so the elapsed ticker and the output reads run from boot.
export function createTaskStrip({ services, env, mirror }: Pick<AppDeps, "services" | "env" | "mirror">): ComponentType {
  const store = new TasksStore(mirror.run)
  const presenter = new TasksPresenter(store, services.tasks, env)
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
