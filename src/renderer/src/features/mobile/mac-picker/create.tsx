import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { ConnectionStore } from "@/state/connection/connection-store/connection-store"
import type { Device } from "@/ipc/device"
import type { Log } from "@/log/log"
import { MacPicker } from "./mac-picker"
import { MacPickerPresenter } from "./mac-picker-presenter/mac-picker-presenter"
import { MacPickerStore } from "./mac-picker-store/mac-picker-store"

export function createMacPicker({
  device,
  connectionStore,
  log,
}: {
  device: Device
  connectionStore: ConnectionStore
  log: Log
}): ComponentType {
  const store = new MacPickerStore()
  const presenter = new MacPickerPresenter(store, device, connectionStore, log.child("mac-picker"))
  presenter.start()

  return observer(function MacPickerHost() {
    return (
      <MacPicker
        label={connectionStore.label}
        online={connectionStore.online}
        servers={store.servers}
        current={connectionStore.address}
        open={store.open}
        onOpenChange={presenter.handleOpenChange}
        onPick={presenter.handlePick}
      />
    )
  })
}
