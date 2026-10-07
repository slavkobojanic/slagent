import { makeAutoObservable, observableRef } from "mobx"
import type { AppMeta } from "@shared/types"

// App metadata from the main process: readiness, the model, the working folder and
// OpenRouter status. Null until the first meta event or snapshot arrives.
export class MetaStore {
  meta: AppMeta | null = null

  constructor() {
    makeAutoObservable(this, { meta: observableRef })
  }

  get ready(): boolean {
    if (this.meta === null) {
      return false
    }
    return this.meta.ready
  }

  // Claude Code chats sign in through Claude Code itself, so they need no OpenRouter key.
  get configured(): boolean {
    if (this.meta === null) {
      return false
    }
    if (this.meta.openRouter.configured) {
      return true
    }
    return this.meta.modelProvider === "claude-code"
  }

  setMeta(meta: AppMeta) {
    this.meta = meta
  }
}
