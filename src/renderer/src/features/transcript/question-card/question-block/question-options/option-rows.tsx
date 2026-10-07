import type { Question } from "@shared/types"
import { OptionRow } from "./option-row"

export type OptionRowsProps = {
  question: Question
  selected: string[]
  onPick: (label: string) => void
}

export function OptionRows({ question, selected, onPick }: OptionRowsProps) {
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
