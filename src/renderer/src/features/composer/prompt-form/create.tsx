import type { ComponentType } from "react"
import { createAttachButton } from "@/features/composer/attachments/attach-button/create"
import type { AttachmentsPresenter } from "@/features/composer/attachments/attachments-presenter/attachments-presenter"
import type { AttachmentsStore } from "@/features/composer/attachments/attachments-store/attachments-store"
import { createAttachments } from "@/features/composer/attachments/create"
import type { ComposerPresenter } from "@/features/composer/composer-presenter/composer-presenter"
import type { ComposerStore } from "@/features/composer/composer-store/composer-store"
import { createPlanToggle } from "./plan-toggle/create"
import { PromptForm } from "./prompt-form"
import { createPromptTextarea } from "./prompt-textarea/create"
import { createSubmitButton } from "./submit-button/create"

export function createPromptForm({
  composerStore,
  composerPresenter,
  attachmentsStore,
  attachmentsPresenter,
  UsageMeter,
}: {
  composerStore: ComposerStore
  composerPresenter: ComposerPresenter
  attachmentsStore: AttachmentsStore
  attachmentsPresenter: AttachmentsPresenter
  UsageMeter: ComponentType
}): ComponentType {
  const Attachments = createAttachments({ attachmentsStore, attachmentsPresenter })
  const PromptTextarea = createPromptTextarea({ composerStore, composerPresenter, attachmentsPresenter })
  const AttachButton = createAttachButton({ attachmentsPresenter })
  const PlanToggle = createPlanToggle({ composerStore, composerPresenter })
  const SubmitButton = createSubmitButton({ composerStore, composerPresenter })

  return function PromptFormHost() {
    return (
      <PromptForm
        Attachments={Attachments}
        PromptTextarea={PromptTextarea}
        AttachButton={AttachButton}
        PlanToggle={PlanToggle}
        SubmitButton={SubmitButton}
        UsageMeter={UsageMeter}
        onSubmit={composerPresenter.handleSubmit}
        onDragOver={attachmentsPresenter.handleDragOver}
        onDrop={attachmentsPresenter.handleDrop}
      />
    )
  }
}
