import type { ComponentType } from "react"
import type { UserMessage } from "@shared/types"
import type { Block, Turn } from "@/features/transcript/transcript-blocks"

export type MessageListProps = {
  blocks: Block[]
  EmptyState: ComponentType
  UserTurn: ComponentType<{ message: UserMessage }>
  AssistantTurn: ComponentType<{ turn: Turn }>
}

export function MessageList({ blocks, EmptyState, UserTurn, AssistantTurn }: MessageListProps) {
  if (blocks.length === 0) {
    return <EmptyState />
  }
  return (
    <>
      {blocks.map((block) => {
        if (block.kind === "user") {
          return <UserTurn key={block.message.id} message={block.message} />
        }
        return <AssistantTurn key={block.turn.id} turn={block.turn} />
      })}
    </>
  )
}
