import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { UserTurn } from "@/features/transcript/message-list/user-turn/user-turn"
import { attachment, diffComment, replyComment, userMessage } from "@/storybook/sample"

const meta = {
  title: "Features/Transcript/UserTurn",
  component: UserTurn,
  args: {
    message: userMessage(),
    editable: true,
    confirming: false,
    onEdit: fn(),
    onRewind: fn(),
    onOpenFile: fn(),
    onConfirmEdit: fn(),
    onCancelConfirm: fn(),
  },
} satisfies Meta<typeof UserTurn>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const ReadOnly: Story = { args: { editable: false } }

export const Confirming: Story = { args: { confirming: true } }

export const WithComments: Story = {
  args: {
    message: userMessage({
      text: "Please refactor this.",
      attachments: [attachment({ kind: "file", name: "types.ts" })],
      replies: [replyComment()],
      comments: [diffComment()],
    }),
  },
}
