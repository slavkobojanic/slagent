import type { AnsweredQuestion } from "@shared/types"
import { CheckIcon } from "lucide-react"

export type AnsweredQuestionsProps = {
  answers: AnsweredQuestion[]
}

export function AnsweredQuestions({ answers }: AnsweredQuestionsProps) {
  return (
    <dl className="space-y-2 text-sm">
      {answers.map((answer, index) => {
        const picks = [...answer.selected]
        if (answer.other) {
          picks.push(answer.other)
        }
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
