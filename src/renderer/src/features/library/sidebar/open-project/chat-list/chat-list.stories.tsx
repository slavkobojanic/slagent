import type { Meta, StoryObj } from "@storybook/react-vite"
import { ChatList } from "@/features/library/sidebar/open-project/chat-list/chat-list"
import { chat } from "@/storybook/sample"
import { slot } from "@/storybook/slots"

const meta = {
  title: "Features/Library/ChatList",
  component: ChatList,
  args: {
    chats: [chat(), chat({ id: "c2", title: "Fix the sidebar throb", pinned: true }), chat({ id: "c3", title: "Add plan overlay" })],
    empty: false,
    hasHidden: false,
    reduceMotion: false,
    ChatRow: slot("ChatRow"),
    Footer: slot("Footer"),
  },
} satisfies Meta<typeof ChatList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = { args: { chats: [], empty: true } }

export const Hidden: Story = { args: { hasHidden: true } }

export const ReduceMotion: Story = { args: { reduceMotion: true } }
