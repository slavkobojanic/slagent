import { cloneElement } from "react"
import type { Question } from "@shared/types"
import { createOptionRow } from "./option-row/create"

export type OptionRowsProps = {
  question: Question
  selected: string[]
  onPick: (label: string) => void
}

export function OptionRows({ question, selected, onPick }: OptionRowsProps) {
  return (
    <div className="space-y-1.5" role="radiogroup" aria-label={question.question}>
      {question.options.map((option, index) =>
        cloneElement(
          createOptionRow({
            option,
            index,
            checked: selected.includes(option.label),
            onPick: () => onPick(option.label),
          }),
          { key: option.label }
        )
      )}
    </div>
  )
}
