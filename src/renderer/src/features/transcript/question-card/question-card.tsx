import type { ComponentType } from "react"
import { AnimatePresence, MotionConfig, motion } from "motion/react"
import type { Question } from "@shared/types"
import type { QuestionKeyPress } from "@/features/transcript/question-card/question-keys"

// Motion needs the curves as numbers. They mirror the easing tokens in index.css.
const EASE_OUT = [0.23, 1, 0.32, 1] as const
const EASE_DRAWER = [0.32, 0.72, 0, 1] as const

export type QuestionCardProps = {
  question: Question
  direction: 1 | -1
  open: boolean
  error: string | null
  onKey: (press: QuestionKeyPress) => boolean
  Header: ComponentType
  Block: ComponentType<{ question: Question }>
  Footer: ComponentType
}

// Keys typed into a text field belong to the field. The card only reads Enter there.
function isTyping(target: EventTarget): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
}

export function QuestionCard({ question, direction, open, error, onKey, Header, Block, Footer }: QuestionCardProps) {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 pb-3">
      <MotionConfig reducedMotion="user">
        <motion.section
          initial={{ opacity: 0, transform: "translateY(8px)" }}
          animate={{ opacity: 1, transform: "translateY(0px)" }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
          className="overflow-hidden rounded-xl bg-white/3"
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
          <Header />
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
                  <Block question={question} />
                </motion.div>
              </AnimatePresence>
            </div>
            <Footer />
          </motion.div>
          {error !== null ? (
            <p role="alert" className="border-t border-white/10 px-4 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </motion.section>
      </MotionConfig>
    </div>
  )
}
