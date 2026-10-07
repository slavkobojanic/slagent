import { useEffect } from "react"
import { observer } from "mobx-react-lite"
import { toast } from "sonner"
import { AttachmentsPresenter } from "@/features/composer/attachments-presenter/attachments-presenter"
import { Composer } from "@/features/composer/composer"
import { ComposerPresenter } from "@/features/composer/composer-presenter/composer-presenter"
import { ComposerStore } from "@/features/composer/composer-store/composer-store"
import { DraftsPresenter } from "@/features/composer/drafts-presenter/drafts-presenter"
import { DraftsStore } from "@/features/composer/drafts-store/drafts-store"
import { PromptHistoryPresenter } from "@/features/composer/prompt-history-presenter/prompt-history-presenter"
import { PromptHistoryStore } from "@/features/composer/prompt-history-store/prompt-history-store"
import { SuggestionsPresenter } from "@/features/composer/suggestions-presenter/suggestions-presenter"
import type { AppDeps } from "@/state/app-deps"
import type { ComposerSlots, ReviewSlots, RunStatusSlots } from "@/state/slots"

// Reads a file as a data URL, or resolves null when the browser cannot read it.
function readDataUrl(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.addEventListener("load", () => {
      resolve(typeof reader.result === "string" ? reader.result : null)
    })
    reader.addEventListener("error", () => {
      resolve(null)
    })
    reader.readAsDataURL(file)
  })
}

// Builds the prompt box once at boot. It wires the stores and presenters together; the host mounts
// the view, starts the presenter for as long as it is mounted, and passes every value down as a prop.
export function createComposer(deps: AppDeps & { review: ReviewSlots; runStatus: RunStatusSlots }): ComposerSlots {
  const { services, env, mirror, shared, runStatus } = deps
  const RunStatusBar = runStatus.RunStatusBar
  const notify = (message: string) => {
    toast.error(message)
  }

  const drafts = new DraftsStore()
  const draftsPresenter = new DraftsPresenter(drafts, env.window.localStorage)
  const history = new PromptHistoryStore()
  const historyPresenter = new PromptHistoryPresenter(history, env.window.localStorage)
  const store = new ComposerStore({ mirror, review: shared.review, history })
  const suggestions = new SuggestionsPresenter({ store, files: services.files, library: services.library, commands: services.commands, env })
  const attachments = new AttachmentsPresenter({
    store,
    files: services.files,
    browser: {
      createUrl: (file) => URL.createObjectURL(file),
      releaseUrl: (url) => {
        URL.revokeObjectURL(url)
      },
      readDataUrl,
    },
    notify,
  })
  const presenter = new ComposerPresenter({
    store,
    drafts,
    draftsPresenter,
    history,
    historyPresenter,
    suggestions,
    attachments,
    chat: services.chat,
    review: shared.reviewPresenter,
    commands: shared.commands,
    port: shared.composer,
    env,
    notify,
  })

  return {
    Composer: observer(function ComposerHost() {
      useEffect(() => {
        presenter.start()
        return presenter.stop
      }, [])

      return (
        <Composer
          RunStatusBar={RunStatusBar}
          text={store.text}
          placeholder={store.placeholder}
          disabled={store.disabled}
          submitStatus={store.submitStatus}
          submitDisabled={store.submitDisabled}
          planMode={store.planMode}
          planDisabled={store.planDisabled}
          attachments={store.attachmentChips}
          menu={store.menu}
          activeSuggestion={store.active}
          pendingLabel={store.pendingLabel}
          pendingReplies={store.pendingReplies}
          pendingDiffs={store.pendingDiffs}
          attachTextarea={presenter.attachTextarea}
          attachFileInput={attachments.attachFileInput}
          onTextChange={presenter.handleChange}
          onSelect={presenter.handleSelect}
          onKeyDown={presenter.handleKeyDown}
          onCompositionStart={presenter.handleCompositionStart}
          onCompositionEnd={presenter.handleCompositionEnd}
          onPaste={attachments.handlePaste}
          onSubmit={presenter.handleSubmit}
          onDragOver={attachments.handleDragOver}
          onDrop={attachments.handleDrop}
          onFileChange={attachments.handleFileChange}
          onAttach={attachments.openFileDialog}
          onTogglePlan={presenter.togglePlan}
          onStop={presenter.handleStop}
          onRemoveAttachment={attachments.remove}
          onChoose={presenter.chooseSuggestion}
          onHover={presenter.hoverSuggestion}
          onRemoveReply={shared.reviewPresenter.removeReplyComment}
          onRemoveDiff={shared.reviewPresenter.removeDiffComment}
        />
      )
    }),
  }
}
