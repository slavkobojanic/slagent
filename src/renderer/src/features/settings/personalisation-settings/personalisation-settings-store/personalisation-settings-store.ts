import { makeAutoObservable } from "mobx"
import { EMPTY_PERSONALISATION, type Personalisation } from "@shared/types"

// The saved settings come from the mirror, so every check takes them as an argument.
export class PersonalisationSettingsStore {
  draft: Personalisation = { ...EMPTY_PERSONALISATION }
  saving = false
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  isDirty(saved: Personalisation): boolean {
    if (JSON.stringify(this.draft) === JSON.stringify(saved)) {
      return false
    }
    return true
  }

  canSave(saved: Personalisation): boolean {
    if (this.saving || !this.isDirty(saved)) {
      return false
    }
    return true
  }

  reset(saved: Personalisation) {
    this.draft = { ...saved }
    this.error = null
  }

  patch(next: Partial<Personalisation>) {
    this.draft = { ...this.draft, ...next }
    this.error = null
  }

  setSaving(value: boolean) {
    this.saving = value
  }

  setError(message: string | null) {
    this.error = message
  }
}
