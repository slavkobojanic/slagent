import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ChatDeletion } from "@/features/library/chat-deletion/chat-deletion"

const meta = {
  title: "Features/Library/ChatDeletion",
  component: ChatDeletion,
  args: { open: true, chatTitle: "Set up storybook stories", busy: false, onCancel: fn(), onConfirm: fn() },
} satisfies Meta<typeof ChatDeletion>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = {}

export const Busy: Story = { args: { busy: true } }

export const Closed: Story = { args: { open: false } }
