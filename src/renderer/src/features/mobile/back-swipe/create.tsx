import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { Log } from "@/log/log"
import type { MobilePresenter } from "@/features/mobile/mobile-presenter/mobile-presenter"
import type { MobileStore } from "@/features/mobile/mobile-store/mobile-store"
import { BackSwipe } from "./back-swipe"
import { BackSwipePresenter } from "./back-swipe-presenter/back-swipe-presenter"
import { BackSwipeStore } from "./back-swipe-store/back-swipe-store"

export function createBackSwipe({
  window,
  mobileStore,
  mobilePresenter,
  log,
}: {
  window: Window
  mobileStore: MobileStore
  mobilePresenter: MobilePresenter
  log: Log
}): ComponentType {
  const store = new BackSwipeStore()
  const presenter = new BackSwipePresenter(store, mobileStore, mobilePresenter.back, window, log)
  presenter.start()

  return observer(function BackSwipeHost() {
    return <BackSwipe progress={store.progress} />
  })
}
