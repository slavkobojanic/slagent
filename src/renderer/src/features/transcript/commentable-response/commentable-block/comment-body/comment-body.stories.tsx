import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { CommentBody } from "@/features/transcript/commentable-response/commentable-block/comment-body/comment-body"
import { replyComment } from "@/storybook/sample"

const meta = {
  title: "Features/Transcript/CommentBody",
  component: CommentBody,
  args: { comment: replyComment(), open: false, highlighted: false, onOpenChange: fn(), onEdit: fn(), onDelete: fn(), children: "The assistant reply text." },
} satisfies Meta<typeof CommentBody>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Highlighted: Story = { args: { highlighted: true } }

export const CardOpen: Story = { args: { open: true } }
