import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { AttachmentsPresenter } from "@/features/composer/attachments/attachments-presenter/attachments-presenter"
import type { ComposerPresenter } from "@/features/composer/composer-presenter/composer-presenter"
import type { ComposerStore } from "@/features/composer/composer-store/composer-store"
import { PromptTextarea } from "./prompt-textarea"

export function createPromptTextarea({
  composerStore,
  composerPresenter,
  attachmentsPresenter,
}: {
  composerStore: ComposerStore
  composerPresenter: ComposerPresenter
  attachmentsPresenter: AttachmentsPresenter
}): ComponentType {
  return observer(function PromptTextareaHost() {
    return (
      <PromptTextarea
        text={composerStore.text}
        placeholder={composerStore.placeholder}
        disabled={composerStore.disabled}
        attach={composerPresenter.attachTextarea}
        onChange={composerPresenter.handleChange}
        onSelect={composerPresenter.handleSelect}
        onKeyDown={composerPresenter.handleKeyDown}
        onPaste={attachmentsPresenter.handlePaste}
        onCompositionStart={composerPresenter.handleCompositionStart}
        onCompositionEnd={composerPresenter.handleCompositionEnd}
      />
    )
  })
}
