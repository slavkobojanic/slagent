import type { QuestionOption } from "@shared/types"
import { Marker } from "@/features/transcript/question-card/question-block/marker"
import { cn } from "@/lib/utils"
import { OptionText } from "./option-text"

export type OptionRowProps = {
  option: QuestionOption
  index: number
  checked: boolean
  onPick: () => void
}

export function OptionRow({ option, index, checked, onPick }: OptionRowProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg bg-white/6 px-3.5 py-2.5 text-left transition-colors hover:bg-white/8",
        checked && "bg-white/10 hover:bg-white/10",
      )}
      onClick={() => onPick()}
    >
      <OptionText option={option} />
      <Marker checked={checked} index={index} />
    </button>
  )
}
