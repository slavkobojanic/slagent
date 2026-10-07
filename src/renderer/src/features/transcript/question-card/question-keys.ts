// A key press inside the question card, reduced to what the card reads. mod is Meta or Ctrl,
// which the old card treated the same way.
export type QuestionKeyPress = {
  key: string
  shift: boolean
  mod: boolean
  alt: boolean
  typing: boolean
}
