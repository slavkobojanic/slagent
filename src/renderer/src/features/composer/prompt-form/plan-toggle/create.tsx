import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { ComposerPresenter } from "@/features/composer/composer-presenter/composer-presenter"
import type { ComposerStore } from "@/features/composer/composer-store/composer-store"
import { PlanToggle } from "./plan-toggle"

export function createPlanToggle({ composerStore, composerPresenter }: { composerStore: ComposerStore; composerPresenter: ComposerPresenter }): ComponentType {
  return observer(function PlanToggleHost() {
    return <PlanToggle planMode={composerStore.planMode} disabled={composerStore.planDisabled} onToggle={composerPresenter.togglePlan} />
  })
}
