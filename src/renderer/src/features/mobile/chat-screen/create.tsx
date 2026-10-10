import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { MobileChangesStore } from "@/features/mobile/changes-screen/changes-store/changes-store"
import type { MobileChangesPresenter } from "@/features/mobile/changes-screen/changes-presenter/changes-presenter"
import type { MobilePresenter } from "@/features/mobile/mobile-presenter/mobile-presenter"
import type { MobileChatScreenTablet } from "./chat-screen"
import type { MobileStore } from "@/features/mobile/mobile-store/mobile-store"
import { MobileChatScreen } from "./chat-screen"

export function createMobileChatScreen({
  metaStore,
  mobileStore,
  mobilePresenter,
  changesStore,
  changesPresenter,
  Banner,
  Transcript,
  Composer,
  PlanOverlay,
  tablet,
}: {
  metaStore: MetaStore
  mobileStore: MobileStore
  mobilePresenter: MobilePresenter
  changesStore: MobileChangesStore
  changesPresenter: MobileChangesPresenter
  Banner: ComponentType
  Transcript: ComponentType
  Composer: ComponentType
  PlanOverlay: ComponentType
  // Set on a tablet: its header toggles the docked panes instead of navigating. Portrait has no right panel, so it drops the panel toggle.
  tablet?: MobileChatScreenTablet
}): ComponentType {
  return observer(function MobileChatScreenHost() {
    return (
      <MobileChatScreen
        title={mobileStore.chatTitle}
        projectName={mobileStore.projectName}
        ready={metaStore.ready}
        metaError={metaStore.meta?.error || null}
        changesCount={changesStore.changedCount}
        onBack={mobilePresenter.back}
        onOpenChanges={changesPresenter.open}
        onOpenConnection={mobilePresenter.openConnection}
        tablet={tablet === undefined ? undefined : { ...tablet, onTogglePanel: mobileStore.layout === "landscape" ? tablet.onTogglePanel : null }}
        Banner={Banner}
        Transcript={Transcript}
        Composer={Composer}
        PlanOverlay={PlanOverlay}
      />
    )
  })
}
