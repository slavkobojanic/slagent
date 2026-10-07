import { CheckIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Question, QuestionOption } from "@shared/types"
import { HtmlFrame, Media, type Theme } from "./question-media"

export type QuestionBlockProps = {
  question: Question
  selected: string[]
  other: string
  theme: Theme
  frameHeights: Record<string, number>
  brokenImages: Record<string, boolean>
  zoomed: boolean
  attachQuestion: (element: HTMLElement | null) => void
  onPick: (label: string) => void
  onOtherChange: (value: string) => void
  onImageError: (src: string) => void
  onZoomChange: (open: boolean) => void
}

// Options with an image or a mockup are shown as large side-by-side cards.
function isVisual(question: Question): boolean {
  return question.options.some((option) => Boolean(option.image || option.html))
}

// One question: its media, its options, and its free-text row. The block takes focus when it mounts,
// so number keys answer the question right away.
export function QuestionBlock({
  question,
  selected,
  other,
  theme,
  frameHeights,
  brokenImages,
  zoomed,
  attachQuestion,
  onPick,
  onOtherChange,
  onImageError,
  onZoomChange,
}: QuestionBlockProps) {
  return (
    <div ref={attachQuestion} className="space-y-2 outline-none" tabIndex={-1} data-question>
      <Media
        image={question.image}
        html={question.html}
        preview={question.preview}
        title={question.question}
        frameKey={`${question.id}:media`}
        theme={theme}
        frameHeights={frameHeights}
        brokenImages={brokenImages}
        zoomed={zoomed}
        onImageError={onImageError}
        onZoomChange={onZoomChange}
      />
      {isVisual(question) ? (
        <OptionCards question={question} selected={selected} theme={theme} frameHeights={frameHeights} onPick={onPick} />
      ) : (
        <OptionRows question={question} selected={selected} onPick={onPick} />
      )}
      <OtherRow multiSelect={question.multiSelect} optionCount={question.options.length} other={other} onChange={onOtherChange} />
    </div>
  )
}

function RecommendedBadge() {
  return <span className="rounded bg-success/15 px-1.5 text-xs text-success">Recommended</span>
}

// The numbered chip at the end of a row. It flips to a check when picked.
function Marker({ checked, index }: { checked: boolean; index: number }) {
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-md border border-white/15 text-xs tabular-nums text-white/50 transition-colors",
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
      {option.description ? <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{option.description}</span> : null}
    </span>
  )
}

// A compact numbered row. Picking it selects the answer and advances; the parent decides what a
// click means, and the row only reports it.
function OptionRow({ option, index, checked, onPick }: { option: QuestionOption; index: number; checked: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border border-white/10 px-3.5 py-2.5 text-left transition-colors hover:bg-white/4",
        checked && "border-white/70 bg-white/6 hover:bg-white/6",
      )}
      onClick={() => onPick()}
    >
      <OptionText option={option} />
      <Marker checked={checked} index={index} />
    </button>
  )
}

function OptionRows({ question, selected, onPick }: { question: Question; selected: string[]; onPick: (label: string) => void }) {
  return (
    <div className="space-y-1.5" role="radiogroup" aria-label={question.question}>
      {question.options.map((option, index) => (
        <OptionRow
          key={option.label}
          option={option}
          index={index}
          checked={selected.includes(option.label)}
          onPick={() => onPick(option.label)}
        />
      ))}
    </div>
  )
}

// Visual options keep the large preview cards. A pick still advances.
function OptionCards({
  question,
  selected,
  theme,
  frameHeights,
  onPick,
}: {
  question: Question
  selected: string[]
  theme: Theme
  frameHeights: Record<string, number>
  onPick: (label: string) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label={question.question}>
      {question.options.map((option) => {
        const checked = selected.includes(option.label)
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
            <span className="relative block aspect-4/3 w-full overflow-hidden bg-white/3">
              {option.image ? (
                <img src={option.image} alt={option.label} className="absolute inset-0 size-full object-cover" />
              ) : option.html ? (
                // Look, don't touch: clicks go to the card, not the mockup.
                <span className="pointer-events-none absolute inset-0 block overflow-hidden">
                  <HtmlFrame
                    html={option.html}
                    title={option.label}
                    frameKey={`${question.id}:option:${option.label}`}
                    theme={theme}
                    frameHeights={frameHeights}
                  />
                </span>
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">No preview</span>
              )}
            </span>
            <span className={cn("flex flex-1 items-start gap-2.5 px-3 py-2.5", checked && "bg-white/6")}>
              <OptionText option={option} />
            </span>
          </button>
        )
      })}
    </div>
  )
}

// The free-text row. On single-choice questions, typing here clears the pick. Enter is handled by
// the card, which owns every key press in it.
function OtherRow({
  multiSelect,
  optionCount,
  other,
  onChange,
}: {
  multiSelect: boolean
  optionCount: number
  other: string
  onChange: (value: string) => void
}) {
  const filled = other.trim() !== ""
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-white/10 py-1.5 pr-3.5 pl-3.5 transition-colors hover:bg-white/4 focus-within:border-white/40",
        filled && "border-white/70 bg-white/6 hover:bg-white/6",
      )}
    >
      <span className="shrink-0 text-sm font-medium">Other</span>
      <Input
        value={other}
        placeholder={multiSelect ? "Type your own answer (optional)" : "Type your own answer"}
        className="h-8 min-w-0 flex-1 border-0 px-0 text-sm focus-visible:ring-0"
        onChange={(event) => onChange(event.target.value)}
      />
      {multiSelect ? null : <Marker checked={filled} index={optionCount} />}
    </div>
  )
}
