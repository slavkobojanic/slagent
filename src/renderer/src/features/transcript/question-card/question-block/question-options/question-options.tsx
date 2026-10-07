import type { ComponentType } from "react"
import type { Question } from "@shared/types"
import { OptionCards } from "./option-cards"
import { OptionRows } from "./option-rows"

export type QuestionOptionsProps = {
  question: Question
  selected: string[]
  // Whether an option has an image or a mockup, so the options show as preview cards.
  visual: boolean
  HtmlFrame: ComponentType<{ html: string; title: string; frameKey: string }>
  onPick: (label: string) => void
}

export function QuestionOptions({ question, selected, visual, HtmlFrame, onPick }: QuestionOptionsProps) {
  if (visual) {
    return <OptionCards question={question} selected={selected} HtmlFrame={HtmlFrame} onPick={onPick} />
  }
  return <OptionRows question={question} selected={selected} onPick={onPick} />
}
