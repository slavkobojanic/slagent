import type { Meta, StoryObj } from "@storybook/react-vite"
import { AssistantTurn } from "@/features/transcript/message-list/assistant-turn/assistant-turn"

const meta = {
  title: "Features/Transcript/AssistantTurn",
  component: AssistantTurn,
  args: { messageId: "m1", thinking: null, thinkingStreaming: false, workingLabel: null, thinkingLabel: null, tools: null, waiting: false, text: "Done. Every view now has a story.", error: null },
} satisfies Meta<typeof AssistantTurn>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Waiting: Story = { args: { text: null, waiting: true } }

export const Thinking: Story = { args: { thinking: "The views take plain props, so a story can pass placeholders.", thinkingStreaming: true, text: null } }

export const Error: Story = { args: { text: null, error: "The run stopped with an error." } }
