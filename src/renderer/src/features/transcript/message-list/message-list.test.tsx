import { describe, expect, it } from "vitest"
import type { UserMessage } from "@shared/types"
import { MessageList, type MessageListProps } from "@/features/transcript/message-list/message-list"
import type { Turn } from "@/features/transcript/transcript-blocks"
import { viewMarkup } from "@/test/view-markup"

function EmptyState() {
  return <p>Choose a folder</p>
}

function UserTurn({ message }: { message: UserMessage }) {
  return <p>User {message.text}</p>
}

function AssistantTurn({ turn }: { turn: Turn }) {
  return <p>Assistant {turn.assistant?.text}</p>
}

function props(overrides: Partial<MessageListProps> = {}): MessageListProps {
  return { blocks: [], EmptyState, UserTurn, AssistantTurn, ...overrides }
}

describe("MessageList", () => {
  it("shows the empty state when the chat has no messages", () => {
    const markup = viewMarkup(<MessageList {...props()} />)

    expect(markup).toContain("Choose a folder")
  })

  it("shows each block in order without the empty state", () => {
    const markup = viewMarkup(
      <MessageList
        {...props({
          blocks: [
            { kind: "user", message: { id: "u1", role: "user", text: "Fix it", attachments: [] } },
            { kind: "turn", turn: { id: "a1", assistant: { id: "a1", role: "assistant", text: "Done", thinking: "", streaming: false, error: null }, tools: [] } },
          ],
        })}
      />,
    )

    expect(markup).not.toContain("Choose a folder")
    expect(markup.indexOf("User Fix it")).toBeLessThan(markup.indexOf("Assistant Done"))
  })
})
