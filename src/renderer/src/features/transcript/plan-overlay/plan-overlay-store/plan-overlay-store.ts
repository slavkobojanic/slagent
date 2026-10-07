import { makeAutoObservable } from "mobx"

export class PlanOverlayStore {
  approving = false
  dismissed = false

  constructor() {
    makeAutoObservable(this)
  }

  setApproving(value: boolean) {
    this.approving = value
  }

  dismiss() {
    this.dismissed = true
  }

  // A new proposal (or a cleared one) starts the cycle over.
  reset() {
    this.approving = false
    this.dismissed = false
  }
}