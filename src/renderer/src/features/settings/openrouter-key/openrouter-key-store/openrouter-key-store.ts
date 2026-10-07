import { makeAutoObservable } from "mobx"

// The OpenRouter key form. The configured state is not kept here: the mirror reports it.
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

  // After a save succeeds the key leaves the form, so it is not kept around.
  clear() {
    this.apiKey = ""
    this.error = null
  }

  // Each visit starts from an empty form. The legacy form was unmounted when its section closed.
  reset() {
    this.apiKey = ""
    this.visible = false
    this.error = null
  }
}
