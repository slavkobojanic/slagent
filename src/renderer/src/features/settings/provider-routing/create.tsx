import { observer } from "mobx-react-lite"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import { ProviderRouting } from "./provider-routing"
import { ProviderRoutingPresenter } from "./provider-routing-presenter/provider-routing-presenter"
import { ProviderRoutingStore } from "./provider-routing-store/provider-routing-store"

export function createProviderRouting({ api, metaStore, log }: { api: API; metaStore: MetaStore; log: Log }) {
  const providerRoutingStore = new ProviderRoutingStore()
  const providerRoutingPresenter = new ProviderRoutingPresenter(providerRoutingStore, api, log)

  return observer(function ProviderRoutingHost() {
    return (
      <ProviderRouting
        value={metaStore.meta?.routing ?? "balance"}
        error={providerRoutingStore.error}
        onValueChange={providerRoutingPresenter.handleChange}
      />
    )
  })
}
