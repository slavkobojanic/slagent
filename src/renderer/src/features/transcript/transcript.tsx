import type { ComponentType, Ref } from "react"
import type { StickToBottomContext } from "use-stick-to-bottom"
import { Conversation, ConversationContent, ConversationSettle } from "@/components/ai-elements/conversation"

export type TranscriptProps = {
  streaming: boolean
  attachScroll: Ref<StickToBottomContext>
  onSettle: () => void
  MessageList: ComponentType
  Status: ComponentType
  ScrollDown: ComponentType
  QuestionCard: ComponentType
}

// The question card is a sibling of the conversation, so it stays put while the list scrolls.
export function Transcript({ streaming, attachScroll, onSettle, MessageList, Status, ScrollDown, QuestionCard }: TranscriptProps) {
  // Content settling after a chat opens (markdown, highlighting) snaps to the bottom;
  // only streamed output scrolls smoothly.
  return (
    <>
      <Conversation className="chat-transcript min-h-0" resize={streaming ? "smooth" : "instant"} contextRef={attachScroll}>
        <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-6 py-8">
          <MessageList />
          <Status />
        </ConversationContent>
        <ScrollDown />
        <ConversationSettle onSettle={onSettle} />
      </Conversation>
      <QuestionCard />
    </>
  )
}
