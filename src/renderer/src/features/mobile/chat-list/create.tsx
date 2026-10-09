import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { Log } from "@/log/log"
import type { LibraryStore } from "@/mirror/library-store/library-store"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { ConnectionStore } from "@/state/connection/connection-store/connection-store"
import type { Device } from "@/ipc/device"
import type { MobilePresenter } from "@/features/mobile/mobile-presenter/mobile-presenter"
import type { MobileStore } from "@/features/mobile/mobile-store/mobile-store"
import { createMacPicker } from "@/features/mobile/mac-picker/create"
import { MobileChatList } from "./chat-list"
import { MobileChatListStore } from "./chat-list-store/chat-list-store"

export function createMobileChatList({
  libraryStore,
  metaStore,
  mobileStore,
  mobilePresenter,
  device,
  connectionStore,
  log,
  Banner,
}: {
  libraryStore: LibraryStore
  metaStore: MetaStore
  mobileStore: MobileStore
  mobilePresenter: MobilePresenter
  device: Device
  connectionStore: ConnectionStore
  log: Log
  Banner: ComponentType
}): ComponentType {
  const store = new MobileChatListStore(libraryStore)
  const MacPicker = createMacPicker({ device, connectionStore, log: log.child("chat-list") })

  return observer(function MobileChatListHost() {
    return (
      <MobileChatList
        groups={store.groups}
        empty={store.empty}
        ready={metaStore.meta !== null}
        opening={mobileStore.opening}
        error={mobileStore.error}
        onOpenChat={mobilePresenter.openChat}
        onNewChat={mobilePresenter.newChat}
        onOpenConnection={mobilePresenter.openConnection}
        onDismissError={mobilePresenter.dismissError}
        MacPicker={MacPicker}
        Banner={Banner}
      />
    )
  })
}
