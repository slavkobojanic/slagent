import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { ComposerPresenter } from "@/features/composer/composer-presenter/composer-presenter"
import type { ComposerStore } from "@/features/composer/composer-store/composer-store"
import { SubmitButton } from "./submit-button"

export function createSubmitButton({ composerStore, composerPresenter }: { composerStore: ComposerStore; composerPresenter: ComposerPresenter }): ComponentType {
  return observer(function SubmitButtonHost() {
    return <SubmitButton status={composerStore.submitStatus} disabled={composerStore.submitDisabled} onStop={composerPresenter.handleStop} />
  })
}
