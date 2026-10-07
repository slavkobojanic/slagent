import { AnimatePresence, MotionConfig, motion } from "motion/react"
import { ChevronDownIcon, ChevronLeftIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { QuestionKeyPress } from "@/features/agent/question-keys"
import { cn } from "@/lib/utils"
import type { Question } from "@shared/types"
import { QuestionBlock } from "./question-block"
import type { Theme } from "./question-media"

// Motion needs the curves as numbers. They mirror the easing tokens in index.css.
const EASE_OUT = [0.23, 1, 0.32, 1] as const
const EASE_DRAWER = [0.32, 0.72, 0, 1] as const

export type QuestionCardProps = {
  question: Question
  index: number
  count: number
  selected: string[]
  other: string
  ready: boolean
  stepReady: boolean
  hasPrevious: boolean
  hasNext: boolean
  direction: 1 | -1
  open: boolean
  busy: boolean
  error: string | null
  theme: Theme
  frameHeights: Record<string, number>
  brokenImages: Record<string, boolean>
  zoomed: boolean
  attachQuestion: (element: HTMLElement | null) => void
  onKey: (press: QuestionKeyPress) => boolean
  onToggleOpen: () => void
  onSkip: () => void
  onBack: () => void
  onNext: () => void
  onSend: () => void
  onPick: (label: string) => void
  onOtherChange: (value: string) => void
  onImageError: (src: string) => void
  onZoomChange: (open: boolean) => void
}

// Keys typed into a text field belong to the field. The card only reads Enter there.
function isTyping(target: EventTarget): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
}

// The question sits above the composer as a compact card, not a modal. Picking an option answers it
// and moves to the next question; the last pick sends.
export function QuestionCard({
  question,
  index,
  count,
  selected,
  other,
  ready,
  stepReady,
  hasPrevious,
  hasNext,
  direction,
  open,
  busy,
  error,
  theme,
  frameHeights,
  brokenImages,
  zoomed,
  attachQuestion,
  onKey,
  onToggleOpen,
  onSkip,
  onBack,
  onNext,
  onSend,
  onPick,
  onOtherChange,
  onImageError,
  onZoomChange,
}: QuestionCardProps) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.section
        initial={{ opacity: 0, transform: "translateY(8px)" }}
        animate={{ opacity: 1, transform: "translateY(0px)" }}
        transition={{ duration: 0.2, ease: EASE_OUT }}
        className="overflow-hidden rounded-xl border border-white/15 bg-white/3"
        aria-label="Question"
        onKeyDown={(event) => {
          // The card's keys act only while focus is inside it, so they stay on the card rather than
          // in the global shortcut registry.
          const handled = onKey({
            key: event.key,
            shift: event.shiftKey,
            mod: event.metaKey || event.ctrlKey,
            alt: event.altKey,
            typing: isTyping(event.target),
          })
          if (handled) {
            event.preventDefault()
          }
        }}
      >
        <header className="flex items-center gap-2.5 px-4 py-2.5">
          {count > 1 ? (
            <span className="shrink-0 rounded-md bg-warning/20 px-1.5 py-0.5 text-xs font-medium tabular-nums text-warning">
              {index + 1}/{count}
            </span>
          ) : null}
          {question.header ? (
            <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-xs font-medium text-white/70 uppercase">{question.header}</span>
          ) : null}
          <p className="min-w-0 flex-1 text-sm font-medium">{question.question}</p>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={open ? "Collapse" : "Expand"}
            onClick={() => onToggleOpen()}
          >
            <ChevronDownIcon className={cn("size-4 transition-transform duration-200", !open && "-rotate-90")} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            title="Skip — let the agent decide"
            disabled={busy}
            onClick={() => onSkip()}
          >
            <XIcon className="size-4" />
          </Button>
        </header>
        <motion.div
          initial={false}
          animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
          transition={{ duration: 0.22, ease: EASE_DRAWER }}
          className="overflow-hidden"
        >
          <div className="min-w-0 px-4 pb-2">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={question.id}
                initial={{ opacity: 0, transform: `translateX(${direction * 16}px)` }}
                animate={{ opacity: 1, transform: "translateX(0px)" }}
                exit={{ opacity: 0, transform: `translateX(${direction * -16}px)` }}
                transition={{ duration: 0.18, ease: EASE_OUT }}
              >
                <QuestionBlock
                  question={question}
                  selected={selected}
                  other={other}
                  theme={theme}
                  frameHeights={frameHeights}
                  brokenImages={brokenImages}
                  zoomed={zoomed}
                  attachQuestion={attachQuestion}
                  onPick={onPick}
                  onOtherChange={onOtherChange}
                  onImageError={onImageError}
                  onZoomChange={onZoomChange}
                />
              </motion.div>
            </AnimatePresence>
          </div>
          <footer className="flex items-center gap-2 px-4 pb-3">
            {hasPrevious ? (
              <Button type="button" variant="ghost" size="xs" disabled={busy} onClick={() => onBack()}>
                <ChevronLeftIcon className="size-3.5" />
                Back
              </Button>
            ) : null}
            <span className="flex-1" />
            <Button type="button" variant="ghost" size="xs" disabled={busy} onClick={() => onSkip()}>
              Skip
            </Button>
            {hasNext ? (
              <Button type="button" size="xs" disabled={busy || !stepReady} onClick={() => onNext()}>
                Next
                <span className="flex items-center gap-0.5">
                  <kbd className="rounded border border-white/20 px-1 text-xs leading-3.5 text-white/60">⌘</kbd>
                  <kbd className="rounded border border-white/20 px-1 text-xs leading-3.5 text-white/60">↩</kbd>
                </span>
              </Button>
            ) : (
              <Button type="button" size="xs" disabled={busy || !ready} onClick={() => onSend()}>
                Send
              </Button>
            )}
          </footer>
        </motion.div>
        {error !== null ? (
          <p role="alert" className="border-t border-white/10 px-4 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </motion.section>
    </MotionConfig>
  )
}
