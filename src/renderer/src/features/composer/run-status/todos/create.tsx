import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { RunStore } from "@/mirror/run-store/run-store"
import { TodoPanel } from "./todos"
import { TodosStore } from "./todos-store/todos-store"

export function createTodos({ runStore }: { runStore: RunStore }): ComponentType {
  const store = new TodosStore(runStore)

  return observer(function TodosHost() {
    return <TodoPanel panel={store.panel} />
  })
}
