import type { SubagentRunState } from "@shared/types"
import { BotIcon, CheckIcon, CircleAlertIcon, LoaderCircleIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type SubagentRunsProps = {
  runs: SubagentRunState[]
  running: boolean
}

// Live view of the subagent tool: one card per run with the agent, its task and the steps it
// has taken so far. Streams while the runs are in flight, and stays as the record afterwards.
export function SubagentRuns({ runs, running }: SubagentRunsProps) {
  if (runs.length === 0) {
    return null
  }
  return (
    <div className="mt-1 space-y-2">
      {runs.map((run, index) => (
        <SubagentRun key={`${run.agent}-${index}`} run={run} running={running} />
      ))}
    </div>
  )
}

function SubagentRun({ run, running }: { run: SubagentRunState; running: boolean }) {
  const active = running && !run.error && run.state !== "done"
  return (
    <div className="overflow-hidden rounded-md bg-white/5 text-xs">
      <div className="flex items-center gap-2 px-3 pt-2 pb-1">
        <BotIcon className="size-3.5 shrink-0 text-white/60" />
        <span className={cn("font-medium text-white/90", run.error && "text-destructive")}>{run.agent}</span>
        <span className="truncate text-white/40">{run.task.split("\n")[0]}</span>
        <span className="ml-auto shrink-0 text-white/30">{run.steps.length} steps</span>
      </div>
      {run.steps.length > 0 ? (
        <div className="max-h-40 overflow-auto px-3 pb-2">
          {run.steps.map((step, stepIndex) => {
            const current = stepIndex === run.steps.length - 1
            return (
              <div key={`${step}-${stepIndex}`} className="flex items-start gap-2 py-0.5">
                {current && active ? (
                  <LoaderCircleIcon className="mt-0.5 size-3 shrink-0 animate-spin text-white/50" />
                ) : (
                  <CheckIcon className="mt-0.5 size-3 shrink-0 text-white/30" />
                )}
                <span className={cn("break-words text-white/60", current && active && "text-white/90")}>{step}</span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 pb-2">
          {active ? <LoaderCircleIcon className="size-3 shrink-0 animate-spin text-white/50" /> : null}
          <span className="text-white/30">{run.error ? "Failed" : "Starting"}</span>
        </div>
      )}
      {run.error ? (
        <div className="flex items-center gap-2 px-3 pb-2">
          <CircleAlertIcon className="size-3 shrink-0 text-destructive" />
          <span className="break-words text-destructive">{run.error}</span>
        </div>
      ) : null}
    </div>
  )
}
