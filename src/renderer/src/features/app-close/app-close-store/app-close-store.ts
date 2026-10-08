import { makeAutoObservable } from "mobx"

export class AppCloseStore {
  open = false
  busy = false

  constructor() {
    makeAutoObservable(this)
  }

  get canConfirm(): boolean {
    return !this.busy
  }

  setOpen(value: boolean) {
    this.open = value
  }

  setBusy(value: boolean) {
    this.busy = value
  }
}
