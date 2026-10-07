import { makeAutoObservable } from "mobx"

export class PlanCardStore {
  approving = false

  constructor() {
    makeAutoObservable(this)
  }

  setApproving(value: boolean) {
    this.approving = value
  }
}
