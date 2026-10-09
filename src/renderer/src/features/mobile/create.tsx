import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { API } from "@/ipc/api"
import type { Device } from "@/ipc/device"
import type { Log } from "@/log/log"
import type { LibraryStore } from "@/mirror/library-store/library-store"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { ConnectionPresenter } from "@/state/connection/connection-presenter/connection-presenter"
import type { ConnectionStore } from "@/state/connection/connection-store/connection-store"
import type { ThemeStore } from "@/state/theme/theme-store/theme-store"
import { createMobileChatList } from "./chat-list/create"
import { createMobileChatScreen } from "./chat-screen/create"
import { createConnect } from "./connect/create"
import { createConnectionBanner } from "./connection-banner/create"
import { createConnectionSheet } from "./connection-sheet/create"
import { createBackSwipe } from "./back-swipe/create"
import { MobilePresenter } from "./mobile-presenter/mobile-presenter"
import { MobileShell } from "./mobile-shell"
import { MobileStore } from "./mobile-store/mobile-store"

export function createMobile({
  api,
  window,
  device,
  libraryStore,
  metaStore,
  themeStore,
  connectionStore,
  connectionPresenter,
  Transcript,
  Composer,
  PlanOverlay,
  log,
}: {
  api: API
  window: Window
  device: Device
  libraryStore: LibraryStore
  metaStore: MetaStore
  themeStore: ThemeStore
  connectionStore: ConnectionStore
  connectionPresenter: ConnectionPresenter
  Transcript: ComponentType
  Composer: ComponentType
  PlanOverlay: ComponentType
  log: Log
}): ComponentType {
  const mobileStore = new MobileStore(libraryStore)
  const mobilePresenter = new MobilePresenter(mobileStore, libraryStore, themeStore, api, device, window, log)
  mobilePresenter.start()

  const Banner = createConnectionBanner({ connectionStore, mobilePresenter })
  const ChatList = createMobileChatList({ libraryStore, metaStore, mobileStore, mobilePresenter, Banner })
  const ChatScreen = createMobileChatScreen({ metaStore, mobileStore, mobilePresenter, Banner, Transcript, Composer, PlanOverlay })
  const Connect = createConnect({ device, log: log.child("connect") })
  const ConnectionSheet = createConnectionSheet({ connectionStore, connectionPresenter, mobileStore, mobilePresenter, device, log, Connect })
  const BackSwipe = createBackSwipe({ window, mobileStore, mobilePresenter, log: log.child("back-swipe") })

  return observer(function MobileHost() {
    return <MobileShell screen={mobileStore.screen} ChatList={ChatList} ChatScreen={ChatScreen} ConnectionSheet={ConnectionSheet} BackSwipe={BackSwipe} />
  })
}
