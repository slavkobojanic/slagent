import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ChatListFooter } from "@/features/library/sidebar/open-project/chat-list/chat-list-footer/chat-list-footer"

const meta = {
  title: "Features/Library/ChatListFooter",
  component: ChatListFooter,
  args: { hiddenCount: 0, canShowLess: false, onShowAll: fn(), onShowLess: fn() },
} satisfies Meta<typeof ChatListFooter>

export default meta
type Story = StoryObj<typeof meta>

export const Nothing: Story = {}

export const ShowMore: Story = { args: { hiddenCount: 5 } }

export const ShowLess: Story = { args: { canShowLess: true } }

export const Both: Story = { args: { hiddenCount: 5, canShowLess: true } }
