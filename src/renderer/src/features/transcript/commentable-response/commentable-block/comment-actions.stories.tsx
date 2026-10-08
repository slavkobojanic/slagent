import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { CommentActions } from "@/features/transcript/commentable-response/commentable-block/comment-actions"
import { replyComment } from "@/storybook/sample"

const meta = {
  title: "Features/Transcript/CommentActions",
  component: CommentActions,
  args: { comment: replyComment(), onEdit: fn(), onDelete: fn() },
} satisfies Meta<typeof CommentActions>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
