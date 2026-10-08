import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { PendingComments } from "@/features/composer/pending-comments/pending-comments"

const meta = {
  title: "Features/Composer/PendingComments",
  component: PendingComments,
  args: {
    label: "2 comments",
    replies: [{ id: "r1", quote: "the assistant response", text: "Keep this shorter" }],
    diffs: [{ id: "d1", location: "button.tsx:12", text: "Add an xs size" }],
    onRemoveReply: fn(),
    onRemoveDiff: fn(),
  },
} satisfies Meta<typeof PendingComments>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = { args: { replies: [], diffs: [] } }
