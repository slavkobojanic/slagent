import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { QuestionCardStore } from "@/features/transcript/question-card/question-card-store/question-card-store"
import type { ThemeStore } from "@/state/theme/theme-store/theme-store"
import { HtmlFrame } from "./html-frame"

type HtmlFrameHostProps = { html: string; title: string; frameKey: string }

export function createHtmlFrame({
  questionCardStore,
  themeStore,
}: {
  questionCardStore: QuestionCardStore
  themeStore: ThemeStore
}): ComponentType<HtmlFrameHostProps> {
  return observer(function HtmlFrameHost({ html, title, frameKey }: HtmlFrameHostProps) {
    return <HtmlFrame html={html} title={title} frameKey={frameKey} theme={themeStore.resolved} height={questionCardStore.frameHeightOf(frameKey)} />
  })
}
