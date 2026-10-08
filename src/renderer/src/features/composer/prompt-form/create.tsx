import type { ComponentType } from "react"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import { createAttachButton } from "@/features/composer/attachments/attach-button/create"
import type { AttachmentsPresenter } from "@/features/composer/attachments/attachments-presenter/attachments-presenter"
import type { AttachmentsStore } from "@/features/composer/attachments/attachments-store/attachments-store"
import { createAttachments } from "@/features/composer/attachments/create"
import { createEffortSwitcher } from "./effort-switcher/create"
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
  api,
  metaStore,
  log,
}: {
  composerStore: ComposerStore
  composerPresenter: ComposerPresenter
  attachmentsStore: AttachmentsStore
  attachmentsPresenter: AttachmentsPresenter
  UsageMeter: ComponentType
  api: API
  metaStore: MetaStore
  log: Log
}): ComponentType {
  const Attachments = createAttachments({ attachmentsStore, attachmentsPresenter })
  const PromptTextarea = createPromptTextarea({ composerStore, composerPresenter, attachmentsPresenter })
  const AttachButton = createAttachButton({ attachmentsPresenter })
  const PlanToggle = createPlanToggle({ composerStore, composerPresenter })
  const SubmitButton = createSubmitButton({ composerStore, composerPresenter })
  const EffortSwitcher = createEffortSwitcher({ api, metaStore, log })

  return function PromptFormHost() {
    return (
      <PromptForm
        Attachments={Attachments}
        PromptTextarea={PromptTextarea}
        AttachButton={AttachButton}
        PlanToggle={PlanToggle}
        SubmitButton={SubmitButton}
        UsageMeter={UsageMeter}
        EffortSwitcher={EffortSwitcher}
        onSubmit={composerPresenter.handleSubmit}
        onDragOver={attachmentsPresenter.handleDragOver}
        onDrop={attachmentsPresenter.handleDrop}
      />
    )
  }
}
