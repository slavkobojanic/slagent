import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { ChangesPresenter } from "@/features/changes/changes-presenter/changes-presenter"
import type { ChangesStore } from "@/features/changes/changes-store/changes-store"
import { ChangesTabs } from "./changes-tabs"

export function createChangesTabs({ changesStore, changesPresenter }: { changesStore: ChangesStore; changesPresenter: ChangesPresenter }): ComponentType {
  return observer(function ChangesTabsHost() {
    return (
      <ChangesTabs
        showing={changesStore.showing}
        file={changesStore.fileTab}
        hasPlan={changesStore.hasPlan}
        onTab={changesPresenter.handleTab}
        onCloseFile={changesPresenter.handleCloseFile}
        onClose={changesPresenter.handleClose}
      />
    )
  })
}
