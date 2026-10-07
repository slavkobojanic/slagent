import type { QuestionOption } from "@shared/types"
import { RecommendedBadge } from "./recommended-badge"

export type OptionTextProps = {
  option: QuestionOption
}

export function OptionText({ option }: OptionTextProps) {
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
