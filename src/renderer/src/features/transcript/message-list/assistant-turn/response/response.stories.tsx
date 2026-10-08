import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ResponsePart } from "@/features/transcript/message-list/assistant-turn/response/fading-response"
import { Response } from "@/features/transcript/message-list/assistant-turn/response/response"
import { slot } from "@/storybook/slots"

const blocks: ResponsePart[] = [
  { text: "Here is the plan:", code: false },
  { text: "const x = 1", code: true },
]

const meta = {
  title: "Features/Transcript/Response",
  component: Response,
  args: { messageId: "m1", blocks, shown: undefined, streaming: false, Commentable: slot("Commentable") },
} satisfies Meta<typeof Response>

export default meta
type Story = StoryObj<typeof meta>

export const Static: Story = {}

export const Fading: Story = { args: { shown: 1, streaming: true } }

export const Revealed: Story = { args: { shown: 2, streaming: false } }
