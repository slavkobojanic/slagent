import { observer } from "mobx-react-lite"
import { type ComponentType, useEffect } from "react"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
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
import { ComposerPresenter, type BuiltinRunner } from "./composer-presenter/composer-presenter"
import { ComposerStore } from "./composer-store/composer-store"
import { createPendingComments } from "./pending-comments/create"
import { createPromptHistory } from "./prompt-history/create"
import { PromptHistoryPresenter } from "./prompt-history/prompt-history-presenter/prompt-history-presenter"
import { PromptHistoryStore } from "./prompt-history/prompt-history-store/prompt-history-store"
import { createPromptForm } from "./prompt-form/create"
import { createRunStatus } from "./run-status/create"
import { createUsageMeter } from "./run-status/usage-meter/create"
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
  onBuiltin,
  touch = false,
  log,
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
  onBuiltin?: BuiltinRunner
  // A phone: Return adds a line and opening a chat does not raise the keyboard.
  touch?: boolean
  log: Log
}): ComponentType {
  const composerStore = new ComposerStore(libraryStore, metaStore, runStore, touch)
  const attachmentsStore = new AttachmentsStore()
  const attachmentsPresenter = new AttachmentsPresenter(attachmentsStore, api, window, log.child("attachments"))
  const promptHistoryStore = new PromptHistoryStore()
  const promptHistoryPresenter = new PromptHistoryPresenter(promptHistoryStore, window, log.child("prompt-history"))
  const suggestionsStore = new SuggestionsStore()
  const suggestionsPresenter = new SuggestionsPresenter(suggestionsStore, promptHistoryStore, api, window, log.child("suggestions"))
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
    log,
    onBuiltin,
  )

  const RunStatus = createRunStatus({ api, window, runStore, log: log.child("run-status") })
  const PendingComments = createPendingComments({ reviewStore, reviewPresenter })
  const PromptHistory = createPromptHistory({ promptHistoryStore, promptHistoryPresenter, composerPresenter })
  const Suggestions = createSuggestions({ suggestionsStore, suggestionsPresenter, composerPresenter })
  const FileInput = createFileInput({ attachmentsPresenter })
  const UsageMeter = createUsageMeter({ runStore, metaStore })
  const PromptForm = createPromptForm({ composerStore, composerPresenter, attachmentsStore, attachmentsPresenter, UsageMeter, api, metaStore, log })

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
