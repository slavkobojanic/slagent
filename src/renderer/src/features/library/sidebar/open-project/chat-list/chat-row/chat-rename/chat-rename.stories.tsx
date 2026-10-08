import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ChatRename } from "@/features/library/sidebar/open-project/chat-list/chat-row/chat-rename/chat-rename"
import { chat } from "@/storybook/sample"

const meta = {
  title: "Features/Library/ChatRename",
  component: ChatRename,
  args: { chat: chat(), draft: "Set up storybook stories", onDraftChange: fn(), onSave: fn(), onCancel: fn() },
} satisfies Meta<typeof ChatRename>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
