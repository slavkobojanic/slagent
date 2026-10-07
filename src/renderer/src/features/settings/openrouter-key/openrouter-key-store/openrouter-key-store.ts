import { makeAutoObservable } from "mobx"

// The configured state is not kept here: the mirror reports it.
export class OpenRouterKeyStore {
  apiKey = ""
  visible = false
  saving = false
  removing = false
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  get canSave(): boolean {
    if (this.saving || this.apiKey.trim().length === 0) {
      return false
    }
    return true
  }

  setApiKey(value: string) {
    this.apiKey = value
    this.error = null
  }

  toggleVisible() {
    this.visible = !this.visible
  }

  setSaving(value: boolean) {
    this.saving = value
  }

  setRemoving(value: boolean) {
    this.removing = value
  }

  setError(message: string | null) {
    this.error = message
  }

  clear() {
    this.apiKey = ""
    this.error = null
  }

  reset() {
    this.apiKey = ""
    this.visible = false
    this.error = null
  }
}
