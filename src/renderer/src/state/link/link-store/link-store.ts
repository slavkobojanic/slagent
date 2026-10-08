import { makeAutoObservable } from "mobx"

export type LinkPreference = "browser" | "copy"

export type LinkMenu = {
  url: string
  x: number
  y: number
}

// How a clicked web link resolves once the user has remembered a decision.
// A null preference means every click asks again.
export class LinkStore {
  preference: LinkPreference | null = null
  menu: LinkMenu | null = null

  constructor() {
    makeAutoObservable(this)
  }

  setPreference(preference: LinkPreference | null) {
    this.preference = preference
  }

  openMenu(menu: LinkMenu) {
    this.menu = menu
  }

  closeMenu() {
    this.menu = null
  }
}