import { observer } from "mobx-react-lite"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { Log } from "@/log/log"
import { ConnectSettings } from "./connect-settings"
import { ConnectSettingsPresenter } from "./connect-settings-presenter/connect-settings-presenter"
import { ConnectSettingsStore } from "./connect-settings-store/connect-settings-store"

export function createConnectSettings({ metaStore, log }: { metaStore: MetaStore; log: Log }) {
  const store = new ConnectSettingsStore(metaStore)
  const presenter = new ConnectSettingsPresenter(log.child("connect-settings"))

  return observer(function ConnectSettingsHost() {
    return <ConnectSettings server={store.server} qr={store.qr} onCopy={presenter.handleCopy} />
  })
}
