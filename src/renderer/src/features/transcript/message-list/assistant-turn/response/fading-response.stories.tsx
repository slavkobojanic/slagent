import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ResponsePart } from "@/features/transcript/message-list/assistant-turn/response/fading-response"
import { FadingResponse } from "@/features/transcript/message-list/assistant-turn/response/fading-response"
import { slot } from "@/storybook/slots"

const blocks: ResponsePart[] = [
  { text: "Every view takes plain props.", code: false },
  { text: "const x = 1", code: true },
]

const meta = {
  title: "Features/Transcript/FadingResponse",
  component: FadingResponse,
  args: { messageId: "m1", blocks, shown: 1, streaming: true, Commentable: slot("Commentable") },
} satisfies Meta<typeof FadingResponse>

export default meta
type Story = StoryObj<typeof meta>

export const PartlyRevealed: Story = {}

export const FullyRevealed: Story = { args: { shown: 2, streaming: false } }
