import { makeAutoObservable } from "mobx"
import type { EditorStatus } from "@/features/editor/editor-types"

export class EditorStore {
  status: EditorStatus = "idle"
  error: string | null = null
  // The workbench page for the open project, once the editor server is up.
  url: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  setUrl(url: string) {
    this.url = url
    this.status = "loading"
    this.error = null
  }

  setLoading() {
    this.status = "loading"
    this.error = null
  }

  setReady() {
    this.status = "ready"
  }

  setFailed(error: string) {
    this.status = "failed"
    this.error = error
  }

  reset() {
    this.status = "idle"
    this.error = null
    this.url = null
  }
}
