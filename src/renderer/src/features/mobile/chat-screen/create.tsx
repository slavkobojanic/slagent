import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { MobilePresenter } from "@/features/mobile/mobile-presenter/mobile-presenter"
import type { MobileStore } from "@/features/mobile/mobile-store/mobile-store"
import { MobileChatScreen } from "./chat-screen"

export function createMobileChatScreen({
  metaStore,
  mobileStore,
  mobilePresenter,
  Banner,
  Transcript,
  Composer,
  PlanOverlay,
}: {
  metaStore: MetaStore
  mobileStore: MobileStore
  mobilePresenter: MobilePresenter
  Banner: ComponentType
  Transcript: ComponentType
  Composer: ComponentType
  PlanOverlay: ComponentType
}): ComponentType {
  return observer(function MobileChatScreenHost() {
    return (
      <MobileChatScreen
        title={mobileStore.chatTitle}
        projectName={mobileStore.projectName}
        ready={metaStore.ready}
        metaError={metaStore.meta?.error || null}
        onBack={mobilePresenter.back}
        onOpenConnection={mobilePresenter.openConnection}
        Banner={Banner}
        Transcript={Transcript}
        Composer={Composer}
        PlanOverlay={PlanOverlay}
      />
    )
  })
}
