import { observer } from "mobx-react-lite"
import type { Device } from "@/ipc/device"
import type { Log } from "@/log/log"
import { SavedServers } from "./saved-servers"
import { SavedServersPresenter } from "./saved-servers-presenter/saved-servers-presenter"
import { SavedServersStore } from "./saved-servers-store/saved-servers-store"

export function createSavedServers({ device, log }: { device: Device; log: Log }) {
  const store = new SavedServersStore()
  const presenter = new SavedServersPresenter(store, device, log.child("saved-servers"))
  presenter.start()

  return observer(function SavedServersHost() {
    return <SavedServers servers={store.servers} onPick={presenter.handlePick} onRemove={presenter.handleRemove} />
  })
}
