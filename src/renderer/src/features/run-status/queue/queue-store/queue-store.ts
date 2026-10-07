import { makeAutoObservable } from "mobx"
import type { QueuedMessage, QueueMode } from "@shared/types"
import type { RunStore } from "@/mirror/run-store"

// One queued message as the queue draws it. The copy and the mode switch are decided here.
export type QueueRow = {
  id: string
  content: string
  description: string | null
  switchLabel: string
  nextMode: QueueMode
}

const STEER_NOTE = "Sends after the current tool."

// Messages waiting behind a live run. The queue is mirrored, so this store only reads it and
// keeps the error from the last change.
export class QueueStore {
  error: string | null = null

  constructor(private readonly run: RunStore) {
    makeAutoObservable<QueueStore, "run">(this, { run: false })
  }

  get rows(): QueueRow[] {
    return this.run.queue.map(toRow)
  }

  setError(message: string | null) {
    this.error = message
  }
}

function toRow(item: QueuedMessage): QueueRow {
  const steer = item.mode === "steer"
  return {
    id: item.id,
    content: item.text || item.detail,
    description: describe(item.detail, steer),
    switchLabel: steer ? "Follow-up" : "Steer",
    nextMode: steer ? "follow-up" : "steer",
  }
}

function describe(detail: string, steer: boolean): string | null {
  if (steer && detail !== "") {
    return `${detail}. ${STEER_NOTE}`
  }
  if (steer) {
    return STEER_NOTE
  }
  if (detail !== "") {
    return detail
  }
  return null
}
