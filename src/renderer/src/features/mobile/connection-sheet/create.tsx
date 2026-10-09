import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { API } from "@/ipc/api"
import type { Device } from "@/ipc/device"
import type { Log } from "@/log/log"
import type { MobilePresenter } from "@/features/mobile/mobile-presenter/mobile-presenter"
import type { MobileStore } from "@/features/mobile/mobile-store/mobile-store"
import type { ConnectionPresenter } from "@/state/connection/connection-presenter/connection-presenter"
import type { ConnectionStore } from "@/state/connection/connection-store/connection-store"
import { createSavedServers } from "@/features/mobile/saved-servers/create"
import { createTailnetPeers } from "@/features/mobile/tailnet-peers/create"
import { ConnectionSheet } from "./connection-sheet"

export function createConnectionSheet({
  api,
  connectionStore,
  connectionPresenter,
  mobileStore,
  mobilePresenter,
  device,
  log,
  Connect,
}: {
  api: API
  connectionStore: ConnectionStore
  connectionPresenter: ConnectionPresenter
  mobileStore: MobileStore
  mobilePresenter: MobilePresenter
  device: Device
  log: Log
  Connect: ComponentType
}): ComponentType {
  const SavedServers = createSavedServers({ device, connectionStore, log: log.child("saved-servers") })
  const Tailnet = createTailnetPeers({ api, device, connectionStore, mobileStore, log })

  return observer(function ConnectionSheetHost() {
    return (
      <ConnectionSheet
        open={mobileStore.connectionOpen}
        online={connectionStore.online}
        label={connectionStore.label}
        renaming={connectionStore.renaming}
        draftNickname={connectionStore.draftNickname}
        onRenameStart={connectionPresenter.handleRenameStart}
        onRenameChange={connectionPresenter.handleRenameChange}
        onRenameSave={connectionPresenter.handleRenameSave}
        onRenameCancel={connectionPresenter.handleRenameCancel}
        onOpenChange={mobilePresenter.handleConnectionOpenChange}
        onForget={connectionPresenter.forget}
        Connect={Connect}
        SavedServers={SavedServers}
        Tailnet={Tailnet}
      />
    )
  })
}
