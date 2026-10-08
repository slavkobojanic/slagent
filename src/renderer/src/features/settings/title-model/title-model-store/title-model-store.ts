import { makeAutoObservable } from "mobx"

export class TitleModelStore {
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }
}
