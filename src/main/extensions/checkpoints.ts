import type { ExtensionFactory, SessionManager } from "@earendil-works/pi-coding-agent"
import type { CheckpointStore } from "../checkpoints"

// Pi only ships a git-stash checkpoint example, which misses untracked files.
// This snapshots the folder before every run and records the snapshot as a
// session entry, so it sits right before that run's user message in the tree.

const ENTRY = "slagent-checkpoint"

export function checkpointExtension(store: CheckpointStore): ExtensionFactory {
  return (pi) => {
    pi.on("before_agent_start", async (event) => {
      const label = event.prompt.split("\n")[0]?.slice(0, 120) || "checkpoint"
      const commit = await store.snapshot(label)
      if (commit) pi.appendEntry(ENTRY, { commit })
    })
  }
}

// The snapshot taken just before the user message with this entry id, or null
// when that message was sent mid-run or before checkpoints existed.
export function checkpointBefore(sessionManager: Pick<SessionManager, "getBranch">, entryId: string): string | null {
  const branch = sessionManager.getBranch(entryId)
  for (let index = branch.length - 2; index >= 0; index -= 1) {
    const entry = branch[index]
    if (!entry) continue
    if (entry.type === "custom" && entry.customType === ENTRY) {
      const commit = (entry.data as { commit?: unknown } | undefined)?.commit
      return typeof commit === "string" ? commit : null
    }
    if (entry.type === "message" && entry.message.role === "user") return null
  }
  return null
}
