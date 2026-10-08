import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ResponsePart } from "@/features/transcript/message-list/assistant-turn/response/fading-response"
import { StaticResponse } from "@/features/transcript/message-list/assistant-turn/response/static-response"
import { slot } from "@/storybook/slots"

const blocks: ResponsePart[] = [
  { text: "Every view takes plain props.", code: false },
  { text: "const x = 1", code: true },
]

const meta = {
  title: "Features/Transcript/StaticResponse",
  component: StaticResponse,
  args: { messageId: "m1", blocks, Commentable: slot("Commentable") },
} satisfies Meta<typeof StaticResponse>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
