import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { API } from "@/ipc/api"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { RunStore } from "@/mirror/run-store/run-store"
import type { ComposerPort } from "@/state/composer-port/composer-port"
import type { JumpPort } from "@/state/jump-port/jump-port"
import type { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import type { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"
import type { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import type { ReviewPresenter } from "@/state/review/review-presenter/review-presenter"
import type { ReviewStore } from "@/state/review/review-store/review-store"
import type { ThemeStore } from "@/state/theme/theme-store/theme-store"
import { createCommentableResponse } from "./commentable-response/create"
import { createMessageList } from "./message-list/create"
import { createPlanCard } from "./plan-card/create"
import { createQuestionCard } from "./question-card/create"
import { createScrollDown } from "./scroll-down/create"
import { createStatus } from "./status/create"
import { Transcript } from "./transcript"
import { TranscriptPresenter } from "./transcript-presenter/transcript-presenter"
import { TranscriptStore } from "./transcript-store/transcript-store"

export function createTranscript({
  api,
  window,
  metaStore,
  runStore,
  reviewStore,
  reviewPresenter,
  themeStore,
  overlayStore,
  panelPresenter,
  commandRegistry,
  composerPort,
  jumpPort,
}: {
  api: API
  window: Window
  metaStore: MetaStore
  runStore: RunStore
  reviewStore: ReviewStore
  reviewPresenter: ReviewPresenter
  themeStore: ThemeStore
  overlayStore: OverlayStore
  panelPresenter: PanelPresenter
  commandRegistry: CommandRegistry
  composerPort: ComposerPort
  jumpPort: JumpPort
}): ComponentType {
  const store = new TranscriptStore()
  const presenter = new TranscriptPresenter(store, runStore, api, jumpPort, window)
  presenter.start()

  const CommentableResponse = createCommentableResponse({ window, runStore, reviewStore, reviewPresenter })
  const MessageList = createMessageList({
    api,
    window,
    metaStore,
    runStore,
    overlayStore,
    panelPresenter,
    commandRegistry,
    composerPort,
    CommentableResponse,
  })
  const PlanCard = createPlanCard({ api, runStore })
  const Status = createStatus({ runStore })
  const ScrollDown = createScrollDown({ runStore, transcriptStore: store, transcriptPresenter: presenter })
  const QuestionCard = createQuestionCard({ api, window, runStore, themeStore })

  return observer(function TranscriptHost() {
    // Keyed by the chat, so opening a chat mounts the transcript fresh.
    return (
      <Transcript
        key={`transcript-${runStore.transcriptChatId ?? "draft"}`}
        streaming={runStore.streaming}
        attachScroll={presenter.attachScroll}
        onSettle={presenter.handleSettle}
        MessageList={MessageList}
        PlanCard={PlanCard}
        Status={Status}
        ScrollDown={ScrollDown}
        QuestionCard={QuestionCard}
      />
    )
  })
}
