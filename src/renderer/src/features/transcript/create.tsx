import type { ReactNode } from "react"
import { observer } from "mobx-react-lite"
import { parseMarkdownIntoBlocks } from "streamdown"
import { ConversationScrollButton } from "@/components/ai-elements/conversation"
import { EditMessage } from "@/features/transcript/block-row/edit-message"
import { createBlockRow, type RowActions, type RowState } from "@/features/transcript/block-row/create"
import { EmptyState } from "@/features/transcript/empty-state/empty-state"
import { PlanCard } from "@/features/transcript/plan-card/plan-card"
import { RevealPresenter } from "@/features/transcript/reveal/reveal-presenter/reveal-presenter"
import { RevealStore } from "@/features/transcript/reveal/reveal-store/reveal-store"
import { PendingReply } from "@/features/transcript/status/pending-reply"
import { Transcript as TranscriptView } from "@/features/transcript/transcript"
import { awaitingModel, groupMessages } from "@/features/transcript/transcript-blocks"
import { TranscriptPresenter } from "@/features/transcript/transcript-presenter/transcript-presenter"
import { TranscriptStore } from "@/features/transcript/transcript-store/transcript-store"
import type { AppDeps } from "@/state/app-deps"
import type { AgentSlots, ReviewSlots, TranscriptSlots } from "@/state/slots"

// The owning create for the transcript. It is called once at boot. It builds the transcript's
// stores and presenters, starts them, and returns the host that maps the run's messages to rows.
export function createTranscript({
  services,
  env,
  mirror,
  shared,
  review,
  question: Question,
}: AppDeps & { review: ReviewSlots; question: AgentSlots["Question"] }): TranscriptSlots {
  const store = new TranscriptStore()
  const reveal = new RevealStore()
  const presenter = new TranscriptPresenter(
    store,
    mirror.run,
    services.chat,
    services.library,
    shared.composer,
    shared.panelPresenter,
    shared.overlay,
    shared.commands,
    shared.jump,
    env,
  )
  const revealPresenter = new RevealPresenter(reveal, mirror.run, parseMarkdownIntoBlocks, env)
  // start() attaches the jump handler that search results call, and stop() releases it.
  presenter.start()
  revealPresenter.start()

  // Built once: the presenter's methods are stable arrow functions, so the rows never see a new callback.
  const actions: RowActions = {
    onEdit: presenter.requestEdit,
    onRewind: presenter.rewind,
    onOpenFile: presenter.openFile,
    onConfirmEdit: presenter.confirmEdit,
    onCancelConfirm: presenter.cancelConfirm,
  }

  // The scroll-down button reads its own state, so the rows do not re-render when it toggles.
  const ScrollDown = observer(function ScrollDownHost() {
    const jumpLabel = mirror.run.transcriptPage.hasNewer ? "Jump to latest" : undefined
    return <ConversationScrollButton visible={!store.atBottom} aria-label={jumpLabel} onClick={presenter.handleScrollDown} />
  })

  // The editor reads its own draft, so each keystroke re-renders the editor and not the transcript.
  const EditRow = observer(function EditRowHost() {
    return (
      <EditMessage
        draft={store.editDraft}
        canSave={store.canSaveEdit}
        saving={store.editSaving}
        onDraftChange={presenter.setEditDraft}
        onCancel={presenter.cancelEdit}
        onSave={presenter.saveEdit}
      />
    )
  })

  const Transcript = observer(function TranscriptHost() {
    const run = mirror.run
    const messages = run.messages
    // With newer turns outside the window, the live end of the chat is not on screen.
    const live = !run.transcriptPage.hasNewer
    const rowState: RowState = {
      streaming: run.streaming,
      editingId: store.editingId,
      EditRow,
      confirmingId: store.confirmEditId,
      shownOf: (messageId) => reveal.shownOf(messageId),
      Commentable: review.CommentableResponse,
      actions,
    }
    const rows = groupMessages(messages).map((block) =>
      createBlockRow({ key: block.kind === "user" ? block.message.id : block.turn.id, block, state: rowState }),
    )

    const pending = awaitingModel(messages, run.streaming) && !run.planProposal
    let status: ReactNode = null
    if (live && pending) {
      status = <PendingReply label={run.notice ?? "Thinking"} />
    } else if (live && run.notice) {
      status = <p className="text-sm text-muted-foreground">{run.notice}</p>
    }

    let plan: ReactNode = null
    if (live && run.planProposal) {
      plan = <PlanCard plan={run.planProposal} approving={store.approving} onApprove={presenter.approvePlan} />
    }

    let intro: ReactNode = null
    if (messages.length === 0) {
      intro = (
        <EmptyState
          configured={mirror.meta.configured}
          cwd={mirror.meta.meta?.cwd ?? ""}
          onConnect={presenter.openSettings}
          onChoose={presenter.chooseFolder}
        />
      )
    }

    let questionCard: ReactNode = null
    if (run.question) {
      questionCard = (
        <div className="mx-auto w-full max-w-3xl px-6 pb-3">
          <Question key={run.question.id} question={run.question} />
        </div>
      )
    }

    // The question card is a sibling of the transcript: it sits between the list and the composer
    // and does not scroll with the list. The shell places the composer after this.
    return (
      <>
        <TranscriptView
          key={`transcript-${run.transcriptChatId ?? "draft"}`}
          streaming={run.streaming}
          intro={intro}
          rows={rows}
          plan={plan}
          status={status}
          ScrollDown={ScrollDown}
          attachScroll={presenter.attachScroll}
          onSettle={presenter.handleSettle}
        />
        {questionCard}
      </>
    )
  })

  return { Transcript }
}
