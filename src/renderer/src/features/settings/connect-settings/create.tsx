import { observer } from "mobx-react-lite"
import type { API } from "@/ipc/api"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { Log } from "@/log/log"
import { ConnectSettings } from "./connect-settings"
import { ConnectSettingsPresenter } from "./connect-settings-presenter/connect-settings-presenter"
import { ConnectSettingsStore } from "./connect-settings-store/connect-settings-store"

export function createConnectSettings({ api, metaStore, log }: { api: API; metaStore: MetaStore; log: Log }) {
  const store = new ConnectSettingsStore(metaStore)
  const presenter = new ConnectSettingsPresenter(store, api, log.child("connect-settings"))
  presenter.start()

  return observer(function ConnectSettingsHost() {
    return (
      <ConnectSettings
        server={store.server}
        qr={store.qr}
        daemon={store.daemon}
        daemonBusy={store.busy}
        daemonError={store.error}
        canEnable={store.canEnable}
        canDisable={store.canDisable}
        onCopy={presenter.handleCopy}
        onEnable={presenter.handleEnable}
        onDisable={presenter.handleDisable}
      />
    )
  })
}
