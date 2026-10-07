import { observer } from "mobx-react-lite"
import { type ComponentType, useEffect } from "react"
import type { API } from "@/ipc/api"
import type { LibraryStore } from "@/mirror/library-store/library-store"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { RunStore } from "@/mirror/run-store/run-store"
import type { ComposerPort } from "@/state/composer-port/composer-port"
import type { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import type { ReviewPresenter } from "@/state/review/review-presenter/review-presenter"
import type { ReviewStore } from "@/state/review/review-store/review-store"
import { AttachmentsPresenter } from "./attachments/attachments-presenter/attachments-presenter"
import { AttachmentsStore } from "./attachments/attachments-store/attachments-store"
import { createFileInput } from "./attachments/file-input/create"
import { Composer } from "./composer"
import { ComposerPresenter } from "./composer-presenter/composer-presenter"
import { ComposerStore } from "./composer-store/composer-store"
import { createPendingComments } from "./pending-comments/create"
import { createPromptHistory } from "./prompt-history/create"
import { PromptHistoryPresenter } from "./prompt-history/prompt-history-presenter/prompt-history-presenter"
import { PromptHistoryStore } from "./prompt-history/prompt-history-store/prompt-history-store"
import { createPromptForm } from "./prompt-form/create"
import { createRunStatus } from "./run-status/create"
import { createSuggestions } from "./suggestions/create"
import { SuggestionsPresenter } from "./suggestions/suggestions-presenter/suggestions-presenter"
import { SuggestionsStore } from "./suggestions/suggestions-store/suggestions-store"

export function createComposer({
  api,
  window,
  libraryStore,
  metaStore,
  runStore,
  reviewStore,
  reviewPresenter,
  commandRegistry,
  composerPort,
}: {
  api: API
  window: Window
  libraryStore: LibraryStore
  metaStore: MetaStore
  runStore: RunStore
  reviewStore: ReviewStore
  reviewPresenter: ReviewPresenter
  commandRegistry: CommandRegistry
  composerPort: ComposerPort
}): ComponentType {
  const composerStore = new ComposerStore(libraryStore, metaStore, runStore)
  const attachmentsStore = new AttachmentsStore()
  const attachmentsPresenter = new AttachmentsPresenter(attachmentsStore, api, window)
  const promptHistoryStore = new PromptHistoryStore()
  const promptHistoryPresenter = new PromptHistoryPresenter(promptHistoryStore, window)
  const suggestionsStore = new SuggestionsStore()
  const suggestionsPresenter = new SuggestionsPresenter(suggestionsStore, promptHistoryStore, api, window)
  const composerPresenter = new ComposerPresenter(
    composerStore,
    promptHistoryPresenter,
    suggestionsPresenter,
    attachmentsPresenter,
    reviewPresenter,
    api,
    commandRegistry,
    composerPort,
    window,
  )

  const RunStatus = createRunStatus({ api, window, runStore, metaStore, commandRegistry })
  const PendingComments = createPendingComments({ reviewStore, reviewPresenter })
  const PromptHistory = createPromptHistory({ promptHistoryStore, promptHistoryPresenter, composerPresenter })
  const Suggestions = createSuggestions({ suggestionsStore, suggestionsPresenter, composerPresenter })
  const FileInput = createFileInput({ attachmentsPresenter })
  const PromptForm = createPromptForm({ composerStore, composerPresenter, attachmentsStore, attachmentsPresenter })

  return observer(function ComposerHost() {
    // Each chat gets a fresh box: the key remounts the view, and the effect restarts the presenter.
    const chatKey = libraryStore.openChatId ?? "draft"

    useEffect(() => {
      composerPresenter.start()
      return composerPresenter.stop
    }, [chatKey])

    return <Composer key={chatKey} RunStatus={RunStatus} PendingComments={PendingComments} PromptHistory={PromptHistory} Suggestions={Suggestions} FileInput={FileInput} PromptForm={PromptForm} />
  })
}
