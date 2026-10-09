import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { ConnectionStore } from "@/state/connection/connection-store/connection-store"
import type { API } from "@/ipc/api"
import type { Device } from "@/ipc/device"
import type { Log } from "@/log/log"
import type { MobileStore } from "@/features/mobile/mobile-store/mobile-store"
import { TailnetPeers } from "./tailnet-peers"
import { TailnetPeersPresenter } from "./tailnet-peers-presenter/tailnet-peers-presenter"
import { TailnetPeersStore } from "./tailnet-peers-store/tailnet-peers-store"

export function createTailnetPeers({
  api,
  device,
  connectionStore,
  mobileStore,
  log,
}: {
  api: API
  device: Device
  connectionStore: ConnectionStore
  mobileStore: MobileStore
  log: Log
}): ComponentType {
  const store = new TailnetPeersStore()
  const presenter = new TailnetPeersPresenter(store, api, device, connectionStore, mobileStore, log.child("tailnet-peers"))
  presenter.start()

  return observer(function TailnetPeersHost() {
    return (
      <TailnetPeers
        peers={store.peers}
        loading={store.loading}
        current={connectionStore.address}
        onPick={presenter.handlePick}
      />
    )
  })
}
