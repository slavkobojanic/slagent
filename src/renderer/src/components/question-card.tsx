import { useEffect, useRef, useState } from "react"
import { AnimatePresence, MotionConfig, motion } from "motion/react"
import { toast } from "sonner"
import type {
  AnsweredQuestion,
  Question,
  QuestionAnswer,
  QuestionOption,
  QuestionReply,
  QuestionRequest,
} from "@shared/types"
import { HtmlFrame, Media } from "@/components/question-media"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { errorText } from "@/lib/format"
import { cn } from "@/lib/utils"
import { CheckIcon, ChevronDownIcon, ChevronLeftIcon, XIcon } from "lucide-react"

type Draft = {
  selected: string[]
  other: string
}

function emptyDraft(): Draft {
  return { selected: [], other: "" }
}

function complete(draft: Draft): boolean {
  return draft.selected.length > 0 || Boolean(draft.other.trim())
}

function typing(target: EventTarget): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
}

// Options with an image or a mockup are shown as large side-by-side cards.
function visual(question: Question): boolean {
  return question.options.some((option) => option.image || option.html)
}

// Motion needs the curves as numbers; they mirror index.css tokens.
const EASE_OUT = [0.23, 1, 0.32, 1] as const
const EASE_DRAWER = [0.32, 0.72, 0, 1] as const

function RecommendedBadge() {
  return (
    <span className="rounded bg-emerald-400/15 px-1.5 text-[11px] text-emerald-700 dark:text-emerald-300">Recommended</span>
  )
}

// The numbered chip at the end of a row; it flips to a check when picked.
function Marker({ checked, index }: { checked: boolean; index: number }) {
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-md border border-white/15 text-[11px] tabular-nums text-white/50 transition-colors",
        checked && "border-transparent bg-white text-black",
      )}
    >
      {checked ? <CheckIcon className="size-3" strokeWidth={2.5} /> : index + 1}
    </span>
  )
}

function OptionText({ option }: { option: QuestionOption }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="flex flex-wrap items-center gap-1.5">
        <span className="font-medium">{option.label}</span>
        {option.recommended ? <RecommendedBadge /> : null}
      </span>
      {option.description ? (
        <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{option.description}</span>
      ) : null}
    </span>
  )
}

// A compact numbered row. Picking it selects the answer and advances; the
// parent decides what a click means, the row only reports it.
function OptionRow({
  option,
  index,
  checked,
  onPick,
}: {
  option: QuestionOption
  index: number
  checked: boolean
  onPick: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border border-white/10 px-3.5 py-2.5 text-left transition-colors hover:bg-white/[0.04]",
        checked && "border-white/70 bg-white/[0.06] hover:bg-white/[0.06]",
      )}
      onClick={onPick}
    >
      <OptionText option={option} />
      <Marker checked={checked} index={index} />
    </button>
  )
}

function OptionRows({
  question,
  draft,
  onPick,
}: {
  question: Question
  draft: Draft
  onPick: (label: string) => void
}) {
  return (
    <div className="space-y-1.5" role="radiogroup" aria-label={question.question}>
      {question.options.map((option, index) => (
        <OptionRow
          key={option.label}
          option={option}
          index={index}
          checked={draft.selected.includes(option.label)}
          onPick={() => onPick(option.label)}
        />
      ))}
    </div>
  )
}

// Visual options keep the large preview cards; a pick still advances.
function OptionCards({
  question,
  draft,
  onPick,
}: {
  question: Question
  draft: Draft
  onPick: (label: string) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label={question.question}>
      {question.options.map((option) => {
        const checked = draft.selected.includes(option.label)
        return (
          <button
            key={option.label}
            type="button"
            role="radio"
            aria-checked={checked}
            className={cn(
              "flex flex-col overflow-hidden rounded-lg border border-white/10 text-left text-sm transition-colors hover:border-white/25",
              checked && "border-white ring-1 ring-white hover:border-white",
            )}
            onClick={() => onPick(option.label)}
          >
            <span className="relative block aspect-[4/3] w-full overflow-hidden bg-white/[0.03]">
              {option.image ? (
                <img src={option.image} alt={option.label} className="absolute inset-0 size-full object-cover" />
              ) : option.html ? (
                // Look, don't touch: clicks go to the card, not the mockup.
                <span className="pointer-events-none absolute inset-0 block overflow-hidden">
                  <HtmlFrame html={option.html} title={option.label} />
                </span>
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                  No preview
                </span>
              )}
            </span>
            <span className={cn("flex flex-1 items-start gap-2.5 px-3 py-2.5", checked && "bg-white/[0.06]")}>
              <OptionText option={option} />
            </span>
          </button>
        )
      })}
    </div>
  )
}

// The free-text row. On single-choice questions typing here clears the pick.
function OtherRow({
  question,
  draft,
  onChange,
  onEnter,
}: {
  question: Question
  draft: Draft
  onChange: (draft: Draft) => void
  onEnter: () => void
}) {
  const filled = Boolean(draft.other.trim())
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-white/10 py-1.5 pr-3.5 pl-3.5 transition-colors hover:bg-white/[0.04] focus-within:border-white/40",
        filled && "border-white/70 bg-white/[0.06] hover:bg-white/[0.06]",
      )}
    >
      <span className="shrink-0 text-sm font-medium">Other</span>
      <Input
        value={draft.other}
        placeholder={question.multiSelect ? "Type your own answer (optional)" : "Type your own answer"}
        className="h-8 min-w-0 flex-1 border-0 px-0 text-sm focus-visible:ring-0"
        onChange={(event) => {
          const other = event.target.value
          // A written answer replaces a pick on single-choice questions.
          const selected = !question.multiSelect && other.trim() ? [] : draft.selected
          onChange({ ...draft, other, selected })
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault()
            onEnter()
          }
        }}
      />
      {!question.multiSelect ? <Marker checked={filled} index={question.options.length} /> : null}
    </div>
  )
}

function QuestionBlock({
  question,
  draft,
  onPick,
  onOther,
  onEnter,
}: {
  question: Question
  draft: Draft
  onPick: (label: string) => void
  onOther: (draft: Draft) => void
  onEnter: () => void
}) {
  return (
    <div className="space-y-2 outline-none" tabIndex={-1} data-question>
      <Media media={question} title={question.question} />
      {visual(question) ? (
        <OptionCards question={question} draft={draft} onPick={onPick} />
      ) : (
        <OptionRows question={question} draft={draft} onPick={onPick} />
      )}
      <OtherRow question={question} draft={draft} onChange={onOther} onEnter={onEnter} />
    </div>
  )
}

// The question sits above the composer as a compact card, not a modal. Picking
// an option answers it and moves to the next question; the last pick sends.
function QuestionCard({ request }: { request: QuestionRequest }) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(true)
  const [page, setPage] = useState(0)
  const [dir, setDir] = useState(1)
  const body = useRef<HTMLDivElement | null>(null)
  const draftsRef = useRef(drafts)
  const sendTimer = useRef<number | null>(null)

  const ready = request.questions.every((question) => complete(drafts[question.id] ?? emptyDraft()))
  const count = request.questions.length
  // Questions can be removed while navigating; stay on a valid page.
  const index = Math.min(page, count - 1)
  const question = request.questions[index]
  const stepReady = complete(drafts[question.id] ?? emptyDraft())

  function setDraft(id: string, draft: Draft) {
    draftsRef.current = { ...draftsRef.current, [id]: draft }
    setDrafts(draftsRef.current)
  }

  function go(next: number) {
    setDir(next > index ? 1 : -1)
    setPage(next)
  }

  useEffect(() => {
    // A fresh question starts focused, so number keys pick options right away.
    body.current?.querySelector<HTMLElement>("[data-question]")?.focus({ preventScroll: true })
  }, [index, open])

  useEffect(() => () => {
    if (sendTimer.current !== null) window.clearTimeout(sendTimer.current)
  }, [])

  async function send(reply: QuestionReply) {
    setBusy(true)
    try {
      await window.slagent.answerQuestion(request.id, reply)
    } catch (error) {
      toast.error(errorText(error))
      setBusy(false)
    }
  }

  function submit(snapshot: Record<string, Draft> = draftsRef.current) {
    if (busy) return
    const answers: QuestionAnswer[] = request.questions.map((q) => {
      const draft = snapshot[q.id] ?? emptyDraft()
      return { questionId: q.id, selected: draft.selected, other: draft.other.trim() || undefined }
    })
    void send({ skipped: false, answers })
  }

  function advance() {
    if (index < count - 1) {
      if (stepReady) go(index + 1)
      return
    }
    if (ready) submit()
  }

  // A pick on a single-choice question selects, advances, and on the last
  // question sends after a beat so the selected state is seen first.
  function pick(current: Question, label: string) {
    if (sendTimer.current !== null) {
      window.clearTimeout(sendTimer.current)
      sendTimer.current = null
    }
    const draft = draftsRef.current[current.id] ?? emptyDraft()
    if (current.multiSelect) {
      const selected = draft.selected.includes(label)
        ? draft.selected.filter((item) => item !== label)
        : [...draft.selected, label]
      setDraft(current.id, { ...draft, selected })
      return
    }
    const selected = draft.selected[0] === label ? [] : [label]
    const next = { ...draft, selected, other: selected.length ? "" : draft.other }
    setDraft(current.id, next)
    if (selected.length === 0) return
    if (index < count - 1) {
      go(index + 1)
      return
    }
    const snapshot = { ...draftsRef.current, [current.id]: next }
    sendTimer.current = window.setTimeout(() => {
      sendTimer.current = null
      submit(snapshot)
    }, 220)
  }

  function skip() {
    if (sendTimer.current !== null) {
      window.clearTimeout(sendTimer.current)
      sendTimer.current = null
    }
    void send({ skipped: true })
  }

  return (
    <MotionConfig reducedMotion="user">
      <motion.section
        initial={{ opacity: 0, transform: "translateY(8px)" }}
        animate={{ opacity: 1, transform: "translateY(0px)" }}
        transition={{ duration: 0.2, ease: EASE_OUT }}
        className="overflow-hidden rounded-xl border border-white/15 bg-white/[0.03]"
        aria-label="Question"
        onKeyDown={(event) => {
          if (typing(event.target)) {
            // Enter from the free-text row advances or sends.
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              advance()
            }
            return
          }
          if (event.metaKey || event.ctrlKey) {
            if (event.key === "Enter") {
              event.preventDefault()
              advance()
            }
            return
          }
          if (event.altKey) return
          if (event.key === "ArrowLeft" && index > 0) {
            event.preventDefault()
            go(index - 1)
          }
          if (event.key === "ArrowRight" && index < count - 1) {
            event.preventDefault()
            go(index + 1)
          }
          if (event.key === "Escape") {
            event.preventDefault()
            setOpen(false)
          }
          const option = question.options[Number(event.key) - 1]
          if (!option) return
          event.preventDefault()
          pick(question, option.label)
        }}
      >
        <header className="flex items-center gap-2.5 px-4 py-2.5">
          {count > 1 ? (
            <span className="shrink-0 rounded-md bg-amber-400/20 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-amber-700 dark:text-amber-300">
              {index + 1}/{count}
            </span>
          ) : null}
          {question.header ? (
            <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-medium text-white/70 uppercase">
              {question.header}
            </span>
          ) : null}
          <p className="min-w-0 flex-1 text-sm font-medium">{question.question}</p>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={open ? "Collapse" : "Expand"}
            onClick={() => setOpen(!open)}
          >
            <ChevronDownIcon className={cn("size-4 transition-transform duration-200", !open && "-rotate-90")} />
          </Button>
          <Button type="button" variant="ghost" size="icon-xs" title="Skip — let the agent decide" disabled={busy} onClick={skip}>
            <XIcon className="size-4" />
          </Button>
        </header>
        <motion.div
          initial={false}
          animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
          transition={{ duration: 0.22, ease: EASE_DRAWER }}
          className="overflow-hidden"
        >
          <div ref={body} className="min-w-0 px-4 pb-2">
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              <motion.div
                key={question.id}
                custom={dir}
                initial={{ opacity: 0, transform: `translateX(${dir * 16}px)` }}
                animate={{ opacity: 1, transform: "translateX(0px)" }}
                exit={{ opacity: 0, transform: `translateX(${dir * -16}px)` }}
                transition={{ duration: 0.18, ease: EASE_OUT }}
              >
                <QuestionBlock
                  question={question}
                  draft={drafts[question.id] ?? emptyDraft()}
                  onPick={(label) => pick(question, label)}
                  onOther={(draft) => setDraft(question.id, draft)}
                  onEnter={advance}
                />
              </motion.div>
            </AnimatePresence>
          </div>
          <footer className="flex items-center gap-2 px-4 pb-3">
            {index > 0 ? (
              <Button type="button" variant="ghost" size="xs" disabled={busy} onClick={() => go(index - 1)}>
                <ChevronLeftIcon className="size-3.5" />
                Back
              </Button>
            ) : null}
            <span className="flex-1" />
            <Button type="button" variant="ghost" size="xs" disabled={busy} onClick={skip}>
              Skip
            </Button>
            {index < count - 1 ? (
              <Button type="button" size="xs" disabled={busy || !stepReady} onClick={() => go(index + 1)}>
                Next
                <span className="flex items-center gap-0.5">
                  <kbd className="rounded border border-white/20 px-1 text-[10px] leading-3.5 text-white/60">⌘</kbd>
                  <kbd className="rounded border border-white/20 px-1 text-[10px] leading-3.5 text-white/60">↩</kbd>
                </span>
              </Button>
            ) : (
              <Button type="button" size="xs" disabled={busy || !ready} onClick={() => submit()}>
                Send
              </Button>
            )}
          </footer>
        </motion.div>
      </motion.section>
    </MotionConfig>
  )
}

// The answered card, as it stays in the transcript.
function AnsweredQuestions({ answers }: { answers: AnsweredQuestion[] }) {
  return (
    <dl className="space-y-2 text-sm">
      {answers.map((answer, index) => {
        const picks = [...answer.selected]
        if (answer.other) picks.push(answer.other)
        return (
          <div key={index}>
            <dt className="text-muted-foreground">{answer.question}</dt>
            <dd className="mt-1">
              {answer.skipped ? (
                <span className="text-muted-foreground italic">Left to the agent</span>
              ) : (
                <span className="flex items-start gap-1.5 font-medium text-foreground">
                  <CheckIcon className="mt-0.5 size-4 shrink-0" />
                  {picks.join(", ")}
                </span>
              )}
              {answer.images?.length ? (
                <span className="mt-2 flex flex-wrap gap-2">
                  {answer.images.map((src) => (
                    <img key={src} src={src} alt="" className="h-28 rounded-md border border-white/10 object-cover" />
                  ))}
                </span>
              ) : null}
              {answer.note ? <span className="mt-1 block text-xs text-muted-foreground">Note: {answer.note}</span> : null}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

export { AnsweredQuestions, QuestionCard }