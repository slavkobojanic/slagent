import type { Meta, StoryObj } from "@storybook/react-vite"
import { PendingReply } from "@/features/transcript/status/pending-reply"

const meta = {
  title: "Features/Transcript/PendingReply",
  component: PendingReply,
  args: { label: "Thinking" },
} satisfies Meta<typeof PendingReply>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
