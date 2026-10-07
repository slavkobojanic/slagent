import type { ComponentType, ReactNode, Ref } from "react"
import type { StickToBottomContext } from "use-stick-to-bottom"
import { Conversation, ConversationContent, ConversationSettle } from "@/components/ai-elements/conversation"

export type TranscriptProps = {
  streaming: boolean
  // The empty-chat guidance, or null once the chat has messages.
  intro: ReactNode
  rows: ReactNode[]
  plan: ReactNode
  // The working line or the notice, or null.
  status: ReactNode
  ScrollDown: ComponentType
  attachScroll: Ref<StickToBottomContext>
  onSettle: () => void
}

// The chat transcript: a scrolling list of rows. The question card and the composer sit beside
// it, not inside it, so they stay put while the list scrolls.
export function Transcript({ streaming, intro, rows, plan, status, ScrollDown, attachScroll, onSettle }: TranscriptProps) {
  // Content settling after a chat opens (markdown, highlighting) snaps to the bottom;
  // only streamed output scrolls smoothly.
  return (
    <Conversation className="chat-transcript min-h-0" resize={streaming ? "smooth" : "instant"} contextRef={attachScroll}>
      <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-6 py-8">
        {intro}
        {rows}
        {plan}
        {status}
      </ConversationContent>
      <ScrollDown />
      <ConversationSettle onSettle={onSettle} />
    </Conversation>
  )
}
