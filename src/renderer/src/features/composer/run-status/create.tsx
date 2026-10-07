import type { ComponentType } from "react"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { RunStore } from "@/mirror/run-store/run-store"
import { createQueue } from "./queue/create"
import { RunStatus } from "./run-status"
import { createTaskStrip } from "./tasks/create"
import { createTodos } from "./todos/create"

export function createRunStatus({
  api,
  window,
  runStore,
  log,
}: {
  api: API
  window: Window
  runStore: RunStore
  log: Log
}): ComponentType {
  const Tasks = createTaskStrip({ api, window, runStore, log: log.child("tasks") })
  const Todos = createTodos({ runStore })
  const Queue = createQueue({ api, runStore, log: log.child("queue") })

  return function RunStatusHost() {
    return <RunStatus Tasks={Tasks} Todos={Todos} Queue={Queue} />
  }
}
