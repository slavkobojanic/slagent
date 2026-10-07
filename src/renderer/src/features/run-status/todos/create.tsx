import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { AppDeps } from "@/state/app-deps"
import { TodosStore } from "@/features/run-status/todos/todos-store/todos-store"
import { TodoPanel } from "./todos"

// Owning: called once at boot. The todo list has no commands, so it needs no presenter.
export function createTodos({ mirror }: Pick<AppDeps, "mirror">): ComponentType {
  const store = new TodosStore(mirror.run)

  return observer(function TodosHost() {
    return <TodoPanel panel={store.panel} />
  })
}
