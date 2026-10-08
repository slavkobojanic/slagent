import type { Meta, StoryObj } from "@storybook/react-vite"
import type { CommentUnit } from "@/features/transcript/commentable-response/comment-model"
import { CommentableResponse } from "@/features/transcript/commentable-response/commentable-response"
import { slot } from "@/storybook/slots"

const whole: CommentUnit = { key: "m1\nblock", messageId: "m1", block: "The whole block.", enabled: true }
const items: CommentUnit[] = [
  { key: "m1\n- one", messageId: "m1", block: "- one", enabled: true },
  { key: "m1\n- two", messageId: "m1", block: "- two", enabled: true },
]

const meta = {
  title: "Features/Transcript/CommentableResponse",
  component: CommentableResponse,
  args: { whole, items: [], Block: slot("Block"), children: "The whole block." },
} satisfies Meta<typeof CommentableResponse>

export default meta
type Story = StoryObj<typeof meta>

export const WholeBlock: Story = {}

export const ListItems: Story = { args: { whole: null, items } }

export const Plain: Story = { args: { whole: null, items: [] } }
