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
import { createMobileChangesScreen } from "./changes-screen/create"
import { MobileChangesPresenter } from "./changes-screen/changes-presenter/changes-presenter"
import { MobileChangesStore } from "./changes-screen/changes-store/changes-store"
import { createConnect } from "./connect/create"
import { createConnectionBanner } from "./connection-banner/create"
import { createConnectionSheet } from "./connection-sheet/create"
import { createBackSwipe } from "./back-swipe/create"
import { createTablet } from "./tablet-shell/create"
import { MobilePresenter } from "./mobile-presenter/mobile-presenter"
import type { RunStore } from "@/mirror/run-store/run-store"
import type { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import type { PanelStore } from "@/state/panel/panel-store/panel-store"
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
  runStore,
  panelStore,
  panelPresenter,
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
  runStore: RunStore
  panelStore: PanelStore
  panelPresenter: PanelPresenter
  Transcript: ComponentType
  Composer: ComponentType
  PlanOverlay: ComponentType
  log: Log
}): ComponentType {
  const mobileStore = new MobileStore(libraryStore)
  const mobilePresenter = new MobilePresenter(mobileStore, libraryStore, themeStore, api, device, window, log)
  mobilePresenter.start()

  const changesStore = new MobileChangesStore()
  const changesPresenter = new MobileChangesPresenter(changesStore, mobileStore, runStore, api, log.child("changes"))
  changesPresenter.start()

  const Banner = createConnectionBanner({ connectionStore, mobilePresenter })
  const ChatList = createMobileChatList({ libraryStore, metaStore, mobileStore, mobilePresenter, device, connectionStore, log, Banner })
  const ChatScreen = createMobileChatScreen({ metaStore, mobileStore, mobilePresenter, changesStore, changesPresenter, Banner, Transcript, Composer, PlanOverlay })
  const ChangesScreen = createMobileChangesScreen({ changesStore, changesPresenter, themeStore })
  const Connect = createConnect({ device, log: log.child("connect") })
  const ConnectionSheet = createConnectionSheet({ api, connectionStore, connectionPresenter, mobileStore, mobilePresenter, device, log, Connect })
  const BackSwipe = createBackSwipe({ window, mobileStore, mobilePresenter, log: log.child("back-swipe") })

  const Tablet = createTablet({
    api,
    window,
    metaStore,
    runStore,
    themeStore,
    mobileStore,
    mobilePresenter,
    changesStore,
    changesPresenter,
    panelStore,
    panelPresenter,
    ChatList,
    ConnectionSheet,
    Banner,
    Transcript,
    Composer,
    PlanOverlay,
    log: log.child("tablet"),
  })

  return observer(function MobileHost() {
    return <MobileShell layout={mobileStore.layout} Tablet={Tablet} screen={mobileStore.screen} ChatList={ChatList} ChatScreen={ChatScreen} ChangesScreen={ChangesScreen} ConnectionSheet={ConnectionSheet} BackSwipe={BackSwipe} />
  })
}
