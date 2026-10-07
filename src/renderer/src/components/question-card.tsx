import { useRef, useState } from "react"
import { toast } from "sonner"
import type {
  AnsweredQuestion,
  Question,
  QuestionAnswer,
  QuestionOption,
  QuestionReply,
  QuestionRequest,
} from "@shared/types"
import { HtmlFrame, hasMedia, Media } from "@/components/question-media"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { errorText } from "@/lib/format"
import { cn } from "@/lib/utils"
import { CheckIcon, MessageCircleQuestionIcon } from "lucide-react"

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

function Marker({ checked, index }: { checked: boolean; index: number }) {
  return (
    <span className={cn("shrink-0 tabular-nums text-muted-foreground", checked && "text-white")}>{index + 1}.</span>
  )
}

function OptionText({ option }: { option: QuestionOption }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="flex flex-wrap items-center gap-1.5">
        <span className="font-medium">{option.label}</span>
        {option.recommended ? (
          <span className="rounded bg-emerald-400/15 px-1.5 text-[11px] text-emerald-700 dark:text-emerald-300">Recommended</span>
        ) : null}
      </span>
      {option.description ? <span className="mt-0.5 block text-xs text-muted-foreground">{option.description}</span> : null}
    </span>
  )
}

function OptionCards({
  question,
  draft,
  fill,
  onToggle,
}: {
  question: Question
  draft: Draft
  fill: boolean
  onToggle: (label: string) => void
}) {
  return (
    <div
      className={cn("grid gap-3 sm:grid-cols-3", fill && "min-h-0 flex-1")}
      role={question.multiSelect ? "group" : "radiogroup"}
      aria-label={question.question}
    >
      {question.options.map((option, index) => {
        const checked = draft.selected.includes(option.label)
        return (
          <button
            key={option.label}
            type="button"
            role={question.multiSelect ? "checkbox" : "radio"}
            aria-checked={checked}
            className={cn(
              "flex flex-col overflow-hidden rounded-lg border border-white/10 text-left text-sm transition-colors hover:border-white/25",
              checked && "border-white ring-1 ring-white hover:border-white",
            )}
            onClick={() => onToggle(option.label)}
          >
            <span
              className={cn(
                "relative block w-full overflow-hidden bg-white/[0.03]",
                fill ? "min-h-40 flex-1" : "aspect-[4/3]",
              )}
            >
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
              <Marker checked={checked} index={index} />
              <OptionText option={option} />
            </span>
          </button>
        )
      })}
    </div>
  )
}

function OptionList({
  question,
  draft,
  onToggle,
}: {
  question: Question
  draft: Draft
  onToggle: (label: string) => void
}) {
  // The preview follows the pointer and focus, and falls back to the pick.
  const [focused, setFocused] = useState<string | null>(null)
  const shown = focused ?? draft.selected[draft.selected.length - 1] ?? null
  const shownOption = question.options.find((option) => option.label === shown)
  const hasPreviews = question.options.some(hasMedia)

  return (
    <div className={cn("grid gap-3", hasPreviews && "md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]")}>
      <div className="space-y-1.5" role={question.multiSelect ? "group" : "radiogroup"} aria-label={question.question}>
        {question.options.map((option, index) => {
          const checked = draft.selected.includes(option.label)
          return (
            <button
              key={option.label}
              type="button"
              role={question.multiSelect ? "checkbox" : "radio"}
              aria-checked={checked}
              className={cn(
                "flex w-full items-start gap-2.5 rounded-md border border-white/10 px-3 py-2 text-left text-sm transition-colors hover:bg-white/[0.04]",
                checked && "border-white bg-white/[0.06] hover:bg-white/[0.06]",
              )}
              onClick={() => onToggle(option.label)}
              onMouseEnter={() => setFocused(option.label)}
              onMouseLeave={() => setFocused(null)}
              onFocus={() => setFocused(option.label)}
              onBlur={() => setFocused(null)}
            >
              <Marker checked={checked} index={index} />
              <OptionText option={option} />
            </button>
          )
        })}
      </div>
      {hasPreviews ? (
        <div className="max-h-[32rem] min-h-24 overflow-auto rounded-md border border-white/10 bg-white/[0.02] px-3 py-2 text-sm">
          {shownOption && hasMedia(shownOption) ? (
            <Media media={shownOption} title={shownOption.label} />
          ) : (
            <p className="text-xs text-muted-foreground">Point at an option to preview it.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}

function QuestionBlock({
  question,
  number,
  numbered,
  fill,
  draft,
  onChange,
}: {
  question: Question
  number: number
  numbered: boolean
  // A lone visual question stretches its cards to the modal's height.
  fill: boolean
  draft: Draft
  onChange: (draft: Draft) => void
}) {
  function toggle(label: string) {
    if (!question.multiSelect) {
      const selected = draft.selected[0] === label ? [] : [label]
      // Picking an option replaces a written answer on single-choice questions.
      onChange({ ...draft, selected, other: selected.length ? "" : draft.other })
      return
    }
    const selected = draft.selected.includes(label)
      ? draft.selected.filter((item) => item !== label)
      : [...draft.selected, label]
    onChange({ ...draft, selected })
  }

  return (
    <div
      className={cn("space-y-3 outline-none", fill && "flex h-full flex-col space-y-0 gap-3")}
      tabIndex={-1}
      data-question
      onKeyDown={(event) => {
        if (typing(event.target) || event.metaKey || event.ctrlKey || event.altKey) return
        const option = question.options[Number(event.key) - 1]
        if (!option) return
        event.preventDefault()
        toggle(option.label)
      }}
    >
      <div className="flex items-baseline gap-2">
        {question.header ? (
          <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-medium text-white/70 uppercase">
            {question.header}
          </span>
        ) : null}
        <p className="pr-8 text-sm font-medium">
          {numbered ? <span className="mr-1.5 text-muted-foreground">{number}.</span> : null}
          {question.question}
        </p>
      </div>
      <Media media={question} title={question.question} />
      {visual(question) ? (
        <OptionCards question={question} draft={draft} fill={fill} onToggle={toggle} />
      ) : (
        <OptionList question={question} draft={draft} onToggle={toggle} />
      )}
      <Input
        value={draft.other}
        placeholder={question.multiSelect ? "Something else (optional)" : "Something else"}
        className="h-8 text-sm"
        onChange={(event) => {
          const other = event.target.value
          const selected = !question.multiSelect && other.trim() ? [] : draft.selected
          onChange({ ...draft, other, selected })
        }}
      />
    </div>
  )
}

// The question opens in a modal so options get room. Closing it leaves a
// small card in the transcript to reopen it, and the composer still answers.
function QuestionCard({ request }: { request: QuestionRequest }) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(true)
  const body = useRef<HTMLDivElement | null>(null)
  const ready = request.questions.every((question) => complete(drafts[question.id] ?? emptyDraft()))
  const single = request.questions.length === 1
  const title = single ? "The agent has a question" : `The agent has ${request.questions.length} questions`

  async function send(reply: QuestionReply) {
    setBusy(true)
    try {
      await window.slagent.answerQuestion(request.id, reply)
    } catch (error) {
      toast.error(errorText(error))
      setBusy(false)
    }
  }

  function submit() {
    if (!ready || busy) return
    const answers: QuestionAnswer[] = request.questions.map((question) => {
      const draft = drafts[question.id] ?? emptyDraft()
      return {
        questionId: question.id,
        selected: draft.selected,
        other: draft.other.trim() || undefined,
      }
    })
    void send({ skipped: false, answers })
  }

  return (
    <>
      <section
        className="flex items-center gap-3 rounded-md border border-white/15 bg-white/[0.03] px-4 py-2 text-sm"
        aria-label="Question"
      >
        <MessageCircleQuestionIcon className="size-4 shrink-0 text-white/70" />
        <span className="min-w-0 flex-1 truncate">{request.questions[0]?.question}</span>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(true)}>
          Answer
        </Button>
      </section>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="flex h-[75vh] w-[75vw] max-w-none flex-col p-0"
          onOpenAutoFocus={(event) => {
            // Focus the first question so number keys work right away.
            event.preventDefault()
            body.current?.querySelector<HTMLElement>("[data-question]")?.focus({ preventScroll: true })
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || !ready) return
            if (event.metaKey || event.ctrlKey || !typing(event.target)) {
              event.preventDefault()
              submit()
            }
          }}
        >
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <DialogDescription className="sr-only">Close this to reply in the chat instead.</DialogDescription>
          <div ref={body} className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 pt-5 pb-4">
            {request.questions.map((question, index) => (
              <QuestionBlock
                key={question.id}
                question={question}
                number={index + 1}
                numbered={!single}
                fill={single && visual(question)}
                draft={drafts[question.id] ?? emptyDraft()}
                onChange={(draft) => setDrafts((current) => ({ ...current, [question.id]: draft }))}
              />
            ))}
          </div>
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 px-5 py-3">
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void send({ skipped: true })}>
              Let it decide
            </Button>
            <Button type="button" size="sm" disabled={busy || !ready} onClick={submit}>
              Send
            </Button>
          </footer>
        </DialogContent>
      </Dialog>
    </>
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
