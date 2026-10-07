import type { Question } from "@shared/types"

export function hasVisualOptions(question: Question): boolean {
  return question.options.some((option) => Boolean(option.image || option.html))
}
