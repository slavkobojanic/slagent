import type { Meta, StoryObj } from "@storybook/react-vite"
import type { Block } from "@/features/transcript/transcript-blocks"
import { MessageList } from "@/features/transcript/message-list/message-list"
import { assistantMessage, toolMessage, userMessage } from "@/storybook/sample"
import { slot } from "@/storybook/slots"

const blocks: Block[] = [
  { kind: "user", message: userMessage() },
  {
    kind: "turn",
    turn: { id: "m1", assistant: assistantMessage(), tools: [toolMessage()] },
  },
  { kind: "user", message: userMessage({ id: "u2", text: "Great, and cover the empty states." }) },
]

const meta = {
  title: "Features/Transcript/MessageList",
  component: MessageList,
  args: { blocks, EmptyState: slot("EmptyState"), UserTurn: slot("UserTurn"), AssistantTurn: slot("AssistantTurn") },
} satisfies Meta<typeof MessageList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = { args: { blocks: [] } }
