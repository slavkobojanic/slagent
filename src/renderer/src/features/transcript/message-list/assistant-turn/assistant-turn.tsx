import type { ReactNode } from "react"
import { Message } from "@/components/ai-elements/message"
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning"
import { Shimmer } from "@/components/ai-elements/shimmer"

export type AssistantTurnProps = {
  messageId: string
  thinking: string | null
  thinkingStreaming: boolean
  tools: ReactNode
  // Whether the reply has started but has no text yet, so the working label shows.
  waiting: boolean
  text: ReactNode
  error: string | null
}

export function AssistantTurn({ messageId, thinking, thinkingStreaming, tools, waiting, text, error }: AssistantTurnProps) {
  return (
    <Message from="assistant" className="max-w-full" data-message-id={messageId}>
      {thinking ? (
        <Reasoning isStreaming={thinkingStreaming}>
          <ReasoningTrigger />
          <ReasoningContent>{thinking}</ReasoningContent>
        </Reasoning>
      ) : null}
      {tools}
      {waiting ? <Shimmer>Working</Shimmer> : null}
      {text}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </Message>
  )
}
