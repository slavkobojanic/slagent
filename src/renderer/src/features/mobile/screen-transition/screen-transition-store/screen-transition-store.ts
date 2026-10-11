import { makeAutoObservable } from "mobx"
import type { MobileScreen } from "@/features/mobile/mobile-screen"

const DEPTH: Record<MobileScreen, number> = { chats: 0, chat: 1, changes: 2 }

export class ScreenTransitionStore {
  current: MobileScreen
  leaving: MobileScreen | null = null
  direction: "push" | "pop" = "push"
  entering = false

  constructor(initialScreen: MobileScreen) {
    this.current = initialScreen
    makeAutoObservable(this)
  }

  transitionTo(screen: MobileScreen) {
    if (this.current === screen) return
    const direction: "push" | "pop" = DEPTH[screen] > DEPTH[this.current] ? "push" : "pop"
    this.leaving = this.current
    this.current = screen
    this.direction = direction
    this.entering = true
  }

  finishTransition() {
    this.leaving = null
    this.entering = false
  }
}
