import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { MobilePresenter } from "@/features/mobile/mobile-presenter/mobile-presenter"
import type { ConnectionStore } from "@/state/connection/connection-store/connection-store"
import { ConnectionBanner } from "./connection-banner"

export function createConnectionBanner({ connectionStore, mobilePresenter }: { connectionStore: ConnectionStore; mobilePresenter: MobilePresenter }): ComponentType {
  return observer(function ConnectionBannerHost() {
    return (
      <ConnectionBanner
        online={connectionStore.online}
        reached={connectionStore.reached}
        label={connectionStore.label}
        onOpen={mobilePresenter.openConnection}
      />
    )
  })
}
