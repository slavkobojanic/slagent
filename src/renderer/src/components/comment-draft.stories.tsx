import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { CommentDraft } from "@/components/comment-draft"

const meta = {
  title: "Components/CommentDraft",
  component: CommentDraft,
  args: { onSave: fn(), onCancel: fn() },
} satisfies Meta<typeof CommentDraft>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const NewComment: Story = {
  args: { saveLabel: "Add comment" },
}

export const Editing: Story = {
  args: { initial: "Use a Set.", saveLabel: "Save" },
}
