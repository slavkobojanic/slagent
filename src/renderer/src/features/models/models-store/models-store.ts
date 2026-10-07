import { makeAutoObservable } from "mobx"
import { groupModels, type ModelGroups } from "@/features/models/model-groups"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { RunStore } from "@/mirror/run-store/run-store"

export class ModelsStore {
  query = ""
  busy = false
  error: string | null = null

  constructor(
    private readonly metaStore: MetaStore,
    private readonly runStore: RunStore,
  ) {
    makeAutoObservable(this)
  }

  get groups(): ModelGroups {
    return groupModels(this.metaStore.meta?.models ?? [], this.metaStore.meta?.modelId ?? null, this.query)
  }

  get canSelect(): boolean {
    if (!this.metaStore.ready || this.busy) {
      return false
    }
    return true
  }

  get canOpen(): boolean {
    if (!this.metaStore.ready || this.runStore.streaming) {
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

  reset() {
    this.query = ""
    this.error = null
  }
}
