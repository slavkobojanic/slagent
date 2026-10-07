import type { ComponentType } from "react"
import type { API } from "@/ipc/api"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { RunStore } from "@/mirror/run-store/run-store"
import type { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import { createQueue } from "./queue/create"
import { RunStatus } from "./run-status"
import { createTaskStrip } from "./tasks/create"
import { createTodos } from "./todos/create"
import { createUsageMeter } from "./usage-meter/create"

export function createRunStatus({
  api,
  window,
  runStore,
  metaStore,
  commandRegistry,
}: {
  api: API
  window: Window
  runStore: RunStore
  metaStore: MetaStore
  commandRegistry: CommandRegistry
}): ComponentType {
  const Tasks = createTaskStrip({ api, window, runStore })
  const Todos = createTodos({ runStore })
  const Queue = createQueue({ api, runStore })
  const Usage = createUsageMeter({ api, runStore, metaStore, commandRegistry })

  return function RunStatusHost() {
    return <RunStatus Tasks={Tasks} Todos={Todos} Queue={Queue} Usage={Usage} />
  }
}
