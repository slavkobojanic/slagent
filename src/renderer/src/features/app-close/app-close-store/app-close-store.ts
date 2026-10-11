import { makeAutoObservable } from "mobx"

export class AppCloseStore {
  open = false
  busy = false

  constructor() {
    makeAutoObservable(this)
  }

  get canConfirm(): boolean {
    if (this.busy) {
      return false
    }
    return true
  }

  setOpen(value: boolean) {
    this.open = value
  }

  setBusy(value: boolean) {
    this.busy = value
  }
}
