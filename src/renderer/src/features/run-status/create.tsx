import type { AppDeps } from "@/state/app-deps"
import type { RunStatusSlots } from "@/state/slots"
import { createQueue } from "./queue/create"
import { RunStatusBar } from "./run-status"
import { createTaskStrip } from "./tasks/create"
import { createTodos } from "./todos/create"
import { createUsageMeter } from "./usage-meter/create"

// Owning: called once at boot. It builds each sub-unit, which owns its own store and presenter,
// and returns the bar that composes them. The bar reads nothing itself.
export function createRunStatus(deps: AppDeps): RunStatusSlots {
  const Tasks = createTaskStrip(deps)
  const Todos = createTodos(deps)
  const Queue = createQueue(deps)
  const Usage = createUsageMeter(deps)

  function RunStatus() {
    return <RunStatusBar Tasks={Tasks} Todos={Todos} Queue={Queue} Usage={Usage} />
  }

  return { RunStatusBar: RunStatus }
}
