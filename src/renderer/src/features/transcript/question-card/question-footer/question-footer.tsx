import { ChevronLeftIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export type QuestionFooterProps = {
  index: number
  count: number
  hasPrevious: boolean
  hasNext: boolean
  busy: boolean
  // The question on screen is answered, so Next can move on.
  stepReady: boolean
  // Every question is answered, so Send can send.
  ready: boolean
  onBack: () => void
  onSkip: () => void
  onNext: () => void
  onSend: () => void
}

export function QuestionFooter({ index, count, hasPrevious, hasNext, busy, stepReady, ready, onBack, onSkip, onNext, onSend }: QuestionFooterProps) {
  return (
    <footer className="flex items-center gap-2 px-4 pb-3">
      {hasPrevious ? (
        <Button type="button" variant="ghost" size="xs" disabled={busy} onClick={() => onBack()}>
          <ChevronLeftIcon className="size-3.5" />
          Back
        </Button>
      ) : null}
      <span className="flex-1" />
      {count > 1 ? (
        <span className="text-xs tabular-nums text-white/50">
          {index + 1} / {count}
        </span>
      ) : null}
      <Button type="button" variant="ghost" size="xs" disabled={busy} onClick={() => onSkip()}>
        Skip
      </Button>
      {hasNext ? (
        <Button type="button" size="xs" disabled={busy || !stepReady} onClick={() => onNext()}>
          Next
        </Button>
      ) : (
        <Button type="button" size="xs" disabled={busy || !ready} onClick={() => onSend()}>
          Send
        </Button>
      )}
    </footer>
  )
}
