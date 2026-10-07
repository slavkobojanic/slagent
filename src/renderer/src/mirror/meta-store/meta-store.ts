import { makeAutoObservable } from "mobx"
import type { AppMeta } from "@shared/types"

export class MetaStore {
  meta: AppMeta | null = null

  constructor() {
    makeAutoObservable(this)
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
