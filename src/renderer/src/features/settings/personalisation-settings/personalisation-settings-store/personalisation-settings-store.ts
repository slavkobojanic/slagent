import { makeAutoObservable, observableRef } from "mobx"
import { EMPTY_PERSONALISATION, type Personalisation } from "@shared/types"

// The personalisation form. The saved settings come from the mirror, so the store holds only
// the draft, and every check takes the saved settings as an argument.
export class PersonalisationSettingsStore {
  // A ref, not a deep observable: the draft goes over IPC as a plain object.
  draft: Personalisation = { ...EMPTY_PERSONALISATION }
  saving = false
  error: string | null = null

  constructor() {
    makeAutoObservable(this, { draft: observableRef })
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

  // Starts a visit from the saved settings, as the legacy section did when it mounted.
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
