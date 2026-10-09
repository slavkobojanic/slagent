import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { MobilePresenter } from "@/features/mobile/mobile-presenter/mobile-presenter"
import type { MobileStore } from "@/features/mobile/mobile-store/mobile-store"
import type { ConnectionPresenter } from "@/state/connection/connection-presenter/connection-presenter"
import type { ConnectionStore } from "@/state/connection/connection-store/connection-store"
import { ConnectionSheet } from "./connection-sheet"

export function createConnectionSheet({
  connectionStore,
  connectionPresenter,
  mobileStore,
  mobilePresenter,
  Connect,
}: {
  connectionStore: ConnectionStore
  connectionPresenter: ConnectionPresenter
  mobileStore: MobileStore
  mobilePresenter: MobilePresenter
  Connect: ComponentType
}): ComponentType {
  return observer(function ConnectionSheetHost() {
    return (
      <ConnectionSheet
        open={mobileStore.connectionOpen}
        online={connectionStore.online}
        label={connectionStore.label}
        onOpenChange={mobilePresenter.handleConnectionOpenChange}
        onForget={connectionPresenter.forget}
        Connect={Connect}
      />
    )
  })
}
