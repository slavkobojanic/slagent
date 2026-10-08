import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ChatRowMenu } from "@/features/library/sidebar/open-project/chat-list/chat-row/chat-row-menu/chat-row-menu"
import { chat } from "@/storybook/sample"

const meta = {
  title: "Features/Library/ChatRowMenu",
  component: ChatRowMenu,
  args: {
    chat: chat(),
    open: true,
    onOpenChange: fn(),
    onPin: fn(),
    onRename: fn(),
    onCopy: fn(),
    onDelete: fn(),
  },
} satisfies Meta<typeof ChatRowMenu>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = {}

export const Pinned: Story = { args: { chat: chat({ pinned: true }) } }
