import { observer } from "mobx-react-lite"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { Log } from "@/log/log"
import { ConnectSettings } from "./connect-settings"
import { ConnectSettingsPresenter } from "./connect-settings-presenter/connect-settings-presenter"

export function createConnectSettings({ metaStore, log }: { metaStore: MetaStore; log: Log }) {
  const presenter = new ConnectSettingsPresenter(log.child("connect-settings"))

  return observer(function ConnectSettingsHost() {
    return <ConnectSettings server={metaStore.meta?.server ?? null} onCopy={presenter.handleCopy} />
  })
}
