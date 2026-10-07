import { makeAutoObservable } from "mobx"
import { groupModels, type ModelGroups } from "@/features/models/model-dialog/model-groups"
import type { MetaStore } from "@/mirror/meta-store"
import type { RunStore } from "@/mirror/run-store"

// The model dialog's own state: the search text, a change in flight, and the last failure.
// The models and the current model are read from the mirrored meta; nothing here copies them.
export class ModelDialogStore {
  query = ""
  busy = false
  error: string | null = null

  constructor(
    private readonly meta: MetaStore,
    private readonly run: RunStore,
  ) {
    makeAutoObservable<ModelDialogStore, "meta" | "run">(this, { meta: false, run: false })
  }

  get groups(): ModelGroups {
    return groupModels(this.meta.meta?.models ?? [], this.meta.meta?.modelId ?? null, this.query)
  }

  // Rows are off until the app is ready, and while a change is in flight.
  get canSelect(): boolean {
    if (!this.meta.ready || this.busy) {
      return false
    }
    return true
  }

  // "Change model" in the palette is off until the app is ready and no run is streaming.
  get canOpen(): boolean {
    if (!this.meta.ready || this.run.streaming) {
      return false
    }
    return true
  }

  setQuery(value: string) {
    this.query = value
  }

  setBusy(value: boolean) {
    this.busy = value
  }

  setError(message: string | null) {
    this.error = message
  }

  // Forgets the search and any failure. Called when the dialog closes.
  reset() {
    this.query = ""
    this.error = null
  }
}
