import type { ComponentType } from "react"
import type { Question } from "@shared/types"
import { cn } from "@/lib/utils"
import { OptionText } from "./option-text"

export type OptionCardsProps = {
  question: Question
  selected: string[]
  HtmlFrame: ComponentType<{ html: string; title: string; frameKey: string }>
  onPick: (label: string) => void
}

export function OptionCards({ question, selected, HtmlFrame, onPick }: OptionCardsProps) {
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
                  <HtmlFrame html={option.html} title={option.label} frameKey={`${question.id}:option:${option.label}`} />
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
