import { observer } from "mobx-react-lite"
import type { QuestionRequest } from "@shared/types"
import type { AppDeps } from "@/state/app-deps"
import type { AgentSlots } from "@/state/slots"
import { QuestionCard } from "./question-card"
import { QuestionPresenter } from "./question-presenter/question-presenter"
import { QuestionStore } from "./question-store/question-store"

// Owning create: called once at boot. The question card sits above the composer while the agent
// waits for an answer. The store follows the mirrored request, so a card always belongs to the open chat.
export function createAgent(deps: AppDeps): AgentSlots {
  const { services, env, mirror, shared } = deps
  const store = new QuestionStore()
  const presenter = new QuestionPresenter(store, mirror.run, services.chat, env)
  presenter.start()

  const Question = observer(function QuestionHost({ question }: { question: QuestionRequest }) {
    const current = store.question
    if (current === null) {
      return null
    }
    // Keyed by the request, so a new question mounts a fresh card, as the old App did.
    return (
      <QuestionCard
        key={question.id}
        question={current}
        index={store.index}
        count={store.count}
        selected={store.draft.selected}
        other={store.draft.other}
        ready={store.ready}
        stepReady={store.stepReady}
        hasPrevious={store.hasPrevious}
        hasNext={store.hasNext}
        direction={store.direction}
        open={store.open}
        busy={store.busy}
        error={store.error}
        theme={shared.theme.resolved}
        frameHeights={store.frameHeights}
        brokenImages={store.brokenImages}
        zoomed={store.zoomed}
        attachQuestion={presenter.attachQuestion}
        onKey={presenter.handleKey}
        onToggleOpen={presenter.handleToggleOpen}
        onSkip={presenter.handleSkip}
        onBack={presenter.handleBack}
        onNext={presenter.handleNext}
        onSend={presenter.handleSend}
        onPick={presenter.handlePick}
        onOtherChange={presenter.handleOtherChange}
        onImageError={presenter.handleImageError}
        onZoomChange={presenter.handleZoomChange}
      />
    )
  })

  return { Question }
}
