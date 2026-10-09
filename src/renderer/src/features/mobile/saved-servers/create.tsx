import { observer } from "mobx-react-lite"
import type { ServerAddress } from "@/lib/server-address"
import type { ConnectionStore } from "@/state/connection/connection-store/connection-store"
import type { Device } from "@/ipc/device"
import type { Log } from "@/log/log"
import { SavedServers } from "./saved-servers"
import { SavedServersPresenter } from "./saved-servers-presenter/saved-servers-presenter"
import { SavedServersStore } from "./saved-servers-store/saved-servers-store"

export function createSavedServers({
  device,
  connectionStore,
  log,
}: {
  device: Device
  // The connected Mac is left out of the switch list: it already has its card.
  // Null on a phone that is not connected yet. Nicknames saved here keep the
  // connected Mac's own label current too.
  connectionStore: ConnectionStore | { address: ServerAddress | null }
  log: Log
}) {
  const store = new SavedServersStore()
  const presenter = new SavedServersPresenter(store, device, "setNicknames" in connectionStore ? connectionStore : null, log.child("saved-servers"))
  presenter.start()

  return observer(function SavedServersHost() {
    return (
      <SavedServers
        servers={store.others(connectionStore.address)}
        nicknames={store.nicknames}
        editing={store.editing}
        draft={store.draft}
        onRenameStart={presenter.handleRenameStart}
        onRenameChange={presenter.handleRenameChange}
        onRenameSave={presenter.handleRenameSave}
        onRenameCancel={presenter.handleRenameCancel}
        onPick={presenter.handlePick}
        onRemove={presenter.handleRemove}
      />
    )
  })
}
