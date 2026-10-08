import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { ProjectMenuStore } from "@/features/shell/shell-header/project-menu/project-menu-store/project-menu-store"
import type { UpdateButtonStore } from "@/features/shell/shell-header/update-button/update-button-store/update-button-store"
import { MainColumn } from "./main-column"

export function createMainColumn({
  Transcript,
  Composer,
  BranchLine,
  PlanOverlay,
  metaStore,
  projectMenuStore,
  updateButtonStore,
}: {
  Transcript: ComponentType
  Composer: ComponentType
  BranchLine: ComponentType
  PlanOverlay: ComponentType
  metaStore: MetaStore
  projectMenuStore: ProjectMenuStore
  updateButtonStore: UpdateButtonStore
}): ComponentType {
  return observer(function MainColumnHost() {
    return (
      <MainColumn
        ready={metaStore.ready}
        metaError={metaStore.meta?.error || null}
        actionError={updateButtonStore.error ?? projectMenuStore.error}
        Transcript={Transcript}
        Composer={Composer}
        BranchLine={BranchLine}
        PlanOverlay={PlanOverlay}
      />
    )
  })
}
