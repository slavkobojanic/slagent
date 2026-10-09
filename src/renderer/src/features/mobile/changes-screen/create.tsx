import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import { MobileChangesScreen } from "@/features/mobile/changes-screen/changes-screen"
import type { MobileChangesPresenter } from "@/features/mobile/changes-screen/changes-presenter/changes-presenter"
import type { MobileChangesStore } from "@/features/mobile/changes-screen/changes-store/changes-store"
import { MobileDiffList } from "@/features/mobile/changes-screen/diff-list/diff-list"
import type { ThemeStore } from "@/state/theme/theme-store/theme-store"

export function createMobileChangesScreen({
  changesStore,
  changesPresenter,
  themeStore,
}: {
  changesStore: MobileChangesStore
  changesPresenter: MobileChangesPresenter
  themeStore: ThemeStore
}): ComponentType {
  const DiffList = observer(function MobileDiffListHost() {
    return <MobileDiffList files={changesStore.files} emptyText={changesStore.emptyText} themeType={themeStore.resolved} />
  })

  return observer(function MobileChangesScreenHost() {
    return (
      <MobileChangesScreen
        projectName={changesPresenter.projectName}
        branch={changesStore.branchLabel}
        count={changesStore.changedCount}
        loading={changesStore.loading}
        DiffList={DiffList}
        onBack={changesPresenter.back}
        onRefresh={changesPresenter.handleRefresh}
      />
    )
  })
}
